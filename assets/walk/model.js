import * as T from './vendor/three.module.min.js';
import {buildDoors} from './doors.js?v=family-meal';

// North is -Z and east is +X. The slope is illustrative.
export const ground = (x, z) => x * .012 - z * .018;
export const sites = {
  gate: { name:'老门上', x:-73, z:1.4, aim:[-52,0] },
  court:{ name:'四合院', x:9.1, z:-6.45, aim:[9,-12.8] },
  meal:{ name:'正房炕桌', x:10.05, z:-20.95, aim:[6.55,-21.0] },
  cave: { name:'胡同窑', x:-87.8, z:11, aim:[-87.8,1] },
  school:{ name:'窑校旧址', x:-92.4, z:6.55, aim:[-85.5,.50] },
  classroom:{ name:'窑洞课堂', x:-86.8, z:.22, aim:[-88.25,-3.8] },
  neighbors:{ name:'村头树下', x:-74.7, z:2.55, aim:[-71.35,5.15] },
  field:{ name:'村旁田垄', x:-69, z:38, aim:[-66.7,33.4] }
};

export const school={
  x:-87.8, floorY:ground(-87.8,-5)+.055, desks:[-2.95,-1.38], benchGap:.55
};

export function makeVillage(scene) {
  let seed=813;
  function random(){ seed=(1664525*seed+1013904223)>>>0; return seed/4294967296; }
  const box=new T.BoxGeometry(), leaf=new T.IcosahedronGeometry(1,1);
  const round=new T.CylinderGeometry(.88,1,1,10);
  const batches=new Map(), solid=[], doorEntries=[], rooms=[];
  const dummy=new T.Object3D();
  function put(geo,x,y,z,w,h,d,color,ry=0,rx=0,rz=0){
    dummy.position.set(x,y,z); dummy.scale.set(w,h,d); dummy.rotation.set(rx,ry,rz,'YXZ'); dummy.updateMatrix();
    if(!batches.has(geo)) batches.set(geo,[]);
    batches.get(geo).push([dummy.matrix.clone(),color]);
  }
  function block(x,y,z,w,h,d,c,ry=0){put(box,x,y,z,w,h,d,c,ry);}
  function barrier(x,z,w,d){solid.push([x-w/2,x+w/2,z-d/2,z+d/2]);}
  const detailBox=box.clone();
  const wallColors=['#cea882','#d3b58e','#bd9775','#dfc29d','#cba384'];
  const roofs=['#565e5d','#4f5859','#606966','#636864','#586263'];
  const leaves=['#788b52','#8d9e61','#a3a968','#728657','#89964e','#a8a76b'];
  const pick=a=>a[Math.floor(random()*a.length)];
  function tree(x,z,size){
    const y=ground(x,z);
    put(round,x,y+size*.42,z,size*.065,size*.84,size*.065,'#70543e');
    for(let j=0;j<11;j++){
      const a=j*2.4, r=j===10?0:size*(.13+random()*.17);
      put(leaf,x+Math.cos(a)*r,y+size*(j===10?1.03:.73+random()*.2)+random()*.3,z+Math.sin(a)*r,size*(.17+random()*.12),size*(.22+random()*.13),size*.23,pick(leaves),a);
    }
    for(const sign of [-1,1])put(round,x+sign*size*.074,y+size*.57,z,size*.032,size*.39,size*.032,'#79614a',0,.12,-sign*.48);
    barrier(x,z,size*.12,size*.12);
  }
  // A continuous earth plinth and cut sediment layers keep the old settlement legible from above.
  const perimeter=[[-106,-34],[-96,-45],[-64,-47],[-31,-45],[9,-50],[48,-46],[84,-44],[98,-34],[100,-9],[97,22],[88,39],[57,46],[20,44],[-15,48],[-48,44],[-81,40],[-102,30],[-108,7]];
  const terrain=new T.BufferGeometry(), pts=[], cols=[];
  function tri(a,b,c,tint){pts.push(...a,...b,...c);const col=new T.Color(tint);for(let j=0;j<3;j++) cols.push(col.r,col.g,col.b);}
  const band=[0,-.55,-2.8,-3.15,-5.5];
  for(let i=0;i<perimeter.length;i++){
    const [x,z]=perimeter[i], [xx,zz]=perimeter[(i+1)%perimeter.length];
    const a=[x,ground(x,z),z], b=[xx,ground(xx,zz),zz];
    tri([0,0,0],b,a,'#c8b68c');
    for(let k=0;k<band.length-1;k++){
      const pt=(v,level)=>[v[0]*(1+level*.001),v[1]+level,v[2]*(1+level*.001)];
      const hi=band[k],lo=band[k+1], c=['#ab986c','#c39670','#b38660','#bf9676'][k];
      tri(pt(a,hi),pt(b,hi),pt(b,lo),c);tri(pt(a,hi),pt(b,lo),pt(a,lo),c);
    }
  }
  terrain.setAttribute('position',new T.Float32BufferAttribute(pts,3));terrain.setAttribute('color',new T.Float32BufferAttribute(cols,3));terrain.computeVertexNormals();
  const land=new T.Mesh(terrain,new T.MeshLambertMaterial({vertexColors:true,side:T.DoubleSide}));land.receiveShadow=true;land.castShadow=true;scene.add(land);

  function patch(x,z,w,d,c,lift=.035){
    put(box,x,ground(x,z)+lift,z,w,.04,d,c,0,.018,.012);
  }
  // The fields have narrow ridges with irregular borders between plots.
  for(const side of [-1,1]){
    let x=-94;
    while(x<80){
      const w=10+random()*10,z=side*(33+random()*2),d=9+random()*6;
      patch(x+w/2,z,w-.5,d,pick(['#b9ac78','#b5ab79','#abaa70','#b7b889','#c1ab6f','#a8aa78']));
      for(let j=1;j<w-1;j+=.82) patch(x+j,z,.14,d-.25,'#a09566',.076);
      x+=w;
    }
  }
  patch(2,0,169,7.6,'#d9bd91',.07);
  for(const z of [-1.25,1.25]) patch(0,z,159,.23,'#c5a77f',.105);
  patch(-76,1.5,6.8,57,'#d7bb8c',.06);
  patch(-85,8,23,5.7,'#d7bb8c',.075);

  // Pitched, hipped roofs. A normalized mesh can be instanced at different spans.
  const roofGeo=new T.BufferGeometry();
  const roofPts=[];
  const e=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]],l=[-.37,1,0],r=[.37,1,0];
  for(const [a,b,c] of [[e[0],l,r],[e[0],r,e[1]],[e[1],r,e[2]],[e[2],r,l],[e[2],l,e[3]],[e[3],l,e[0]]])roofPts.push(...a,...b,...c);
  roofGeo.setAttribute('position',new T.Float32BufferAttribute(roofPts,3));roofGeo.computeVertexNormals();
  function roof(x,y,z,w,d,h,tint,ry=0){
    put(roofGeo,x,y,z,w,h,d,tint,ry);
    block(x,y+h+.045,z,w*.77,.15,.22,'#454d4c',ry);
    block(x,y-.04,z,w,.16,d,'#4c5049',ry);
    // Parallel raised tile rolls on both slopes.
    const sin=Math.sin(ry),cos=Math.cos(ry);
    for(let dx=-w*.34;dx<=w*.34;dx+=.45){
      for(const s of [-1,1]){
        const dz=s*d*.25;
        put(box,x+cos*dx+sin*dz,y+h*.5+.022,z-sin*dx+cos*dz,.065,.06,Math.hypot(h,d/2), '#727772',ry,s*Math.atan2(h,d/2));
      }
    }
  }
  function hall(x,y,z,w,d,h,front,wall,roofColor,side=false){
    const angle=side?Math.PI/2:0;
    const along=(u,v)=>side?[x+v,z-u]:[x+u,z+v];
    const floorY=y+.24, doorFace=front*(d/2-.10);
    function timber(u,v,level,width,height,depth,color){
      const [xx,zz]=along(u,v);
      block(xx,floorY+level,zz,width,height,depth,color,angle);
    }
    function solidPart(u,v,level,width,height,depth,color){
      timber(u,v,level,width,height,depth,color);
      const [xx,zz]=along(u,v);
      barrier(xx,zz,side?depth:width,side?width:depth);
    }
    function crock(u,v,level,radius,height,color){
      const [xx,zz]=along(u,v);
      put(round,xx,floorY+level,zz,radius,height,radius,color);
    }
    const roomName=side?(front>0?'灶厦':'厦屋'):'正房';
    rooms.push({x,z,halfX:(side?d:w)/2,halfZ:(side?w:d)/2,floorY,name:roomName});
    timber(0,0,-.13,w,.26,d,'#b49b7b');
    solidPart(0,-doorFace,h/2,w,h,.20,wall);
    for(const sign of [-1,1]){
      solidPart(sign*(w/2-.10),0,h/2,.20,h,d,wall);
      const span=w/2-.80;
      solidPart(sign*(.80+span/2),doorFace,h/2,span,h,.20,wall);
      timber(sign*.79,doorFace,1.08,.08,2.16,.25,'#654832');
    }
    timber(0,doorFace,(2.14+h)/2,1.60,h-2.14,.20,wall);
    timber(0,doorFace,2.14,1.65,.11,.26,'#654832');
    const [hingeX,hingeZ]=along(-.75,doorFace);
    const [centerX,centerZ]=along(0,doorFace);
    doorEntries.push({x:hingeX,y:floorY,z:hingeZ,centerX,centerZ,angle,front,name:roomName});
    for(const sign of [-1,1]){
      const u=sign*w*.30;
      for(const face of [-1,1]){
        const v=doorFace+face*.112;
        timber(u,v,1.48,w*.20,1.02,.055,'#694f3b');
        timber(u,v+face*.035,1.48,w*.20-.13,.89,.035,'#e1cfac');
        for(const offset of [-.30,0,.30])timber(u+offset*w*.20,v+face*.06,1.48,.046,.90,.036,'#776047');
        timber(u,v+face*.06,1.47,w*.20,.056,.04,'#776047');
      }
    }
    if(side){
      // Single-pitch eaves drain towards the open yard.
      const slope=front*.23;
      put(box,x,floorY+h+.22,z,w+.48,.18,d+.60,roofColor,angle,slope);
      for(let u=-w/2;u<=w/2;u+=.37){
        const [xx,zz]=along(u,0);
        put(box,xx,floorY+h+.33,zz,.065,.055,d+.58,'#747875',angle,slope);
      }
      timber(0,-doorFace,h+.19,w,.49,.22,wall);
      if(front>0){
        solidPart(-2.75,-front*.12,.42,2.1,.84,1.10,'#ad8a69');
        timber(-2.75,-front*.12,.86,2.18,.09,1.16,'#7b7464');
        crock(-2.9,0,.93,.48,.14,'#393c36');
        crock(-2.9,0,1.01,.40,.09,'#605e50');
        crock(-2.9,0,1.08,.07,.09,'#3c3933');
        timber(-2.70,front*.445,.26,.49,.36,.045,'#483828');
        timber(-3.53,-front*.62,1.57,.28,2.9,.28,'#8b7967');
        crock(2.95,0,.36,.42,.72,'#906b4d');
      }else{
        solidPart(-2.7,0,.59,1.55,.12,.8,'#886141');
        for(const u of [-3.33,-2.07])for(const v of [-.3,.3])timber(u,v,.28,.09,.56,.09,'#68513c');
        crock(-2.9,0,.73,.20,.16,'#c8b599');crock(2.6,0,.39,.48,.78,'#967052');
      }
    }else{
      roof(x,floorY+h,z,w+.72,d+.72,1.05,roofColor);
      // The kang borders the back wall; keep the central doorway and aisle free.
      solidPart(-2.85,-front*.16,.33,4.25,.66,2.52,'#b89670');
      timber(-2.85,-front*.16,.686,4.21,.055,2.48,'#c8a874');
      for(let i=0;i<10;i++)timber(-4.73+i*.4,-front*.16,.717,.022,.009,2.4,'#b39567');
      for(const u of [-3.9,-1.5,1.5,3.9])timber(u,0,h-.10,.14,.20,d-.22,'#6d5341');
      for(let i=0;i<3;i++){
        timber(-4.38,-front*.59,.78+i*.105,.94,.105,.62,['#7e7163','#9c6959','#7f8c89'][i]);
      }
      timber(-2.45,0,1.07,.98,.095,.80,'#865c3d');
      for(const u of [-2.84,-2.06])for(const v of [-.30,.30])timber(u,v,.88,.075,.34,.075,'#664832');
      crock(-2.45,0,1.15,.18,.085,'#dfcfaf');
      crock(-2.45,0,1.20,.145,.035,'#7f8a50');
      for(const u of [-2.75,-2.15])crock(u,.17,1.17,.103,.11,'#e4d4b4');
      solidPart(3.7,-front*.70,.43,1.7,.86,.67,'#846447');
      timber(3.7,-front*.34,.63,1.56,.045,.04,'#a28666');
      crock(3.35,-front*.65,.98,.15,.25,'#a2825a');
    }
  }
  function courtyard(x,side){
    const center=side*13.4,y=ground(x,center), c=pick(wallColors),rc=pick(roofs);
    block(x,y+.015,center,12,.18,18.9,'#c6ac87');
    hall(x,y,side*21,10.8,3.5,2.8,-side,c,rc);
    for(const offset of [-4.75,4.75]) hall(x+offset,y,side*13.2,11.6,2.2,2.25,-Math.sign(offset),c,rc,true);
    // The opening at the street connects the lane to each yard.
    const gateZ=side*4.6;
    for(const off of [-3.52,3.52]){
      block(x+off,y+1.03,gateZ,4.96,2.06,.48,c);
      block(x+off,y+2.1,gateZ,5,.13,.65,rc);
      // A shallow plinth of staggered stone courses along the lane.
      for(let row=0;row<3;row++){
        for(let col=0;col<7;col++){
          const start=Math.max(-2.48,-2.48+col*.82-(row%2)*.4);
          const end=Math.min(2.48,-2.48+(col+1)*.82-(row%2)*.4);
          if(end>start+.03)put(detailBox,x+off+(start+end)/2,y+.11+row*.2,gateZ-side*.25,end-start-.022,.18,.06,pick(['#90877a','#9d9180','#a39683','#a49986']));
        }
      }
      barrier(x+off,gateZ,4.96,.48);
    }
    for(const off of [-1.22,1.22])block(x+off,y+1.25,gateZ,.32,2.5,.68,'#88725c');
    roof(x,y+2.56,gateZ,3.45,1.68,.55,rc);
    block(x,y+2.27,gateZ,2.65,.32,.51,'#73533d');
    for(const off of [-1.2,1.2]){
      block(x+off,y+.22,gateZ,.58,.42,.78,'#938a7c');
      block(x+off,y+2.49,gateZ,.64,.13,.98,'#765a41');
    }
    block(x,y+.13,gateZ-side*.53,2.44,.16,.95,'#aca292');
    // Farmyard furnishings are illustrative.
    if(random()>.48){
      const sx=x+2.3,sz=side*11.7;
      put(round,sx,y+.39,sz,.32,.78,.32,'#837d70');
      put(round,sx,y+.87,sz,.74,.19,.74,'#aba491');
      block(sx+.18,y+1.08,sz,.1,.36,.1,'#6e5744');
    }
    block(x,y+.13,side*17.6,4,.25,1.05,'#aaa08d');
    put(round,x+2,y+.33,side*15.4,.4,.66,.4,'#947150');
    if(random()>.32)tree(x-1.95,side*12.2,2.8+random());
  }
  for(let i=0;i<12;i++){
    const x=-63+i*12;
    courtyard(x,-1);courtyard(x,1);
    if(i%2===0)tree(x+4.8,3.15,3.8+random()*2);
    if(i%3!==0)tree(x+5.2,-3.2,4.1+random()*1.5);
  }
  for(const s of [-1,1]) for(let j=0;j<22;j++){
    const x=-91+j*8.3+random()*2, z=s*(24.7+random()*3);
    tree(x,z,3+random()*3);
  }
  tree(-72.95,7.2,4.9);
  // Earthen cut bank with three hollow vaulted chambers facing the lane.
  const caveLength=6;
  // Page 169 shows three bays on one wall and a fourth on the return.
  // Local u runs along each facade, v points towards the yard.
  for(let i=0;i<4;i++){
    const corner=i===3, angle=corner?-Math.PI/2:0;
    const x=corner?-80:-93+i*5.2,z=corner?3.6:1,y=ground(x,z);
    const width=5.2,rad=i===1?2.10:1.85,spring=1.28,top=4.9;
    function worldPoint(u,v){return corner?[x-v,z+u]:[x+u,z+v];}
    function panel(u,v,h,w,t,d,color){
      const [xx,zz]=worldPoint(u,v);block(xx,y+h,zz,w,t,d,color,angle);
    }
    function obstacle(u,v,w,d){
      const [xx,zz]=worldPoint(u,v);barrier(xx,zz,corner?d:w,corner?w:d);
    }
    const shape=new T.Shape();
    shape.moveTo(-width/2,0);shape.lineTo(-width/2,top);shape.lineTo(width/2,top);shape.lineTo(width/2,0);shape.lineTo(rad,0);shape.lineTo(rad,spring);
    shape.absarc(0,spring,rad,0,Math.PI,false);shape.lineTo(-rad,0);shape.closePath();
    const geo=new T.ExtrudeGeometry(shape,{depth:caveLength,bevelEnabled:false,curveSegments:16});
    const [rearX,rearZ]=worldPoint(0,-caveLength);
    put(geo,rearX,y,rearZ,1,1,1,'#bb967e',angle);
    panel(0,-caveLength,2,width,4.1,.4,'#8e7766');
    obstacle(0,-caveLength,width,.5);
    const jamb=width/2-rad;
    for(const sign of [-1,1])obstacle(sign*(rad+jamb/2),-caveLength/2,jamb,caveLength);
    // An inset plaster tympanum with the doorway, sidelights and upper lights cut out.
    const face=new T.Shape(), halfDoor=.77, doorH=1.95;
    face.moveTo(-rad,0);face.lineTo(-halfDoor,0);face.lineTo(-halfDoor,doorH);
    face.lineTo(halfDoor,doorH);face.lineTo(halfDoor,0);face.lineTo(rad,0);
    face.lineTo(rad,spring);face.absarc(0,spring,rad,0,Math.PI,false);face.closePath();
    function aperture(u,h,w,t){
      const hole=new T.Path();
      hole.moveTo(u-w/2,h-t/2);hole.lineTo(u-w/2,h+t/2);hole.lineTo(u+w/2,h+t/2);
      hole.lineTo(u+w/2,h-t/2);hole.closePath();face.holes.push(hole);
      for(let k=1;k<5;k++)panel(u-w/2+k*w/5,-.25,h,.037,t,.065,'#655a50');
    }
    for(const sign of [-1,1]){
      aperture(sign*1.26,1.32,.65,.62);
      obstacle(sign*(rad+halfDoor)/2,-.25,rad-halfDoor,.14);
    }
    aperture(0,2.24,1.10,.37);
    if(corner){aperture(0,2.77,.47,.40);}
    else{
      const hole=new T.Path();hole.absarc(0,2.79,.23,0,2*Math.PI,true);face.holes.push(hole);
      for(const dx of [-.095,0,.095])panel(dx,-.25,2.79,.027,.40,.05,'#61564c');
    }
    const [fx,fz]=worldPoint(0,-.27);
    put(new T.ExtrudeGeometry(face,{depth:.10,bevelEnabled:false,curveSegments:20}),fx,y,fz,1,1,1,'#c5a38a',angle);
    for(const sign of [-1,1])panel(sign*.78,-.19,.99,.07,1.98,.11,'#645548');
    panel(0,-.19,1.98,1.62,.09,.12,'#645548');
    if(i!==1){
      panel(0,-.34,.95,1.48,1.90,.08,'#726251');obstacle(0,-.34,1.5,.12);
      for(const h of [.32,.68,1.47])panel(0,-.28,h,1.43,.08,.04,'#8b7966');
    }else{
      const floor=school.floorY;
      block(x,floor-.09,-2,4.20,.18,6,'#ba9e79');
      rooms.push({x,z:-2,halfX:rad,halfZ:3,floorY:floor,name:'窑洞课堂'});
      // The longer side of every shared bench faces the blackboard.
      const deskX=x-.56;
      for(const row of school.desks){
        const seat=row+school.benchGap;
        block(deskX,floor+.62,row,2.04,.075,.53,'#9d7450');
        block(deskX,floor+.51,row,1.86,.15,.40,'#765438');
        block(deskX,floor+.315,seat,2.12,.08,.24,'#a88256');
        block(deskX,floor+.155,seat,1.89,.065,.07,'#73563c');
        for(const dx of [-.85,.85]){
          for(const dz of [-.18,.18])block(deskX+dx,floor+.27,row+dz,.08,.54,.08,'#79583d');
          block(deskX+dx,floor+.15,seat,.11,.30,.20,'#79583d');
        }
        barrier(deskX,row,2.04,.53);barrier(deskX,seat,2.12,.24);
        for(const dx of [-.56,.53]){
          block(deskX+dx,floor+.666,row,.26,.019,.19,'#e4d4ad',.06);
          block(deskX+dx+.10,floor+.683,row+.03,.016,.014,.14,'#74523d',.27);
        }
      }
      const boardZ=-4.73;
      block(x,floor+1.62,boardZ,2.80,1.16,.09,'#74553c');
      block(x,floor+1.62,boardZ+.055,2.67,1.04,.025,'#384642');
      block(x,floor+1.04,boardZ+.09,2.78,.055,.17,'#997752');
      block(x+.81,floor+1.09,boardZ+.11,.16,.036,.042,'#dedbc6');
      if(typeof document!=='undefined'){
        const board=document.createElement('canvas');
        board.width=864;board.height=328;
        const ctx=board.getContext('2d');
        ctx.fillStyle='#384642';ctx.fillRect(0,0,864,328);
        ctx.fillStyle='#e2e0c9';ctx.font='40px "Songti SC", serif';ctx.fillText('识 字',60,75);
        ctx.fillRect(60,94,742,2);
        ctx.font='82px "Kaiti SC", "Songti SC", serif';ctx.fillText('日　月　山　川',100,226);
        const chalk=new T.CanvasTexture(board);chalk.colorSpace=T.SRGBColorSpace;
        const writing=new T.Mesh(new T.PlaneGeometry(2.64,1.0),new T.MeshLambertMaterial({map:chalk}));
        writing.position.set(x,floor+1.62,boardZ+.071);scene.add(writing);
      }
    }
    panel(0,-caveLength/2,top+.04,width,.12,caveLength,'#a09674');
    panel(0,-.09,top+.12,width,.16,.38,'#63615a');
    for(let k=0;k<22;k++)panel(-2.50+k*.24,-.06,top+.219,.13,.07,.40,'#77746c');
  }
  // Plain courtyard boundary and a higher tiled lintel, as in the gate photograph.
  for(const [cx,w] of [[-93.35,4.45],[-82.8,11.05]]){
    const h=ground(cx,7.25);
    block(cx,h+1.28,7.25,w,2.56,.36,'#bf9e84');barrier(cx,7.25,w,.36);
    block(cx,h+2.6,7.25,w,.14,.47,'#706a5e');
  }
  const gx=-89.73,gy=ground(gx,7.25);
  for(const sign of [-1,1]){
    block(gx+sign*1.26,gy+1.53,7.25,.28,3.06,.55,'#b18f77');barrier(gx+sign*1.26,7.25,.28,.55);
  }
  block(gx,gy+2.85,7.25,2.80,.49,.55,'#bfa28a');
  block(gx,gy+3.14,7.25,3.02,.15,.74,'#6b665d');
  patch(-89.73,8.85,2.8,3.8,'#c8b296',.083);
  // A low, stepped earth bank behind the cave roofs.
  for(let j=0;j<3;j++){
    const z=-7-j*2.6, h=4.2-j*1.3;
    block(-87.8,ground(-87.8,z)+h*.5,z,17+j*.8,h,2.8,'#b49b72');barrier(-87.8,z,17+j*.8,2.8);
  }
  for(let i=0;i<9;i++)tree(-99+random()*4,-12+i*4,3+random()*3);
  const mat=new T.MeshLambertMaterial({side:T.DoubleSide,flatShading:true});
  // World-space pigment grain gives earth, tiles and wood the same miniature scale.
  mat.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vClayPos;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',
      'vClayPos = (modelMatrix * instanceMatrix * vec4(transformed,1.0)).xyz;\n#include <project_vertex>');
    shader.fragmentShader=`varying vec3 vClayPos;
      float speck(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
      float earth(vec3 p){vec3 a=floor(p),f=fract(p);f=f*f*(3.-2.*f);
        return mix(mix(mix(speck(a),speck(a+vec3(1,0,0)),f.x),mix(speck(a+vec3(0,1,0)),speck(a+vec3(1,1,0)),f.x),f.y),
                   mix(mix(speck(a+vec3(0,0,1)),speck(a+vec3(1,0,1)),f.x),mix(speck(a+vec3(0,1,1)),speck(a+vec3(1,1,1)),f.x),f.y),f.z);}
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
      vec3 q=vClayPos;
      float fine=1.-smoothstep(.015,.12,length(fwidth(q)));
      float grain=(earth(q*vec3(1.1,3.,1.1))-.5)*.17+(earth(q*5.)-.5)*.12+(earth(q*34.)-.5)*.19*fine;
      diffuseColor.rgb*=1.+grain;`);
  };
  for(const [geo,items] of batches){
    const m=new T.InstancedMesh(geo,mat,items.length);
    items.forEach(([matrix,c],i)=>{m.setMatrixAt(i,matrix);m.setColorAt(i,new T.Color(c));});
    m.castShadow=true;m.receiveShadow=true;scene.add(m);
  }
  const doors=buildDoors(scene,doorEntries);
  function canStand(x,z){
    // The convex perimeter is ordered clockwise on the X/Z plan.
    const iOutside=perimeter.some(([a,b],i)=>{
      const [c,d]=perimeter[(i+1)%perimeter.length];
      return (c-a)*(z-b)-(d-b)*(x-a)<Math.hypot(c-a,d-b)*.55;
    });
    return !iOutside && !doors.blocked(x,z) && !solid.some(([a,b,c,d])=>x>a-.25&&x<b+.25&&z>c-.25&&z<d+.25);
   }
  const roomAt=(x,z)=>rooms.find(r=>Math.abs(r.x-x)<r.halfX&&Math.abs(r.z-z)<r.halfZ);
  return {canStand,doors,roomAt};
}
