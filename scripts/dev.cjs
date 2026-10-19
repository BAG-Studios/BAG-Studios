const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
try{process.loadEnvFile('.env.development.local');}catch{}
const api=require('../api/website.js'),article=require('../api/article.js');const root=path.resolve(__dirname,'..');
http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost:3000');req.query=Object.fromEntries(url.searchParams);res.status=n=>{res.statusCode=n;return res};res.json=b=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(b));};
 if(url.pathname==='/api/website'){let body='';for await(const chunk of req){body+=chunk;if(body.length>150000){res.statusCode=413;res.end();return;}}req.body=body||undefined;return api(req,res);}
 if(url.pathname==='/blog-umea-demo-day.html'||url.pathname.startsWith('/blog/')){req.query.slug=url.pathname==='/blog-umea-demo-day.html'?'umea-demo-day':url.pathname.slice(6);return article(req,res);}
 const name=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);const file=url.pathname==='/media-library.json'?path.join(root,'public','media-library.json'):path.resolve(root,'.'+name);
 if(!file.startsWith(root+path.sep)||name.includes('/.')){res.statusCode=403;return res.end();}
 try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.ttf':'font/ttf'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.statusCode=404;res.end('Not found');}
}).listen(3000,'127.0.0.1',()=>console.log('BAG Studios local preview: http://127.0.0.1:3000'));
