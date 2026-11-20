import * as T from './vendor/three.module.min.js';
import {ground} from './model.js?v=school-photo';

// Pieces share geometry and material across species, as in the village figures.
export function addAnimals(scene){
  const round=new T.SphereGeometry(.5,10,7), taper=new T.ConeGeometry(.5,1,8);
  const bar=new T.BoxGeometry(), batches=new Map(), motion=[];
  const flock=new T.Group();
  function pivot(parent,x=0,y=0,z=0){
    const node=new T.Group();node.position.set(x,y,z);parent.add(node);return node;
  }
  function part(parent,shape,tint,x,y,z,w,h,d){
    const node=pivot(parent,x,y,z);node.scale.set(w,h,d);
    if(!batches.has(shape))batches.set(shape,[]);
    batches.get(shape).push({node,tint});return node;
  }
  function eyes(head,x,y,z,size){
    for(const s of [-1,1])part(head,round,'#282622',s*x,y,z,size,size,size);
  }
  function hen(x,z,size,phase,color){
    const bird=pivot(flock);bird.scale.setScalar(size);
    const torso=pivot(bird,0,.32,0);
    part(torso,round,color,0,0,0,.34,.38,.51);
    for(const s of [-1,1]){
      part(torso,round,color,.145*s,.005,-.02,.11,.21,.35).rotation.x=-.28;
      part(torso,round,'#604a3c',s*.055,.14,-.22,.10,.32,.13).rotation.x=-.62;
    }
    const neck=pivot(torso,0,.035,.14);
    part(neck,round,color,0,.11,.06,.19,.26,.20);
    part(neck,round,color,0,.23,.09,.20,.20,.22);
    part(neck,taper,'#d7a44d',0,.21,.215,.09,.15,.095).rotation.x=Math.PI/2;
    part(neck,round,'#aa4232',0,.329,.088,.05,.085,.13);
    eyes(neck,.081,.245,.139,.033);
    const legs=[-1,1].map(s=>{
      const leg=pivot(bird,s*.078,.21,0);
      part(leg,bar,'#ac8347',0,-.10,0,.03,.2,.032);
      part(leg,bar,'#ac8347',0,-.197,.037,.046,.024,.12);return leg;
    });
    motion.push(t=>{
      const a=t*.36+phase;
      const bx=x+.24*Math.sin(a), bz=z+.23*Math.cos(a);
      bird.position.set(bx,Math.max(ground(bx,bz),ground(9,-13.4)+.105)+.015,bz);
      bird.rotation.y=Math.atan2(.24*Math.cos(a),-.23*Math.sin(a));
      const peck=Math.pow((1+Math.sin(t*3.4+phase))*.5,3);
      neck.rotation.x=.13+1.52*peck;torso.rotation.x=.10+.68*peck;
      legs.forEach((leg,i)=>leg.rotation.x=(i?1:-1)*.20*Math.sin(t*4+phase)*(1-peck));
    });
  }
  hen(9.75,-9.75,1.05,.8,'#bc8656');
  hen(10.63,-10.23,.94,3.4,'#e3c79b');
  hen(10.52,-9.48,.62,5.1,'#d9b575');

  function quadruped(x,z,isCow){
    const root=pivot(flock), body=pivot(root);
    const coat=isCow?'#a87549':'#b38658',dark=isCow?'#544438':'#795c43';
    const width=isCow?.83:.36,height=isCow?.78:.38,length=isCow?1.72:.80;
    const hipY=isCow?1.05:.53;
    part(body,round,coat,0,hipY,0,width,height,length);
    const legs=[];
    for(const s of [-1,1])for(const end of [-1,1]){
      const leg=pivot(body,s*width*.30,hipY-.10,end*length*.31);
      const h=hipY-.10;
      part(leg,round,coat,0,-h*.33,0,width*.22,h*.82,width*.24);
      part(leg,bar,dark,0,-h*.78,0,width*.125,h*.42,width*.14);
      part(leg,round,dark,0,-h+.04,.025,width*.21,.09,width*.25);legs.push(leg);
    }
    const neck=pivot(body,0,hipY+.10,length*.30);
    part(neck,round,coat,0,.11,length*.19,width*.66,height*.75,length*.56);
    const face=pivot(neck,0,.15,length*.39);
    part(face,round,coat,0,0,0,width*.65,height*.71,width*.78);
    part(face,round,isCow?'#82634c':'#dac39e',0,-.075,width*.33,width*.52,height*.32,width*.53);
    part(face,round,dark,0,-.055,width*.57,width*.31,.08,.07);
    eyes(face,width*.257,.055,width*.15,isCow?.073:.044);
    for(const side of [-1,1]){
      if(isCow){
        part(face,round,coat,side*.30,.105,-.025,.32,.13,.15).rotation.z=side*.34;
        part(face,taper,'#dbcaab',side*.235,.27,-.11,.10,.31,.10).rotation.z=-side*.53;
      }else{
        part(face,taper,dark,side*.102,.163,-.035,.13,.20,.12).rotation.z=-side*.10;
      }
    }
    const tail=pivot(body,0,hipY+.15,-length*.44);
    if(isCow){
      part(tail,bar,coat,0,-.31,-.04,.057,.69,.057);
      part(tail,round,dark,0,-.68,-.04,.11,.22,.13);
    }else{
      part(tail,round,coat,0,.10,-.11,.12,.38,.14).rotation.x=-.72;
      part(tail,round,'#dbc2a0',0,.26,-.19,.12,.19,.15);
    }
    motion.push(t=>{
      if(isCow){
        root.position.set(x,ground(x,z)+.10,z);root.rotation.y=-1.03;
        neck.rotation.x=.95+.32*Math.sin(t*.72);
        face.rotation.x=.22+.10*Math.cos(t*1.8);tail.rotation.z=.25*Math.sin(t*1.7);
      }else{
        // Easing the path clock creates a brief halt to sniff on every circuit.
        const u=t*.24, a=u-Math.sin(u), speed=(1-Math.cos(u))*.5;
        const px=x+2.4*Math.sin(a), pz=z+.55*Math.cos(a);
        root.position.set(px,ground(px,pz)+.10,pz);
        root.rotation.y=Math.atan2(2.4*Math.cos(a),-.55*Math.sin(a));
        legs.forEach((leg,i)=>leg.rotation.x=(i===0||i===3?1:-1)*.57*speed*Math.sin(t*6));
        neck.rotation.x=.13+.71*(1-speed);tail.rotation.y=.65*Math.sin(t*5.5);
      }
    });
  }
  quadruped(-63.6,1.35,false);quadruped(-65.6,30.75,true);
  const material=new T.MeshLambertMaterial({flatShading:true});
  const draw=Array.from(batches,([geometry,parts])=>{
    const mesh=new T.InstancedMesh(geometry,material,parts.length);
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.frustumCulled=false;
    parts.forEach(({tint},i)=>mesh.setColorAt(i,new T.Color(tint)));scene.add(mesh);
    return {mesh,parts};
  });
  function animate(time){
    motion.forEach(fn=>fn(time));flock.updateMatrixWorld(true);
    for(const {mesh,parts} of draw){
      parts.forEach(({node},i)=>mesh.setMatrixAt(i,node.matrixWorld));
      mesh.instanceMatrix.needsUpdate=true;
    }
  }
  animate(0);return animate;
}
