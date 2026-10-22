const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {spawn}=require('node:child_process');
const directory=path.resolve(__dirname,'../tests/benchmark-artifacts/runtime');
const assets=[
 {name:'langlm-de-755mb.gguf',url:'https://huggingface.co/AnthonyFC/langlm-gguf/resolve/54a677b8e5a4a7a9851336ac01cb4ceba37da3f2/langlm-de-755mb.gguf',bytes:792085568,sha256:'4612ce710ec9ba2d0697abd1c527d05562c24116f1c2920b115cce10cc8d1f1b'},
 {name:'llama-b11669-bin-win-cpu-x64.zip',url:'https://github.com/ggml-org/llama.cpp/releases/download/b11669/llama-b11669-bin-win-cpu-x64.zip',bytes:19537886,sha256:'37b3efcf962847ca869745fd4ccf7f5e7e8dacfeff9fa3523b4ca8cdc66d632b'}
];
async function download(asset){
 const target=path.join(directory,asset.name);
 try{const data=await fs.readFile(target);if(data.length===asset.bytes && createHash('sha256').update(data).digest('hex')===asset.sha256){console.log(asset.name+' verified cache');return;}}catch{}
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(1800000)});if(!response.ok)throw new Error('Download '+response.status);
 const file=await fs.open(target+'.part','w'),hash=createHash('sha256');let bytes=0,last=Date.now();
 try{for await(const data of response.body){bytes+=data.length;hash.update(data);await file.writeFile(data);if(Date.now()-last>15000){console.log(asset.name+' '+Math.round(100*bytes/asset.bytes)+'%');last=Date.now();}}}finally{await file.close();}
 if(bytes!==asset.bytes || hash.digest('hex')!==asset.sha256)throw new Error('Download verification failed: '+asset.name);
 await fs.rename(target+'.part',target);console.log(asset.name+' verified');
}
(async()=>{await fs.mkdir(directory,{recursive:true});await Promise.all(assets.map(download));
 await fs.writeFile(path.join(directory,'assets.json'),JSON.stringify(assets,null,2));
 await new Promise((ok,no)=>{const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command','Expand-Archive -LiteralPath $env:BENCH_LLAMA_ZIP -DestinationPath $env:BENCH_LLAMA_DEST -Force'],{windowsHide:true,stdio:'pipe',env:{...process.env,BENCH_LLAMA_ZIP:path.join(directory,assets[1].name),BENCH_LLAMA_DEST:path.join(directory,'llama')}});child.on('error',no);child.on('exit',code=>code===0?ok():no(new Error('Extraction failed')));});
 console.log('benchmark assets ready');
})().catch(error=>{console.error(error.message);process.exitCode=1;});
