const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApi, renderText } = require('../server/website.cjs');
const env = { SUPABASE_URL:'https://example.supabase.co', SUPABASE_PUBLISHABLE_KEY:'public-test', SUPABASE_SECRET_KEY:'private-test', ADMIN_EMAIL:'boringarcadestudios@gmail.com' };
function response() { return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(b){this.body=b;return this}}; }
function request(resource,body,headers={}) { return {method:body?'POST':'GET',query:{resource},headers:{host:'localhost:3000',origin:'http://localhost:3000',...headers},body}; }
const ok = data => ({ok:true,status:200,json:async()=>data,text:async()=>JSON.stringify(data)});
test('removed contact, newsletter and unsubscribe features cannot access the database',async()=>{
 const api=createApi({env,fetchImpl:async()=>assert.fail('Removed endpoint touched the database')});
 for(const resource of ['contact','newsletter','unsubscribe','admin-messages','admin-subscribers']){
  const res=response();await api(request(resource,{email:'removed@example.com',consent:true}),res);assert.equal(res.statusCode,404,resource);
 }
});
test('admin data requires a verified session',async()=>{
 const api=createApi({env,fetchImpl:async()=>assert.fail('Unexpected network access')});const res=response();
 await api(request('admin-posts'),res);assert.equal(res.statusCode,401);
});
test('a signed-in non-owner cannot access blog administration',async()=>{
 const api=createApi({env,fetchImpl:async(url)=>{assert.match(url,/auth\/v1\/user/);return ok({id:'other',email:'other@example.com',email_confirmed_at:'2026-01-01'});}});const res=response();
 await api(request('admin-posts',null,{authorization:'Bearer valid-other-token'}),res);assert.equal(res.statusCode,403);
});
test('public posts query excludes drafts, future publication dates and content',async()=>{
 const api=createApi({env,fetchImpl:async(url)=>{const u=new URL(url);assert.equal(u.searchParams.get('status'),'eq.published');assert.match(u.searchParams.get('published_at'),/^lte\./);assert.doesNotMatch(u.searchParams.get('select'),/content/);return ok([]);}});const res=response();
 await api(request('posts'),res);assert.equal(res.statusCode,200);assert.deepEqual(res.body.posts,[]);
});
test('unavailable configuration returns an honest failure',async()=>{
 const res=response();await createApi({env:{}})(request('posts'),res);assert.equal(res.statusCode,503);
});
test('client configuration never returns the server secret',async()=>{
 const res=response();await createApi({env})(request('config'),res);assert.equal(res.statusCode,200);assert.equal(res.body.publishableKey,'public-test');assert.ok(!JSON.stringify(res.body).includes('private-test'));
});
test('image uploads require owner authentication',async()=>{
 const res=response();await createApi({env,fetchImpl:async()=>assert.fail('Unexpected upload')})(request('admin-upload',{base64:'bad'}),res);assert.equal(res.statusCode,401);
});
test('image uploads reject disguised HTML after validating the owner',async()=>{
 const res=response();await createApi({env,fetchImpl:async()=>ok({id:'owner',email:env.ADMIN_EMAIL,email_confirmed_at:'2026-01-01'})})(request('admin-upload',{base64:Buffer.from('<html>not an image</html>').toString('base64')},{authorization:'Bearer owner'}),res);assert.equal(res.statusCode,400);
});
test('valid image upload is sent as binary only after verifying the owner',async()=>{
 let calls=0;const bytes=Buffer.from('89504e470d0a1a0a00000000','hex');const api=createApi({env,fetchImpl:async(url,options)=>{
  calls++;if(url.includes('/auth/'))return ok({id:'owner',email:env.ADMIN_EMAIL,email_confirmed_at:'2026-01-01'});
  assert.match(url,/storage\/v1\/object\/blog-media\/[a-f0-9-]+\.png$/);assert.ok(Buffer.isBuffer(options.body));assert.equal(options.headers['Content-Type'],'image/png');return ok({Key:'saved'});
 }});const res=response();await api(request('admin-upload',{base64:bytes.toString('base64')},{authorization:'Bearer owner'}),res);assert.equal(res.statusCode,200);assert.equal(calls,2);assert.match(res.body.url,/https:\/\/example.supabase.co\/storage\/v1\/object\/public\/blog-media\//);
});
test('owner saves structured article content and captions without permitting raw HTML blocks',async()=>{
 let payload;const api=createApi({env,fetchImpl:async(url,options)=>{if(url.includes('/auth/'))return ok({id:'owner',email:env.ADMIN_EMAIL,email_confirmed_at:'2026-01-01'});payload=JSON.parse(options.body);return ok([{...payload,id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'}]);}});
 const res=response();await api(request('admin-posts',{title:'A studio story',slug:'studio-story',excerpt:'A studio introduction.',content:'A story about development.',status:'draft',layout:{mode:'split',cover:{caption:'A real caption'},blocks:[{type:'text',text:'A story about development.'},{type:'html',text:'<script>bad()</script>'}]}},{authorization:'Bearer owner'}),res);
 assert.equal(res.statusCode,200);assert.equal(payload.layout.cover.caption,'A real caption');assert.equal(payload.layout.mode,'split');assert.equal(payload.layout.blocks.length,1);assert.equal(payload.status,'draft');
});
test('article formatting escapes scripts, HTML and malicious links',()=>{
 const html=renderText('# Hello\n\n<script>alert(1)</script>\n\n[jump](javascript:alert(1))');
 assert.match(html,/<h2>Hello<\/h2>/);assert.doesNotMatch(html,/<script>|href=/);assert.match(html,/&lt;script&gt;/);
});
test('published article is rendered on the server with escaped content and its own canonical URL',async()=>{
 const previousFetch=global.fetch;const previousEnv={...process.env};Object.assign(process.env,env);
 global.fetch=async url=>{assert.match(url,/status=eq.published/);return ok([{title:'News <script>',slug:'new-story',excerpt:'A new development story.',category:'STUDIO NOTES',cover_url:'https://bag-studios.com/Images/Logo.png',published_at:'2026-10-01T12:00:00Z',content:'# Our update\n\n<script>unsafe()</script>'}]);};
 try{const res={headers:{},setHeader(k,v){this.headers[k]=v},end(html){this.html=html}};await require('../api/article.js')({query:{slug:'new-story'}},res);assert.equal(res.statusCode,200);assert.match(res.html,/href="https:\/\/bag-studios.com\/blog\/new-story"/);assert.match(res.html,/&lt;script&gt;unsafe/);assert.doesNotMatch(res.html,/<script>unsafe/);assert.match(res.html,/<h2>Our update<\/h2>/);}finally{global.fetch=previousFetch;for(const key of Object.keys(env)){if(previousEnv[key]===undefined)delete process.env[key];else process.env[key]=previousEnv[key];}}
});
