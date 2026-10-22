const { createServer } = require('node:http');
const { readFile, realpath } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const { createLocalStore } = require('./local-store.cjs');
const { createAiRuntime } = require('./ai-runtime.cjs');
const { createOpenAiRuntime } = require('./openai-runtime.cjs');
const root = resolve(__dirname,'../Dev');
const entry = resolve(root,'Tagebuch.html'), assets = resolve(root,'app') + sep;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.txt':'text/plain; charset=utf-8'};
function createDevServer({dataDir = resolve(__dirname,'../data'),storage = true,ai = true,aiOptions = {},openai = true,openaiOptions = {}} = {}){
  const store = storage ? createLocalStore(dataDir) : null;
  const runtime = ai ? createAiRuntime({directory:resolve(dataDir,'ai'),...aiOptions}) : null;
  const cloud = openai ? createOpenAiRuntime({directory:resolve(dataDir,'openai'),...openaiOptions}) : null;
  const server = createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://127.0.0.1');
    if(store && await store.handle(req,res,url.pathname)) return;
    if(cloud && await cloud.handle(req,res,url.pathname)) return;
    if(runtime && await runtime.handle(req,res,url.pathname)) return;
  } catch {res.writeHead(400);res.end();return;}
  if(req.method !== 'GET' && req.method !== 'HEAD') {res.writeHead(405);res.end();return;}
  try {
    const name = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const file = await realpath(name === '/' ? entry : resolve(root,'.' + name));
    if(file !== entry && !file.startsWith(assets)) {res.writeHead(404);res.end();return;}
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {res.writeHead(404);res.end();}
});
  server.on('close',()=>{runtime?.close();cloud?.close();});
  server.stopAi = () => {runtime?.close();cloud?.close();};
  return server;
}
module.exports = { createDevServer };
if(require.main === module){
  const server = createDevServer();
  for(const signal of ['SIGINT','SIGTERM']) process.once(signal,()=>{server.stopAi();server.close();});
  server.on('error', error => {console.error('Dev-Server konnte nicht starten: ' + error.message); process.exitCode = 1;});
  server.listen(8765,'127.0.0.1',() => console.log('Windows-Dev: http://127.0.0.1:8765\nAutomatischer Datenordner: ' + resolve(__dirname,'../data') + '\nNur auf diesem PC erreichbar. Beenden mit Strg+C.'));
}
