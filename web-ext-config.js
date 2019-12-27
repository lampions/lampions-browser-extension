const fs = require("fs");
const path = require("path");

const config = {
  sourceDir: "addon"
};
const credentialsFile = path.join(
  process.env.HOME, ".webext.credentials.json");
if (fs.existsSync(credentialsFile)) {
  const credentials = JSON.parse(fs.readFileSync(credentialsFile));
  config.sign = {
    apiKey: credentials.apiKey,
    apiSecret: credentials.apiSecret,
  };
}

module.exports = config;
