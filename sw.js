const CACHE='aga-v3';
const ASSETS=['./','index.html','style.css','app.js','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/icon-maskable-512.png','images/logo.jpg',
 ...[1,2,3,4,5,6,7,8].map(i=>`images/ex${i}.jpg`)];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
// Network-first for pages/code (so updates show up), cache-first for images; falls back to cache offline.
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
 const img=/\.(jpg|png|webp)$/.test(new URL(r.url).pathname);
 const net=()=>fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));}return res;});
 e.respondWith(img?caches.match(r,{ignoreSearch:true}).then(c=>c||net()):net().catch(()=>caches.match(r,{ignoreSearch:true}).then(c=>c||caches.match('index.html'))));});
