export const WebsiteUrls = [`https://devcon.org/`, `https://devcon.org/es/`];
export const DevconFolder = "./output/devcon-local";
export const CacheDir = "./output/cache";
export const OptimizedImageDir = "next_image";
export const DataFiles = [
  "en",
  "en/tickets",
  "en/blogs",
  "en/city-guide",
  "en/past-events",
  "en/faq",
  "en/news",
  "en/about",
  "en/road-to-devcon",
  "en/dips",
  "en/supporters",
  "en/devcon-week",
  "en/programming",
  "en/speaker-applications",
  "es",
  "es/tickets",
  "es/blogs",
  "es/city-guide",
  "es/past-events",
  "es/faq",
  "es/news",
  "es/about",
  "es/road-to-devcon",
  "es/dips",
  "es/supporters",
  "es/devcon-week",
  "es/programming",
  "es/speaker-applications",
];
export const IndexFile = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Meta tag for redirection -->
  <meta http-equiv="refresh" content="0; url=/en/index.html">

  <title>Redirecting...</title>

  <!-- JavaScript redirection as well -->
  <script type="text/javascript">
    window.location.href = '/en/index.html';
  </script>
</head>
<body>
  <p>If you are not redirected automatically, follow this <a href="/en/index.html">link</a>.</p>
</body>
</html>`;
