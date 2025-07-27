const http = require("http");
const IncomingForm = require("formidable").IncomingForm;

const port = 5003;

http
  .createServer((req, res) => {
    if (req.url === "/process" && req.method === "POST") {
      const form = new IncomingForm({
        keepExtensions: true,
      });
      form.parse(req);
      form
        .on("field", (name, value) => {
          console.log(`[Image Service] Field: ${name} = ${value}`);
        })
        .on("file", (name, file) => {
          console.log(
            `[Image Service] File: ${name} = ${file.originalFilename}`
          );
        })
        .on("end", () => {
          console.log("[Image Service] Processing completed.");
          res.writeHead(200);
          res.end("done");
        });
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, () => {
    console.log(`Image Service running at http://localhost:${port}`);
  });
