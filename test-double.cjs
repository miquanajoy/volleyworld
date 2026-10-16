const assert=require('node:assert/strict'),V=require('./dist/engine.js');
const clone=x=>JSON.parse(JSON.stringify(x)),win=(m,a=true)=>{m.sets=Array.from({length:3},()=>a?[25,20]:[20,25])};
for(let season=0;season<40;season++){
 const s=V.fresh(V.defaultIds,'double');assert(V.validState(s));s.rounds.flat().forEach(V.simulate);V.startPlayin(s);s.playin.forEach(V.simulate);V.draw(s);assert(V.validState(s));const seeds=JSON.stringify(s.bracket.seeds);
 for(const {key}of V.playoffStages(s)){
  for(const m of s.bracket[key])key==='gf'?win(m,season%2===0):key==='reset'?win(m,season%4===1):V.simulate(m);
  V.advance(s);V.stampResults(s);assert(V.validState(s),`Invalid stage ${key}`);
  if(key==='r16'){assert.equal(s.bracket.lower1[0].a,V.loser(s.bracket.r16[0]));assert.equal(s.bracket.lower1[0].b,V.loser(s.bracket.r16[1]));assert(V.playoffLocked(s,s.bracket.r16[0]));}
  if(key==='qf'){for(let i=0;i<4;i++)assert.equal(s.bracket.lower2[i].b,V.loser(s.bracket.qf[i^1]));}
  if(key==='sf'){for(let i=0;i<2;i++)assert.equal(s.bracket.lower4[i].b,V.loser(s.bracket.sf[i^1]));assert.equal(s.bracket.bronze.length,0);assert(!V.complete(s));}
  if(key==='gf'){assert.equal(s.bracket.reset.length,season%2===0?0:1);assert.equal(V.complete(s),season%2===0);if(season%2)assert(V.playoffLocked(s,s.bracket.gf[0]));}
 }
 assert(V.complete(s));assert.equal(JSON.stringify(s.bracket.seeds),seeds);const playoffs=V.matches(s).filter(m=>!m.id.startsWith('L')&&!m.id.startsWith('P'));assert.equal(playoffs.length,season%2===0?30:31);assert.equal(V.matches(s).length,season%2===0?530:531);assert.equal(V.totalMatches(s),V.matches(s).length);
 const medals=V.podium(s);assert.equal(new Set(medals).size,3);assert.equal(medals[0],V.winner(V.decidingFinal(s)));assert.equal(medals[2],V.loser(s.bracket.lower6[0]));const losses={};for(const m of playoffs)losses[V.loser(m)]=(losses[V.loser(m)]||0)+1;for(const id of Object.keys(s.bracket.seeds))assert.equal(losses[id]||0,id===medals[0]?(season%2===0?0:1):2,'Every eliminated team loses exactly twice');
 assert(V.validState(clone(s)));let bad=clone(s);bad.playoffFormat='single';assert(!V.validState(bad));bad=clone(s);bad.bracket.lower2[0].b=bad.bracket.lower2[0].a;assert(!V.validState(bad));bad=clone(s);bad.bracket.bronze=[{...s.bracket.lower6[0],id:'B0'}];assert(!V.validState(bad));bad=clone(s);bad.bracket.gf[0].a=bad.bracket.gf[0].b;assert(!V.validState(bad));bad=clone(s);bad.bracket.reset=season%2?[]:[{...s.bracket.gf[0],id:'G1'}];if(season%2){assert(!V.complete(bad));assert(!V.validState(bad),'Missing mandatory reset is rejected');}else assert(!V.validState(bad));
}
for(const mode of ['single','double'])for(let i=0;i<8;i++){let s=V.fresh(V.defaultIds,mode);V.finishAll(s);assert(V.complete(s));assert(V.validState(s));assert.equal(V.podium(s).length,3)}
const legacy=V.fresh();delete legacy.playoffFormat;assert(V.validState(legacy));V.finishAll(legacy);assert(V.validState(legacy));assert.equal(V.totalMatches(legacy),516);assert(!V.isDouble(legacy));assert.throws(()=>V.fresh(V.defaultIds,'invalid'));assert(!V.validState({...legacy,playoffFormat:'invalid'}));
console.log('PASS: 40 double-elimination seasons, both grand-final/reset paths, crossed lower entries, exactly two losses per eliminated team, bronze, 530/531 counts, invalid-route rejection, auto-finish and legacy compatibility');
