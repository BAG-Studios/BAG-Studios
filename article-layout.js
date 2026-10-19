(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BagArticle=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const str=(v,max=100000)=>typeof v==='string'?v.slice(0,max):'';
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function safeUrl(value){try{const s=str(value,2000).trim();if(!s)return '';const u=new URL(s,'https://bag-studios.com/');return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function legacyBlocks(content){return str(content).split(/\n\s*\n/).filter(Boolean).map(s=>/^#{1,3} /.test(s)?{type:'heading',text:s.replace(/^#{1,3} /,'')}:s.split('\n').every(l=>/^[-*] /.test(l))?{type:'list',text:s.split('\n').map(l=>l.slice(2)).join('\n')}:{type:'text',text:s});}
 function normalizeLayout(raw,content=''){
  const s=raw&&typeof raw==='object'?raw:{};const image=i=>({url:safeUrl(i?.url),alt:str(i?.alt,500),caption:str(i?.caption,1000)});
  const blocks=(Array.isArray(s.blocks)?s.blocks:legacyBlocks(content)).slice(0,100).filter(b=>b&&['heading','text','list','image'].includes(b.type)).map(b=>b.type==='image'?{type:'image',...image(b)}:{type:b.type,text:str(b.text,15000)});
  return {version:1,mode:s.mode==='split'?'split':'single',cover:{alt:str(s.cover?.alt,500),caption:str(s.cover?.caption,1000),ratio:['wide','standard'].includes(s.cover?.ratio)?s.cover.ratio:'natural'},sidebar:image(s.sidebar),blocks,cta:{enabled:s.cta?.enabled===true,title:str(s.cta?.title,150),text:str(s.cta?.text,1000),label:str(s.cta?.label,80),url:safeUrl(s.cta?.url),secondaryLabel:str(s.cta?.secondaryLabel,80),secondaryUrl:safeUrl(s.cta?.secondaryUrl)}};
 }
 function figure(image,cls=''){if(!safeUrl(image.url))return '';return `<figure class="${cls}"><img src="${escape(safeUrl(image.url))}" alt="${escape(image.alt)}" loading="lazy">${image.caption?`<figcaption>${escape(image.caption)}</figcaption>`:''}</figure>`;}
 function renderBlocks(blocks){return blocks.map(b=>{
  if(b.type==='image')return figure(b,'post-inline-image');if(!b.text.trim())return '';
  if(b.type==='heading')return `<h2>${escape(b.text)}</h2>`;
  if(b.type==='list')return '<ul>'+b.text.split('\n').filter(Boolean).map(l=>`<li>${escape(l)}</li>`).join('')+'</ul>';
  return '<p>'+escape(b.text).replace(/\n/g,'<br>')+'</p>';
 }).join('\n');}
 function renderArticle(post){
  const l=normalizeLayout(post.layout,post.content);const split=l.mode==='split'&&l.sidebar.url;
  let date='';try{if(post.published_at)date=new Date(post.published_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Stockholm'});}catch{}
  const cover=figure({url:post.cover_url,alt:l.cover.alt||post.title,caption:l.cover.caption},'post-cover post-crop-'+l.cover.ratio);
  const c=l.cta;const ending=c.enabled?`<section class="post-ending"><div><h2>${escape(c.title)}</h2><p>${escape(c.text)}</p></div><div class="post-ending-links">${c.url&&c.label?`<a class="post-button" href="${escape(c.url)}">${escape(c.label)} ↗</a>`:''}${c.secondaryUrl&&c.secondaryLabel?`<a href="${escape(c.secondaryUrl)}">${escape(c.secondaryLabel)} →</a>`:''}</div></section>`:'';
  return `<article class="bag-post"><header class="post-header"><p class="post-meta"><span>${escape(post.category||'STUDIO NOTES')}</span>${date?`<time datetime="${escape(post.published_at)}">${escape(date)}</time>`:''}</p><h1>${escape(post.title)}</h1><p class="post-lead">${escape(post.excerpt)}</p></header>${cover}<div class="post-story${split?' post-split':''}"><div class="post-copy">${renderBlocks(l.blocks)}</div>${split?figure(l.sidebar,'post-side-image'):''}</div>${ending}</article>`;
 }
 return {escape,safeUrl,legacyBlocks,normalizeLayout,renderBlocks,renderArticle};
});
