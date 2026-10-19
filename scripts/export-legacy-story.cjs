// Export the original HTML article as an editable database record without rewriting its copy.
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'../blog-umea-demo-day.html'),'utf8');
const clean=s=>s.replace(/<br\s*\/?\s*>/g,' ').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').trim();
const capture=re=>clean(html.match(re)[1]);
const copy=html.match(/<div class="article-copy">([\s\S]*?)<\/div>/)[1];
const blocks=[...copy.matchAll(/<(h2|p)>([\s\S]*?)<\/\1>/g)].map(m=>({type:m[1]==='h2'?'heading':'text',text:clean(m[2])}));
const post={slug:'umea-demo-day',title:capture(/<h1>([\s\S]*?)<\/h1>/),category:'EVENTS & PLAYTESTING',excerpt:capture(/<p class="lead">([\s\S]*?)<\/p>/),cover_url:'https://bag-studios.com/Images/demo-day-event.png',status:'published',published_at:'2026-10-01T10:00:00Z',content:blocks.map(b=>(b.type==='heading'?'# ':'')+b.text).join('\n\n'),layout:{version:1,mode:'split',cover:{alt:'Visitors gathered for a presentation at Umeå Demo Day in MIT-huset',caption:'Umeå Demo Day · MIT-huset, Umeå University',ratio:'natural'},sidebar:{url:'https://bag-studios.com/Images/demo-day-playtesting.png',alt:'A player discussing Atira at the demo table while a team member takes notes',caption:'At the demo table: playing, talking, and taking notes.'},blocks,cta:{enabled:true,title:'Try Atira for yourself.',text:'The early Windows demo is available on itch.io. Play a few runs and tell us what you think.',label:'Play the demo',url:'https://bag-studios.itch.io/project-a',secondaryLabel:'More about Atira',secondaryUrl:'https://bag-studios.com/atira.html'}}};
process.stdout.write(JSON.stringify(post));
