import type {Plugin} from 'vite';
import {createReadStream,createWriteStream,existsSync} from 'node:fs';
import {mkdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Transform} from 'node:stream';
import {spawn} from 'node:child_process';
import song from './timing.json';

/** Local-only export: encoded Three.js frames are muxed with the original WAV. */
export function karaokeExport():Plugin{
  let busy=false,lastExport='';
  return {name:'karaoke-local-export',configureServer(server){
    server.middlewares.use('/api/karaoke/download',async(req,res)=>{
      if(!lastExport||!existsSync(lastExport)){res.statusCode=404;res.end('Ingen video er eksportert ennå.');return;}
      res.setHeader('Content-Type','video/mp4');res.setHeader('Content-Length',(await stat(lastExport)).size);
      res.setHeader('Content-Disposition','attachment; filename="Serviett-i-nord-karaoke.mp4"');
      createReadStream(lastExport).pipe(res);
    });
    server.middlewares.use('/api/karaoke/export',async(req,res)=>{
      if(req.method!=='POST'){res.statusCode=405;res.end();return;}
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){res.statusCode=403;res.end();return;}
      if(busy){res.statusCode=409;res.end(JSON.stringify({error:'Et annet opptak pågår.'}));return;}
      const dir=resolve('artifacts/karaoke'),encoder=resolve('artifacts/tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'),source=resolve(dir,'source.wav');
      if(!existsSync(source)||!existsSync(encoder)){res.statusCode=503;res.end(JSON.stringify({error:'Lokal videokoder eller original WAV mangler.'}));return;}
      busy=true;
      try{
        await mkdir(dir,{recursive:true});
        const webm=req.headers['content-type']?.includes('webm');
        const stamp=Date.now(),input=resolve(dir,`frames-${stamp}.${webm?'webm':'h264'}`),output=resolve(dir,`Serviett-i-nord-karaoke-${stamp}.mp4`);
        let bytes=0;
        const limit=new Transform({transform(chunk,_encoding,callback){bytes+=chunk.length;callback(bytes>256*1024*1024?new Error('Videoen er for stor.'):null,chunk);}});
        await pipeline(req,limit,createWriteStream(input));
        // Raw H.264 has no container timestamps. Bound the output by the song,
        // rather than -shortest, which can finish before its audio is muxed.
        const args=['-v','error',...(webm?[]:['-fflags','+genpts','-framerate','30','-f','h264']),'-i',input,'-i',source,'-map','0:v:0','-map','1:a:0','-c:v',webm?'libx264':'copy',...(webm?['-preset','fast','-crf','18']:[]),'-c:a','aac','-b:a','256k','-t',String(song.duration),'-movflags','+faststart',output];
        await new Promise<void>((done,fail)=>{
          const child=spawn(encoder,args,{windowsHide:true});let error='';
          child.stderr.on('data',chunk=>error+=chunk.toString());child.on('error',fail);
          child.on('close',code=>code===0?done():fail(new Error(error.slice(-1500)||'Videokodingen feilet.')));
        });
        // Verify an actual audio stream in the resulting file before reporting success.
        await new Promise<void>((done,fail)=>{
          const child=spawn(encoder,['-v','error','-i',output,'-map','0:a:0','-t','0.05','-f','null','-'],{windowsHide:true});
          child.on('error',fail);child.on('close',code=>code===0?done():fail(new Error('Den eksporterte filen mangler et lesbart lydspor.')));
        });
        lastExport=output;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({saved:true,path:output,url:'/api/karaoke/download'}));
      }catch(error){res.statusCode=500;res.end(JSON.stringify({error:error instanceof Error?error.message:String(error)}));}
      finally{busy=false;}
    });
  }};
}
