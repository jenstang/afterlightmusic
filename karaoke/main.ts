import './style.css';
import {KaraokeRenderer} from './renderer';
import type {Song,Mode} from './types';
import timing from './timing.json';

const song=timing as Song;
const icon=(name:string)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${({play:'<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14m8-14v14"/>',restart:'<path d="M4 9a8 8 0 1 1 0 7M4 4v5h5"/>',full:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',save:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>'} as Record<string,string>)[name]}</svg>`;
const format=(t:number)=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML=`<main class="page">
  <header class="top"><div class="identity"><div class="anniversary" aria-hidden="true">30</div><div><div class="eyebrow">Fra en serviett i nord</div><h1>Tretti år. Syng med!</h1></div></div><div class="edition">Serviett i nord · v6<br>Karaoke · ${format(song.duration)}</div></header>
  <section class="stage" id="stage" aria-label="Karaokevideo"><canvas id="video" aria-label="Sangtekst med synkronisert ordmarkering"></canvas><div class="start-overlay"><button id="start" aria-label="Start karaoke">▶</button></div><button id="stage-exit">Avslutt fullskjerm · Esc</button></section>
  <input class="seek" id="seek" type="range" min="0" max="${song.duration}" step="0.01" value="0" aria-label="Tidspunkt i sangen"/>
  <section class="controls" aria-label="Avspilling"><div class="left-controls"><button class="button" id="play">${icon('play')}<span>Spill av</span></button><button class="icon" id="restart" aria-label="Start på nytt">${icon('restart')}</button><span class="time"><strong id="time">00:00</strong> / ${format(song.duration)}</span></div><div class="right-controls"><button class="button secondary" id="fullscreen">${icon('full')} Fullskjerm</button><button class="button" id="export">${icon('save')} Lag MP4</button></div></section>
  <div id="status" role="status">Laster musikk og skrifttype …</div>
  <section class="settings" aria-label="Visning"><div class="settings-group"><label class="field">Ordmarkering<select id="mode"><option value="fill">Flytende farge</option><option value="ball">Sprettende prikk</option></select></label><label class="field">Bakgrunn<select id="palette"><option value="profile">Profilfarger etter vers</option><option value="#005AA4">Vann · blå</option><option value="#002776">Fjell · mørk blå</option><option value="#F8E9DD">Sand · lys</option><option value="#7EB5D2">Frost · lys blå</option><option value="#D3D3EA">Syrin · lys lilla</option></select></label><label class="field">Forsink tekst (sek.)<input id="offset" type="number" min="-3" max="3" step="0.05" value="0" aria-label="Forsink tekst i sekunder"/></label></div><div class="keyhint"><kbd>Space</kbd> spill / pause &nbsp; <kbd>←</kbd> <kbd>→</kbd> 5 sekunder<br><kbd>F</kbd> fullskjerm &nbsp; <kbd>Esc</kbd> tilbake</div></section>
  <section class="export-panel" id="export-panel" aria-label="Videoeksport"><div class="export-heading"><span id="export-label">Lager video …</span><button class="button secondary" id="cancel">Avbryt</button></div><progress id="export-progress" max="1" value="0"></progress><div id="export-result" class="notice"></div></section>
  <details><summary>Tekst og tidskoder · ${song.cues.length} linjer</summary><div class="lyrics-table"><table><thead><tr><th>Tid</th><th>Del</th><th>Tekst</th></tr></thead><tbody>${song.cues.map(c=>`<tr><td><button data-time="${Math.max(0,c.start-.8)}" aria-label="Hopp til linje ${c.id+1}">${format(c.start)}</button></td><td>${c.section}</td><td>${c.text}</td></tr>`).join('')}</tbody></table></div></details>
  <footer><span>Farger: Vann, Fjell, Sand, Frost og Syrin · <a href="https://design.sparebank1.no/visuell-identitet/farger/" target="_blank" rel="noreferrer">SpareBank 1s fargeprofil</a></span><span>Video: 1920 × 1080 · Teksten er sentrert gjennom hele sangen</span></footer>
