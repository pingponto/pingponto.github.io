var CACHE_NAME = 'pontual-static-v1';
var ASSETS = [
'./',
'./index.html',
'./report.html',
'./styles.css',
'./app.js',
'./db.js',
'./manifest.webmanifest'
];
self.addEventListener('install', function(e){ e.waitUntil(caches.open(CACHE_NAME).then(function(c){ return c.addAll(ASSETS); })); });
self.addEventListener('activate', function(e){ e.waitUntil(caches.keys().then(function(keys){ return Promise.all(keys.filter(function(k){return k!==CACHE_NAME;}).map(function(k){return caches.delete(k);})); })); });
self.addEventListener('fetch', function(e){ e.respondWith(caches.match(e.request).then(function(r){ return r || fetch(e.request).catch(function(){ return caches.match('./index.html'); }); })); });