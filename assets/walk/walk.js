import * as T from './vendor/three.module.min.js';
import {ground,makeVillage,sites} from './model.js?v=school-photo';
import {addVillagers} from './villagers.js?v=school-photo';
import {addAnimals} from './animals.js?v=school-photo';

const $=id=>document.getElementById(id);
const canvas=$('view'),world=$('world'),notes=$('notes');
$('sources').onclick=()=>notes.showModal();
$('close').onclick=()=>notes.close();

const music=$('walk-music'), musicButton=$('music-toggle');
music.volume=.55;
function showMusicState(){
  const playing=!music.paused;
  musicButton.setAttribute('aria-pressed',String(playing));
  $('music-state').textContent=playing?'音乐开':'音乐关';
}
music.addEventListener('playing',showMusicState);
music.addEventListener('pause',showMusicState);
musicButton.addEventListener('click',async()=>{
  if(!music.paused){music.pause();return;}
  try{await music.play();}
  catch(error){
    if(error.name!=='AbortError')$('music-state').textContent='重试音乐';
  }
});
window.addEventListener('pagehide',()=>music.pause());

function start(){
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;
  renderer.shadowMap.needsUpdate=true;
  const scene=new T.Scene();
  scene.add(new T.HemisphereLight('#fff7df','#b3a58b',1.72));
  const sun=new T.DirectionalLight('#fff1d3',2.0);
  sun.position.set(-90,130,60);sun.castShadow=true;
  Object.assign(sun.shadow.camera,{left:-119,right:119,top:92,bottom:-92,near:.5,far:360});
  sun.shadow.camera.updateProjectionMatrix();sun.shadow.mapSize.set(2048,2048);
  sun.shadow.normalBias=.045;sun.shadow.bias=-.00022;scene.add(sun);
  const {canStand,doors,roomAt}=makeVillage(scene);
  const animateVillagers=addVillagers(scene), animateAnimals=addAnimals(scene);
  const floor=new T.Mesh(new T.PlaneGeometry(1500,1500),new T.ShadowMaterial({opacity:.18}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-8;floor.receiveShadow=true;scene.add(floor);
  const horizon=new T.Group();
  const distantGround=new T.Mesh(new T.PlaneGeometry(1800,1800),new T.MeshLambertMaterial({color:'#b9ae89'}));
  distantGround.rotation.x=-Math.PI/2;distantGround.position.y=-7;horizon.add(distantGround);
  for(let i=0;i<40;i++){
    const a=i/40*Math.PI*2;
    const hill=new T.Mesh(new T.IcosahedronGeometry(1,1),new T.MeshLambertMaterial({color:i%2?'#909c80':'#a2a68c',flatShading:true}));
    hill.position.set(290*Math.cos(a),-19,290*Math.sin(a));hill.scale.set(60+i%4*7,25+(i*7)%18,65);horizon.add(hill);
  }
  const sky=new T.Mesh(new T.SphereGeometry(590,48,24),new T.ShaderMaterial({
    side:T.BackSide,depthWrite:false,
    vertexShader:'varying vec3 dir; void main(){dir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 dir;void main(){vec3 d=normalize(dir);
      float t=smoothstep(-.05,.62,d.y);vec3 c=mix(vec3(.82,.83,.73),vec3(.36,.58,.72),t);
      float glow=pow(max(dot(d,normalize(vec3(-.65,.44,.41))),0.),12.);
      gl_FragColor=vec4(c+vec3(.15,.085,.025)*glow,1.);
      #include <colorspace_fragment>
    }`
  }));horizon.add(sky);
  horizon.visible=false;scene.add(horizon);
  const skyTone=new T.Color('#d7e1d9');
  const orbit=new T.OrthographicCamera(-100,100,60,-60,.1,950);
  const eye=new T.PerspectiveCamera(68,1,.08,700);
  eye.rotation.order='YXZ';
  const position=new T.Vector3(),target=new T.Vector3(-6,0,0);
  let mode='overview',az=-.53,elevation=.65,zoom=1,yaw=0,pitch=0,last=0,dirty=true;
  const held=new Set(),touchKeys=new Set(),pointers=new Map();
  const pins=Object.entries(sites).filter(([id])=>!['meal','school','classroom','neighbors'].includes(id)).map(([id,site])=>{
    const button=document.createElement('button');
    button.type='button';button.className='pin';button.textContent=site.name;button.ariaLabel='步行前往'+site.name;
    world.insertBefore(button,world.querySelector('.identity'));
    button.onclick=()=>jump(id);
    // Anchor labels to separate architectural features.
    const x=site.x;
    const z=id==='court'?-19:id==='cave'?0:site.z;
    return {button,point:new T.Vector3(x,ground(x,z)+(id==='cave'?6:4),z)};
  });
  function resize(){
    const w=world.clientWidth,h=world.clientHeight;
    renderer.setSize(w,h,false);
    const aspect=w/h;
    const half=Math.max(47,112/aspect);
    orbit.left=-half*aspect;orbit.right=half*aspect;orbit.top=half;orbit.bottom=-half;orbit.updateProjectionMatrix();
    eye.aspect=aspect;eye.updateProjectionMatrix();dirty=true;
  }
  new ResizeObserver(resize).observe(world);
  const doorButton=$('door-action');
  let nearby=null;
  function useDoor(){
    if(mode!=='walk'||!nearby)return;
    nearby.open=!nearby.open;dirty=true;
    canvas.focus({preventScroll:true});
  }
  doorButton.onclick=useDoor;
  function updateCamera(){
    const walking=mode==='walk';
    if(walking){
      const room=roomAt(position.x,position.z);
      eye.position.set(position.x,(room?.floorY??ground(position.x,position.z))+1.64,position.z);
      nearby=doors.closest(position.x,position.z);
      if(nearby)doorButton.textContent=(nearby.open?'关门':'开门')+' · '+nearby.name;
      eye.rotation.set(pitch,yaw,0,'YXZ');
    }else{
      orbit.zoom=zoom;orbit.updateProjectionMatrix();
      const r=230*Math.cos(elevation);
      orbit.position.set(target.x+r*Math.sin(az),target.y+230*Math.sin(elevation),target.z+r*Math.cos(az));
      orbit.lookAt(target);orbit.updateMatrixWorld();
      for(const pin of pins){
        const pt=pin.point.clone().project(orbit);
        const x=(pt.x+1)*world.clientWidth/2,y=(-pt.y+1)*world.clientHeight/2-10;
        pin.button.hidden=x<15||x>world.clientWidth-15||y<100||y>world.clientHeight-80;
        pin.button.style.left=x+'px';pin.button.style.top=y+'px';
      }
    }
    doorButton.hidden=!walking||!nearby;
    $('needle').style.transform='rotate('+((walking?yaw:az)*180/Math.PI)+'deg)';
    renderer.render(scene,walking?eye:orbit);
  }
  function setMode(value){
    mode=value;world.dataset.mode=mode;held.clear();touchKeys.clear();pointers.clear();
    const walking=mode==='walk';
    horizon.visible=walking;floor.visible=!walking;
    scene.fog=walking?new T.FogExp2(skyTone,.006):null;
    scene.background=walking?skyTone:null;
    $('walk').setAttribute('aria-pressed',String(walking));$('overview').setAttribute('aria-pressed',String(!walking));
    $('hint').textContent=walking?(matchMedia('(pointer:coarse)').matches?'按方向键行走 · 长按左转或右转':'方向键 / WASD 行走 · Q / E 转向 · 拖动环看'):'拖动环看 · 滚轮或双指缩放';
    pins.forEach(p=>p.button.hidden=walking);dirty=true;
    canvas.focus({preventScroll:true});
  }
  function jump(id){
    const site=sites[id];$('location').value=id;
    position.set(site.x,0,site.z);yaw=Math.atan2(site.x-site.aim[0],site.z-site.aim[1]);pitch=id==='meal'?-.16:id==='court'||id==='classroom'?-.12:id==='neighbors'?-.09:id==='school'?.14:.035;
    setMode('walk');$('place').textContent=site.name;
  }
  $('visit').onclick=()=>jump($('location').value);
  $('walk').onclick=()=>{if(mode!=='walk')jump($('location').value);};
  $('overview').onclick=()=>{
    az=-.53;elevation=.65;zoom=1;setMode('overview');$('place').textContent='十九世纪 · 韩家旧村';
  };
  const bound=T.MathUtils.clamp;
  const keys=new Set(['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown','q','e','r','f','+','=','-','shift']);
  window.addEventListener('keydown',e=>{
    if(notes.open||['SELECT','INPUT','TEXTAREA'].includes(document.activeElement?.tagName)||e.metaKey||e.ctrlKey||e.altKey)return;
    if(e.code==='Space' && mode==='walk' && document.activeElement===canvas && nearby){
      e.preventDefault();if(!e.repeat)useDoor();return;
    }
    const key=e.key.toLowerCase();if(keys.has(key)){held.add(key);e.preventDefault();}
  });
  window.addEventListener('keyup',e=>held.delete(e.key.toLowerCase()));
  function release(){held.clear();touchKeys.clear();pointers.clear();}
  window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
  $('sources').addEventListener('click',release);
  for(const btn of document.querySelectorAll('[data-move]')){
    btn.addEventListener('pointerdown',e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);touchKeys.add(btn.dataset.move);
      if(mode==='walk' && ['q','e'].includes(btn.dataset.move)){
        yaw+=(btn.dataset.move==='q'?1:-1)*Math.PI/24;dirty=true;
      }});
    btn.addEventListener('lostpointercapture',()=>touchKeys.delete(btn.dataset.move));
    btn.onclick=e=>{if(e.detail===0&&mode==='walk'){touchKeys.add(btn.dataset.move);move(.12);touchKeys.delete(btn.dataset.move);dirty=true;}};
  }
  canvas.addEventListener('pointerdown',e=>{canvas.focus();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);});
  canvas.addEventListener('lostpointercapture',e=>pointers.delete(e.pointerId));
  const span=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a[0]-b[0],a[1]-b[1]);};
  canvas.addEventListener('pointermove',e=>{
    const prev=pointers.get(e.pointerId);if(!prev)return;
    const pinch=pointers.size===2&&mode==='overview',before=pinch?span():0;
    const dx=e.clientX-prev[0],dy=e.clientY-prev[1];
    pointers.set(e.pointerId,[e.clientX,e.clientY]);
    if(pinch&&before>1){zoom=bound(zoom*span()/before,.65,3.4);}
    else if(mode==='overview'){az-=dx*.006;elevation=bound(elevation+dy*.005,.23,1.48);}
    else{yaw-=dx*.005;pitch=bound(pitch-dy*.004,-1.15,1.15);}
    dirty=true;
  });
  canvas.addEventListener('wheel',e=>{
    if(mode!=='overview')return;e.preventDefault();zoom=bound(zoom*Math.exp(-bound(e.deltaY,-200,200)*.0018),.65,3.4);dirty=true;
  },{passive:false});
  const down=k=>held.has(k)||touchKeys.has(k)?1:0;
  function move(dt){
    if(mode==='overview'){
      const turn=down('arrowleft')-down('arrowright'),tilt=down('arrowup')-down('arrowdown');
      az+=turn*dt*1.3;elevation=bound(elevation+tilt*dt,.23,1.48);
      zoom=bound(zoom*Math.exp((down('+')+down('=')-down('-'))*dt),.65,3.4);return;
    }
    yaw+=(down('q')-down('e'))*dt*1.65;
    pitch=bound(pitch+(down('r')-down('f'))*dt*1.2,-1.15,1.15);
    const f=Math.max(down('w'),down('arrowup'))-Math.max(down('s'),down('arrowdown'));
    const r=Math.max(down('d'),down('arrowright'))-Math.max(down('a'),down('arrowleft'));
    const mag=Math.max(1,Math.hypot(f,r)),v=(held.has('shift')?9:5.4)*dt/mag;
    const dx=(r*Math.cos(yaw)-f*Math.sin(yaw))*v,dz=(-f*Math.cos(yaw)-r*Math.sin(yaw))*v;
    if(canStand(position.x+dx,position.z))position.x+=dx;
    if(canStand(position.x,position.z+dz))position.z+=dz;
    const {x,z}=position;
    const room=roomAt(x,z);
    $('place').textContent=room?room.name:Math.abs(z)>28?'村旁田畴':x< -77?'老门以西 · 窑院车路':x< -68?'老门上':Math.abs(z)<4?'囤庄住宅街道':Math.abs(z)<24&&x<75?'囤庄四合院':'村旁田畴';
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  let villageTime=0,lastPose=-Infinity;
  function frame(now){
    const dt=Math.min(.05,(now-last)/1000);last=now;
    let animated=false;
    if(!notes.open&&!document.hidden){
      if(held.size||touchKeys.size){move(dt);dirty=true;}
      if(doors.update(reducedMotion.matches?1:dt,mode==='walk'?position:null))dirty=true;
      if(!reducedMotion.matches){
        villageTime+=dt;
        if(now-lastPose>=(mode==='walk'?42:125)){
          animateVillagers(villageTime);animateAnimals(villageTime);lastPose=now;animated=true;
        }
      }
    }
    if(dirty){updateCamera();dirty=false;}
    else if(animated){renderer.render(scene,mode==='walk'?eye:orbit);}
    requestAnimationFrame(frame);
  }
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').textContent='三维画面已中断，请刷新页面重新进入。';});
  const entry=location.hash.slice(1);
  if(Object.hasOwn(sites,entry))jump(entry);
  resize();updateCamera();$('loading').textContent='';requestAnimationFrame(frame);
}
try{start();}catch(err){
  console.error(err);
  $('loading').textContent='当前浏览器未能载入三维画面。请启用硬件加速，或使用支持 WebGL 2 的浏览器。仍可查看右上角的复原依据。';
  document.querySelector('.controls').hidden=true;
}
