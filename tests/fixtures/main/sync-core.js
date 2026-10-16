(function(root){
class CloudWriter{
 constructor(write,onStatus){this.write=write;this.status=onStatus;this.revision=0;this.latest=null;this.pending=null;this.running=null;this.paused=true;this.closed=false;this.timer=null;}
 activate(revision){this.revision=revision;this.paused=false;}
 enqueue(state){if(this.closed)return;this.latest=JSON.parse(JSON.stringify(state));this.pending=this.latest;if(this.paused)return;clearTimeout(this.timer);this.timer=setTimeout(()=>this.flush(),700);this.status('pending');}
 flush(){clearTimeout(this.timer);if(this.running)return this.running;if(this.closed||this.paused||!this.pending)return Promise.resolve();this.running=this.drain().finally(()=>{this.running=null});return this.running;}
 async drain(){while(this.pending&&!this.paused&&!this.closed){let snapshot=this.pending;this.pending=null;this.status('saving');try{const result=await this.write(snapshot,this.revision);if(this.closed)return;this.revision=result.revision;this.status(this.pending?'pending':'saved',result);}catch(e){if(this.closed)return;this.pending=this.pending||snapshot;this.paused=true;this.status(e.message.includes('SAVE_CONFLICT')?'conflict':'error',e);}}}
 close(){this.closed=true;clearTimeout(this.timer);this.pending=null;}
}
if(typeof module!=='undefined')module.exports={CloudWriter};root.CloudWriter=CloudWriter;
})(typeof window==='undefined'?globalThis:window);
