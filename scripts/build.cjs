const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const out=path.join(root,'public');
if(path.dirname(out)!==root||path.basename(out)!=='public')throw new Error('Unexpected build directory');
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const item of fs.readdirSync(root,{withFileTypes:true})){
 if(item.isFile()&&(/\.(html|css|js)$/.test(item.name)||item.name==='robots.txt')&&item.name!=='contact-preview.html')fs.copyFileSync(path.join(root,item.name),path.join(out,item.name));
}
for(const dir of ['Fonts','Icons','Images'])fs.cpSync(path.join(root,dir),path.join(out,dir),{recursive:true,filter:file=>!file.endsWith('contact-portrait-preview.png')});
console.log('Static website built into public/. Server code, credentials, SQL and tests are excluded.');
