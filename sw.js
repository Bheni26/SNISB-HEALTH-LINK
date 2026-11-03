// SNISB Health Link — Service Worker : ouverture hors connexion.
// Pages : réseau d'abord (4 s), cache en secours -> jamais bloqué sur une ancienne version.
// Bibliothèques (CDN) et polices : cache d'abord. Supabase et fonctions : jamais mis en cache.
const VERSION='snisb-v22';
const CDN=[
  'https://unpkg.com/react@18/umd/react.development.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..500,0..1,0'
];
const SHELL=['./','./index.html','./manifest.json','./icon-192.png'];
const EXTERNES=['unpkg.com','cdn.jsdelivr.net','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil((async()=>{
    const c=await caches.open(VERSION);
    await Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})));
    await Promise.all(CDN.map(u=>fetch(new Request(u,{mode:'no-cors'})).then(r=>c.put(u,r)).catch(()=>{})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const k=await caches.keys();
    await Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(req.mode==='navigate'){
    e.respondWith((async()=>{
      const c=await caches.open(VERSION);
      try{
        const r=await Promise.race([fetch(req),new Promise((_,rej)=>setTimeout(()=>rej(new Error('lent')),4000))]);
        if(r&&r.ok){c.put('./index.html',r.clone());}
        return r;
      }catch(err){
        return (await c.match('./index.html'))||(await c.match('./'))||Response.error();
      }
    })());
    return;
  }
  if(url.origin===location.origin||EXTERNES.includes(url.hostname)){
    e.respondWith((async()=>{
      const c=await caches.open(VERSION);
      const hit=await c.match(req);
      if(hit)return hit;
      try{const r=await fetch(req);if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r;}
      catch(err){return Response.error();}
    })());
  }
});
