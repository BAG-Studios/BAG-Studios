(()=>{
 const $=s=>document.querySelector(s),A=window.BagArticle,form=$('#post-editor');
 let token='',config,posts=[],expires=0,currentId=null,layout=A.normalizeLayout({}),dirty=false,slugTouched=false,imageTarget='cover',uploading=false;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 const status=(message,error=false)=>{const el=$('#admin-status');el.textContent=message;el.dataset.error=String(error);};
 const resize=el=>{if(el.tagName==='TEXTAREA'&&!el.hidden){el.style.height='auto';el.style.height=el.scrollHeight+'px';}};
 const resizeAll=()=>requestAnimationFrame(()=>document.querySelectorAll('.editor-input').forEach(resize));
 const markDirty=()=>{dirty=true;$('#save-state').textContent='Unsaved changes';};
 const canLeave=()=>{if(uploading){status('Please wait for the image upload to finish.',true);return false;}return !dirty||confirm('Leave this story without saving your changes?');};
 const localDate=iso=>{const d=iso?new Date(iso):new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
 async function api(resource,body){
  if(token&&Date.now()>expires){logout();throw new Error('Your session expired. Please sign in again.');}
  const response=await fetch('/api/website?resource='+resource,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json();if(!response.ok){if(response.status===401)logout();throw new Error(data.error||'Please try again.');}return data;
 }
 function logout(){if(token&&config)fetch(config.url+'/auth/v1/logout',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token}}).catch(()=>{});token='';expires=0;dirty=false;posts=[];$('#admin-workspace').hidden=true;$('#admin-login').hidden=false;$('#sign-out').hidden=true;$('#post-list').replaceChildren();form.reset();}
 function dateLabel(){const value=form.elements.published_at.value;$('#canvas-date').textContent=(value?new Date(value):new Date()).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();}
 function imageView(prefix,url){const img=$('#'+prefix+'-image');img.hidden=!url;if(url)img.src=url;else img.removeAttribute('src');$('#'+prefix+'-empty').hidden=!!url;$('#'+prefix+'-change').hidden=!url;}
 function refreshImages(){imageView('cover',A.safeUrl(form.elements.cover_url.value));imageView('sidebar',layout.sidebar.url);$('#cover-figure').className='post-cover post-crop-'+layout.cover.ratio;$('#sidebar-figure').hidden=layout.mode!=='split';$('#editor-story').classList.toggle('post-split',layout.mode==='split');resizeAll();}
 function refreshEnding(){const c=layout.cta;$('#editor-ending').hidden=!c.enabled;$('#ending-settings').hidden=!c.enabled;const links=$('#ending-buttons');links.replaceChildren();for(const [label,url,primary] of [[c.label,c.url,true],[c.secondaryLabel,c.secondaryUrl,false]]){if(label){const a=node('a',label+(primary?' ↗':' →'),primary?'post-button':'');a.href=A.safeUrl(url)||'#';a.tabIndex=-1;links.append(a);}}}
 function field(tag,cls,value,label){const el=node(tag,undefined,cls);el.value=value||'';el.setAttribute('aria-label',label);return el;}
 function renderBlocks(){
  const container=$('#content-blocks');container.replaceChildren();
  layout.blocks.forEach((block,index)=>{
   const wrapper=node('section',undefined,'editor-block'+(block.type==='image'?' editor-image-block':''));wrapper.dataset.blockIndex=index;
   const tools=node('div',undefined,'editor-block-tools');tools.append(node('span',block.type));
   for(const [action,label,icon] of [['up','Move section up','↑'],['down','Move section down','↓'],['delete','Remove section','×']]){
    const button=node('button',icon);button.type='button';button.title=label;button.setAttribute('aria-label',label);button.disabled=action==='up'&&index===0||action==='down'&&index===layout.blocks.length-1;
    button.onclick=()=>{if(action==='delete'){if((block.text||block.url)&&!confirm('Remove this section?'))return;layout.blocks.splice(index,1);}else{const target=index+(action==='up'?-1:1);[layout.blocks[index],layout.blocks[target]]=[layout.blocks[target],layout.blocks[index]];}markDirty();renderBlocks();};tools.append(button);
   }
   wrapper.append(tools);
   if(block.type==='image'){
    const figure=node('figure');if(block.url){const img=node('img');img.src=block.url;img.alt=block.alt;figure.append(img);}
    const choose=node('button',block.url?'Change image':'＋ Add an image',block.url?'editor-quiet':'editor-image-placeholder');choose.type='button';choose.onclick=()=>openImages('block:'+index);figure.append(choose);
    const caption=field('input','editor-caption',block.caption,'Image caption');caption.placeholder='Add an image caption…';caption.maxLength=1000;caption.oninput=()=>{block.caption=caption.value;markDirty();};figure.append(caption);wrapper.append(figure);
    const details=node('details',undefined,'editor-image-details');details.append(node('summary','Image details'));
    for(const [key,label] of [['url','Image URL'],['alt','Image description']]){const lab=node('label',label,'editor-setting');const input=field('input','',block[key],label);input.maxLength=key==='alt'?500:2000;input.onchange=()=>{if(key==='url'&&input.value&&!A.safeUrl(input.value)){status('Use an HTTPS image URL.',true);return;}block[key]=key==='url'?A.safeUrl(input.value):input.value;markDirty();if(key==='url')renderBlocks();};lab.append(input);details.append(lab);}wrapper.append(details);
   }else{
    const input=field('textarea','editor-input '+(block.type==='heading'?'post-heading-input':'post-text-input')+(block.type==='list'?' editor-list-input':''),block.text,block.type==='heading'?'Section heading':block.type==='list'?'List items, one per line':'Section text');input.rows=1;input.maxLength=15000;input.dataset.blockField='text';input.placeholder=block.type==='heading'?'Section heading':block.type==='list'?'One item per line…':'Tell the story…';input.oninput=()=>{block.text=input.value;markDirty();resize(input);};wrapper.append(input);
   }
   container.append(wrapper);
  });resizeAll();
 }
 function newPost(post){
  form.reset();currentId=post?.id||null;slugTouched=!!post;layout=A.normalizeLayout(post?.layout,post?.content||'');
  if(!post)layout.blocks=[{type:'heading',text:''},{type:'text',text:''}];
  for(const key of ['title','slug','category','excerpt','cover_url','status'])form.elements[key].value=post?.[key]||(key==='category'?'STUDIO NOTES':key==='status'?'draft':'');
  form.elements.published_at.value=localDate(post?.published_at);$('#layout-mode').value=layout.mode;$('#cover-ratio').value=layout.cover.ratio;$('#cover-alt').value=layout.cover.alt;$('#cover-caption').value=layout.cover.caption;
  for(const key of ['url','alt','caption'])$('#sidebar-'+key).value=layout.sidebar[key];
  $('#ending-enabled').checked=layout.cta.enabled;for(const key of ['title','text','label','url'])$('#ending-'+key).value=layout.cta[key];$('#ending-secondary-label').value=layout.cta.secondaryLabel;$('#ending-secondary-url').value=layout.cta.secondaryUrl;
  $('#editor-heading').textContent=post?.title||'New story';$('#save-state').textContent=post?'Saved':'Not saved';$('#delete-post').hidden=!post;dirty=false;
  document.querySelectorAll('.studio-post-choice').forEach(el=>el.setAttribute('aria-current',String(el.dataset.postId===currentId)));
  dateLabel();refreshImages();refreshEnding();renderBlocks();resizeAll();
 }
 function collect(){
  const body=Object.fromEntries(new FormData(form));body.layout=A.normalizeLayout(layout);body.content=layout.blocks.filter(b=>b.type!=='image').map(b=>(b.type==='heading'?'# ':'')+b.text).filter(Boolean).join('\n\n');if(body.content.trim().length<10)body.content=body.excerpt;
  body.published_at=body.published_at?new Date(body.published_at).toISOString():new Date().toISOString();if(currentId)body.id=currentId;return body;
 }
 async function loadPosts(){const data=await api('admin-posts');posts=data.posts;const list=$('#post-list');list.replaceChildren();if(!posts.length)list.append(node('p','Your stories will appear here.','studio-meta'));for(const post of posts){const button=node('button',undefined,'studio-action studio-post-choice');button.type='button';button.dataset.postId=post.id;button.append(node('strong',post.title),node('span',post.status==='published'?'Published':'Draft'));button.onclick=()=>{if(canLeave())newPost(post);};list.append(button);}}
 $('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const login=event.currentTarget,button=login.querySelector('button');button.disabled=true;status('Signing in…');
  try{config=await api('config');const response=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:login.elements.email.value.trim(),password:login.elements.password.value})});const session=await response.json();if(!response.ok)throw new Error('Could not sign in. Check your email and password.');token=session.access_token;expires=Date.now()+(session.expires_in||3600)*1000;login.elements.password.value='';await loadPosts();$('#admin-login').hidden=true;$('#admin-workspace').hidden=false;$('#sign-out').hidden=false;newPost(posts[0]);status('');}catch(error){logout();status(error.message,true);}finally{button.disabled=false;}
 });
 $('#sign-out').onclick=()=>{if(canLeave()){logout();status('Signed out.');}};$('#new-post').onclick=()=>{if(canLeave()){newPost();status('');}};
 form.elements.title.addEventListener('input',()=>{if(!currentId&&!slugTouched)form.elements.slug.value=form.elements.title.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
 form.elements.slug.addEventListener('input',()=>{slugTouched=true;markDirty();});
 for(const input of form.elements){input.addEventListener('input',()=>{markDirty();resize(input);if(input.name==='published_at')dateLabel();if(input.name==='cover_url')refreshImages();});}
 function bind(id,update){$(id).addEventListener('input',event=>{update(event.target);markDirty();resize(event.target);});}
 bind('#layout-mode',el=>{layout.mode=el.value;refreshImages();});bind('#cover-ratio',el=>{layout.cover.ratio=el.value;refreshImages();});bind('#cover-alt',el=>layout.cover.alt=el.value);bind('#cover-caption',el=>layout.cover.caption=el.value);
 for(const key of ['url','alt','caption'])bind('#sidebar-'+key,el=>{layout.sidebar[key]=key==='url'?A.safeUrl(el.value):el.value;if(key==='url')refreshImages();});
 $('#remove-sidebar').onclick=()=>{layout.sidebar={url:'',alt:'',caption:''};for(const key of ['url','alt','caption'])$('#sidebar-'+key).value='';refreshImages();markDirty();};
 bind('#ending-enabled',el=>{layout.cta.enabled=el.checked;refreshEnding();});for(const key of ['title','text','label','url'])bind('#ending-'+key,el=>{layout.cta[key]=el.value;refreshEnding();});bind('#ending-secondary-label',el=>{layout.cta.secondaryLabel=el.value;refreshEnding();});bind('#ending-secondary-url',el=>{layout.cta.secondaryUrl=el.value;refreshEnding();});
 document.querySelectorAll('[data-add]').forEach(button=>button.onclick=()=>{if(layout.blocks.length>=100){status('This story already has 100 sections.',true);return;}layout.blocks.push(button.dataset.add==='image'?{type:'image',url:'',alt:'',caption:''}:{type:button.dataset.add,text:''});markDirty();renderBlocks();const last=$('#content-blocks').lastElementChild;last.scrollIntoView({behavior:'smooth',block:'center'});last.querySelector('textarea,button')?.focus();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(uploading){status('Please wait for the image upload to finish.',true);return;}const button=$('#save-post');button.disabled=true;status('Saving…');
  try{const saved=await api('admin-posts',collect());await loadPosts();newPost(saved.post);status(saved.post.status==='published'?'Published. Your story is now on the blog.':'Draft saved.');}catch(error){status(error.message,true);}finally{button.disabled=false;}
 });
 $('#delete-post').onclick=async()=>{if(!currentId||!confirm('Delete this story permanently?'))return;try{await api('admin-delete',{kind:'post',id:currentId});await loadPosts();newPost();status('Story deleted.');}catch(error){status(error.message,true);}};
 $('#preview-post').onclick=()=>{const post=collect();post.title=post.title||'Untitled story';$('#article-preview').srcdoc='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="'+location.origin+'/"><link rel="stylesheet" href="brand-theme.css"><link rel="stylesheet" href="post-article.css?v=2"><style>body{background:#111214;margin:0;padding:48px;color:#f3f1ea}.bag-post{max-width:1280px;margin:auto}a{pointer-events:none}@media(max-width:600px){body{padding:24px}}</style></head><body>'+A.renderArticle(post)+'</body></html>';$('#post-preview').showModal();};$('#close-preview').onclick=()=>$('#post-preview').close();
 function selectImage(url){const safe=A.safeUrl(url);if(!safe)return;if(imageTarget==='cover')form.elements.cover_url.value=safe;else if(imageTarget==='sidebar'){layout.sidebar.url=safe;$('#sidebar-url').value=safe;}else{const index=Number(imageTarget.split(':')[1]);if(layout.blocks[index])layout.blocks[index].url=safe;renderBlocks();}refreshImages();markDirty();$('#image-picker').close();}
 async function openImages(target){imageTarget=target;$('#image-picker').showModal();$('#image-status').textContent='Loading images…';$('#image-library').replaceChildren();
  try{const results=await Promise.allSettled([fetch('/media-library.json').then(r=>r.ok?r.json():[]),api('admin-media').then(r=>r.images||[])]);let images=[];for(const r of results)if(r.status==='fulfilled'&&Array.isArray(r.value))images.push(...r.value);
   for(const image of images){const button=node('button',undefined,'editor-media-choice');button.type='button';const img=node('img');img.src=A.safeUrl(image.url);img.alt=image.name;img.loading='lazy';button.append(img,node('span',image.name));button.onclick=()=>selectImage(image.url);$('#image-library').append(button);}$('#image-status').textContent=results.some(r=>r.status==='rejected')?'Some uploaded images could not be loaded. You can still choose a studio image or upload a new one.':images.length?'':'Upload your first image.';
  }catch(error){$('#image-status').textContent=error.message;}
 }
 document.querySelectorAll('[data-choose]').forEach(button=>button.onclick=()=>openImages(button.dataset.choose));$('#close-images').onclick=()=>{if(!uploading)$('#image-picker').close();};$('#image-picker').addEventListener('cancel',event=>{if(uploading)event.preventDefault();});$('#upload-media').onclick=()=>$('#upload-input').click();
 $('#upload-input').onchange=async event=>{const file=event.target.files[0];if(!file)return;if(file.size>2621440){$('#image-status').textContent='Choose an image under 2.5 MB.';return;}uploading=true;$('#upload-media').disabled=true;$('#image-status').textContent='Uploading image…';
  try{const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const result=await api('admin-upload',{base64:data});selectImage(result.url);status('Image uploaded. Save the story to keep this change.');}catch(error){$('#image-status').textContent=error.message||'Could not upload this image.';}finally{uploading=false;$('#upload-media').disabled=false;event.target.value='';}
 };
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});window.addEventListener('resize',resizeAll);window.addEventListener('pagehide',()=>{token='';});
})();
