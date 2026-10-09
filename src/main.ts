import './style.css';
import {Film,chapters} from './film';
import audioMap from './audio-map.json';
const icons={play:'<path d="m6 3 13 9-13 9Z" fill="currentColor"/>',pause:'<path d="M6 4h4v16H6zm8 0h4v16h-4z" fill="currentColor"/>',volume:'<path d="m11 4-6 5H2v6h3l6 5V4Zm4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/>',expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',replay:'<path d="M4 8a9 9 0 1 1-1 7M4 3v6h6"/>',download:'<path d="M12 2v13m-5-5 5 5 5-5M4 16v5h16v-5"/>'};
const icon=(name:keyof typeof icons)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
document.querySelector('#app')!.innerHTML=`
<main class="shell" id="shell">
  <canvas id="film" aria-label="En soldat i en ødelagt by, animert musikkfilm"></canvas><div class="vignette"></div><div class="grain"></div>
  <header><div class="brand"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m2 19 10-16 10 16H2Z M7 19l5-8 5 8"/></svg> AFTERLIGHT <span style="font-weight:400;color:#8a9b8b;font-size:9px;letter-spacing:.12em">A THREE.JS FILM</span></div><div class="top-meta">ONE SOLDIER. A WORLD IN RUINS.</div><button class="outline" id="cinema">KINOMODUS ↗</button></header>
  <section class="intro"><div class="eyebrow">AN AUDIOREACTIVE SHORT FILM</div><h1>AFTER<br>LIGHT<span style="color:#eead7a">.</span></h1><p>Byen har falt. Maskinene er igjen.<br>Én soldat følger lyset gjennom ruinene.</p><button class="play-film" id="start"><span style="width:14px;display:flex">${icon('play')}</span> SNURR FILM <span style="font-weight:400;opacity:.6">03:44</span></button><div class="loading" id="loading">Laster lydsporet …</div><div class="credits"><span>TRIOMPHE ORCHESTRAL</span><span>•</span><span>GENERATIVE CINEMA / 2026</span></div></section>
  <div class="coordinates">SECTOR 07 / 59° N 10° E &nbsp; — &nbsp; SIGNAL DETECTED</div>
  <div class="story"><div class="story-num" id="chapter-num">01</div><div><div class="story-label" id="chapter-label">EN VERDEN ETTER OSS</div><div class="story-title" id="chapter-title">THE SILENT CITY</div></div></div>
  <div class="status"><span class="dot"></span><span id="status">AUDIOREACTIVE / REALTIME</span></div>
  <section class="player" aria-label="Filmavspiller"><nav class="chapters" aria-label="Scener">${chapters.map((c,i)=>`<button class="chapter ${i===0?'active':''}" data-chapter="${i}" aria-label="Hopp til ${c.title}"><span>0${i+1}</span>${c.title}</button>`).join('')}</nav>
  <div class="timeline"><svg viewBox="0 0 1000 25" preserveAspectRatio="none" aria-hidden="true">${audioMap.energy.filter((_,i)=>i%2===0).map((e,i,a)=>`<line x1="${i/a.length*1000}" x2="${i/a.length*1000}" y1="${12-e*10}" y2="${12+e*10}" stroke="#cbd1b5" stroke-width="1.7"/>`).join('')}</svg><div class="progress-line" id="progress"></div><div class="progress-head" id="head"></div><input id="seek" type="range" min="0" max="${audioMap.duration}" value="0" step="0.1" aria-label="Tidspunkt i filmen"/></div>
  <div class="transport"><div class="transport-left"><button class="icon-button" id="toggle" aria-label="Spill av">${icon('play')}</button><button class="icon-button" id="restart" aria-label="Start på nytt">${icon('replay')}</button><div class="track-name">Triomphe Orchestral <small>ORIGINAL SOUNDTRACK</small></div></div><div class="transport-right"><span class="time"><b id="time">00:00</b> / 03:44</span><button class="icon-button" id="mute" aria-label="Demp lyd">${icon('volume')}</button><input class="volume" id="volume" type="range" min="0" max="1" step="0.01" value="0.8" aria-label="Lydstyrke"/><span class="quality">WEBGL / HD</span><button class="icon-button" id="export" aria-label="Ta opp filmen som WebM" title="Ta opp hele filmen som WebM (3:44)">${icon('download')}</button><button class="icon-button" id="fullscreen" aria-label="Fullskjerm">${icon('expand')}</button><span class="keyhint">SPACE TO PLAY</span></div></div></section>
  <button class="outline exit-cinema" id="exit">AVSLUTT KINOMODUS · ESC</button><div class="toast" id="toast" role="status"></div>
  <div class="end"><div class="eyebrow" style="justify-content:center">THE SIGNAL LIVES ON</div><h2>AFTERLIGHT.</h2><p>Triomphe Orchestral · En film laget med TypeScript og Three.js</p><button class="play-film" id="again">SE FILMEN IGJEN ↻</button></div>
</main>`;
const $=<T extends HTMLElement>(id:string)=>document.getElementById(id) as T;
const shell=$('shell'),canvas=$<HTMLCanvasElement>('film'),seek=$<HTMLInputElement>('seek');
const audio=new Audio(`${import.meta.env.BASE_URL}soundtrack.mp3`);audio.preload='auto';audio.volume=.8;
let film:Film;
try{film=new Film(canvas);}catch(e){$('loading').textContent='WebGL kunne ikke starte. Åpne filmen i en nettleser med maskinvareakselerasjon.';throw e;}
let context:AudioContext|undefined,analyser:AnalyserNode|undefined,source:MediaElementAudioSourceNode|undefined,data:Uint8Array<ArrayBuffer>|undefined;
let started=false,recorder:MediaRecorder|undefined,recordDestination:MediaStreamAudioDestinationNode|undefined,recording=false;
const format=(t:number)=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
function toast(text:string,timeout=5000){$('toast').textContent=text;if(timeout)window.setTimeout(()=>{if($('toast').textContent===text)$('toast').textContent='';},timeout);}
async function setupAudio(){if(!context){context=new AudioContext();source=context.createMediaElementSource(audio);analyser=context.createAnalyser();analyser.fftSize=256;analyser.smoothingTimeConstant=.7;source.connect(analyser);analyser.connect(context.destination);data=new Uint8Array(analyser.frequencyBinCount);}await context.resume();}
async function play(){try{await setupAudio();await audio.play();started=true;shell.classList.add('playing');shell.classList.remove('ended');syncPlay();}catch{toast('Trykk spill av for å starte lyd og film.');}}
function syncPlay(){$('toggle').innerHTML=icon(audio.paused?'play':'pause');$('toggle').setAttribute('aria-label',audio.paused?'Spill av':'Pause');$('status').textContent=recording?'RECORDING / WEBM':audio.paused&&started?'PAUSED / SIGNAL ON HOLD':'AUDIOREACTIVE / REALTIME';}
function toggle(){if(audio.paused)void play();else{audio.pause();syncPlay();}}
function restart(){audio.currentTime=0;shell.classList.remove('ended');void play();}
function jump(time:number){if(recording){toast('Avslutt opptaket før du hopper i filmen.');return;}audio.currentTime=time;started=true;shell.classList.add('playing');shell.classList.remove('ended');updateUI();}
function updateUI(){const t=audio.currentTime;seek.value=String(t);const percent=t/audioMap.duration*100;$('progress').style.width=`${percent}%`;$('head').style.left=`${percent}%`;$('time').textContent=format(t);const index=Math.max(0,chapters.findLastIndex(c=>t>=c.time));$('chapter-num').textContent=`0${index+1}`;$('chapter-title').textContent=chapters[index].title;$('chapter-label').textContent=chapters[index].label.toUpperCase();document.querySelectorAll('.chapter').forEach((el,i)=>el.classList.toggle('active',index===i));}
$('start').onclick=()=>void play();$('toggle').onclick=toggle;$('restart').onclick=restart;$('again').onclick=restart;
seek.addEventListener('input',()=>jump(Number(seek.value)));
document.querySelectorAll<HTMLButtonElement>('[data-chapter]').forEach(el=>el.onclick=()=>{jump(chapters[Number(el.dataset.chapter)].time);void play();});
$<HTMLInputElement>('volume').oninput=()=>{audio.volume=Number($<HTMLInputElement>('volume').value);audio.muted=false;};
$('mute').onclick=()=>{audio.muted=!audio.muted;$('mute').style.opacity=audio.muted?'.35':'1';$('mute').setAttribute('aria-label',audio.muted?'Slå på lyd':'Demp lyd');};
function cinema(value:boolean){shell.classList.toggle('cinema',value);}
$('cinema').onclick=()=>{cinema(true);void play();};$('exit').onclick=()=>cinema(false);
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.requestFullscreen();}catch{toast('Nettleseren støtter ikke fullskjerm her.');}};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.code==='Space'){e.preventDefault();toggle();}if(e.code==='Escape')cinema(false);if(e.code==='ArrowRight')jump(Math.min(audio.duration||audioMap.duration,audio.currentTime+5));if(e.code==='ArrowLeft')jump(Math.max(0,audio.currentTime-5));if(e.key.toLowerCase()==='f')$('fullscreen').click();});
audio.oncanplay=()=>{$('loading').textContent='LYDSPOR KLART · HODETELEFONER ANBEFALES';};
audio.onerror=()=>{$('loading').textContent='Lydfilen kunne ikke lastes.';toast('Lydfilen mangler. Kontroller public/soundtrack.mp3.');};
audio.onended=()=>{if(recording)stopRecording();shell.classList.add('ended');shell.classList.remove('cinema');syncPlay();};
audio.onpause=syncPlay;audio.onplay=syncPlay;
function stopRecording(){if(recorder?.state==='recording')recorder.stop();recording=false;film.setCapture(false);syncPlay();$('export').style.color='';}
async function exportFilm(){
  if(recording){stopRecording();toast('Opptaket er avsluttet og lastes ned.');return;}
  if(!window.MediaRecorder||!canvas.captureStream){toast('Opptak støttes ikke i denne nettleseren. Bruk Chrome eller Edge.');return;}
  try{
    await setupAudio();const mime=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime){toast('Denne nettleseren støtter ikke WebM-opptak.');return;}
    audio.pause();audio.currentTime=0;
    recordDestination??=context!.createMediaStreamDestination();if(source)source.connect(recordDestination);
    film.setCapture(true);film.render(0,true);
    const stream=canvas.captureStream(30);recordDestination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
    const chunks:Blob[]=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000});
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=async()=>{const blob=new Blob(chunks,{type:mime});const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='Afterlight-Triomphe-Orchestral.webm';link.textContent='LAST NED FILMEN';link.className='outline';link.id='saved-film';link.style.cssText='position:absolute;left:42px;top:90px;z-index:10;text-decoration:none';document.getElementById('saved-film')?.remove();shell.append(link);link.click();stream.getVideoTracks().forEach(track=>track.stop());if(source&&recordDestination)source.disconnect(recordDestination);try{const response=await fetch('/api/render',{method:'POST',headers:{'Content-Type':'video/webm'},body:blob});const result=await response.json();toast(result.saved?'1080p-filmen er lagret i prosjektets artifacts-mappe.':'Filmen er klar. Bruk LAST NED FILMEN.');}catch{toast('Filmen er klar. Bruk LAST NED FILMEN.');}};
    recorder.start(1000);recording=true;$('export').style.color='#ffa36b';cinema(true);await play();toast('Tar opp hele filmen med lyd. La fanen være åpen i 3:44. Klikk opptaksknappen igjen for å avslutte.',8000);syncPlay();
  }catch(e){stopRecording();toast(`Opptaket kunne ikke starte: ${e instanceof Error?e.message:String(e)}`);}
}
$('export').onclick=()=>void exportFilm();
let frames=0;
function loop(){requestAnimationFrame(loop);let bass=0;if(analyser&&data){analyser.getByteFrequencyData(data);bass=(data[1]+data[2]+data[3])/765;}film.render(audio.currentTime,started,bass);if(frames++%6===0)updateUI();}
loop();
