const { mkdir, lstat, readFile, writeFile, rename, readdir, unlink, rm } = require('node:fs/promises');
const { resolve, dirname, sep } = require('node:path');
const { randomBytes, randomUUID, timingSafeEqual } = require('node:crypto');

// Development-only same-origin storage port; no arbitrary filesystem access.
function createLocalStore(dataDir) {
  const base = resolve(dataDir), token = randomBytes(32).toString('hex');
  let writes = Promise.resolve();
  const folder = '[^/\\\\:*?"<>|.\\x00-\\x1f]+';
  const filePattern = new RegExp('^(config/familie\\.json|kinder/' + folder + '/files/(tagebuch\\.json|sicherungen/tagebuch-\\d{4}-\\d{2}-\\d{2}\\.json|bilder/[A-Za-z0-9_-]+\\.bild))$');
  const backupsPattern = new RegExp('^kinder/' + folder + '/files/sicherungen$');
  const childPattern = new RegExp('^kinder/' + folder + '$');
  function respond(res, status, value) {
    res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(JSON.stringify(value));
  }
  async function checkedPath(path) {
    const target = resolve(base, ...path.split('/'));
    if(!target.startsWith(base + sep)) throw new Error('Invalid path');
    let current = base;
    for(const segment of ['', ...path.split('/')]) {
      if(segment) current = resolve(current,segment);
      try {if((await lstat(current)).isSymbolicLink()) throw new Error('Links are not storage directories');}
      catch(error) {if(error.code !== 'ENOENT') throw error;}
    }
    return target;
  }
  async function body(req) {
    const parts = []; let size = 0;
    for await(const part of req) {
      size += part.length; if(size > 64 * 1024 * 1024) throw new Error('Request too large'); parts.push(part);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  }
  function permitted(req) {
    const host = req.headers.host, port = req.socket.localPort;
    return (host === '127.0.0.1:' + port || host === 'localhost:' + port) &&
      (!req.headers.origin || req.headers.origin === 'http://' + host) &&
      (!req.headers['sec-fetch-site'] || ['same-origin','none'].includes(req.headers['sec-fetch-site'])) && req.headers['x-tagebuch-client'] === '1';
  }
  async function handle(req,res,path) {
    if(!path.startsWith('/api/storage/')) return false;
    if(!permitted(req)) {respond(res,403,{error:'Zugriff nur durch die lokale Tagebuch-App.'});return true;}
    if(path === '/api/storage/session' && req.method === 'GET') {
      try {await checkedPath('config/familie.json');await mkdir(base,{recursive:true});respond(res,200,{version:1,token,directory:base});}
      catch {respond(res,500,{error:'Der automatische Datenordner ist nicht verfügbar.'});}
      return true;
    }
    const supplied = Buffer.from(req.headers['x-tagebuch-token'] || '');
    if(supplied.length !== token.length || !timingSafeEqual(supplied,Buffer.from(token))) {respond(res,403,{error:'Die lokale Verbindung ist abgelaufen. Bitte die Seite neu laden.'});return true;}
    if(req.method !== 'POST' || !String(req.headers['content-type']).startsWith('application/json')) {respond(res,405,{error:'Ungültige Anfrage.'});return true;}
    let input;
    try {input = await body(req);} catch {respond(res,400,{error:'Ungültige oder zu große Speicherdaten.'});return true;}
    const relative = input?.path;
    const valid = typeof relative === 'string' && (
      (['/api/storage/read','/api/storage/write'].includes(path) && filePattern.test(relative)) ||
      (path === '/api/storage/list' && backupsPattern.test(relative)) ||
      (path === '/api/storage/remove' && (childPattern.test(relative) || (filePattern.test(relative) && relative.includes('/sicherungen/'))))
    );
    if(!valid) {respond(res,400,{error:'Dieser Speicherpfad ist nicht erlaubt.'});return true;}
    try {
      const execute = async () => {
        const target = await checkedPath(relative);
        if(path === '/api/storage/read') {
          try {return {text:await readFile(target,'utf8')};} catch(error) {if(error.code === 'ENOENT') return {text:null};throw error;}
        }
        if(path === '/api/storage/list') {
          try {return {names:(await readdir(target,{withFileTypes:true})).filter(e => e.isFile()).map(e => e.name)};} catch(error) {if(error.code === 'ENOENT') return {names:[]};throw error;}
        }
        if(path === '/api/storage/write') {
          if(typeof input.text !== 'string') throw new Error('Invalid file');
          await mkdir(dirname(target),{recursive:true}); const temporary = target + '.' + randomUUID() + '.tmp';
          try {await writeFile(temporary,input.text,{encoding:'utf8',flag:'wx'});await rename(temporary,target);}
          finally {await unlink(temporary).catch(error => {if(error.code !== 'ENOENT') throw error;});}
          return {ok:true};
        }
        // Recursive removal is limited to a child folder, never the data root.
        await rm(target,{recursive:childPattern.test(relative),force:true});return {ok:true};
      };
      let result;
      if(path === '/api/storage/write' || path === '/api/storage/remove') {const next = writes.then(execute);writes = next.catch(() => {});result = await next;}
      else {await writes;result = await execute();}
      respond(res,200,result);
    } catch {respond(res,500,{error:'Die Daten konnten nicht sicher gelesen oder gespeichert werden.'});}
    return true;
  }
  return {handle};
}
module.exports = {createLocalStore};
