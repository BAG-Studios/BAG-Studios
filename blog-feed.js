(async()=>{
 const grid=document.querySelector('.blog-grid');if(!grid)return;
 try{const response=await fetch('/api/website?resource=posts');if(!response.ok)return;const {posts}=await response.json();
  const fragment=document.createDocumentFragment();
  for(const post of posts){
   const article=document.createElement('article');article.className='blog-entry';const card=document.createElement('a');card.className='blog-card';card.href='/blog/'+encodeURIComponent(post.slug);
   if(post.cover_url){const art=document.createElement('div');art.className='blog-art';const img=document.createElement('img');img.src=post.cover_url;img.alt=post.title;img.loading='lazy';art.append(img);card.append(art);}
   const copy=document.createElement('div');copy.className='blog-copy';const meta=document.createElement('div');meta.className='blog-meta';const category=document.createElement('span');category.textContent=post.category;const date=document.createElement('time');date.dateTime=post.published_at;date.textContent=new Date(post.published_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'Europe/Stockholm'}).toUpperCase();meta.append(category,date);
   const title=document.createElement('h2');title.textContent=post.title;const excerpt=document.createElement('p');excerpt.textContent=post.excerpt;const more=document.createElement('span');more.className='blog-read-more';more.textContent='Read more ↗';copy.append(meta,title,excerpt,more);card.append(copy);article.append(card);fragment.append(article);
  }
  grid.prepend(fragment);
 }catch{ /* Keep the existing article available if the service is offline. */ }
})();
