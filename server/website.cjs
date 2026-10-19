const crypto = require('node:crypto');
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new HttpError(status,message)};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderText(text){
 return String(text).split(/\n\s*\n/).filter(Boolean).map(block=>{
  if(/^#{1,3} /.test(block))return '<h2>'+escapeHtml(block.replace(/^#{1,3} /,''))+'</h2>';
  if(block.split('\n').every(line=>/^[-*] /.test(line)))return '<ul>'+block.split('\n').map(line=>'<li>'+escapeHtml(line.slice(2))+'</li>').join('')+'</ul>';
  return '<p>'+escapeHtml(block).replace(/\n/g,'<br>')+'</p>';
 }).join('\n');
}
function csv(rows){return '\ufeff'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');}
function text(value,min,max,label){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,`Please enter ${label}.`);return value.trim();}
function email(value){const result=text(value,3,254,'a valid email address').toLowerCase();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result))fail(400,'Please enter a valid email address.');return result;}
function parseBody(req){try{return typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{fail(400,'Invalid request.');}}
function postInput(body){
 const title=text(body.title,3,150,'a title between 3 and 150 characters');
 const slug=text(body.slug,3,100,'a short URL');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail(400,'Use lowercase letters, numbers and hyphens for the URL.');
 const status=body.status==='published'?'published':'draft';
 let cover_url=String(body.cover_url||'').trim();if(cover_url){try{const url=new URL(cover_url,'https://bag-studios.com');if(url.protocol!=='https:'||url.username||url.password)throw new Error();cover_url=url.href;}catch{fail(400,'Use an HTTPS cover image URL.');}}
 return {title,slug,status,category:text(body.category||'STUDIO NOTES',2,60,'a category'),excerpt:text(body.excerpt,10,400,'an introduction between 10 and 400 characters'),content:text(body.content,10,100000,'the article text'),cover_url:cover_url||null,published_at:status==='published'?(body.published_at?new Date(body.published_at).toISOString():new Date().toISOString()):null};
}
function createClient(env,fetchImpl){
 const base=env.SUPABASE_URL?.replace(/\/$/,'');
 async function call(path,{method='GET',body,token,prefer}={}){
  const headers={apikey:token?env.SUPABASE_PUBLISHABLE_KEY:env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'};
  if(token)headers.Authorization='Bearer '+token;
  // Modern secret keys authenticate through apikey; they are not JWT bearer tokens.
  if(prefer)headers.Prefer=prefer;
  let response;try{response=await fetchImpl(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}catch{fail(503,'The service is temporarily unavailable. Please try again.');}
  if(!response.ok){if(response.status===409)fail(409,'That URL is already used by another post.');if(path.startsWith('/auth/'))fail(401,'Please sign in again.');fail(503,'The service is temporarily unavailable. Please try again.');}
  if(response.status===204)return null;
  try{return await response.json();}catch{return null;}
 }
 return {call};
}
function createApi({env=process.env,fetchImpl=fetch}={}){
 return async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  try{
   if(!env.SUPABASE_URL||!env.SUPABASE_PUBLISHABLE_KEY||!env.SUPABASE_SECRET_KEY)fail(503,'This feature is not available yet. Please contact the studio by email.');
   const resource=req.query?.resource||'';const method=req.method;const body=parseBody(req);
   if(!['GET','POST'].includes(method)){res.setHeader('Allow','GET, POST');fail(405,'Method not allowed.');}
   if(method==='POST'){
    const origin=req.headers.origin;const host=req.headers.host;
    if(!origin||![`https://${host}`,`http://${host}`].includes(origin))fail(403,'Please submit this form from the BAG Studios website.');
    if(Number(req.headers['content-length']||0)>140000)fail(413,'This request is too large.');
   }
   const client=createClient(env,fetchImpl);
   if(resource==='config'&&method==='GET')return res.status(200).json({url:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY});
   if(resource==='posts'&&method==='GET'){
    const posts=await client.call('/rest/v1/blog_posts?select=id,slug,title,category,excerpt,cover_url,published_at&status=eq.published&published_at=lte.'+encodeURIComponent(new Date().toISOString())+'&order=published_at.desc&limit=100');
    return res.status(200).json({posts});
   }
   if(['contact','newsletter'].includes(resource)&&method==='POST'){
    if(body.website)return res.status(200).json({ok:true});
    if(body.consent!==true)fail(400,'Please confirm the privacy notice before submitting.');
    const address=email(body.email);
    const payload=resource==='contact'?{name:text(body.name,2,100,'your name'),email:address,subject:text(body.subject,2,160,'a subject'),message:text(body.message,10,5000,'a message between 10 and 5,000 characters'),consent_at:new Date().toISOString()}:{email:address,consent_at:new Date().toISOString(),consent_version:'2026-10-19',unsubscribe_token:crypto.randomBytes(32).toString('hex')};
    // Vercel overwrites x-real-ip at its edge; do not trust arbitrary forwarded chains.
    const ip=req.headers['x-real-ip']||'local';const key=crypto.createHmac('sha256',env.SUPABASE_SECRET_KEY).update(resource+':'+ip).digest('hex');
    const allowed=await client.call('/rest/v1/rpc/website_take_rate_limit',{method:'POST',body:{p_key:key,p_limit:5,p_window_seconds:3600}});
    if(!allowed){res.setHeader('Retry-After','3600');fail(429,'Too many submissions. Please try again in an hour.');}
    await client.call(resource==='contact'?'/rest/v1/contact_messages':'/rest/v1/newsletter_subscribers?on_conflict=email',{method:'POST',body:payload,prefer:resource==='newsletter'?'resolution=ignore-duplicates,return=minimal':'return=minimal'});
    return res.status(200).json({ok:true});
   }
   if(resource==='unsubscribe'&&method==='POST'){
    if(!/^[a-f0-9]{64}$/.test(String(body.token||'')))fail(400,'This unsubscribe link is invalid.');
    await client.call('/rest/v1/newsletter_subscribers?unsubscribe_token=eq.'+body.token,{method:'PATCH',body:{unsubscribed_at:new Date().toISOString()},prefer:'return=minimal'});
    return res.status(200).json({ok:true});
   }
   if(!resource.startsWith('admin-'))fail(404,'Not found.');
   const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token)fail(401,'Please sign in.');
   const user=await client.call('/auth/v1/user',{token});
   if(!user?.id||!user.email_confirmed_at||String(user.email).toLowerCase()!==(env.ADMIN_EMAIL||'boringarcadestudios@gmail.com').toLowerCase())fail(403,'This account cannot manage the studio website.');
   if(resource==='admin-posts'){
    if(method==='GET')return res.status(200).json({posts:await client.call('/rest/v1/blog_posts?select=*&order=updated_at.desc&limit=200')});
    const input=postInput(body);const id=body.id;
    if(id&&!/^[a-f0-9-]{36}$/.test(id))fail(400,'Invalid post.');
    const saved=await client.call('/rest/v1/blog_posts'+(id?'?id=eq.'+id:''),{method:id?'PATCH':'POST',body:{...input,updated_at:new Date().toISOString()},prefer:'return=representation'});
    return res.status(200).json({post:saved?.[0]});
   }
   if(resource==='admin-messages'&&method==='GET')return res.status(200).json({messages:await client.call('/rest/v1/contact_messages?select=*&order=created_at.desc&limit=200')});
   if(resource==='admin-subscribers'&&method==='GET')return res.status(200).json({subscribers:await client.call('/rest/v1/newsletter_subscribers?select=id,email,consent_at,consent_version,unsubscribed_at,unsubscribe_token&order=consent_at.desc&limit=1000')});
   if(resource==='admin-delete'&&method==='POST'){
    const table={post:'blog_posts',message:'contact_messages',subscriber:'newsletter_subscribers'}[body.kind];
    if(!table||!/^[a-f0-9-]{36}$/.test(body.id||''))fail(400,'Invalid item.');
    await client.call(`/rest/v1/${table}?id=eq.${body.id}`,{method:'DELETE',prefer:'return=minimal'});return res.status(200).json({ok:true});
   }
   fail(404,'Not found.');
  }catch(error){return res.status(error.status||500).json({error:error.status?error.message:'Something went wrong. Please try again.'});}
 };
}
module.exports={createApi,createClient,escapeHtml,renderText,csv};
