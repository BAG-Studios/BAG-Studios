// Run against npm run dev. Set BAG_PLAYWRIGHT_MODULE when using a bundled runtime.
const {chromium}=require(process.env.BAG_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage();page.setDefaultTimeout(8000);let posts=[];const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());let result;
   if(url.pathname.startsWith('/test-auth'))result={access_token:'test-token',expires_in:3600};
   else if(url.pathname==='/api/website'){
    switch(url.searchParams.get('resource')){
     case 'config':result={url:'http://127.0.0.1:3000/test-auth',publishableKey:'test'};break;
     case 'admin-posts':
      if(req.method()==='POST'){const post={...req.postDataJSON(),id:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',published_at:new Date().toISOString()};posts=[post];result={post};}else result={posts};break;
     default:result={ok:true};
    }
   }else return url.hostname==='127.0.0.1'?route.continue():route.abort();
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto('http://127.0.0.1:3000/admin.html',{waitUntil:'domcontentloaded'});
  await page.locator('[name=password]').fill('local-test-password');await page.locator('#login-form button').click();
  await page.locator('#admin-workspace').waitFor({state:'visible'});
  const form=page.locator('#post-editor');await form.locator('[name=title]').fill('A new studio story');await form.locator('[name=excerpt]').fill('An introduction for a new studio update.');await form.locator('[name=content]').fill('# Studio notes\n\nA development update for our players.');
  await page.locator('#preview-post').click();await page.locator('#post-preview').waitFor({state:'visible'});await page.locator('#close-preview').click();
  await form.locator('[name=status]').selectOption('published');await form.locator('[type=submit]').click();await page.getByText('Published. Your story is now on the blog.',{exact:true}).waitFor();assert.equal(posts[0].status,'published');
  await page.locator('#sign-out').click();await page.locator('#admin-login').waitFor({state:'visible'});assert.deepEqual(errors,[]);
  console.log('PASS admin browser workflow: sign in, preview, publish, sign out. HTTP responses simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exit(1)});
