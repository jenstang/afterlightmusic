import * as T from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import map from './audio-map.json';

export const chapters = [
  {time:0, title:'THE SILENT CITY', label:'En verden etter oss'},
  {time:56, title:'FIRST CONTACT', label:'Maskinene våkner'},
  {time:116, title:'UNDER THE ASH', label:'Et øyeblikk av stillhet'},
  {time:151, title:'THE LAST STAND', label:'Ingen vei tilbake'},
  {time:199, title:'AFTERLIGHT', label:'Det finnes fortsatt lys'},
];
const clamp=T.MathUtils.clamp, lerp=T.MathUtils.lerp;
let seed=9127;
function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const material=(color:number,metalness=.15,roughness=.85)=>new T.MeshStandardMaterial({color,metalness,roughness});
const concrete=material(0x4e5550), broken=material(0x697064), dark=material(0x202a28,.5), armor=material(0x5d6651,.5,.6), steel=material(0x465450,.75,.48);
const orange=new T.MeshStandardMaterial({color:0xff7b35,emissive:0xff5a12,emissiveIntensity:5});
const cyan=new T.MeshStandardMaterial({color:0xbdfcf1,emissive:0x64edcb,emissiveIntensity:3});
function box(parent:T.Object3D,w:number,h:number,d:number,mat:T.Material,x=0,y=0,z=0){const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function sphere(parent:T.Object3D,r:number,mat:T.Material,x=0,y=0,z=0){const m=new T.Mesh(new T.IcosahedronGeometry(r,1),mat);m.position.set(x,y,z);parent.add(m);return m;}
type Rig={group:T.Group,legs:T.Group[],arms:T.Group[],head:T.Group,gun:T.Group,eye:T.Mesh};
function character(robot=false):Rig{
  const group=new T.Group(), torso=new T.Group(), head=new T.Group(),gun=new T.Group();group.add(torso);torso.position.y=1.5;
  const mat=robot?steel:armor;
  box(torso,.84,.96,.48,mat);box(torso,.72,.52,.12,dark,0,.08,.29);
  box(torso,.54,.13,.1,robot?orange:cyan,0,.13,.37);
  box(torso,.65,.55,.26,dark,0,.06,-.34);
  torso.add(head);head.position.y=.82;
  sphere(head,.36,mat,0,.07);box(head,.53,.13,.12,dark,0,.08,.29);
  const eye=box(head,.44,.055,.07,robot?orange:cyan,0,.085,.37);
  if(!robot){box(head,.6,.14,.56,mat,0,.29);box(torso,.92,.1,.56,dark,0,-.4);}
  const legs:T.Group[]=[],arms:T.Group[]=[];
  for(const s of [-1,1]){
    const l=new T.Group();l.position.set(s*.25,1.06,0);group.add(l);legs.push(l);
    box(l,.29,.55,.3,mat,0,-.26);sphere(l,.17,dark,0,-.55);box(l,.24,.45,.27,mat,0,-.8);box(l,.3,.2,.5,dark,0,-1,.1);
    const a=new T.Group();a.position.set(s*.58,.29,0);torso.add(a);arms.push(a);
    sphere(a,.25,mat);box(a,.22,.51,.24,mat,0,-.3);sphere(a,.13,dark,0,-.58);box(a,.19,.4,.2,mat,0,-.76);box(a,.2,.18,.22,dark,0,-.96);
  }
  torso.add(gun);gun.position.set(.5,-.26,.5);
  box(gun,.17,.22,.84,dark);box(gun,.1,.12,.52,steel,0,.03,.57);box(gun,.09,.055,.14,robot?orange:cyan,0,.16,.1);
  box(gun,.12,.25,.18,dark,0,-.17,-.08);
  if(robot){box(torso,.16,.58,.12,orange,-.5,.3,-.2);box(torso,.16,.58,.12,orange,.5,.3,-.2);group.scale.setScalar(1.35);}
  else{const scarf=box(torso,.75,.22,.6,material(0xa19b7c),0,.57);scarf.rotation.z=.1;}
  return {group,legs,arms,head,gun,eye};
}

export class Film{
  renderer:T.WebGLRenderer; scene=new T.Scene(); camera=new T.PerspectiveCamera(47,1,.1,550);
  composer:EffectComposer; bloom:UnrealBloomPass; grade:ShaderPass;
  soldier=character();robots:Rig[]=[];sun:T.DirectionalLight;flash=new T.PointLight(0xffa766,0,25);
  ash:T.Points; smoke:T.Points; tracers:T.Mesh[]=[]; bursts:T.Mesh[]=[];drone:T.Group;
  fires:T.PointLight[]=[];lastTime=0;capture=false;
  constructor(canvas:HTMLCanvasElement){
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    this.scene.background=new T.Color(0x889183);this.scene.fog=new T.FogExp2(0x899386,.009);
    this.scene.add(new T.HemisphereLight(0xc7dfc5,0x22291f,2.1));
    this.sun=new T.DirectionalLight(0xffd0a0,3.8);this.sun.position.set(-35,52,-150);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.left=-38;this.sun.shadow.camera.right=38;this.sun.shadow.camera.top=38;this.sun.shadow.camera.bottom=-38;this.sun.shadow.camera.far=130;this.sun.shadow.bias=-.0007;this.scene.add(this.sun,this.sun.target,this.flash);
    this.city();this.scene.add(this.soldier.group);
    for(let i=0;i<7;i++){const rig=character(true);this.robots.push(rig);this.scene.add(rig.group);}
    const dustGeo=new T.BufferGeometry(),dust=new Float32Array(2400*3);
    for(let i=0;i<dust.length;i+=3){dust[i]=(rand()-.5)*130;dust[i+1]=rand()*35;dust[i+2]=-rand()*240;}
    dustGeo.setAttribute('position',new T.BufferAttribute(dust,3));this.ash=new T.Points(dustGeo,new T.PointsMaterial({color:0xe5d9b4,size:.055,transparent:true,opacity:.6,depthWrite:false}));this.scene.add(this.ash);
    const smokeCanvas=document.createElement('canvas');smokeCanvas.width=smokeCanvas.height=64;const ctx=smokeCanvas.getContext('2d')!;const gradient=ctx.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(90,98,84,.4)');gradient.addColorStop(1,'rgba(70,80,66,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    const sg=new T.BufferGeometry(),sp=new Float32Array(100*3);for(let i=0;i<sp.length;i+=3){sp[i]=(rand()-.5)*65;sp[i+1]=rand()*20+2;sp[i+2]=-rand()*230;}
    sg.setAttribute('position',new T.BufferAttribute(sp,3));this.smoke=new T.Points(sg,new T.PointsMaterial({map:new T.CanvasTexture(smokeCanvas),size:23,transparent:true,opacity:.42,depthWrite:false}));this.scene.add(this.smoke);
    for(let i=0;i<18;i++){const m=box(this.scene,.055,.055,1.8,i%2?cyan:orange);m.visible=false;this.tracers.push(m);}
    for(let i=0;i<12;i++){const m=sphere(this.scene,1,orange);m.visible=false;this.bursts.push(m);}
    this.drone=new T.Group();box(this.drone,1,.35,.8,steel);sphere(this.drone,.17,orange,0,0,.5);for(const side of [-1,1]){box(this.drone,2.2,.1,.12,dark,side*.7);const ring=new T.Mesh(new T.TorusGeometry(.55,.07,6,18),steel);ring.rotation.x=Math.PI/2;ring.position.x=side*1.25;this.drone.add(ring);}this.scene.add(this.drone);
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new T.Vector2(800,600),.38,.6,1.1);this.composer.addPass(this.bloom);
    this.grade=new ShaderPass({uniforms:{tDiffuse:{value:null},time:{value:0},fade:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform float fade;varying vec2 vUv;void main(){vec3 c=texture2D(tDiffuse,vUv).rgb;float v=smoothstep(.8,.15,length((vUv-.5)*vec2(1.,.8)));c*=mix(.55,1.,v);float n=fract(sin(dot(vUv+time,vec2(12.9898,78.233)))*43758.5453);c+=(n-.5)*.025;c=mix(c,vec3(.005,.009,.007),fade);gl_FragColor=vec4(c,1.);}`});this.composer.addPass(this.grade);this.composer.addPass(new OutputPass());
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  city(){
    box(this.scene,280,.2,380,material(0x373e36),0,-.2,-145);
    box(this.scene,16,.04,340,material(0x262e29,.25,.7),0,-.07,-140);
    for(let z=12;z>-290;z-=8){box(this.scene,.15,.025,3,material(0xa19b79),0,.001,z);for(const s of [-1,1])box(this.scene,3,.22,8,concrete,s*9,-.03,z);}
    const win=material(0x121e1a,.4,.5);
    for(let side=-1;side<=1;side+=2){for(let row=0;row<17;row++){
      const z=12-row*18, w=8+rand()*7,h=7+rand()*27,x=side*(15+w*.3+rand()*3),d=11+rand()*5;
      const b=new T.Group();b.position.set(x,0,z);this.scene.add(b);
      const shell=box(b,w,h,d,rand()>.5?concrete:broken,0,h/2);shell.rotation.z=side*rand()*.025;
      for(let y=2;y<h-1;y+=3){for(let j=-w/2+1;j<w/2;j+=2.3){if(rand()>.18)box(b,1.05,1.7,.1,win,j,y,d/2+.06);}for(let j=-d/2+1;j<d/2;j+=2.3){if(rand()>.23){box(b,.1,1.7,1.05,win,-side*(w/2+.06),y,j);if(rand()>.8){const shutter=box(b,.13,1.1,1.3,broken,-side*(w/2+.16),y-.5,j);shutter.rotation.x=.3;}}}box(b,w+.2,.16,d+.15,dark,0,y-1.1);}
      for(let k=0;k<5;k++){const part=box(b,1+rand()*3,1+rand()*2,2+rand()*3,concrete,(rand()-.5)*w,h+rand(),(rand()-.5)*d);part.rotation.set(rand()*.5,rand(),rand()*.5);}
      for(let k=0;k<4;k++){const rebar=box(b,.045,2+rand()*4,.045,steel,(rand()-.5)*w,h+1,(rand()-.5)*d);rebar.rotation.z=(rand()-.5)*.8;}
      if(row%3===0){const front=box(b,.1,8,4,concrete,-side*w*.51,3,0);front.rotation.z=side*.18;}
    }}
    // A broken elevated railway frames the entrance, leaving the street open.
    for(const side of [-1,1]){box(this.scene,2.3,15,3,concrete,side*10,7.5,-30);box(this.scene,side<0?13:7,1.4,4,concrete,side<0?-7:9,15,-30);for(let j=0;j<7;j++){const m=box(this.scene,.07,.08,4,steel,side*(4+j),15.75,-30);m.rotation.y=.06*j;}}
    for(let i=0;i<450;i++){const x=(rand()-.5)*90,z=20-rand()*300;if(Math.abs(x)<2)continue;const r=box(this.scene,.2+rand()*1.5,.15+rand()*.9,.3+rand()*1.9,rand()>.4?concrete:dark,x,.1,z);r.rotation.set(rand()*.35,rand()*6,rand()*.5);}
    for(let i=0;i<14;i++){const z=5-i*20,x=(i%2?1:-1)*(4+rand()*3);const car=new T.Group();car.position.set(x,.15,z);car.rotation.y=(rand()-.5)*1.3;this.scene.add(car);box(car,1.9,.7,3.9,material(i%3?0x3a4237:0x785848),0,.55);box(car,1.6,.65,1.8,dark,0,1.16,-.15);for(const s of [-1,1])for(const f of [-1,1]){const tire=new T.Mesh(new T.CylinderGeometry(.36,.36,.2,10),dark);tire.rotation.z=Math.PI/2;tire.position.set(s*.96,.34,f*1.2);car.add(tire);}if(i%3===0){const f=new T.PointLight(0xff762d,10,13,2);f.position.set(x,1,z);this.scene.add(f);this.fires.push(f);for(let k=0;k<3;k++)sphere(car,.25,orange,(rand()-.5),.9+rand()*.6,rand());}}
    for(let i=0;i<15;i++){const z=12-i*19;for(const s of [-1,1]){const pole=new T.Group();pole.position.set(s*8.1,0,z);pole.rotation.z=s*(.05+rand()*.14);this.scene.add(pole);box(pole,.12,6,.12,steel,0,3);box(pole,1.6,.1,.1,steel,-s*.7,6);box(pole,.5,.08,.35,cyan,-s*1.4,5.95);}}
    // Distant monument / evac beacon.
    box(this.scene,1.2,47,1.2,steel,0,23,-275);box(this.scene,.22,19,.22,cyan,0,35,-274.3);
    const sun=new T.Mesh(new T.SphereGeometry(9,24,16),new T.MeshBasicMaterial({color:0xffd6a0}));sun.position.set(-35,32,-280);this.scene.add(sun);
  }
  resize(){const w=this.capture?1920:innerWidth,h=this.capture?1080:innerHeight;this.renderer.setPixelRatio(this.capture?1:Math.min(devicePixelRatio,1.6));this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.composer.setSize(w,h);}
  setCapture(value:boolean){this.capture=value;this.renderer.domElement.style.objectFit=value?'contain':'fill';this.resize();}
  energy(t:number){const index=clamp(t/map.step,0,map.energy.length-1),i=Math.floor(index);return lerp(map.energy[i],map.energy[Math.min(i+1,map.energy.length-1)],index-i);}
  render(t:number,playing:boolean,liveBass=0){
    const energy=this.energy(t),combat=(t>=56&&t<116)||(t>=151&&t<199),end=t>=199;
    const speed=combat?1.2:end?.65:.72;
    // Deterministic poses and effects mean scrubbing always reconstructs the same frame.
    const z=-t*.72,walk=t*speed*5,hero=this.soldier;
    hero.group.position.set(Math.sin(t*.15)*1.7,.04+Math.abs(Math.sin(walk))*.07,z);hero.group.rotation.y=Math.PI+(combat?Math.sin(t*.35)*.45:Math.sin(t*.13)*.12);
    if(t>=116&&t<132){hero.group.position.y=-.4;hero.group.rotation.z=-.12;}
    else hero.group.rotation.z=0;
    hero.legs.forEach((leg,i)=>leg.rotation.x=Math.sin(walk+i*Math.PI)*(combat?.8:.4));
    hero.arms[0].rotation.x=combat?-1.3:Math.sin(walk)*.25-.3;hero.arms[1].rotation.x=combat?-1.45:-.65;
    hero.arms[0].rotation.z=combat?-.28:.1;hero.arms[1].rotation.z=combat?.22:-.1;hero.gun.rotation.x=combat?0:.5;
    hero.head.rotation.y=combat?Math.sin(t*.8)*.25:Math.sin(t*.25)*.3;
    this.robots.forEach((r,i)=>{
      const phase=t*.9+i*1.75,active=combat||t>35&&t<56||t>=132&&t<151;
      r.group.visible=active;
      const defeat=combat&&Math.sin(t*.48+i*2.4)>.78;
      const rz=z-10-(i%3)*7+Math.sin(phase)*3,rx=(i%2?1:-1)*(3+(i%3)*2);
      r.group.position.set(rx,defeat?.4:.05,rz);r.group.rotation.set(defeat?1.35:0,Math.atan2(hero.group.position.x-rx,z-rz),defeat?.35:0);
      r.legs.forEach((leg,j)=>leg.rotation.x=defeat?.1:Math.sin(t*6+i+j*Math.PI)*.6);
      r.arms.forEach(a=>a.rotation.x=-1.4);r.gun.rotation.x=0;
      r.eye.scale.x=.75+energy*.5;
    });
    const shotPhase=(t*3.8)%1,pulse=combat?Math.pow(Math.max(0,1-shotPhase*5),2)*clamp((energy-.35)*2.5,.2,1):0;
    const base=new T.Vector3(hero.group.position.x+.4,1.7,z-1.2);
    this.flash.position.copy(base);this.flash.intensity=pulse*32;
    this.tracers.forEach((m,i)=>{const p=(t*(i%2?2.9:3.8)+i*.187)%1;m.visible=combat&&p<.38;m.position.set(lerp(base.x,(i%2?1:-1)*(3+i%3),p*2),1.6+Math.sin(i)*.4,z-1.5-p*48);m.rotation.set(0,i%2?.15:-.15,.1);m.scale.z=1+energy*2;});
    this.bursts.forEach((m,i)=>{const period=4.2+i*.4,p=(t+i*1.713)%period,life=p/.65;m.visible=combat&&life<1&&energy>.44;m.position.set((i%2?1:-1)*(3+i%4),.5+life*2,z-8-i%3*8);m.scale.setScalar(.08+Math.sin(life*Math.PI)*1.8*energy);});
    this.drone.visible=t>38&&t<205;this.drone.position.set(Math.sin(t*.13)*8,7+Math.sin(t*.4)*1.3,z-14-Math.cos(t*.14)*10);this.drone.rotation.set(Math.sin(t)*.1,t*.25,Math.sin(t*.8)*.12);
    this.ash.position.x=Math.sin(t*.04)*4;this.ash.position.y=-(t*.15)%4;this.smoke.position.x=Math.sin(t*.09)*3;this.smoke.position.y=(t*.16)%3;
    this.fires.forEach((f,i)=>f.intensity=6+Math.sin(t*12+i)*2+energy*6);
    this.sun.target.position.set(0,0,z);this.sun.position.set(-35,52,z-60);
    const dawn=end?clamp((t-199)/23,0,1):0;this.sun.color.setRGB(1,.73+dawn*.13,.48+dawn*.15);this.sun.intensity=3.8+dawn*2;
    const fog=this.scene.fog as T.FogExp2;fog.color.set(0x899386).lerp(new T.Color(0xc2b496),dawn*.65);this.scene.background=(fog.color.clone());fog.density=.009-dawn*.002;
    let pos:T.Vector3,look:T.Vector3;const shot=Math.floor(t/(combat?5.8:13))%5;
    if(!playing&&t===0){pos=new T.Vector3(9,4.6,15);look=new T.Vector3(-2.2,4,-30);this.camera.fov=48;}
    else if(combat){
      const phase=t%5.8/5.8;
      if(shot===0){pos=new T.Vector3(hero.group.position.x+3.6,2.3,z+5.8-phase*2);look=new T.Vector3(0,1.6,z-9);}
      else if(shot===1){pos=new T.Vector3(-7,1.3,z-5);look=hero.group.position.clone().add(new T.Vector3(0,1.45,0));}
      else if(shot===2){pos=new T.Vector3(Math.sin(t*.24)*15,14,z+7);look=new T.Vector3(0,1,z-10);}
      else if(shot===3){pos=new T.Vector3(1.8,1.9,z+2.7);look=new T.Vector3(-3,1.6,z-15);}
      else{pos=new T.Vector3(-5+phase*5,.65,z-13);look=new T.Vector3(0,1.6,z);}
      this.camera.fov=shot===2?52:58;const shake=(energy*.55+liveBass*.3)*pulse;pos.x+=Math.sin(t*91)*shake;pos.y+=Math.cos(t*77)*shake*.6;
    }else{
      const phase=t%13/13;
      if(t>=116&&t<132){pos=new T.Vector3(2.6,1.7,z+3);look=hero.group.position.clone().add(new T.Vector3(0,1.5,0));}
      else if(end){pos=new T.Vector3(8-dawn*5,4+dawn*10,z+9+dawn*15);look=new T.Vector3(0,5+dawn*8,z-50);}
      else if(shot===0){pos=new T.Vector3(7-phase*2,3.5,z+10);look=new T.Vector3(0,3,z-22);}
      else if(shot===1){pos=new T.Vector3(-6,1.8,z+4-phase*2);look=hero.group.position.clone().add(new T.Vector3(0,1.7,-.5));}
      else if(shot===2){pos=new T.Vector3(13,15+phase*3,z+18);look=new T.Vector3(0,1,z-15);}
      else if(shot===3){pos=new T.Vector3(-3+phase*6,.65,z-7);look=new T.Vector3(hero.group.position.x,1.8,z);}
      else{pos=new T.Vector3(0,2.8,z+6);look=new T.Vector3(0,5,z-45);}
      this.camera.fov=shot===1?44:49;
    }
    this.camera.position.copy(pos);this.camera.lookAt(look);this.camera.updateProjectionMatrix();
    this.bloom.strength=.3+energy*.25+pulse*.18;this.grade.uniforms.time.value=t;
    this.grade.uniforms.fade.value=playing?Math.max(clamp(1-t/2,0,1),clamp((t-(map.duration-3))/3,0,1)):0;
    this.composer.render();this.lastTime=t;
  }
}
