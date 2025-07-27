const http = require("http");
const fs = require("fs");
const path = require("path");

const port = 5001;
const craftedImagePath = path.join(__dirname, "../cabo-pero-injected.jpeg");

const html = `
<!DOCTYPE html>
<html>
  <body>
    <h2>Upload Crafted Image</h2>
    <form action="http://localhost:5002/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="image" accept="image/jpeg" required><br><br>
      <button type="submit">Upload</button>
    </form>
    <h3>Crafted Image (for HPP test):</h3>
    <img src="/crafted-image.jpeg" width="300"/>
  </body>
</html>
`;

http
  .createServer((req, res) => {
    if (req.url === "/crafted-image.jpeg") {
      fs.createReadStream(craftedImagePath)
        .on("error", () => {
          res.writeHead(404);
          res.end("Not found");
        })
        .pipe(res);
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html);
    }
  })
  .listen(port, () => {
    console.log(`Web UI running at http://localhost:${port}`);
  });
