// Run against npm run dev. Set BAG_PLAYWRIGHT_MODULE when using a bundled runtime.
const {chromium}=require(process.env.BAG_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const legacy=JSON.parse(require('node:child_process').execFileSync(process.execPath,['scripts/export-legacy-story.cjs'],{encoding:'utf8'}));
  legacy.id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const page=await browser.newPage();page.setDefaultTimeout(8000);let posts=[legacy];const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   const req=route.request(),url=new URL(req.url());let result;
   if(url.hostname==='bag-studios.com'&&url.pathname.startsWith('/Images/'))return route.fulfill({path:require('node:path').join(process.cwd(),decodeURIComponent(url.pathname))});
   if(url.pathname.startsWith('/test-auth'))result={access_token:'test-token',expires_in:3600};
   else if(url.pathname==='/api/website'){
    switch(url.searchParams.get('resource')){
     case 'config':result={url:'http://127.0.0.1:3000/test-auth',publishableKey:'test'};break;
     case 'admin-posts':
      if(req.method()==='POST'){const input=req.postDataJSON();const post={...input,id:input.id||'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',published_at:input.published_at||new Date().toISOString()};posts=[post];result={post};}else result={posts};break;
     case 'admin-upload':assert.ok(req.postDataJSON().base64);result={url:'https://bag-studios.com/Images/demo-day-event.png'};break;
     default:result={ok:true};
    }
   }else return url.hostname==='127.0.0.1'?route.continue():route.abort();
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
  });
  await page.goto('http://127.0.0.1:3000/admin.html',{waitUntil:'domcontentloaded'});
  await page.locator('[name=password]').fill('local-test-password');await page.locator('#login-form button').click();
  await page.locator('#admin-workspace').waitFor({state:'visible'});
  assert.equal(await page.locator('[name=title]').inputValue(),legacy.title);
  assert.equal(await page.locator('.editor-block').count(),8);
  await page.locator('[name=title]').fill('Atira at Umeå Demo Day — updated');
  await page.locator('#save-post').click();await page.getByText('Published. Your story is now on the blog.',{exact:true}).waitFor();
  assert.equal(posts[0].id,legacy.id);assert.equal(posts[0].layout.blocks.length,8);assert.equal(posts[0].layout.sidebar.url,legacy.layout.sidebar.url);
  await page.locator('#new-post').click();
  const form=page.locator('#post-editor');await form.locator('[name=title]').fill('A new studio story');await form.locator('[name=excerpt]').fill('An introduction for a new studio update.');await form.locator('[data-block-field=text]').nth(0).fill('Studio notes');await form.locator('[data-block-field=text]').nth(1).fill('A development update for our players.');
  await page.locator('#layout-mode').selectOption('split');await page.locator('#sidebar-empty').click();await page.locator('.editor-media-choice').filter({hasText:'demo day playtesting'}).click();await page.locator('#sidebar-caption').fill('At the demo table.');await page.locator('#cover-url').fill('Images/demo-day-event.png');await page.locator('#cover-caption').fill('Umeå Demo Day.');
  await page.locator('[data-add=heading]').click();await form.locator('[data-block-field=text]').nth(2).fill('Back to development.');await page.locator('.editor-block').nth(2).getByRole('button',{name:'Move section up',exact:true}).click();
  await page.locator('#cover-figure .editor-image-wrap').hover();await page.locator('#cover-change').click();await page.locator('#upload-input').setInputFiles({name:'test.png',mimeType:'image/png',buffer:Buffer.from('89504e470d0a1a0a00000000','hex')});await page.locator('#image-picker').waitFor({state:'hidden'});
  if(process.env.BAG_EDITOR_SCREENSHOTS){await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:process.env.BAG_EDITOR_SCREENSHOTS+'/editor-desktop.png',fullPage:true});}
  await page.locator('#preview-post').click();await page.locator('#post-preview').waitFor({state:'visible'});assert.equal(await page.frameLocator('#article-preview').locator('.post-cover figcaption').textContent(),'Umeå Demo Day.');await page.locator('#close-preview').click();
  await page.locator('[name=status]').selectOption('published');await page.locator('#save-post').click();await page.getByText('Published. Your story is now on the blog.',{exact:true}).waitFor();assert.equal(posts[0].status,'published');assert.equal(posts[0].layout.mode,'split');assert.equal(posts[0].layout.cover.caption,'Umeå Demo Day.');assert.equal(posts[0].layout.blocks[1].text,'Back to development.');assert.equal(posts[0].layout.blocks[2].text,'A development update for our players.');
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);if(process.env.BAG_EDITOR_SCREENSHOTS)await page.locator('#post-editor').screenshot({path:process.env.BAG_EDITOR_SCREENSHOTS+'/editor-mobile.png'});
  await page.locator('#sign-out').click();await page.locator('#admin-login').waitFor({state:'visible'});assert.deepEqual(errors,[]);
  console.log('PASS admin browser workflow: sign in, preview, publish, sign out. HTTP responses simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error.message);process.exit(1)});
