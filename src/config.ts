export const WebsiteUrls = [`https://devcon.org/`, `https://devcon.org/es/`];
export const DevconFolder = "./output/devcon-local";
export const CacheDir = "./output/cache";
export const OptimizedImageDir = "next_image";
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
