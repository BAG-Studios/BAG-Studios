const fs=require('node:fs'),path=require('node:path');
const {createClient,escapeHtml}=require('../server/website.cjs');
module.exports=async(req,res)=>{
 let xml=fs.readFileSync(path.join(process.cwd(),'sitemap.xml'),'utf8');
 try{if(process.env.SUPABASE_SECRET_KEY){const posts=await createClient(process.env,fetch).call('/rest/v1/blog_posts?select=slug,updated_at&status=eq.published&published_at=lte.'+encodeURIComponent(new Date().toISOString())+'&order=published_at.desc&limit=1000');const entries=posts.map(p=>`<url><loc>https://bag-studios.com/blog/${escapeHtml(p.slug)}</loc><lastmod>${new Date(p.updated_at).toISOString()}</lastmod></url>`).join('\n');xml=xml.replace('</urlset>',entries+'\n</urlset>');}}catch{ /* Keep the static pages discoverable during database downtime. */ }
 res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');res.statusCode=200;res.end(xml);
};
