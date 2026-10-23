import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('out'),prefix='/chatgpt-agent-test';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon','.png':'image/png'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url||'/', 'http://localhost');
  if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
  const rel=decodeURIComponent(url.pathname.slice(prefix.length));
  const relative=rel.replace(/^\/+/,'')+(rel.endsWith('/')||!path.extname(rel)?'/index.html':'');
  const file=path.resolve(root,relative);
  if(!(file===root||file.startsWith(root+path.sep))){res.writeHead(403);res.end();return;}
  const payload=await fs.readFile(file);
  res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
  res.end(payload);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Static Ship It E2E server listening on 4173'));
