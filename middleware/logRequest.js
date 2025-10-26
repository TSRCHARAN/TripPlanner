import fs from "fs";
import path from "path";
const logDir = "./logs";
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function appendToFile(fileName, message) {
  const filePath = path.join(logDir, fileName);
  fs.appendFile(filePath, message + "\n", err => { if (err) console.error("Log write error:", err); });
}

export function logRequest(req, res, next) {
  const start = Date.now();
  const now = new Date().toISOString();
  console.log(`\n▶ ${now} ${req.method} ${req.originalUrl}`);
  console.log("Body:", JSON.stringify(req.body));
  res.on("finish", () => {
    const duration = Date.now() - start;
    const line = `${now} | ${req.method} ${req.originalUrl} | ${res.statusCode} | ${duration}ms`;
    console.log(`⬅ ${res.statusCode} ${duration}ms`);
    appendToFile(`${new Date().toISOString().slice(0,10)}.log`, line);
  });
  next();
}

export function errorLogger(err, req, res, next) {
  const now = new Date().toISOString();
  const entry = [
    "---------------------------",
    `ERROR @ ${now}`,
    `${req.method} ${req.originalUrl}`,
    `Message: ${err.message}`,
    `Stack: ${err.stack}`,
    "---------------------------"
  ].join("\n");
  console.error(entry);
  appendToFile("errors.log", entry);
  res.status(500).json({ success:false, message: "Internal Server Error", error: err.message });
}
