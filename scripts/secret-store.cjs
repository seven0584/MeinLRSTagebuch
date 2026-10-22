const {spawn} = require('node:child_process');
const fs = require('node:fs/promises');
const {join,resolve} = require('node:path');
const {randomBytes} = require('node:crypto');

// The secret travels on stdin only. DPAPI binds the saved blob to the Windows
// account; no key is placed in a command argument, environment variable or log.
function dpapi(value, decrypt=false, {spawnImpl=spawn}={}){
  const operation=decrypt
    ? '$bytes=[Convert]::FromBase64String($inputText);$plain=[Security.Cryptography.ProtectedData]::Unprotect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Text.Encoding]::UTF8.GetString($plain))'
    : '$bytes=[Text.Encoding]::UTF8.GetBytes($inputText);$cipher=[Security.Cryptography.ProtectedData]::Protect($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Console]::Out.Write([Convert]::ToBase64String($cipher))';
  const script='$ErrorActionPreference="Stop";Add-Type -AssemblyName System.Security;$inputText=[Console]::In.ReadToEnd();'+operation;
  return new Promise((done,reject)=>{
    const child=spawnImpl('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    let output='',settled=false;
    const finish=(error)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(new Error('Der geschützte Windows-Schlüsselspeicher ist nicht verfügbar.')):done(output);};
    const timer=setTimeout(()=>{child.kill();finish(true);},15000);
    child.on('error',()=>finish(true));child.stdin.on('error',()=>finish(true));
    child.stdout.on('data',part=>{output+=part.toString('utf8');if(output.length>65536){child.kill();finish(true);}});
    child.on('close',code=>finish(code!==0));child.stdin.end(value,'utf8');
  });
}
function createSecretStore({directory,platform=process.platform,protect=dpapi}={}){
  const file=join(resolve(directory),'openai-credentials.dpapi');let memory=null;
  const persistent=platform==='win32';
  return {
    persistent,
    async read(){
      if(!persistent)return memory?structuredClone(memory):null;
      let blob;try{blob=await fs.readFile(file,'utf8');}catch(e){if(e.code==='ENOENT')return null;throw new Error('Der geschützte Schlüssel konnte nicht gelesen werden.');}
      try{return JSON.parse(await protect(blob,true));}catch{throw new Error('Der gespeicherte Schlüssel konnte unter diesem Windows-Konto nicht geöffnet werden. Bitte neu einrichten.');}
    },
    async write(value){
      if(!persistent){memory=structuredClone(value);return;}
      const blob=await protect(JSON.stringify(value),false);
      await fs.mkdir(resolve(directory),{recursive:true});
      const temporary=file+'.'+randomBytes(8).toString('hex')+'.tmp';
      try{await fs.writeFile(temporary,blob,{flag:'wx',mode:0o600});await fs.rename(temporary,file);}catch{await fs.unlink(temporary).catch(()=>{});throw new Error('Der Schlüssel konnte nicht geschützt gespeichert werden.');}
    },
    async remove(){memory=null;if(persistent)await fs.unlink(file).catch(e=>{if(e.code!=='ENOENT')throw new Error('Der gespeicherte Schlüssel konnte nicht entfernt werden.');});},
    close(){memory=null;}
  };
}
module.exports={createSecretStore,dpapi};
