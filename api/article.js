const fs=require('node:fs');const path=require('node:path');
const {createClient,escapeHtml:e,renderText}=require('../server/website.cjs');
const {renderArticle}=require('../article-layout.js');
module.exports=async(req,res)=>{
 res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 const shell=fs.readFileSync(path.join(process.cwd(),'blog.html'),'utf8');
 const document=(title,description,slug,content,cover)=>{
  let head=shell.split('<main class="blog-showcase">')[0].replace('<head>','<head><base href="/">').replace(/<title>.*?<\/title>/,`<title>${e(title)} — BAG Studios</title>`);
  head=head.replace(/(<meta (?:name|property)="(?:description|og:description)" content=")[^"]*/g,(_,prefix)=>prefix+e(description)).replace(/(<meta property="og:title" content=")[^"]*/g,(_,prefix)=>prefix+e(title)).replace(/https:\/\/bag-studios\.com\/blog\.html/g,'https://bag-studios.com/blog/'+slug);
  head=head.replace(/(<meta property="og:image" content=")[^"]*/g,(_,prefix)=>prefix+e(cover||'https://bag-studios.com/Images/Logo.png'));
  head=head.replace('</head>','<link rel="stylesheet" href="post-article.css?v=2"></head>');
  return head+'<main class="published-story">'+content+'</main>'+shell.slice(shell.indexOf('</main>')+7);
 };
 const slug=String(req.query.slug||'');
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){res.statusCode=404;return res.end(document('Article not found','',slug,'<h1>Article not found.</h1><a href="blog.html">Back to the blog</a>'));}
 try{
  if(!process.env.SUPABASE_SECRET_KEY)throw new Error('Unavailable');
  const client=createClient(process.env,fetch);const posts=await client.call('/rest/v1/blog_posts?slug=eq.'+slug+'&status=eq.published&published_at=lte.'+encodeURIComponent(new Date().toISOString())+'&select=*&limit=1');const p=posts?.[0];
  if(!p){res.statusCode=404;return res.end(document('Article not found','',slug,'<h1>Article not found.</h1><a href="blog.html">Back to the blog</a>'));}
  res.statusCode=200;res.end(document(p.title,p.excerpt,slug,`<a class="studio-back" href="blog.html">← All stories</a>${renderArticle(p)}`,p.cover_url));
 }catch{res.statusCode=503;res.end(document('Temporarily unavailable','',slug,'<h1>This story is temporarily unavailable.</h1><p>Please try again shortly.</p><a href="blog.html">Back to the blog</a>'));}
};
