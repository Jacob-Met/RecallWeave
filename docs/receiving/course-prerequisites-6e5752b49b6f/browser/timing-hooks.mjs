export function installReceivingHooks() {
  if(globalThis.__rwReceiving)throw Error('Receiving hooks already installed');
  const originalRead=File.prototype.arrayBuffer, originalDigest=crypto.subtle.digest,
    originalURL=URL.createObjectURL, originalStorage=Object.fromEntries(['setItem','removeItem','clear'].map(k=>[k,Storage.prototype[k]]));
  const digestOwn=Object.getOwnPropertyDescriptor(crypto.subtle,'digest');
  const pending=new Map(),arms=[],events=[],storageWrites=[];let urlFailure=null,restored=false;
  const state=()=>({events:events.map(x=>({...x})),storageWrites:storageWrites.map(x=>({...x})),pending:[...pending.keys()],armed:arms.map(x=>({...x})),urlFailure,restored});
  function gate(kind,name,run) {
    const n=arms.findIndex(x=>x.kind===kind&&(kind!=='read'||x.filename===name));
    if(n<0)return run();
    const spec=arms.splice(n,1)[0];
    events.push({event:'pending',kind,token:spec.token,filename:name??null});
    return new Promise((resolve,reject)=>{
      pending.set(spec.token,{run:async mode=>{
        pending.delete(spec.token);
        if(mode==='reject'){events.push({event:'rejected',kind,token:spec.token});reject(new Error('Receiving controlled '+kind+' failure '+spec.token));return;}
        try{const result=await run();events.push({event:'resolved',kind,token:spec.token});resolve(result);}
        catch(error){events.push({event:'original-error',kind,token:spec.token,message:String(error)});reject(error);}
      }});
    });
  }
  File.prototype.arrayBuffer=function(){const self=this;return gate('read',self.name,()=>originalRead.call(self));};
  crypto.subtle.digest=function(...args){const self=this;return gate('digest',null,()=>originalDigest.apply(self,args));};
  URL.createObjectURL=function(...args){if(urlFailure){const token=urlFailure;urlFailure=null;events.push({event:'url-refused',token});throw new Error('Receiving controlled download failure '+token);}return originalURL.apply(this,args);};
  for(const method of Object.keys(originalStorage))Storage.prototype[method]=function(...args){
    storageWrites.push({method,args:args.map(String),area:this===localStorage?'local':this===sessionStorage?'session':'other'});
    return originalStorage[method].apply(this,args);
  };
  Object.defineProperty(globalThis,'__rwReceiving',{value:Object.freeze({
    snapshot:state,
    arm(kind,token,filename){if(restored||!['read','digest'].includes(kind)||pending.has(token)||arms.some(x=>x.token===token))throw Error('Invalid receiving arm');arms.push({kind,token,...(kind==='read'?{filename}:{})});return state();},
    async release(token,mode='resolve'){if(!['resolve','reject'].includes(mode)||!pending.has(token))throw Error('No matching receiving gate '+token);await pending.get(token).run(mode);return state();},
    failURL(token){if(urlFailure||restored)throw Error('URL failure already armed/restored');urlFailure=token;return state();},
    restore(){if(pending.size||arms.length||urlFailure)throw Error('Cannot restore active receiving gates');File.prototype.arrayBuffer=originalRead;if(digestOwn)Object.defineProperty(crypto.subtle,'digest',digestOwn);else delete crypto.subtle.digest;URL.createObjectURL=originalURL;for(const k of Object.keys(originalStorage))Storage.prototype[k]=originalStorage[k];restored=true;events.push({event:'restored'});return state();}
  }),configurable:false,writable:false});
}
