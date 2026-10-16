(function(root){
'use strict';
// Certificates, not forecasts. Equal primary totals are always treated in the
// unfavourable direction until the complete league can use the real mini-table.
const V=root.V||(typeof require==='function'?require('./engine.js'):null);
const cmp=(a,b)=>a[0]-b[0]||a[1]-b[1]||a[2]-b[2];
const total=t=>[t.w,t.sf-t.sa,t.pf-t.pa];
function network(n){
 const g=Array.from({length:n},()=>[]);
 function edge(a,b,c){const x={to:b,c,rev:g[b].length},y={to:a,c:0,rev:g[a].length};g[a].push(x);g[b].push(y)}
 function flow(s,t){let result=0;for(;;){const level=Array(n).fill(-1),q=[s];level[s]=0;for(let h=0;h<q.length;h++)for(const e of g[q[h]])if(e.c>0&&level[e.to]<0){level[e.to]=level[q[h]]+1;q.push(e.to)}if(level[t]<0)return{value:result,reachable:new Set(q)};const next=Array(n).fill(0);function send(v,f){if(v===t)return f;for(;next[v]<g[v].length;next[v]++){const e=g[v][next[v]];if(e.c&&level[e.to]===level[v]+1){const d=send(e.to,Math.min(f,e.c));if(d){e.c-=d;g[e.to][e.rev].c+=d;return d}}}return 0}let d;while((d=send(s,1e9)))result+=d;}}
 return{edge,flow};
}
// A game contributes exactly one win. Integral max flow assigns that win to one
// endpoint. A failed cut identifies teams of which at least one must be relaxed.
function feasible(kind,values,edges,mask){
 const n=values.length,source=n+edges.length,sink=source+1,net=network(sink+1);let required=0;
 if(kind==='lower'){
  values.forEach((v,i)=>{const demand=mask&(1<<i)?0:v;net.edge(source,i,demand);required+=demand});
  edges.forEach(([a,b],j)=>{net.edge(a,n+j,1);net.edge(b,n+j,1);net.edge(n+j,sink,1)});
 }else{
  values.forEach((v,i)=>net.edge(i,sink,mask&(1<<i)?edges.length:v));
  edges.forEach(([a,b],j)=>{net.edge(source,n+j,1);net.edge(n+j,a,1);net.edge(n+j,b,1)});required=edges.length;
 }
 const f=net.flow(source,sink);return{ok:f.value===required,conflict:values.map((_,i)=>i).filter(i=>!(mask&(1<<i))&&f.reachable.has(i)&&(kind!=='lower'||values[i]>0))};
}
function search(kind,values,edges,allowed,maxNodes){
 let visited=0;const memo=new Map();
 function visit(mask,left){
  if(visited++>=maxNodes)return null;
  if(memo.has(mask))return memo.get(mask);
  const f=feasible(kind,values,edges,mask);if(f.ok)return true;
  if(left===0||!f.conflict.length){memo.set(mask,false);return false}
  f.conflict.sort((a,b)=>kind==='lower'?values[b]-values[a]:values[a]-values[b]);
  let unknown=false;for(const i of f.conflict){const r=visit(mask|(1<<i),left-1);if(r===true)return true;if(r===null)unknown=true;}
  const r=unknown?null:false;memo.set(mask,r);return r;
 }
 return visit(0,allowed);
}
function scenario(rows,remaining,target,best){
 const current=rows.map(total),count=Array(rows.length).fill(0),index=new Map(rows.map((r,i)=>[r.id,i]));
 const other=rows.map((_,i)=>i).filter(i=>i!==target),local=new Map(other.map((i,j)=>[i,j])),edges=[];let ownRemaining=0;
 for(const m of remaining){const a=index.get(m.a),b=index.get(m.b);if(a===target||b===target){ownRemaining++;const rival=a===target?b:a;const sign=best?-1:1;current[rival][0]+=best?0:1;current[rival][1]+=sign*3;current[rival][2]+=sign*75;}else{count[a]++;count[b]++;edges.push([local.get(a),local.get(b)])}}
 const own=total(rows[target]);own[0]+=best?ownRemaining:0;own[1]+=(best?3:-3)*ownRemaining;own[2]+=(best?75:-75)*ownRemaining;
 return{own,edges,other,current,count};
}
function threshold(rows,remaining,target,k,maxNodes){
 const worst=scenario(rows,remaining,target,false),best=scenario(rows,remaining,target,true);
 let possible=0,automatic=0;const needs=worst.other.map(i=>{
  const [w,sd,pd]=worst.current[i],r=worst.count[i];let need=r+1;
  // At x wins, max SD = 3x - (r-x); at that SD, max PD = 75x+44(r-x).
  for(let x=0;x<=r;x++)if(cmp([w+x,sd+4*x-r,pd+75*x+44*(r-x)],worst.own)>=0){need=x;break}
  if(need<=r){possible++;if(need===0)automatic++}return need;
 });
 let clinched=possible<k,clinchSearch=true;
 if(!clinched&&automatic<k){
  // Impossible candidates are removed up front. Their games still supply wins
  // to the other endpoint, so retain their network vertex with zero demand.
  const demands=needs.map((v,j)=>v>worst.count[worst.other[j]]?0:v);
  // Restrict branch removals to positive demands. Zero-demand impossible teams
  // do not contribute to `possible` or to the permitted number of removals.
  clinchSearch=search('lower',demands,worst.edges,possible-k,maxNodes);clinched=clinchSearch===false;
 }
 if(clinched)return{clinched:true,excluded:false,limited:false};
 let forced=0;const caps=best.other.map(i=>{
  const [w,sd,pd]=best.current[i],r=best.count[i];let cap=-1;
  // At x wins, min SD = x - 3(r-x); at that SD, min PD = -44x-75(r-x).
  for(let x=0;x<=r;x++)if(cmp([w+x,sd+4*x-3*r,pd-44*x-75*(r-x)],best.own)<=0)cap=x;
  if(cap<0){forced++;return r}return cap;
 });
 let excluded=forced>=k,excludeSearch=true;
 if(!excluded){excludeSearch=search('upper',caps,best.edges,k-1-forced,maxNodes);excluded=excludeSearch===false}
 return{clinched:false,excluded,limited:clinchSearch===null||excludeSearch===null};
}
function solve(rows,remaining,cutoffs=[12,20],maxNodes=96){
 const result={};for(let i=0;i<rows.length;i++){const r={};for(const k of cutoffs)r[k]=threshold(rows,remaining,i,k,maxNodes);result[rows[i].id]=r}return result;
}
const cache=new Map();
function checkpoint(s,completed){
 const key=JSON.stringify([V.ids(s),s.tie,completed.map(i=>[i,s.rounds[i].map(m=>[m.a,m.b,m.sets])])]);if(cache.has(key))return cache.get(key);
 const included=new Set(completed),snapshot={...s,rounds:s.rounds.map((r,i)=>included.has(i)?r:r.map(m=>({...m,sets:null})))};
 const rows=V.standings(snapshot),remaining=snapshot.rounds.flat().filter(m=>!m.sets),final=remaining.length===0;
 const certificates=final||!completed.length?null:solve(rows,remaining),teams={};
 // A certificate stays true under any completion of another round. Carry it
 // forward even if a later relaxed search hits its budget. Reconstruct from
 // results rather than storing flags, so edits/imports cannot preserve stale facts.
 const previous=completed.length&&!final?checkpoint(s,completed.slice(0,-1)):null;
 rows.forEach((r,i)=>{const a=certificates?.[r.id],old=previous?.teams[r.id]||{};teams[r.id]={direct:final?i<12:!!a?.[12].clinched||!!old.direct,advance:final?i<20:!!a?.[20].clinched||!!old.advance,noDirect:final?i>=12:!!a?.[12].excluded||!!old.noDirect,out:final?i>=20:!!a?.[20].excluded||!!old.out,limited:final?false:!!(a?.[12].limited||a?.[20].limited)};const t=teams[r.id];t.advance=t.advance||t.direct;t.noDirect=t.noDirect||t.out;t.playin=t.advance&&t.noDirect&&!t.out;});
 const answer={teams,rounds:[...completed],lastRound:completed.at(-1),final};cache.set(key,answer);if(cache.size>48)cache.delete(cache.keys().next().value);return answer;
}
function report(s){
 // Result order also supports players completing rounds out of schedule order.
 const completed=s.rounds.map((r,i)=>({i,done:r.every(m=>m.sets),order:Math.max(0,...r.map(m=>m.resultOrder||0))})).filter(r=>r.done).sort((a,b)=>a.order-b.order||a.i-b.i).map(r=>r.i);
 const current=checkpoint(s,completed),previous=completed.length?checkpoint(s,completed.slice(0,-1)):null;
 const events={direct:[],advance:[],playin:[],noDirect:[],out:[]};
 for(const id of V.ids(s)){const now=current.teams[id],old=previous?.teams[id]||{};
  if(now.direct&&!old.direct)events.direct.push(id);
  if(now.out&&!old.out)events.out.push(id);
  if(now.playin&&!old.playin)events.playin.push(id);
  if(now.advance&&!old.advance&&!now.direct&&!now.playin)events.advance.push(id);
  if(now.noDirect&&!old.noDirect&&!now.out&&!now.playin)events.noDirect.push(id);
 }
 return{...current,events};
}
const api={solve,report,checkpoint};if(typeof module!=='undefined')module.exports=api;root.Qualification=api;
})(typeof window==='undefined'?globalThis:window);
