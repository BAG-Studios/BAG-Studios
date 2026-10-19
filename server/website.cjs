const {randomUUID}=require('node:crypto');
const {normalizeLayout}=require('../article-layout.js');
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
function text(value,min,max,label){if(typeof value!=='string'||value.trim().length<min||value.trim().length>max)fail(400,`Please enter ${label}.`);return value.trim();}
function parseBody(req){try{return typeof req.body==='string'?JSON.parse(req.body):req.body||{};}catch{fail(400,'Invalid request.');}}
function postInput(body){
 const title=text(body.title,3,150,'a title between 3 and 150 characters');
 const slug=text(body.slug,3,100,'a short URL');if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))fail(400,'Use lowercase letters, numbers and hyphens for the URL.');
 const status=body.status==='published'?'published':'draft';
 let cover_url=String(body.cover_url||'').trim();if(cover_url){try{const url=new URL(cover_url,'https://bag-studios.com');if(url.protocol!=='https:'||url.username||url.password)throw new Error();cover_url=url.href;}catch{fail(400,'Use an HTTPS cover image URL.');}}
 let published_at=null;if(status==='published'){const date=body.published_at?new Date(body.published_at):new Date();if(!Number.isFinite(date.getTime()))fail(400,'Choose a valid publication date.');published_at=date.toISOString();}
 const layout=body.layout?normalizeLayout(body.layout,body.content):null;
 if(layout&&JSON.stringify(layout).length>100000)fail(400,'This story is too large. Please shorten it.');
 return {title,slug,status,category:text(body.category||'STUDIO NOTES',2,60,'a category'),excerpt:text(body.excerpt,10,400,'an introduction between 10 and 400 characters'),content:text(body.content,10,100000,'the article text'),cover_url:cover_url||null,published_at,...(layout?{layout}:{})};
}
function createClient(env,fetchImpl){
 const base=env.SUPABASE_URL?.replace(/\/$/,'');
 async function call(path,{method='GET',body,token,prefer,raw=false,contentType='application/json'}={}){
  const headers={apikey:token?env.SUPABASE_PUBLISHABLE_KEY:env.SUPABASE_SECRET_KEY,'Content-Type':contentType};
  if(token)headers.Authorization='Bearer '+token;
  // Modern secret keys authenticate through apikey; they are not JWT bearer tokens.
  if(prefer)headers.Prefer=prefer;
  let response;try{response=await fetchImpl(base+path,{method,headers,body:body===undefined?undefined:raw?body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}catch{fail(503,'The service is temporarily unavailable. Please try again.');}
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
    if(Number(req.headers['content-length']||0)>(resource==='admin-upload'?3600000:260000))fail(413,'This request is too large.');
   }
   const client=createClient(env,fetchImpl);
   if(resource==='config'&&method==='GET')return res.status(200).json({url:env.SUPABASE_URL,publishableKey:env.SUPABASE_PUBLISHABLE_KEY});
   if(resource==='posts'&&method==='GET'){
    const posts=await client.call('/rest/v1/blog_posts?select=id,slug,title,category,excerpt,cover_url,published_at&status=eq.published&published_at=lte.'+encodeURIComponent(new Date().toISOString())+'&order=published_at.desc&limit=100');
    return res.status(200).json({posts});
   }
   if(!['admin-posts','admin-delete','admin-upload','admin-media'].includes(resource))fail(404,'Not found.');
   const token=/^Bearer (.+)$/.exec(req.headers.authorization||'')?.[1];if(!token)fail(401,'Please sign in.');
   const user=await client.call('/auth/v1/user',{token});
   if(!user?.id||!user.email_confirmed_at||String(user.email).toLowerCase()!==(env.ADMIN_EMAIL||'boringarcadestudios@gmail.com').toLowerCase())fail(403,'This account cannot manage the studio website.');
   if(resource==='admin-upload'&&method==='POST'){
    if(typeof body.base64!=='string'||body.base64.length>3500000||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.base64))fail(400,'Choose a JPEG, PNG or WebP image under 2.5 MB.');
    const bytes=Buffer.from(body.base64,'base64');if(bytes.length>2621440)fail(400,'Choose an image under 2.5 MB.');
    let format='';if(bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a')format='png';else if(bytes.subarray(0,3).toString('hex')==='ffd8ff')format='jpeg';else if(bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP')format='webp';
    if(!format)fail(400,'Choose a valid JPEG, PNG or WebP image.');
    const key=randomUUID()+'.'+(format==='jpeg'?'jpg':format);await client.call('/storage/v1/object/blog-media/'+key,{method:'POST',body:bytes,raw:true,contentType:'image/'+format});
    return res.status(200).json({url:env.SUPABASE_URL+'/storage/v1/object/public/blog-media/'+key});
   }
   if(resource==='admin-media'&&method==='GET'){
    const files=await client.call('/storage/v1/object/list/blog-media',{method:'POST',body:{prefix:'',limit:100,sortBy:{column:'created_at',order:'desc'}}});
    return res.status(200).json({images:(files||[]).filter(f=>f.id&&/\.(png|jpe?g|webp)$/i.test(f.name)).map(f=>({name:f.name,url:env.SUPABASE_URL+'/storage/v1/object/public/blog-media/'+encodeURIComponent(f.name)}))});
   }
   if(resource==='admin-posts'){
    if(method==='GET')return res.status(200).json({posts:await client.call('/rest/v1/blog_posts?select=*&order=updated_at.desc&limit=200')});
    const input=postInput(body);const id=body.id;
    if(id&&!/^[a-f0-9-]{36}$/.test(id))fail(400,'Invalid post.');
    const saved=await client.call('/rest/v1/blog_posts'+(id?'?id=eq.'+id:''),{method:id?'PATCH':'POST',body:{...input,updated_at:new Date().toISOString()},prefer:'return=representation'});
    return res.status(200).json({post:saved?.[0]});
   }
   if(resource==='admin-delete'&&method==='POST'){
    const table=body.kind==='post'?'blog_posts':null;
    if(!table||!/^[a-f0-9-]{36}$/.test(body.id||''))fail(400,'Invalid item.');
    await client.call(`/rest/v1/${table}?id=eq.${body.id}`,{method:'DELETE',prefer:'return=minimal'});return res.status(200).json({ok:true});
   }
   fail(404,'Not found.');
  }catch(error){return res.status(error.status||500).json({error:error.status?error.message:'Something went wrong. Please try again.'});}
 };
}
module.exports={createApi,createClient,escapeHtml,renderText};
