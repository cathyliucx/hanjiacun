import * as T from './vendor/three.module.min.js';
import {ground,school} from './model.js?v=school-photo';

// Two neighbouring yards share a lane. Straight sections through the narrow
// gates keep baskets clear of the posts; bends and stops happen in open space.
function courtyardVisit(x, side, speed, offset){
  const points=[
    [-.4,15.7], [0,9], [0,5.8], [0,3.4], [.45,2.1], [2,1.35],
    [10,1.35], [11.55,2.1], [12,3.4], [12,5.8], [12,9], [12.65,15.6]
  ].map(([dx,depth])=>new T.Vector3(x+dx,0,side*depth));
  return walkRoute(points,speed,offset,(point)=>{
    const depth=side*point.z, yardX=point.x<x+6?x:x+12;
    const yardFloor=ground(yardX,side*13.4)+.105;
    const streetFloor=ground(point.x,point.z)+.09;
    const surface=T.MathUtils.lerp(streetFloor,Math.max(ground(point.x,point.z),yardFloor),
      T.MathUtils.smoothstep(depth,3.4,4.4));
    return surface+.105*(1-T.MathUtils.smoothstep(Math.abs(depth-4.1),.23,.62));
  });
}
function walkRoute(points,speed,offset,floorAt){
  const path=new T.CatmullRomCurve3(points);
  const duration=path.getLength()/speed, pause=3.4;
  const point=new T.Vector3(), tangent=new T.Vector3();
  return (root,time)=>{
    const leg=duration+pause, clock=(time+offset)%(2*leg);
    const returning=clock>=leg, elapsed=clock%leg;
    const progress=Math.min(elapsed/duration,1);
    const u=returning?1-progress:progress;
    path.getPointAt(u,point);path.getTangentAt(u,tangent);
    const turn=T.MathUtils.smoothstep(elapsed-duration,.8,pause-.3);
    root.rotation.y=Math.atan2(tangent.x,tangent.z)+(Number(returning)+turn)*Math.PI;
    root.position.set(point.x,floorAt(point),point.z);
    // Ease the stride into and out of the pause at each doorstep.
    return T.MathUtils.smoothstep(elapsed,0,.32)*(1-T.MathUtils.smoothstep(elapsed,duration-.32,duration));
  };
}

