const fs=require('node:fs');
const url=process.env.SUPABASE_URL||'',key=process.env.SUPABASE_PUBLISHABLE_KEY||'';
if(Boolean(url)!==Boolean(key))throw Error('Set both SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
if(url){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw Error('SUPABASE_URL must use HTTPS.');if(!key.startsWith('sb_publishable_')){try{let payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(payload.role!=='anon')throw Error();}catch{throw Error('Only a publishable key or legacy anon key can be used in the browser. Never use a secret/service role key.');}}}
fs.writeFileSync('dist/config.js','window.VOLLEY_CONFIG = '+JSON.stringify({supabaseUrl:url,supabaseKey:key}).replace(/</g,'\\u003c')+';\n');
console.log(url?'Cloud configuration prepared.':'Local play enabled; cloud awaits configuration.');
