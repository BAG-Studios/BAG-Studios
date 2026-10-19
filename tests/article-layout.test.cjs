const {test}=require('node:test');const assert=require('node:assert/strict');
const {renderArticle,normalizeLayout,legacyBlocks}=require('../article-layout.js');
test('article layout renders cover captions, text, a side image and ending together',()=>{
 const layout=normalizeLayout({mode:'split',cover:{caption:'At the event',alt:'An audience',ratio:'wide'},sidebar:{url:'Images/demo-day-playtesting.png',alt:'A playtest',caption:'At the table'},blocks:[{type:'heading',text:'A fresh pair of eyes.'},{type:'text',text:'We watched players explore the arena.'}],cta:{enabled:true,title:'Try Atira.',text:'Play our demo.',label:'Play demo',url:'https://bag-studios.itch.io/project-a'}});
 const html=renderArticle({title:'Demo Day',excerpt:'A day with our players.',category:'EVENTS',cover_url:'Images/demo-day-event.png',layout});
 assert.match(html,/post-story post-split/);assert.match(html,/At the event/);assert.match(html,/A fresh pair of eyes/);assert.match(html,/demo-day-playtesting/);assert.match(html,/Play demo/);
});
test('all article fields and captions escape HTML; image and button URLs reject scripts',()=>{
 const layout=normalizeLayout({sidebar:{url:'javascript:alert(1)'},blocks:[{type:'text',text:'<script>bad()</script>'},{type:'image',url:'javascript:alert(1)',caption:'<img onerror=bad()>'}],cta:{enabled:true,url:'javascript:alert(1)',title:'<script>bad()</script>'}});
 const html=renderArticle({title:'<img onerror=bad()>',excerpt:'Plain text',layout});assert.doesNotMatch(html,/<script>|javascript:|<img onerror/);assert.match(html,/&lt;script&gt;/);
});
test('legacy markdown content converts into editable blocks without losing paragraphs or lists',()=>{
 const blocks=legacyBlocks('# Hello\n\nFirst paragraph.\n\n- One\n- Two');assert.equal(blocks[0].type,'heading');assert.equal(blocks[1].text,'First paragraph.');assert.equal(blocks[2].type,'list');
});
test('invalid layout options normalize to supported values and discard unknown block types',()=>{
 const l=normalizeLayout({mode:'anything',cover:{ratio:'evil'},blocks:[{type:'html',text:'<script>'},{type:'text',text:'Hello'}]});assert.equal(l.mode,'single');assert.equal(l.cover.ratio,'natural');assert.equal(l.blocks.length,1);
});
