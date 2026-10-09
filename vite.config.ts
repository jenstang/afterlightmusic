import {defineConfig} from 'vite';
import {createWriteStream} from 'node:fs';
import {mkdir,rename} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';

// Local render output. This middleware is only present in the development server.
export default defineConfig(({command,isPreview})=>({base:command==='build'||isPreview?'/afterlightmusic/':'/',plugins:[{name:'local-film-export',configureServer(server){
  server.middlewares.use('/api/render',async(req,res)=>{
    if(req.method!=='POST'){res.statusCode=405;res.end();return;}
    if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.statusCode=403;res.end();return;}
    const dir=resolve('artifacts'),temp=resolve(dir,'afterlight.webm.part'),output=resolve(dir,'Afterlight-Triomphe-Orchestral.webm');
    try{await mkdir(dir,{recursive:true});await pipeline(req,createWriteStream(temp));await rename(temp,output);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:true,path:output}));}
    catch{res.statusCode=500;res.end(JSON.stringify({saved:false}));}
  });
}}]}));
