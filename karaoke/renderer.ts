import * as THREE from 'three';
import type {Cue,Mode,Song,Word} from './types';
import {cueAt,sectionAt} from './timeline';

export const PALETTE={vann:'#005AA4',fjell:'#002776',frost:'#7EB5D2',sand:'#F8E9DD',syrin:'#D3D3EA',white:'#FFFFFF'};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
type Placed={word:Word;x:number;y:number;width:number};

/** A flat Three.js stage. Everything visible in the video is drawn here. */
export class KaraokeRenderer{
  readonly renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-960,960,540,-540,.1,10);
  private lettering=document.createElement('canvas');
  private ctx:CanvasRenderingContext2D;
  private texture:THREE.CanvasTexture;
  private placements:Placed[]=[];
  private lastCue=-1;
  private currentFont=82;
  private currentDark=true;
  mode:Mode='fill';
  offset=0;
  colorMode='profile';
  constructor(readonly canvas:HTMLCanvasElement,readonly song:Song){
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,alpha:false});
    this.renderer.setSize(1920,1080,false);
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.NoToneMapping;
    this.lettering.width=1920;this.lettering.height=1080;
    this.ctx=this.lettering.getContext('2d',{alpha:true})!;
    this.texture=new THREE.CanvasTexture(this.lettering);this.texture.colorSpace=THREE.SRGBColorSpace;
    this.texture.minFilter=THREE.LinearFilter;this.texture.magFilter=THREE.LinearFilter;this.texture.generateMipmaps=false;
    const text=new THREE.Mesh(new THREE.PlaneGeometry(1920,1080),new THREE.MeshBasicMaterial({map:this.texture,transparent:true,toneMapped:false,depthWrite:false}));
    this.scene.add(text);this.camera.position.z=2;
  }
  cueAt(time:number):Cue|undefined{return cueAt(this.song,time-this.offset);}
  private colorAt(t:number){
    // Vann remains the dominant profile color. Sections change between solid colors.
    if(this.colorMode!=='profile')return this.colorMode;
    const section=sectionAt(this.song,t-this.offset);
    if(section==='Breakdown')return PALETTE.fjell;
    if(section==='Vers 3')return PALETTE.sand;
    if(section==='Før refreng')return PALETTE.fjell;
    return PALETTE.vann;
  }
  private layout(cue:Cue){
    const ctx=this.ctx;let font=86;
    // At most two centered lines, with a deliberate balanced line break.
    let bestRows:Word[][]=[cue.words];
    for(;font>=58;font-=2){
      ctx.font=`${font}px SB1Medium, Arial, sans-serif`;
      const width=(ws:Word[])=>ctx.measureText(ws.map(w=>w.text).join(' ')).width;
      if(width(cue.words)<=1570){bestRows=[cue.words];break;}
      let best=Infinity;
      for(let split=1;split<cue.words.length;split++){
        const first=cue.words.slice(0,split),second=cue.words.slice(split),a=width(first),b=width(second);
        if(Math.max(a,b)>1570)continue;
        const score=Math.abs(a-b)+(first.at(-1)?.text==='–'?0:35);
        if(score<best){best=score;bestRows=[first,second];}
      }
      if(best<Infinity)break;
    }
    this.currentFont=font;
    this.placements=[];
    const gap=ctx.measureText(' ').width;
    const lineHeight=font*1.42;
    bestRows.forEach((row,r)=>{
      const total=row.reduce((sum,w)=>sum+ctx.measureText(w.text).width,0)+gap*(row.length-1);
      let x=(1920-total)/2;
      const y=540+(r-(bestRows.length-1)/2)*lineHeight;
      for(const word of row){const width=ctx.measureText(word.text).width;this.placements.push({word,x,y,width});x+=width+gap;}
    });
    this.lastCue=cue.id;
  }
  render(time:number){
    const cue=this.cueAt(time),t=time-this.offset,ctx=this.ctx;
    if(cue&&cue.id!==this.lastCue)this.layout(cue);
    const bg=this.colorAt(time);
    this.currentDark=![PALETTE.sand,PALETTE.frost,PALETTE.syrin].includes(bg);
    this.scene.background=new THREE.Color(bg);
    ctx.clearRect(0,0,1920,1080);
    if(!cue){this.texture.needsUpdate=true;this.renderer.render(this.scene,this.camera);return undefined;}
    ctx.font=`${this.currentFont}px SB1Medium, Arial, sans-serif`;
    ctx.textBaseline='middle';ctx.textAlign='left';
    const base=this.currentDark?'rgba(255,255,255,.76)':'rgba(0,39,118,.66)';
    const sung=this.currentDark?PALETTE.white:PALETTE.fjell;
    for(const p of this.placements){
      const progress=clamp((t-p.word.start)/Math.max(.08,p.word.end-p.word.start));
      ctx.fillStyle=base;ctx.fillText(p.word.text,p.x,p.y);
      if(progress>0){
        ctx.save();ctx.beginPath();ctx.rect(p.x-2,p.y-this.currentFont, (p.width+4)*progress,this.currentFont*2);ctx.clip();
        if(progress<1&&this.mode==='fill'){
          const ink=ctx.createLinearGradient(p.x,0,p.x+p.width,0);ink.addColorStop(0,sung);ink.addColorStop(1,this.currentDark?PALETTE.sand:PALETTE.vann);ctx.fillStyle=ink;
        }else ctx.fillStyle=sung;
        ctx.fillText(p.word.text,p.x,p.y);ctx.restore();
      }
    }
    if(this.mode==='ball'&&t>=cue.start&&t<=cue.end+.15){
      let index=this.placements.findIndex(p=>t<p.word.end);
      if(index<0)index=this.placements.length-1;
      const p=this.placements[index],next=this.placements[Math.min(index+1,this.placements.length-1)];
      const phase=clamp((t-p.word.start)/Math.max(.1,p.word.end-p.word.start));
      const sameRow=Math.abs(p.y-next.y)<1;
      const x=p.x+p.width/2+(sameRow?(next.x+next.width/2-p.x-p.width/2)*phase:0);
      const y=p.y-this.currentFont*.82-30*Math.sin(Math.PI*phase);
      ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle=this.currentDark?PALETTE.sand:PALETTE.vann;ctx.fill();
    }
    this.texture.needsUpdate=true;this.renderer.render(this.scene,this.camera);
    return cue;
  }
  refresh(){this.lastCue=-1;}
}