</main>`;

const canvas=$<HTMLCanvasElement>('video'),audio=new Audio(`${import.meta.env.BASE_URL}karaoke/serviett-i-nord.mp3`),stage=$('stage');
if(!import.meta.env.DEV)$('export').innerHTML=icon('save')+' Last ned MP4';
const archiveLink=document.createElement('a');archiveLink.href=`${import.meta.env.BASE_URL}afterlight/`;archiveLink.textContent='Se også AFTERLIGHT';document.querySelector('footer')!.append(archiveLink);
audio.preload='auto';
const render=new KaraokeRenderer(canvas,song);
let started=false,exporting=false,cancelled=false;
function updatePlay(){$('play').innerHTML=icon(audio.paused?'play':'pause')+`<span>${audio.paused?'Spill av':'Pause'}</span>`;}
async function play(){try{await audio.play();started=true;stage.classList.add('started');updatePlay();}catch{$('status').textContent='Trykk Spill av for å starte musikken.';}}
function toggle(){if(exporting)return;if(audio.paused)void play();else audio.pause();}
function seek(t:number){if(exporting)return;audio.currentTime=Math.max(0,Math.min(song.duration,t));render.render(audio.currentTime);}
function updateUI(){const t=audio.currentTime;$<HTMLInputElement>('seek').value=String(t);$('time').textContent=format(t);}
$('start').onclick=()=>void play();$('play').onclick=toggle;
$('restart').onclick=()=>{seek(0);void play();};
$<HTMLInputElement>('seek').oninput=e=>seek(Number((e.target as HTMLInputElement).value));
$<HTMLSelectElement>('mode').onchange=e=>{render.mode=(e.target as HTMLSelectElement).value as Mode;};
$<HTMLSelectElement>('palette').onchange=e=>{render.colorMode=(e.target as HTMLSelectElement).value;};
$<HTMLInputElement>('offset').oninput=e=>{render.offset=Math.max(-3,Math.min(3,Number((e.target as HTMLInputElement).value)||0));};
document.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(button=>button.onclick=()=>{seek(Number(button.dataset.time));void play();});
async function full(){try{if(document.fullscreenElement)await document.exitFullscreen();else await stage.requestFullscreen();}catch{$('status').textContent='Fullskjerm støttes ikke i denne nettleseren.';}}
$('fullscreen').onclick=()=>void full();$('stage-exit').onclick=()=>void document.exitFullscreen();
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;if(e.code==='Space'){e.preventDefault();toggle();}if(e.code==='ArrowRight'){e.preventDefault();seek(audio.currentTime+5);}if(e.code==='ArrowLeft'){e.preventDefault();seek(audio.currentTime-5);}if(e.key.toLowerCase()==='f')void full();});
audio.onplay=updatePlay;audio.onpause=updatePlay;audio.onended=()=>{$('status').textContent='Takk for sangen! Trykk Start på nytt for en runde til.';updatePlay();};
audio.oncanplay=()=>{$('status').textContent='Klar til å synge.';};audio.onerror=()=>{$('status').textContent='Lydsporet kunne ikke lastes.';};
await Promise.all([document.fonts.load('86px SB1Medium'),document.fonts.load('16px SB1Regular')]);
render.refresh();
function loop(){requestAnimationFrame(loop);if(!exporting){render.render(audio.currentTime);updateUI();}}
loop();

function progress(value:number,label:string){$<HTMLProgressElement>('export-progress').value=value;$('export-label').textContent=label;}
function setBusy(value:boolean){exporting=value;for(const id of ['start','play','restart','seek','mode','palette','offset','export'])($<HTMLButtonElement>(id)).disabled=value;}
$('cancel').onclick=()=>{cancelled=true;$('export-label').textContent='Avbryter …';};
async function exportVideo(){
  if(!import.meta.env.DEV){const link=document.createElement('a');link.href=`${import.meta.env.BASE_URL}karaoke/serviett-i-nord-karaoke.mp4?v=${song.revision??1}`;link.download='Serviett-i-nord-karaoke.mp4';link.click();$('status').textContent='Laster ned den ferdige 1080p-videoen med flytende ordmarkering.';return;}
  const previous=audio.currentTime,wasPlaying=!audio.paused;audio.pause();cancelled=false;setBusy(true);stage.classList.add('started');
  $('export-panel').classList.add('visible');$('export-result').replaceChildren();$('cancel').hidden=false;
  let encoder:VideoEncoder|undefined;
  try{
    if(!('VideoEncoder' in window))throw new Error('Denne nettleseren støtter ikke rask videoeksport. Åpne spilleren i Chrome eller Edge.');
    const config:VideoEncoderConfig={codec:'avc1.420028',width:1920,height:1080,bitrate:8_000_000,framerate:30,latencyMode:'realtime',hardwareAcceleration:'prefer-hardware',avc:{format:'annexb'}};
    const support=await VideoEncoder.isConfigSupported(config);
    if(!support.supported)throw new Error('H.264-koding støttes ikke her. Åpne den lokale spilleren i Chrome eller Edge.');
    const chunks:ArrayBuffer[]=[];let encodeError:Error|undefined;
    encoder=new VideoEncoder({output(chunk){const bytes=new ArrayBuffer(chunk.byteLength);chunk.copyTo(bytes);chunks.push(bytes);},error(error){encodeError=error;}});
    encoder.configure(config);
    const fps=30,frames=Math.ceil(song.duration*fps);
    for(let frame=0;frame<frames;frame++){
      if(cancelled)throw new Error('Eksporten ble avbrutt.');if(encodeError)throw encodeError;
      render.render(frame/fps);
      const videoFrame=new VideoFrame(canvas,{timestamp:Math.round(frame/fps*1e6),duration:Math.round(1e6/fps)});
      encoder.encode(videoFrame,{keyFrame:frame%60===0});videoFrame.close();
      if(frame%12===0){await encoder.flush();progress(frame/frames*.93,`Lager video · ${Math.round(frame/frames*100)} %`);await new Promise(resolve=>setTimeout(resolve,0));}
    }
    await encoder.flush();encoder.close();encoder=undefined;
    if(cancelled)throw new Error('Eksporten ble avbrutt.');
    progress(.95,'Legger til originalmusikken …');$('cancel').hidden=true;
    const response=await fetch('/api/karaoke/export',{method:'POST',headers:{'Content-Type':'video/h264'},body:new Blob(chunks,{type:'video/h264'})});
    const result=await response.json();if(!response.ok||!result.saved)throw new Error(result.error||'Kunne ikke lagre videoen.');
    progress(1,'Karaokevideoen er klar');
    const message=document.createElement('div');message.textContent=`Lagret: ${result.path}`;$('export-result').append(message);
    const link=document.createElement('a');link.href=result.url;link.download='Serviett-i-nord-karaoke.mp4';link.className='button download';link.textContent='Last ned MP4';$('export-result').append(link);
  }catch(error){progress(0,'Eksporten ble ikke fullført');$('export-result').textContent=error instanceof Error?error.message:String(error);$('export-result').classList.add('error');}
  finally{if(encoder&&encoder.state!=='closed')encoder.close();$('cancel').hidden=true;setBusy(false);audio.currentTime=previous;if(!started)stage.classList.remove('started');if(wasPlaying)void play();}
}
$('export').onclick=()=>void exportVideo();