// The residents face local +Z. A shared set of instanced meshes draws the whole cast.
export function addVillagers(scene) {
  const sphere=new T.SphereGeometry(.5,12,8);
  const cylinder=new T.CylinderGeometry(.5,.5,1,10);
  const coat=new T.CylinderGeometry(.39,.52,1,10);
  const cone=new T.ConeGeometry(.5,1,14);
  const box=new T.BoxGeometry();
  const batches=new Map(), poses=[];
  const material=new T.MeshLambertMaterial({flatShading:true});
  const up=new T.Vector3(0,1,0),axis=new T.Vector3();
  function joint(parent,x,y,z){
    const pivot=new T.Group();pivot.position.set(x,y,z);parent.add(pivot);return pivot;
  }
  const frame=new T.Group();
  function part(parent,geo,color,x,y,z,w,h,d){
    const node=joint(parent,x,y,z);
    node.scale.set(w,h,d);
    if(!batches.has(geo))batches.set(geo,[]);
    batches.get(geo).push({node,color});
    return node;
  }
  function rod(parent,color,a,b,width){
    axis.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const n=part(parent,cylinder,color,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,width,axis.length(),width);
    n.quaternion.setFromUnitVectors(up,axis.normalize());return n;
  }
  const wood='#70523b',skin='#d3a17d',hair='#393633',shoe='#373431';
  function resident({x,z,angle,shirt,trousers,job,phase=0,hat=false,scale=1,visit=null}){
    const root=joint(frame,x,ground(x,z)+.10,z);
    const seated=job==='sort', sifting=job==='sift';
    if(job==='sweep'||seated||sifting){
      const centerX=-63+12*Math.round((x+63)/12);
      root.position.y=Math.max(ground(x,z),ground(centerX,Math.sign(z)*13.4)+.105);
    }
    root.rotation.y=angle;root.scale.setScalar(scale);
    const waist=joint(root,0,.83,0);
    part(waist,coat,shirt,0,.26,0,.54,.65,.38);
    part(waist,cylinder,'#5d5143',0,.095,0,.51,.065,.365);
    rod(waist,'#b3a58c',[-.02,.54,.147],[.15,.35,.169],.025);
    const head=joint(waist,0,.66,0);
    part(head,sphere,skin,0,.087,0,.32,.38,.30);
    part(head,sphere,hair,0,.19,-.017,.326,.225,.31);
    for(const s of [-1,1])part(head,sphere,'#45382e',s*.068,.103,.131,.029,.021,.02);
    part(head,sphere,skin,0,.074,.152,.062,.07,.06);
    if(hat){
      part(head,cone,'#cda76e',0,.278,0,.65,.215,.65);
      part(head,cylinder,'#9f7b4c',0,.174,0,.65,.027,.65);
    }else{
      part(head,sphere,hair,0,.16,-.147,.15,.14,.14);
    }
    const arms=[],legs=[];
    for(const side of [-1,1]){
      const shoulder=joint(waist,.208*side,.49,0);
      part(shoulder,coat,shirt,0,-.14,0,.173,.30,.17);
      const elbow=joint(shoulder,0,-.275,0);
      part(elbow,cylinder,shirt,0,-.12,0,.132,.25,.14);
      part(elbow,sphere,skin,0,-.275,0,.12,.142,.12);
      arms.push({shoulder,elbow});
      const hip=joint(root,side*.13,.84,0);
      part(hip,coat,trousers,0,-.19,0,.21,.42,.215);
      const knee=joint(hip,0,-.38,0);
      part(knee,cylinder,trousers,0,-.18,0,.155,.375,.17);
      part(knee,sphere,shoe,0,-.375,.046,.18,.14,.30);
      legs.push({hip,knee});
    }
    const hand=joint(arms[1].elbow,0,-.27,0);
    let tool;
    if(job==='hoe'||job==='sweep'){
      tool=joint(hand,0,0,0);
      rod(tool,wood,[0,-1.03,0],[0,.41,0],.048);
      if(job==='hoe'){
        part(tool,box,'#626462',0,-1.045,.12,.23,.06,.31);
      }else{
        for(let i=-3;i<=3;i++)rod(tool,'#b79859',[i*.023,-.80,0],[i*.054,-1.16,.025],.058);
        part(tool,box,wood,0,-.87,0,.21,.036,.09);
      }
    }else if(job==='carry'){
      const basket=joint(hand,0,-.30,0);
      part(basket,coat,'#bb9157',0,-.02,0,.42,.26,.38);
      part(basket,cylinder,'#735840',0,.115,0,.35,.018,.32);
      for(const s of [-1,1])rod(basket,wood,[s*.17,.12,0],[0,.31,0],.025);
    }
    if(job==='pupil'){
      // A cloth book bag rides on the hip rather than swinging through the desks.
      part(waist,box,'#927857',-.256,.11,0,.13,.27,.24);
      rod(waist,'#7c6149',[.12,.50,.15],[-.24,.13,.12],.038);
    }
    if(job==='chat'||job==='chat-seated'){
      part(head,sphere,hair,0,.13,-.17,.18,.18,.18);
      part(waist,coat,shirt,0,.08,0,.58,.34,.41);
      if(job==='chat-seated'){
        waist.position.y=.49;
        legs.forEach(({hip,knee})=>{hip.position.y=.49;hip.rotation.x=-1.43;knee.rotation.x=1.46;});
        part(root,box,wood,0,.405,0,.53,.09,.43);
        for(const dx of [-.18,.18])for(const dz of [-.14,.14])
          part(root,box,wood,dx,.19,dz,.073,.38,.073);
      }
    }
    let sieve, greens, riceBowl;
    if(seated){
      // A low stool, with the seated thighs horizontal and shins below the knees.
      waist.position.y=.49;
      legs.forEach(({hip,knee})=>{
        hip.position.y=.49;hip.rotation.x=-1.45;knee.rotation.x=1.45;
      });
      part(root,box,wood,0,.425,0,.51,.09,.45);
      for(const dx of [-.18,.18])for(const dz of [-.15,.15])
        part(root,box,wood,dx,.21,dz,.07,.42,.07);
      const tray=joint(root,.02,.71,.54);
      part(tray,cylinder,'#ad824d',0,0,0,.72,.10,.53);
      for(let i=0;i<9;i++){
        const leaf=part(tray,sphere,i%2?'#637e44':'#899744',
          Math.sin(i*2)*.19,.075,Math.cos(i*2)*.14,.11,.06,.22);
        leaf.rotation.y=i*.72;
      }
      part(root,coat,'#a78254',.52,.18,.46,.42,.31,.4);
      greens=part(hand,sphere,'#6f893d',0,-.07,.02,.11,.09,.23);
    }else if(job==='study'){
      root.position.y=school.floorY;
      waist.position.y=.51;
      legs.forEach(({hip,knee})=>{
        hip.position.y=.51;hip.rotation.x=-1.40;knee.rotation.x=1.48;
      });
      rod(hand,wood,[0,-.04,0],[0,.10,-.08],.015);
    }else if(job==='eat'){
      // Seated on the kang with folded legs; the low table stands between diners.
      const center=-63+12*Math.round((x+63)/12);
      root.position.y=ground(center,Math.sign(z)*13.4)+.24+.72;
      waist.position.y=.16;
      legs.forEach(({hip,knee},i)=>{
        hip.position.y=.16;hip.rotation.x=-1.43;hip.rotation.z=(i?1:-1)*.79;
        knee.rotation.x=1.8;knee.rotation.z=(i?-1:1)*.94;
      });
      const left=joint(arms[0].elbow,0,-.27,0);
      riceBowl=joint(left,0,-.025,.035);
      part(riceBowl,cone,'#d4bd99',0,0,0,.24,.14,.24).rotation.z=Math.PI;
      part(riceBowl,sphere,'#f0debd',0,.065,0,.205,.055,.205);
      for(const dx of [-.017,.017])
        rod(hand,wood,[dx,0,-.025],[dx*.55,-.07,.21],.018);
    }else if(sifting){
      // The bamboo rim and grain move together while the collection basket stays put.
      sieve=joint(root,0,1.02,.46);
      part(sieve,cylinder,'#ad8050',0,0,0,.78,.11,.65);
      part(sieve,cylinder,'#ddbf76',0,.057,0,.69,.015,.56);
      for(let i=0;i<15;i++)part(sieve,sphere,'#bb964d',
        Math.sin(i*2.4)*(.07+i*.014),.074,Math.cos(i*2.4)*(.05+i*.011),.034,.019,.027);
      part(root,coat,'#a07c50',0,.23,.53,.62,.42,.57);
      part(root,cylinder,'#d8b777',0,.445,.53,.48,.018,.44);
    }
    // A soft contact mark follows the feet without recomputing village shadow maps.
    part(root,sphere,'#a79578',0,.012,0,.60,.016,.36);
    poses.push(time=>{
      const cycle=time*(job==='hoe'?1.85:job==='sweep'?2.1:1.55)+phase;
      const wave=Math.sin(cycle);
      if(job==='carry'||visit){
        let walking=1;
        if(visit){
          walking=visit(root,time);
          head.rotation.y=.32*(1-walking)*Math.sin(cycle);
          arms[0].elbow.rotation.x=-.8*(1-walking);
        }else{
          // Walk a rounded loop along the lane, including a short turn at either end.
          const t=time*.16+phase, dx=6.3*Math.cos(t),dz=.47*Math.sin(t);
          root.position.x=x+6.3*Math.sin(t);root.position.z=z-.47*Math.cos(t);
          root.position.y=ground(root.position.x,root.position.z)+.10;
          root.rotation.y=Math.atan2(dx,dz);
        }
        const step=Math.sin(time*4.8+phase)*walking;
        legs.forEach(({hip,knee},i)=>{const stride=(i?1:-1)*step;hip.rotation.x=.40*stride;knee.rotation.x=.32*Math.max(0,-stride);});
        arms[0].shoulder.rotation.x=.32*step;arms[1].shoulder.rotation.x=-.12-.07*step;
        waist.position.y=.84+.025*walking*Math.cos(time*9.6+phase);
      }else if(job==='chat'||job==='chat-seated'){
        // Take turns talking; listeners turn their heads and occasionally nod.
        const beat=(time+phase)%12, speaking=beat<3;
        const gesture=speaking?Math.sin(Math.PI*beat/3):0;
        head.rotation.y=.20*Math.sin(time*.7+phase);
        head.rotation.x=speaking?.03*wave:.09*Math.sin(time*2+phase);
        waist.rotation.y=.09*Math.cos(time*.8+phase);
        arms[1].shoulder.rotation.x=-.19-.65*gesture;
        arms[1].elbow.rotation.x=-.45-.88*gesture;
        arms[1].shoulder.rotation.z=.12+.26*gesture;
        arms[0].elbow.rotation.x=job==='chat-seated'?-1.0:-.24;
      }else if(job==='study'){
        waist.rotation.x=.18;head.rotation.x=.12+.08*wave;
        arms[0].shoulder.rotation.x=-.67;arms[0].elbow.rotation.x=-.75;
        arms[1].shoulder.rotation.x=-.75;arms[1].elbow.rotation.x=-.70+.09*wave;
        arms[1].shoulder.rotation.z=.09*Math.sin(time*2.9+phase);
      }else if(job==='eat'){
        const bite=(1+wave)*.5;
        waist.rotation.x=.08+.10*(1-bite);
        head.rotation.x=.11+.12*(1-bite);
        arms[0].shoulder.rotation.x=-.59;arms[0].elbow.rotation.x=-1.75;
        riceBowl.rotation.x=2.34-waist.rotation.x;
        arms[1].shoulder.rotation.x=-.70-.28*bite;
        arms[1].shoulder.rotation.z=-.12-.19*bite;
        arms[1].elbow.rotation.x=-.72-1.64*bite;
      }else if(seated){
        const pick=(1+wave)*.5;
        waist.rotation.x=.15+.12*pick;
        head.rotation.x=.24+.13*pick;
        arms[0].shoulder.rotation.x=-.53;
        arms[0].elbow.rotation.x=-.93;
        arms[1].shoulder.rotation.x=-.66+.21*pick;
        arms[1].shoulder.rotation.z=.12+.24*pick;
        arms[1].elbow.rotation.x=-.72-.52*pick;
        greens.rotation.y=.55*wave;
      }else if(sifting){
        const shake=Math.sin(time*4+phase);
        const lift=Math.cos(time*4+phase);
        sieve.position.x=.085*shake;
        sieve.position.y=1.02+.033*lift;
        sieve.rotation.z=.07*shake;
        waist.rotation.y=.08*shake;head.rotation.x=.15;
        arms.forEach(({shoulder,elbow},i)=>{
          shoulder.rotation.x=-.50-.06*lift;
          shoulder.rotation.z=(i?1:-1)*.13+.16*shake;
          elbow.rotation.x=-.84-.08*lift;
        });
      }else if(job==='hoe'||job==='sweep'){
        const hoe=job==='hoe';
        waist.rotation.x=(hoe?.34:.16)+(hoe?.24:.06)*wave;
        waist.rotation.y=(hoe?.08:.31)*Math.cos(cycle);
        arms.forEach(({shoulder,elbow},i)=>{
          shoulder.rotation.x=(i?-.67:-.43)+(hoe?.47:.14)*wave;
          shoulder.rotation.z=i?-.14:.30;
          elbow.rotation.x=(i?-.48:-.74)+.12*wave;
        });
        const grip=arms[1];
        const stroke=hoe ? -.66+.20*wave : -.52;
        tool.rotation.x=stroke-waist.rotation.x-grip.shoulder.rotation.x-grip.elbow.rotation.x;
        head.rotation.x=.09+.08*wave;
      }else{
        const gesture=(1+wave)*.5;
        waist.rotation.y=.075*wave;
        head.rotation.x=.10*Math.sin(cycle*1.6);
        arms[0].shoulder.rotation.z=-.13;
        arms[1].shoulder.rotation.x=-.18-.33*gesture;
        arms[1].shoulder.rotation.z=.15+.14*gesture;
        arms[1].elbow.rotation.x=-.30-.83*gesture;
      }
    });
  }
  resident({x:-67.6,z:-.8,angle:1.6,shirt:'#536771',trousers:'#3f4949',job:'talk'});
  resident({x:-66.35,z:-.75,angle:-1.65,shirt:'#995e47',trousers:'#4e4d48',job:'talk',phase:2.8,scale:.96});
  resident({x:-51,z:1.85,shirt:'#697253',trousers:'#4b4a45',angle:0,job:'carry',hat:true});
  resident({x:9.6,z:-14.1,angle:-.26,shirt:'#936e56',trousers:'#4b5353',job:'sweep'});
  resident({x:-68,z:33,angle:.4,shirt:'#506971',trousers:'#585146',job:'hoe',hat:true});
  resident({x:-65.2,z:34.4,angle:-1,shirt:'#99715a',trousers:'#555447',job:'hoe',hat:true,phase:2.4});
  // Stagger errands along both rows so each household keeps its own rhythm.
  for(const [dx,dz,shirt,phase,seated] of [
    [-.86,-.34,'#724956',0,true],[.22,-.84,'#58746c',3,false],
    [.87,.22,'#786347',6,true],[-.22,.88,'#716489',9,false]
  ]){
    resident({x:-71.35+dx,z:5.15+dz,angle:Math.atan2(-dx,-dz),shirt,
      trousers:'#454b4b',job:seated?'chat-seated':'chat',phase,scale:.94});
  }
  const errands=[
    {x:9,side:-1,speed:1.02,offset:11,shirt:'#965747',job:'carry'},
    {x:-63,side:-1,speed:.91,offset:24,shirt:'#566f75',job:'visit'},
    {x:45,side:-1,speed:1.08,offset:4,shirt:'#707955',job:'carry'},
    {x:-51,side:1,speed:.95,offset:5,shirt:'#82694e',job:'carry'},
    {x:-3,side:1,speed:1.06,offset:30,shirt:'#617980',job:'visit'},
    {x:33,side:1,speed:.89,offset:15,shirt:'#8d6258',job:'visit'}
  ];
  for(const {x,side,speed,offset,shirt,job} of errands){
    resident({x,z:side*15,angle:0,shirt,trousers:'#484d48',job,phase:offset,
      visit:courtyardVisit(x,side,speed,offset)});
  }
  for(const [center,side,phase] of [[9,-1,.5],[-63,-1,1.7],[-3,1,3],[45,1,4.2]]){
    resident({x:center+2.15,z:side*13.25,angle:side*.85,shirt:'#845855',
      trousers:'#4a5055',job:'sort',phase});
    resident({x:center-1.65,z:side*9.65,angle:-side*.68,shirt:'#586d76',
      trousers:'#504940',job:'sift',phase:phase+1});
  }
  for(const [center,side] of [[9,-1],[-63,-1],[-3,1]]){
    resident({x:center-2.65,z:side*21.96,angle:side<0?.33:2.81,shirt:'#82584a',trousers:'#484d48',job:'eat'});
    resident({x:center-2.24,z:side*20.08,angle:side<0?2.8:.34,shirt:'#586f79',trousers:'#484d48',job:'eat',phase:2.1});
  }
  for(const [i,row] of school.desks.entries()){
    resident({x:school.x-.99,z:row+school.benchGap,angle:Math.PI,scale:.70,
      shirt:i?'#a07054':'#596f75',trousers:'#55534b',job:'study',phase:i*1.5});
  }
  // Offset aisles and departure times allow two pupils to pass one another.
  for(const [i,lane] of [.84,1.48].entries()){
    const startZ=i?6.1:4.7, endZ=i?-1.35:-3.66;
    const doorway=i?.37:.00;
    const path=[[lane+(i?1.4:-1.5),startZ],[doorway,1.65],[doorway,.40],[lane,-.10],[lane,endZ]]
      .map(([dx,z])=>new T.Vector3(school.x+dx,0,z));
    const visit=walkRoute(path,i?.83:.75,i?9:3,point=>
      T.MathUtils.lerp(ground(point.x,point.z)+.03,school.floorY,
        1-T.MathUtils.smoothstep(point.z,.9,1.28)));
    resident({x:school.x+lane,z:startZ,angle:Math.PI,scale:i?.72:.68,job:'pupil',
      shirt:i?'#757e56':'#975e4c',trousers:'#494d47',phase:i*2.3,visit});
  }
  const draw=[];
  for(const [geometry,parts] of batches){
    const mesh=new T.InstancedMesh(geometry,material,parts.length);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;
    parts.forEach(({color},i)=>mesh.setColorAt(i,new T.Color(color)));
    scene.add(mesh);draw.push({mesh,parts});
  }
  function animate(time){
    poses.forEach(update=>update(time));
    frame.updateMatrixWorld(true);
    for(const {mesh,parts} of draw){
      parts.forEach(({node},i)=>mesh.setMatrixAt(i,node.matrixWorld));
      mesh.instanceMatrix.needsUpdate=true;
    }
  }
  animate(0);return animate;
}
