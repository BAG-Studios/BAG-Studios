const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
test('legacy article exports full editable text, cover, side image, captions and closing links',()=>{
 const post=JSON.parse(execFileSync(process.execPath,[path.join(root,'scripts/export-legacy-story.cjs')],{encoding:'utf8'}));
 assert.equal(post.slug,'umea-demo-day');assert.equal(post.layout.mode,'split');assert.equal(post.layout.blocks.length,8);
 assert.equal(post.layout.blocks.filter(b=>b.type==='heading').length,3);assert.match(post.content,/To everyone who stopped by/);
 assert.match(post.layout.sidebar.url,/demo-day-playtesting/);assert.ok(post.layout.cover.caption);assert.equal(post.layout.cta.enabled,true);
 const config=JSON.parse(fs.readFileSync(path.join(root,'vercel.json'),'utf8'));
 assert.ok(config.rewrites.some(r=>r.source==='/blog-umea-demo-day.html'&&r.destination==='/api/article?slug=umea-demo-day'));
});
