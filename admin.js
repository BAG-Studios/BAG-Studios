(()=>{
 const $=s=>document.querySelector(s);let token='',config,posts=[],subscribers=[],expires=0;let currentId=null;
 const status=(message,error=false)=>{const el=$('#admin-status');el.textContent=message;el.dataset.error=String(error);};
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 async function api(resource,body){
  if(token&&Date.now()>expires){logout();throw new Error('Your session expired. Please sign in again.');}
  const response=await fetch('/api/website?resource='+resource,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});const result=await response.json();if(!response.ok){if(response.status===401)logout();throw new Error(result.error||'Please try again.');}return result;
 }
 function logout(){if(token&&config)fetch(config.url+'/auth/v1/logout',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token}}).catch(()=>{});token='';expires=0;posts=[];subscribers=[];$('#admin-workspace').hidden=true;$('#admin-login').hidden=false;$('#post-list').replaceChildren();$('#message-list').replaceChildren();$('#subscriber-list').replaceChildren();$('#post-editor').reset();}
 function newPost(post){
  const form=$('#post-editor');form.reset();currentId=post?.id||null;
  for(const field of ['title','slug','category','excerpt','cover_url','content','status'])if(post)form.elements[field].value=post[field]||'';
  $('#editor-heading').textContent=post?'Edit story':'New story';$('#delete-post').hidden=!currentId;
 }
 async function loadPosts(){const data=await api('admin-posts');posts=data.posts;const list=$('#post-list');list.replaceChildren();
  if(!posts.length)list.append(node('p','No new stories yet. Create your first draft.','studio-meta'));
  for(const post of posts){const button=node('button',undefined,'studio-action studio-post-choice');button.type='button';button.append(node('strong',post.title),node('span',post.status==='published'?'Published · '+new Date(post.published_at).toLocaleDateString():'Draft'));button.onclick=()=>newPost(post);list.append(button);}
 }
 $('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;status('Signing in…');
  try{config=await api('config');const response=await fetch(config.url+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({email:form.elements.email.value.trim(),password:form.elements.password.value})});const session=await response.json();if(!response.ok)throw new Error('Could not sign in. Check your email and password.');token=session.access_token;expires=Date.now()+(session.expires_in||3600)*1000;form.elements.password.value='';await loadPosts();$('#admin-login').hidden=true;$('#admin-workspace').hidden=false;newPost();status('Signed in.');}
  catch(error){logout();status(error.message,true);}finally{button.disabled=false;}
 });
 $('#sign-out').onclick=()=>{logout();status('Signed out.');};$('#new-post').onclick=()=>{newPost();status('');};
 $('#post-editor').elements.title.addEventListener('input',event=>{if(!currentId)$('#post-editor').elements.slug.value=event.target.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
 $('#post-editor').addEventListener('submit',async event=>{
  event.preventDefault();const form=event.currentTarget;const button=form.querySelector('[type=submit]');button.disabled=true;status('Saving…');
  try{const body=Object.fromEntries(new FormData(form));if(currentId){body.id=currentId;body.published_at=posts.find(p=>p.id===currentId)?.published_at;}const saved=await api('admin-posts',body);await loadPosts();newPost(saved.post);status(saved.post.status==='published'?'Published. Your story is now on the blog.':'Draft saved.');}catch(error){status(error.message,true);}finally{button.disabled=false;}
 });
 $('#delete-post').onclick=async()=>{if(!currentId||!confirm('Delete this story permanently?'))return;try{await api('admin-delete',{kind:'post',id:currentId});await loadPosts();newPost();status('Story deleted.');}catch(error){status(error.message,true);}};
 $('#preview-post').onclick=()=>{const form=$('#post-editor');const body=$('#preview-body');body.replaceChildren(node('p',form.elements.category.value,'studio-eyebrow'),node('h1',form.elements.title.value),node('p',form.elements.excerpt.value,'studio-lead'));for(const block of form.elements.content.value.split(/\n\s*\n/)){body.append(node(/^#{1,3} /.test(block)?'h2':'p',block.replace(/^#{1,3} /,'')));}$('#post-preview').showModal();};$('#close-preview').onclick=()=>$('#post-preview').close();
 async function records(kind){const data=await api(kind==='messages'?'admin-messages':'admin-subscribers');const list=$('#'+(kind==='messages'?'message':'subscriber')+'-list');list.replaceChildren();const values=data[kind];if(kind==='subscribers')subscribers=values;
  if(!values.length)list.append(node('p',kind==='messages'?'No messages yet.':'No signups yet.','studio-empty'));
  for(const item of values){const card=node('article',undefined,'studio-record');card.append(node('h3',kind==='messages'?item.subject:item.email));
   if(kind==='messages'){const link=node('a',item.name+' · '+item.email);link.href='mailto:'+encodeURIComponent(item.email);card.append(link,node('p',item.message));}
   card.append(node('p',kind==='messages'?new Date(item.created_at).toLocaleString():`${item.unsubscribed_at?'Unsubscribed':'Subscribed'} · ${new Date(item.consent_at).toLocaleDateString()}`,'studio-meta'));
   const remove=node('button','Delete','studio-action studio-danger');remove.type='button';remove.onclick=async()=>{if(!confirm('Permanently delete this '+(kind==='messages'?'message':'subscriber')+'?'))return;try{await api('admin-delete',{kind:kind==='messages'?'message':'subscriber',id:item.id});await records(kind);status('Deleted.');}catch(error){status(error.message,true);}};card.append(remove);list.append(card);
  }
 }
 document.querySelectorAll('[data-admin-tab]').forEach(button=>button.onclick=async()=>{for(const el of document.querySelectorAll('[data-admin-tab]'))el.setAttribute('aria-selected',String(el===button));for(const el of document.querySelectorAll('[data-admin-panel]'))el.hidden=el.dataset.adminPanel!==button.dataset.adminTab;status('');try{if(button.dataset.adminTab!=='posts')await records(button.dataset.adminTab);}catch(error){status(error.message,true);}});
 $('#export-subscribers').onclick=()=>{const rows=[['email','consent_at','consent_version','unsubscribe_url'],...subscribers.filter(s=>!s.unsubscribed_at).map(s=>[s.email,s.consent_at,s.consent_version,'https://bag-studios.com/unsubscribe.html?token='+s.unsubscribe_token])];const text='\ufeff'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8'}));const link=node('a');link.href=url;link.download='bag-studios-subscribers.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 window.addEventListener('pagehide',()=>{token='';});
})();
