(function(root){
const raw=[['POL','Ba Lan','🇵🇱','CEV',1,422.98],['ITA','Ý','🇮🇹','CEV',2,362.55],['RUS','Nga','🇷🇺','CEV',3,359.48],['USA','Mỹ','🇺🇸','NORCECA',4,358.60],['JPN','Nhật Bản','🇯🇵','AVC',5,352.70],['BRA','Brazil','🇧🇷','CSV',6,333.79],['SLO','Slovenia','🇸🇮','CEV',7,325.01],['FRA','Pháp','🇫🇷','CEV',8,323.43],['BUL','Bulgaria','🇧🇬','CEV',9,285.01],['FIN','Phần Lan','🇫🇮','CEV',10,263.92],['GER','Đức','🇩🇪','CEV',11,262.21],['UKR','Ukraine','🇺🇦','CEV',12,255.62],['CUB','Cuba','🇨🇺','NORCECA',13,250.31],['ARG','Argentina','🇦🇷','CSV',14,245.70],['BEL','Bỉ','🇧🇪','CEV',15,244.77],['CAN','Canada','🇨🇦','NORCECA',16,244.62],['TUR','Thổ Nhĩ Kỳ','🇹🇷','CEV',17,237.64],['SRB','Serbia','🇷🇸','CEV',18,224.83],['IRI','Iran','🇮🇷','AVC',19,224.70],['CZE','Cộng hòa Séc','🇨🇿','CEV',20,214.91],['GRE','Hy Lạp','🇬🇷','CEV',21,176.97],['MEX','Mexico','🇲🇽','NORCECA',24,169.14],['KOR','Hàn Quốc','🇰🇷','AVC',25,163.10],['PUR','Puerto Rico','🇵🇷','NORCECA',26,153.60],['CHI','Chile','🇨🇱','CSV',28,151.35],['EGY','Ai Cập','🇪🇬','CAVB',29,150.49],['TUN','Tunisia','🇹🇳','CAVB',31,149.30],['CHN','Trung Quốc','🇨🇳','AVC',34,134.53],['PAK','Pakistan','🇵🇰','AVC',39,125.42],['COL','Colombia','🇨🇴','CSV',42,120.97],['DOM','Cộng hòa Dominica','🇩🇴','NORCECA',50,103.28],['VEN','Venezuela','🇻🇪','CSV',56,87.09]];
const teams=raw.map(([id,name,flag,region,rank,rating])=>({id,name,flag,region,rank,rating}));
const reserves=[["ROU", "Romania", "🇷🇴", "CEV", 22, 173.46], ["NED", "Hà Lan", "🇳🇱", "CEV", 23, 171.34], ["DEN", "Đan Mạch", "🇩🇰", "CEV", 27, 151.36], ["EST", "Estonia", "🇪🇪", "CEV", 30, 150.03], ["POR", "Bồ Đào Nha", "🇵🇹", "CEV", 32, 141.67], ["SUI", "Thụy Sĩ", "🇨🇭", "CEV", 33, 136.05], ["ISR", "Israel", "🇮🇱", "CEV", 35, 132.4], ["ESP", "Tây Ban Nha", "🇪🇸", "CEV", 36, 132.18], ["SWE", "Thụy Điển", "🇸🇪", "CEV", 37, 132.02], ["BLR", "Belarus", "🇧🇾", "CEV", 38, 130.97], ["CRO", "Croatia", "🇭🇷", "CEV", 40, 123.39], ["AUS", "Australia", "🇦🇺", "AVC", 41, 121.75], ["QAT", "Qatar", "🇶🇦", "AVC", 43, 120.64], ["BRN", "Bahrain", "🇧🇭", "AVC", 44, 119.63], ["LAT", "Latvia", "🇱🇻", "CEV", 45, 117.04], ["INA", "Indonesia", "🇮🇩", "AVC", 46, 112.92], ["HUN", "Hungary", "🇭🇺", "CEV", 47, 104.76], ["IND", "Ấn Độ", "🇮🇳", "AVC", 48, 103.98], ["CMR", "Cameroon", "🇨🇲", "CAVB", 49, 103.92], ["SVK", "Slovakia", "🇸🇰", "CEV", 51, 102.79], ["THA", "Thái Lan", "🇹🇭", "AVC", 52, 96.8], ["MKD", "Bắc Macedonia", "🇲🇰", "CEV", 53, 95.26], ["TPE", "Đài Bắc Trung Hoa", "🇹🇼", "AVC", 54, 88.92], ["AUT", "Áo", "🇦🇹", "CEV", 55, 87.49], ["SMR", "San Marino", "🇸🇲", "CEV", 57, 84], ["VIE", "Việt Nam", "🇻🇳", "AVC", 58, 82.42], ["DMA", "Dominica", "🇩🇲", "NORCECA", 59, 77.14], ["SCO", "Scotland", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "CEV", 60, 76.93], ["OMA", "Oman", "🇴🇲", "AVC", 61, 74.77], ["MNE", "Montenegro", "🇲🇪", "CEV", 62, 74.64], ["LCA", "Saint Lucia", "🇱🇨", "NORCECA", 63, 73.67], ["BIZ", "Belize", "🇧🇿", "NORCECA", 64, 73.55], ["BAR", "Barbados", "🇧🇧", "NORCECA", 65, 72.33], ["KEN", "Kenya", "🇰🇪", "CAVB", 66, 67.9], ["CYP", "Síp", "🇨🇾", "CEV", 67, 67.28], ["NGR", "Nigeria", "🇳🇬", "CAVB", 68, 66.41], ["JAM", "Jamaica", "🇯🇲", "NORCECA", 69, 65.79], ["ALG", "Algeria", "🇩🇿", "CAVB", 70, 64.69], ["TKM", "Turkmenistan", "🇹🇲", "AVC", 71, 63.93], ["KGZ", "Kyrgyzstan", "🇰🇬", "AVC", 72, 63.63], ["ALB", "Albania", "🇦🇱", "CEV", 73, 62.3], ["KAZ", "Kazakhstan", "🇰🇿", "AVC", 74, 61.9], ["NCA", "Nicaragua", "🇳🇮", "NORCECA", 75, 60.27], ["UAE", "UAE", "🇦🇪", "AVC", 76, 58.47], ["BOL", "Bolivia", "🇧🇴", "CSV", 77, 55.63], ["GHA", "Ghana", "🇬🇭", "CAVB", 78, 55.3], ["RWA", "Rwanda", "🇷🇼", "CAVB", 79, 54.92], ["BAN", "Bangladesh", "🇧🇩", "AVC", 80, 54.47], ["KSA", "Saudi Arabia", "🇸🇦", "AVC", 81, 54.29], ["ANT", "Antigua và Barbuda", "🇦🇬", "NORCECA", 82, 54.04], ["NOR", "Na Uy", "🇳🇴", "CEV", 83, 53.36], ["BIH", "Bosnia và Herzegovina", "🇧🇦", "CEV", 84, 52.86], ["NIR", "Bắc Ireland", "🇬🇧", "CEV", 85, 52.14], ["LBA", "Libya", "🇱🇾", "CAVB", 86, 51.08], ["NIG", "Niger", "🇳🇪", "CAVB", 87, 51.04], ["GUA", "Guatemala", "🇬🇹", "NORCECA", 88, 49.13], ["UGA", "Uganda", "🇺🇬", "CAVB", 89, 48.96], ["SRI", "Sri Lanka", "🇱🇰", "AVC", 90, 48.18], ["SEN", "Senegal", "🇸🇳", "CAVB", 91, 46.93], ["PHI", "Philippines", "🇵🇭", "AVC", 92, 46.19], ["CUW", "Curaçao", "🇨🇼", "NORCECA", 93, 45.39], ["FRO", "Quần đảo Faroe", "🇫🇴", "CEV", 94, 45.3], ["GRN", "Grenada", "🇬🇩", "NORCECA", 95, 44.82], ["ESA", "El Salvador", "🇸🇻", "NORCECA", 96, 44.48], ["IRQ", "Iraq", "🇮🇶", "AVC", 97, 43.98], ["KUW", "Kuwait", "🇰🇼", "AVC", 98, 40.83], ["MAR", "Morocco", "🇲🇦", "CAVB", 99, 38.87], ["BAH", "Bahamas", "🇧🇸", "NORCECA", 100, 38.85]];
const catalog=[...teams,...reserves.map(([id,name,flag,region,rank,rating])=>({id,name,flag,region,rank,rating}))].sort((a,b)=>a.rank-b.rank);
const limits={CEV:{min:2,max:20},NORCECA:{min:2,max:12},AVC:{min:2,max:12},CSV:{min:2,max:6},CAVB:{min:2,max:8}};
const defaultIds=teams.map(t=>t.id);
const ids=s=>s.teamIds||defaultIds;
const participants=s=>ids(s).map(get);
const regionTeams=r=>catalog.filter(t=>t.region===r);
const quotas=list=>Object.fromEntries(Object.keys(limits).map(r=>[r,list.filter(id=>get(id)?.region===r).length]));
function validRoster(list){if(!Array.isArray(list)||list.length!==32||new Set(list).size!==32||!list.every(id=>get(id)))return false;let q=quotas(list);return Object.keys(limits).every(r=>q[r]>=limits[r].min&&q[r]<=limits[r].max);}
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a};
const match=(a,b,id)=>({id,a,b,sets:null});
function fresh(selected=defaultIds,playoffFormat='single'){if(!['single','double'].includes(playoffFormat))throw Error('Thể thức playoff không hợp lệ.');if(!validRoster(selected))throw Error('Danh sách cần đủ 32 đội, không trùng, đúng giới hạn khu vực.');let ring=shuffle(selected),rounds=[];for(let r=0;r<31;r++){let ms=[];for(let i=0;i<16;i++)ms.push(match(ring[i],ring[31-i],`L${r}-${i}`));rounds.push(ms);ring.splice(1,0,ring.pop());}return ensureSeason({version:1,playoffFormat,teamIds:[...selected],rounds,tie:shuffle(selected),playin:null,bracket:null},true);}
const get=id=>catalog.find(t=>t.id===id);
function score(m){let a=0,b=0;for(const [x,y]of m.sets||[])x>y?a++:b++;return[a,b];}
const winner=m=>m.sets?(score(m)[0]===3?m.a:m.b):null;
const loser=m=>m.sets?(winner(m)===m.a?m.b:m.a):null;
function simulate(m){let aw=0,bw=0,sets=[];const p=.5+.15*Math.tanh((get(m.a).rating-get(m.b).rating)/180)+(Math.random()-.5)*.04;while(aw<3&&bw<3){let a=0,b=0,target=sets.length===4?15:25;while(Math.max(a,b)<target||Math.abs(a-b)<2){Math.random()<p?a++:b++;}sets.push([a,b]);a>b?aw++:bw++;}m.sets=sets;return m;}
function validate(sets){if(!Array.isArray(sets)||sets.length<3||sets.length>5)return false;let w=0,l=0;for(let i=0;i<sets.length;i++){if(w===3||l===3)return false;let [a,b]=sets[i],t=i===4?15:25;if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||Math.max(a,b)<t||Math.abs(a-b)<2)return false;if(Math.max(a,b)>t&&Math.abs(a-b)!==2)return false;a>b?w++:l++;}return w===3||l===3;}
function standings(s){let rows=participants(s).map(t=>({...t,w:0,l:0,sf:0,sa:0,pf:0,pa:0})),map=Object.fromEntries(rows.map(t=>[t.id,t]));for(const m of s.rounds.flat()){if(!m.sets)continue;let[a,b]=score(m),x=map[m.a],y=map[m.b];x.sf+=a;x.sa+=b;y.sf+=b;y.sa+=a;a>b?(x.w++,y.l++):(y.w++,x.l++);for(const[p,q]of m.sets){x.pf+=p;x.pa+=q;y.pf+=q;y.pa+=p;}}const primary=(a,b)=>b.w-a.w||a.l-b.l||(b.sf-b.sa)-(a.sf-a.sa)||(b.pf-b.pa)-(a.pf-a.pa);rows.sort(primary);for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&!primary(rows[i],rows[j]))j++;const group=rows.slice(i,j),ids=new Set(group.map(x=>x.id)),hw=Object.fromEntries(group.map(x=>[x.id,0]));for(const m of s.rounds.flat())if(m.sets&&ids.has(m.a)&&ids.has(m.b))hw[winner(m)]++;group.sort((a,b)=>hw[b.id]-hw[a.id]||s.tie.indexOf(a.id)-s.tie.indexOf(b.id));rows.splice(i,j-i,...group);i=j;}return rows;}
const leagueDone=s=>s.rounds.flat().every(m=>m.sets);
function startPlayin(s){if(!leagueDone(s))throw Error('League chưa kết thúc');const r=standings(s);s.playin=Array.from({length:4},(_,i)=>match(r[12+i].id,r[19-i].id,`P${i}`));}
function draw(s){if(!s.playin?.every(m=>m.sets))throw Error('Vé vớt chưa kết thúc');let r=standings(s),seeds=[r.slice(0,4).map(x=>x.id),r.slice(4,8).map(x=>x.id),r.slice(8,12).map(x=>x.id),s.playin.map(winner)].map(shuffle);s.bracket={seeds:Object.fromEntries(seeds.flatMap((ids,i)=>ids.map(id=>[id,i+1]))),r16:[],qf:[],sf:[],final:[],bronze:[]};if(isDouble(s))for(const key of ['lower1','lower2','lower3','lower4','lower5','lower6','gf','reset'])s.bracket[key]=[];for(let i=0;i<4;i++)s.bracket.r16.push(match(seeds[0][i],seeds[3][i],`R${i*2}`),match(seeds[1][i],seeds[2][i],`R${i*2+1}`));}
const isDouble=s=>s.playoffFormat==='double';
const formatName=s=>isDouble(s)?'Nhánh thắng – nhánh thua':'Loại trực tiếp';
const source=(outcome,key,i)=>[outcome,key,i];
function playoffStages(s){
 const pairRound=(key,label,from,count,prefix,outcome='w',kind='upper')=>({key,label,count,prefix,kind,pairs:Array.from({length:count},(_,i)=>[source(outcome,from,i*2),source(outcome,from,i*2+1)])});
 const upper=[{key:'r16',label:'Vòng 16 đội',count:8,prefix:'R',kind:'upper'},pairRound('qf','Tứ kết','r16',4,'Q'),pairRound('sf','Bán kết','qf',2,'S'),pairRound('final',isDouble(s)?'Chung kết nhánh thắng':'Chung kết','sf',1,'F')];
 if(!isDouble(s))return [...upper,pairRound('bronze','Tranh hạng ba','sf',1,'B','l','medal')];
 const lower1=pairRound('lower1','Nhánh thua · Vòng 1','r16',4,'D1-','l','lower');
 const lower2={key:'lower2',label:'Nhánh thua · Vòng 2',count:4,prefix:'D2-',kind:'lower',pairs:Array.from({length:4},(_,i)=>[source('w','lower1',i),source('l','qf',i^1)])};
 const lower3=pairRound('lower3','Nhánh thua · Vòng 3','lower2',2,'D3-','w','lower');
 const lower4={key:'lower4',label:'Nhánh thua · Vòng 4',count:2,prefix:'D4-',kind:'lower',pairs:Array.from({length:2},(_,i)=>[source('w','lower3',i),source('l','sf',i^1)])};
 const lower5=pairRound('lower5','Nhánh thua · Vòng 5','lower4',1,'D5-','w','lower');
 const lower6={key:'lower6',label:'Chung kết nhánh thua',count:1,prefix:'D6-',kind:'lower',pairs:[[source('w','lower5',0),source('l','final',0)]]};
 const gf={key:'gf',label:'Chung kết tổng · Trận 1',count:1,prefix:'G',kind:'grand',pairs:[[source('w','final',0),source('w','lower6',0)]]};
 const reset={key:'reset',label:'Chung kết tổng · Trận quyết định',count:1,prefix:'G',offset:1,kind:'grand',pairs:[[source('a','gf',0),source('b','gf',0)]],reset:true};
 return [upper[0],lower1,upper[1],lower2,lower3,upper[2],lower4,lower5,upper[3],lower6,gf,reset];
}
function expectedStage(s,def){const b=s.bracket;if(!b||!def.pairs)return null;if(def.reset&&(!b.gf[0]?.sets||winner(b.gf[0])!==b.gf[0].b))return null;
 const keys=[...new Set(def.pairs.flat().map(src=>src[1]))];if(!keys.every(key=>b[key]?.length===playoffStages(s).find(d=>d.key===key)?.count&&b[key].every(m=>m.sets)))return null;
 return def.pairs.map(pair=>pair.map(([out,key,i])=>{const m=b[key][i];return out==='w'?winner(m):out==='l'?loser(m):m[out]}));
}
function advance(s){const b=s.bracket;if(!b)return;for(const def of playoffStages(s).slice(1)){if(b[def.key].length)continue;const pairs=expectedStage(s,def);if(pairs)b[def.key]=pairs.map(([a,c],i)=>match(a,c,def.prefix+(i+(def.offset||0))))}}
function playoffLocked(s,m){if(!s.bracket)return false;const stages=playoffStages(s),key=stages.find(d=>s.bracket[d.key].some(x=>x.id===m.id))?.key;return !!key&&stages.some(d=>s.bracket[d.key].length&&d.pairs?.flat().some(src=>src[1]===key));}
function decidingFinal(s){const b=s.bracket;if(!b)return null;if(!isDouble(s))return b.final[0]||null;return b.gf[0]?.sets&&winner(b.gf[0])===b.gf[0].b?b.reset[0]||null:b.gf[0]||null}
function podium(s){if(!complete(s))return [];const f=decidingFinal(s);return [winner(f),loser(f),isDouble(s)?loser(s.bracket.lower6[0]):winner(s.bracket.bronze[0])]}
function totalMatches(s){if(!isDouble(s))return 516;const gf=s.bracket?.gf?.[0];return gf?.sets&&winner(gf)===gf.a?530:531}
function matchLabel(s,m){if(m.id.startsWith('P'))return 'Vòng vé vớt';return playoffStages(s).find(d=>s.bracket?.[d.key]?.some(x=>x.id===m.id))?.label||'Playoff'}
function stageSlots(s,key){const def=playoffStages(s).find(d=>d.key===key);if(!def)return [];const b=s.bracket,short={r16:'R',qf:'Q',sf:'S',final:'F',lower1:'LB1-',lower2:'LB2-',lower3:'LB3-',lower4:'LB4-',lower5:'LB5-',lower6:'LB6-',gf:'GF'};
 return Array.from({length:def.count},(_,i)=>({m:b?.[key]?.[i]||null,waiting:def.pairs?.[i].map(([out,src,j])=>{const m=b?.[src]?.[j];if(m?.sets)return out==='w'?winner(m):out==='l'?loser(m):m[out];return out==='a'?'Đại diện nhánh thắng':out==='b'?'Đại diện nhánh thua':`${out==='w'?'Thắng':'Thua'} ${short[src]}${j+1}`})||['Chờ đội tuyển','Chờ đội tuyển']}));
}
function matches(s){return [...s.rounds.flat(),...(s.playin||[]),...Object.values(s.bracket||{}).filter(Array.isArray).flat()]}
function stampResults(s){const all=matches(s);let n=Math.max(0,...all.filter(m=>m.sets&&Number.isSafeInteger(m.resultOrder)).map(m=>m.resultOrder));for(const m of all)if(m.sets&&!Number.isSafeInteger(m.resultOrder))m.resultOrder=++n;return s;}
function recentForm(s,id){return matches(s).map((m,index)=>({m,index})).filter(({m})=>m.sets&&(m.a===id||m.b===id)).sort((a,b)=>{const x=Number.isSafeInteger(a.m.resultOrder),y=Number.isSafeInteger(b.m.resultOrder);return Number(x)-Number(y)||(x?a.m.resultOrder-b.m.resultOrder:a.index-b.index)||a.index-b.index}).slice(-5).map(({m})=>{const a=m.a===id,[x,y]=score(m);return{win:winner(m)===id,opponent:a?m.b:m.a,score:a?[x,y]:[y,x],matchId:m.id}})}
function inspectScoreInputs(rows){const errors=Array(5).fill(''),focusSides=Array(5).fill(0),sets=[],pair=(x)=>x!==''&&x!==null&&x!==undefined;let aw=0,bw=0,gap=false,prefix=true,hasPair=false,lastFilled=-1;
for(let i=0;i<5;i++)if(pair(rows[i]?.[0])||pair(rows[i]?.[1]))lastFilled=i;
for(let i=0;i<5;i++){const a=rows[i]?.[0]??'',b=rows[i]?.[1]??'',pa=pair(a),pb=pair(b),target=i===4?15:25;
if(pa&&pb)hasPair=true;
if(aw===3||bw===3){if(pa||pb)errors[i]=`Trận đã kết thúc trước Set ${i+1}. Hãy xóa điểm set này.`;continue;}
if(!pa&&!pb){if(i<=lastFilled){errors[i]=`Nhập đủ điểm Set ${i+1}; không bỏ trống trước set tiếp theo.`;gap=true;prefix=false;}else if(prefix&&aw<3&&bw<3){errors[i]=lastFilled<0?'Nhập điểm cho Set 1.':`Trận chưa kết thúc. Nhập Set ${i+1} để có đội thắng 3 set.`;prefix=false;}continue;}
if(!pa||!pb){errors[i]=`Set ${i+1}: nhập đủ điểm của cả hai đội.`;focusSides[i]=pa?1:0;prefix=false;continue;}
const x=Number(a),y=Number(b);
if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||x<0||y<0){errors[i]='Điểm phải là số nguyên không âm.';focusSides[i]=!Number.isSafeInteger(x)||x<0?0:1;prefix=false;continue;}
if(x===y)errors[i]=`Set ${i+1} không thể kết thúc với tỷ số hòa.`;
else if(Math.max(x,y)<target)errors[i]=`Set ${i+1}: đội thắng phải đạt ít nhất ${target} điểm.`;
else if(Math.abs(x-y)<2)errors[i]=`Set ${i+1}: cần cách biệt ít nhất 2 điểm.`;
else if(Math.max(x,y)>target&&Math.abs(x-y)!==2)errors[i]=`Set ${i+1}: sau mốc ${target}, phải kết thúc ngay khi hơn 2 điểm (ví dụ ${target+1}–${target-1}).`;
if(errors[i]){prefix=false;continue;}
if(gap){prefix=false;continue;}
sets.push([x,y]);if(prefix){x>y?aw++:bw++;}
}
return{errors,focusSides,sets,score:[aw,bw],hasPair,valid:!errors.some(Boolean)&&validate(sets)};}
function ensureSeason(s,newId=false){if(!s.seasonId)s.seasonId=newId?(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'season-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)):'legacy-season-1';if(!s.seasonNumber)s.seasonNumber=1;if(!s.seasonCreatedAt)s.seasonCreatedAt=new Date().toISOString();return s;}
const started=s=>s.rounds.some(r=>r.some(m=>m.sets));
const complete=s=>isDouble(s)?!!(s.bracket?.gf?.[0]?.sets&&(winner(s.bracket.gf[0])===s.bracket.gf[0].a||s.bracket.reset?.[0]?.sets)):!!(s.bracket?.final[0]?.sets&&s.bracket?.bronze[0]?.sets);
function finishAll(s){stampResults(s);s.rounds.flat().filter(m=>!m.sets).forEach(simulate);if(!s.playin)startPlayin(s);s.playin.filter(m=>!m.sets).forEach(simulate);if(!s.bracket)draw(s);advance(s);for(const {key} of playoffStages(s)){s.bracket[key].filter(m=>!m.sets).forEach(simulate);advance(s);}return stampResults(s);}
function validState(s){try{
if(s?.seasonId!==undefined&&(typeof s.seasonId!=="string"||!s.seasonId.match(/^[a-zA-Z0-9-]{1,100}$/)))return false;if(s?.seasonNumber!==undefined&&(!Number.isSafeInteger(s.seasonNumber)||s.seasonNumber<1))return false;
if(s?.playoffFormat!==undefined&&!['single','double'].includes(s.playoffFormat))return false;
if(s?.version!==1||!validRoster(ids(s))||!Array.isArray(s.rounds)||s.rounds.length!==31||!Array.isArray(s.tie)||s.tie.length!==32||new Set(s.tie).size!==32||!s.tie.every(id=>ids(s).includes(id)))return false;
const roster=new Set(ids(s)),pairs=new Set(),matchIds=new Set(),resultOrders=new Set();
const check=m=>{if(m?.resultOrder!==undefined){if(!m.sets||!Number.isSafeInteger(m.resultOrder)||m.resultOrder<1||resultOrders.has(m.resultOrder))return false;resultOrders.add(m.resultOrder)}if(!m||typeof m.id!=='string'||!m.id.match(/^[LPRQSFBDG0-9-]+$/)||matchIds.has(m.id)||!roster.has(m.a)||!roster.has(m.b)||m.a===m.b||(m.sets!==null&&!validate(m.sets)))return false;matchIds.add(m.id);return true};
for(const r of s.rounds){if(!Array.isArray(r)||r.length!==16||new Set(r.flatMap(m=>[m.a,m.b])).size!==32)return false;for(const m of r){if(!check(m))return false;pairs.add([m.a,m.b].sort().join('-'));}}if(pairs.size!==496)return false;
if(s.playin!==null){if(!leagueDone(s)||!Array.isArray(s.playin)||s.playin.length!==4||!s.playin.every(check))return false;const ranked=standings(s);if(!s.playin.every((m,i)=>m.a===ranked[12+i].id&&m.b===ranked[19-i].id))return false;}
if(s.bracket!==null){const b=s.bracket,stages=playoffStages(s),allowed=new Set(['seeds','bronze',...stages.map(d=>d.key)]);if(!s.playin?.every(m=>m.sets)||!b.seeds||Object.keys(b).some(k=>!allowed.has(k)))return false;
for(const def of stages)if(!Array.isArray(b[def.key])||(b[def.key].length!==0&&b[def.key].length!==def.count)||!b[def.key].every(check))return false;
if(isDouble(s)&&(!Array.isArray(b.bronze)||b.bronze.length))return false;
if(b.r16.length!==8||!b.r16.every((m,i)=>m.id==='R'+i))return false;const ranked=standings(s).map(t=>t.id),seedGroups=[ranked.slice(0,4),ranked.slice(4,8),ranked.slice(8,12),s.playin.map(winner)],eligible=seedGroups.flat();
if(Object.keys(b.seeds).length!==16||!seedGroups.every((list,i)=>list.every(id=>b.seeds[id]===i+1)))return false;
if(new Set(b.r16.flatMap(m=>[m.a,m.b])).size!==16||!b.r16.every((m,i)=>eligible.includes(m.a)&&eligible.includes(m.b)&&b.seeds[m.a]===(i%2===0?1:2)&&b.seeds[m.b]===(i%2===0?4:3)))return false;
for(let i=0;i<8;i+=2)if(b.r16.slice(i,i+2).flatMap(m=>[m.a,m.b]).map(id=>b.seeds[id]).sort().join('')!=='1234')return false;
for(const def of stages.slice(1)){const expected=expectedStage(s,def);if(isDouble(s)&&!!expected!==!!b[def.key].length)return false;if(b[def.key].length&&(!expected||!b[def.key].every((m,i)=>m.id===def.prefix+(i+(def.offset||0))&&m.a===expected[i][0]&&m.b===expected[i][1])))return false;}
}return true;
}catch{return false}}
const api={isDouble,formatName,playoffStages,playoffLocked,decidingFinal,podium,totalMatches,matchLabel,stageSlots,matches,stampResults,recentForm,inspectScoreInputs,ensureSeason,started,complete,finishAll,catalog,limits,defaultIds,ids,participants,regionTeams,quotas,validRoster,validState,teams,fresh,get,score,winner,loser,simulate,validate,standings,leagueDone,startPlayin,draw,advance};if(typeof module!=='undefined')module.exports=api;root.V=api;
})(typeof window==='undefined'?globalThis:window);
