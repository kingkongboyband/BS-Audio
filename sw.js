/* Service Worker: แคชเฉพาะตัวหน้าเว็บ (ไม่แคชข้อมูลงานซ่อม/การเรียก API) */
const VERSION = "v1";
const CACHE = "src-audio-" + VERSION;
const SHELL = ["./index.html", "./customer.html", "./icon-192.png", "./icon-512.png",
  "./icon-maskable-512.png", "./apple-touch-icon.png", "./manifest-staff.webmanifest", "./manifest-customer.webmanifest"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("src-audio-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;                       // POST ไป Apps Script ผ่านเครือข่ายตรงๆ เสมอ
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;   // script.google.com ฯลฯ ไม่แตะ

  if (req.mode === "navigate") {                          // หน้าเว็บ: ออนไลน์ก่อน ถ้าไม่มีเน็ตใช้ที่แคช
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match("./index.html"))));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {            // ไฟล์ประกอบ/ฟอนต์: ใช้แคชก่อน แล้วอัพเดทเบื้องหลัง
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
