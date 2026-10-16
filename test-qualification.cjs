const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),V=require('./dist/engine.js'),Q=require('./dist/qualification.js');
const row=(id,w,sd=0,pd=0)=>({id,w,sf:Math.max(0,sd),sa:Math.max(0,-sd),pf:Math.max(0,pd),pa:Math.max(0,-pd)});
let rows=[row('T',4),...['A','B','C'].map(id=>row(id,4,-100))],edges=[{a:'A',b:'B'},{a:'B',b:'C'},{a:'A',b:'C'}];
assert(Q.solve(rows,edges,[2]).T[2].excluded,'Triangle forces two rivals above target despite no individually forced rival');
rows[0]=row('T',5);assert(Q.solve(rows,edges,[2]).T[2].clinched,'Triangle cannot supply two rivals with two wins each');
let limited=Q.solve(rows,edges,[2],0).T[2];assert(limited.limited);assert(!limited.clinched&&!limited.excluded,'Exhausted search must never manufacture a proof');
// Every BO5 outcome, at both extremes of its legally attainable point margin.
const outcomes=[[1,3,6],[1,3,75],[1,2,-19],[1,2,73],[1,1,-44],[1,1,61],[0,-3,-75],[0,-3,-6],[0,-2,-73],[0,-2,19],[0,-1,-61],[0,-1,44]];
let seed=7319;const rnd=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n},cmp=(a,b)=>a.w-b.w||(a.sf-a.sa)-(b.sf-b.sa)||(a.pf-a.pa)-(b.pf-b.pa);
let completions=0;
for(let trial=0;trial<24;trial++){
 const base=Array.from({length:6},(_,i)=>row(String(i),rnd(7),rnd(25)-12,rnd(161)-80));
 const remaining=trial%2?[{a:'0',b:'1'},{a:'2',b:'3'},{a:'4',b:'5'}]:[{a:'0',b:'1'},{a:'1',b:'2'},{a:'0',b:'2'}];
 const proof=Q.solve(base,remaining,[2,4],300);
 function enumerate(index,current){if(index===remaining.length){completions++;for(const r of current){const strict=current.filter(x=>cmp(x,r)>0).length,ties=current.filter(x=>x.id!==r.id&&cmp(x,r)===0).length;for(const k of [2,4]){if(proof[r.id][k].clinched)assert(strict+ties<k,`False clinch: trial ${trial}, team ${r.id}`);if(proof[r.id][k].excluded)assert(strict>=k,`False elimination: trial ${trial}, team ${r.id}`)}}return}
  const m=remaining[index];for(const [win,sd,pd]of outcomes){const next=current.map(x=>({...x})),a=next.find(x=>x.id===m.a),b=next.find(x=>x.id===m.b);a.w+=win;b.w+=1-win;a.sf+=sd;b.sa+=sd;a.pf+=pd;b.pa+=pd;enumerate(index+1,next)}
 }
 enumerate(0,base);
}
const clone=x=>JSON.parse(JSON.stringify(x));let s=V.fresh();const untouched=JSON.stringify(s);assert(Q.report(s).rounds.length===0);assert.equal(JSON.stringify(s),untouched);
s.rounds[5].forEach(m=>{V.simulate(m);V.stampResults(s)});let report=Q.report(s);assert.deepEqual(report.rounds,[5]);assert.equal(report.lastRound,5);
const checkpoint=JSON.stringify(report);V.simulate(s.rounds[0][0]);V.stampResults(s);assert.equal(JSON.stringify(Q.report(s)),checkpoint,'Partial rounds never change certification');
s.rounds[0].filter(m=>!m.sets).forEach(m=>{V.simulate(m);V.stampResults(s)});report=Q.report(s);assert.deepEqual(report.rounds,[5,0]);
// Full-season regression: every earlier certificate agrees with final standings.
let elapsed=0;
for(let season=0;season<5;season++){
 s=V.fresh();const facts=[];const begin=performance.now();
 for(let r=0;r<31;r++){s.rounds[r].forEach(V.simulate);V.stampResults(s);if(r>=18||r===0){const q=Q.report(s);facts.push(q);for(const t of Object.values(q.teams)){assert(!(t.direct&&t.noDirect));assert(!(t.advance&&t.out));assert(!t.playin||t.advance&&t.noDirect)}}}
 for(let f=1;f<facts.length;f++)for(const id of V.ids(s))for(const key of ['direct','advance','noDirect','out'])if(facts[f-1].teams[id][key])assert(facts[f].teams[id][key],'Certificates cannot disappear as rounds complete');
 elapsed+=performance.now()-begin;const ranked=V.standings(s).map(x=>x.id);
 for(const q of facts)for(const [id,t]of Object.entries(q.teams)){const rank=ranked.indexOf(id)+1;if(t.direct)assert(rank<=12);if(t.advance)assert(rank<=20);if(t.noDirect)assert(rank>12);if(t.out)assert(rank>20);if(t.playin)assert(rank>=13&&rank<=20)}
 report=Q.report(s);assert.equal(Object.values(report.teams).filter(t=>t.direct).length,12);assert.equal(Object.values(report.teams).filter(t=>t.playin).length,8);assert.equal(Object.values(report.teams).filter(t=>t.out).length,12);
 const loaded=clone(s);assert.deepEqual(Q.report(loaded),report,'Reload preserves derived certificates');
 const first=s.rounds[0][0];first.sets=[[25,0],[25,0],[25,0]];const after=Q.report(s),final=V.standings(s);for(const [i,t]of final.entries())assert.equal(after.teams[t.id].direct,i<12,'Editing old results recomputes final status');
}
// Editing already certified rounds must invalidate the derived proof chain.
s=V.fresh();let roster=V.ids(s);const strength=new Map(roster.map((id,i)=>[id,i]));
for(const m of s.rounds.slice(0,30).flat())m.sets=Array.from({length:3},()=>strength.get(m.a)<strength.get(m.b)?[25,0]:[0,25]);
V.stampResults(s);assert(Q.report(s).teams[roster[0]].direct);
for(const m of s.rounds.slice(0,30).flat())m.sets=m.sets.map(([a,b])=>[b,a]);
const changed=Q.report(s).teams[roster[0]];assert(!changed.direct&&changed.out,'Old certainty must not survive changed results');
// Sixteen tied primary totals: the mini-table, rather than reversed draw order,
// determines which of them finish in the direct-playoff places.
s=V.fresh();roster=V.ids(s);s.tie=[...roster].reverse();
for(const m of s.rounds.flat()){const a=roster.indexOf(m.a),b=roster.indexOf(m.b),d=(b-a+32)%32,win=d<16||d===16&&a<b;m.sets=Array.from({length:3},()=>win?[25,23]:[23,25])}
V.stampResults(s);let final=V.standings(s),q=Q.report(s);assert.deepEqual(final.slice(0,16).map(t=>t.id),roster.slice(0,16));for(let i=0;i<32;i++)assert.equal(q.teams[final[i].id].playin,i>=12&&i<20);
// Thirty-one equal primary totals AND equal mini-table wins: the stored draw
// decides both cutoffs exactly at the final checkpoint.
s=V.fresh();roster=V.ids(s);s.tie=[...roster].reverse();
for(const m of s.rounds.flat()){const a=roster.indexOf(m.a),b=roster.indexOf(m.b),win=b===31||a!==31&&(b-a+31)%31<=15;m.sets=Array.from({length:3},()=>win?[25,23]:[23,25])}
V.stampResults(s);final=V.standings(s);assert.deepEqual(final.slice(0,31).map(t=>t.id),roster.slice(0,31).reverse());q=Q.report(s);for(let i=0;i<32;i++){assert.equal(q.teams[final[i].id].direct,i<12);assert.equal(q.teams[final[i].id].playin,i>=12&&i<20)}
const elements=new Map(),storage=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'',hidden:false,classList:{add(){},remove(){}},showModal(){},close(){}});return elements.get(id)};
const ctx={V,Qualification:Q,console,performance,setTimeout:()=>0,clearTimeout(){},document:{getElementById:el},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},confirm:()=>true,URL,Blob};ctx.window=ctx;vm.createContext(ctx);for(const f of ['seasons','app','settings'])vm.runInContext(fs.readFileSync('dist/'+f+'.js','utf8'),ctx);
vm.runInContext('state=V.fresh(); state.rounds.slice(0,30).flat().forEach(V.simulate); V.stampResults(state);tab="table";render()',ctx);assert(el('content').innerHTML.includes('CUỘC ĐUA PLAYOFF'));assert(el('content').innerHTML.includes('Cách xác định chắc suất'));ctx.navigate('playoff');assert(el('content').innerHTML.includes('Đã ghi danh vòng vé vớt'));assert(el('content').innerHTML.includes('Chắc đi tiếp · chờ loại suất'));
vm.runInContext('state.rounds.flat().filter(m=>!m.sets).forEach(V.simulate);V.stampResults(state);render()',ctx);assert(el('content').innerHTML.includes('Tạo vòng vé vớt'));ctx.startPlayin();assert(el('content').innerHTML.includes('HẠNG 13 vs 20'));
console.log(`PASS: ${completions.toLocaleString()} enumerated BO5 endpoint completions, flow-cut schedule constraints, safe search budget, partial/out-of-order rounds, five full seasons, reload/edit recomputation, final ranks and early-entry UI (${Math.round(elapsed)}ms season checks)`);
