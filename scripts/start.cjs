const {resolve} = require('node:path');
const {spawn} = require('node:child_process');
const {createDevServer} = require('./dev-server.cjs');
const server = createDevServer();
for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{server.stopAi();server.close();});
server.on('error',error=>{
  console.error(error.code === 'EADDRINUSE'
    ? 'Port 8765 ist bereits belegt. Bitte eine bereits laufende Tagebuch-App beenden und erneut starten.'
    : 'Tagebuch konnte nicht starten: '+error.message);
  process.exitCode=1;
});
server.listen(8765,'127.0.0.1',()=>{
  const url='http://127.0.0.1:8765';
  console.log('Tagebuch: '+url+'\nDatenordner: '+resolve(__dirname,'../data')+'\nDieses Fenster offen lassen. Beenden mit Strg+C.');
  if(process.platform==='win32'){
    const browser=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',"Start-Process 'http://127.0.0.1:8765'"],{windowsHide:true,stdio:'ignore'});
    browser.on('error',()=>console.log('Bitte die Adresse im Browser öffnen: '+url));
  }
});
