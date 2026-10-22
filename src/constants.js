const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const emulatorPath = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("emulatorPath");
const adbPath = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("adbPath");
const idbPath = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("idbPath");
const coreSimulatorLogPath = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("coreSimulatorLogPath");
const iosAppPackage = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("iosAppPackage");
const androidAppPackage = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("androidAppPackage");
const partnerIosAppPackage = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("partnerIosAppPackage");
const partnerAndroidAppPackage = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("partnerAndroidAppPackage");
const maestroPath = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("maestroPath");

const projectPath =
  ((vscode.workspace.workspaceFolders?.length ?? 0) > 0 &&
    vscode.workspace.workspaceFolders[0]?.uri?.fsPath) ||
  ".";
//const projectPath = '/Users/yakupdurmus/Desktop/justlife/justmobile'

// Detects the opened project from app.json ("partnerapp" -> Partner app, otherwise Justlife)
function getAppPackages() {
  let appName = "";
  try {
    const appJson = JSON.parse(
      fs.readFileSync(path.join(projectPath, "app.json"), "utf8")
    );
    appName = (appJson.name || "").toLowerCase();
  } catch {
    // app.json not found, fallback to Justlife
  }

  if (appName === "partnerapp") {
    return {
      appName: "Partner",
      iosAppPackage: partnerIosAppPackage,
      androidAppPackage: partnerAndroidAppPackage,
    };
  }
  return { appName: "Justlife", iosAppPackage, androidAppPackage };
}

const menuOptions = {
  viewIOS: "View IOS",
  viewAndroid: "View Android",
  abtestDiff: "AbTest Diff",
  resetApp: "Reset App",
  resetPermissions: "Reset Permission",
  openDeeplink: "Open Deeplink",
  runMaestroTest: "Run Maestro Test",
  // Hidden for now
  // cursor: "Justlife Agent",
};

module.exports = {
  emulatorPath,
  adbPath,
  idbPath,
  coreSimulatorLogPath,
  iosAppPackage,
  androidAppPackage,
  partnerIosAppPackage,
  partnerAndroidAppPackage,
  getAppPackages,
  projectPath,
  menuOptions,
  maestroPath,
};
