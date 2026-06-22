const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = path.resolve(__dirname, "..");
const sourceApp = path.join(root, "node_modules/electron/dist/Electron.app");
const outputApp = path.join(root, "outputs/Claude to Code.app");
const resourcesDir = path.join(outputApp, "Contents/Resources");
const appDir = path.join(resourcesDir, "app");
const infoPlist = path.join(outputApp, "Contents/Info.plist");

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.rmSync(outputApp, { recursive: true, force: true });
const ditto = childProcess.spawnSync("ditto", [sourceApp, outputApp], { encoding: "utf8" });
if (ditto.status !== 0) {
  throw new Error(ditto.stderr || "ditto failed to copy Electron.app");
}

fs.rmSync(path.join(resourcesDir, "default_app.asar"), { force: true });
fs.rmSync(appDir, { recursive: true, force: true });
fs.mkdirSync(appDir, { recursive: true });

copyFile(path.join(root, "package.json"), path.join(appDir, "package.json"));
fs.cpSync(path.join(root, "electron"), path.join(appDir, "electron"), { recursive: true });
fs.cpSync(path.join(root, "dist"), path.join(appDir, "dist"), { recursive: true });

const appPackage = JSON.parse(fs.readFileSync(path.join(appDir, "package.json"), "utf8"));
appPackage.name = "claude-to-code";
appPackage.productName = "Claude to Code";
appPackage.main = "electron/main.cjs";
appPackage.scripts = {};
appPackage.dependencies = {};
appPackage.devDependencies = {};
fs.writeFileSync(path.join(appDir, "package.json"), `${JSON.stringify(appPackage, null, 2)}\n`);

const plistUpdates = [
  ["CFBundleName", "Claude to Code"],
  ["CFBundleDisplayName", "Claude to Code"],
  ["CFBundleIdentifier", "local.claudetocode"],
  ["CFBundleExecutable", "Electron"]
];

for (const [key, value] of plistUpdates) {
  childProcess.spawnSync("/usr/libexec/PlistBuddy", ["-c", `Set :${key} ${value}`, infoPlist], { stdio: "ignore" });
}

console.log(outputApp);
