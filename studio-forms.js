document.querySelectorAll('[data-studio-form]').forEach(form=>{
 form.addEventListener('submit',async event=>{
  event.preventDefault();const status=form.querySelector('[role="status"]');const button=form.querySelector('button[type="submit"]');
  const data=Object.fromEntries(new FormData(form));data.consent=form.elements.consent?.checked===true;
  if(form.dataset.studioForm==='unsubscribe')data.token=new URLSearchParams(location.search).get('token');
  button.disabled=true;status.textContent='Sending…';status.dataset.error='false';
  try{const response=await fetch('/api/website?resource='+form.dataset.studioForm,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');
   form.reset();status.textContent={contact:'Thanks. Your message has been sent to the studio.',newsletter:'Thanks. Your signup request has been received.',unsubscribe:'You have been unsubscribed.'}[form.dataset.studioForm];
  }catch(error){status.textContent=error.message||'Could not send. Please try again.';status.dataset.error='true';}finally{button.disabled=false;}
 });
});
