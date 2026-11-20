import * as T from './vendor/three.module.min.js';

// One batch for the planks, battens and iron pull of every hinged door.
export function buildDoors(scene, entries){
  const pieces=[
    ...Array.from({length:6},(_,i)=>[(i+.5)*.25,1.06,0,.245,2.12,.075,i%2?'#825b41':'#795438']),
    [.75,.44,0,1.47,.13,.12,'#644631'],[.75,1.65,0,1.47,.13,.12,'#644631'],
    [1.27,.98,0,.09,.18,.17,'#393930']
  ];
  const batch=new T.InstancedMesh(new T.BoxGeometry(),new T.MeshLambertMaterial(),entries.length*pieces.length);
  const pivot=new T.Object3D(),piece=new T.Object3D(),matrix=new T.Matrix4();
  batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;scene.add(batch);
  function pose(door){
    const angle=door.angle+door.front*door.progress*Math.PI/2;
    pivot.position.set(door.x,door.y,door.z);pivot.rotation.y=angle;pivot.updateMatrix();
    door.dx=1.5*Math.cos(angle);door.dz=-1.5*Math.sin(angle);
    pieces.forEach(([x,y,z,w,h,d,color],i)=>{
      piece.position.set(x,y,z);piece.scale.set(w,h,d);piece.updateMatrix();
      const index=door.index*pieces.length+i;
      batch.setMatrixAt(index,matrix.multiplyMatrices(pivot.matrix,piece.matrix));
      if(!door.ready)batch.setColorAt(index,new T.Color(color));
    });
    door.ready=true;batch.instanceMatrix.needsUpdate=true;
  }
  entries.forEach((door,index)=>{Object.assign(door,{index,progress:0,open:false});pose(door);});
  function nearLeaf(door,x,z){
    const u=x-door.x,v=z-door.z;
    const fraction=T.MathUtils.clamp((u*door.dx+v*door.dz)/2.25,0,1);
    return Math.hypot(u-door.dx*fraction,v-door.dz*fraction)<.265;
  }
  function closest(x,z){
    let best=null,range=2.55;
    for(const door of entries){
      const distance=Math.hypot(x-door.centerX,z-door.centerZ);
      if(distance<range){range=distance;best=door;}
    }
    return best;
  }
  function update(dt,player){
    let changed=false;
    for(const door of entries){
      const delta=Number(door.open)-door.progress;
      if(delta===0)continue;
      const previous=door.progress;
      door.progress+=Math.sign(delta)*Math.min(Math.abs(delta),dt*2.6);
      pose(door);
      if(player&&nearLeaf(door,player.x,player.z)){
        door.progress=previous;door.open=!door.open;pose(door);
      }
      changed=true;
    }
    return changed;
  }
  return {closest,update,blocked:(x,z)=>entries.some(d=>nearLeaf(d,x,z))};
}
