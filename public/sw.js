self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("tiktroq-cache-v1").then((cache) => {
      return cache.addAll(["/", "/index.html", "/manifest.webmanifest"]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => {
      return (
        resp ||
        fetch(event.request).then((response) => {
          return caches.open("tiktroq-cache-v1").then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
      );
    })
  );
});
