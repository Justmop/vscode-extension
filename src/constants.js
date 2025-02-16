const vscode = require("vscode");

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
const maestroPath = vscode.workspace
  .getConfiguration("justlife-vs-extension")
  .get("maestroPath");

const projectPath =
  ((vscode.workspace.workspaceFolders?.length ?? 0) > 0 &&
    vscode.workspace.workspaceFolders[0]?.uri?.fsPath) ||
  ".";
//const projectPath = '/Users/yakupdurmus/Desktop/justlife/justmobile'

const menuOptions = {
  viewIOS: "View IOS",
  viewAndroid: "View Android",
  abtestDiff: "AbTest Diff",
  resetApp: "Reset App",
  runMaestroTest: "Run Maestro Test",
};

module.exports = {
  emulatorPath,
  adbPath,
  idbPath,
  coreSimulatorLogPath,
  iosAppPackage,
  androidAppPackage,
  projectPath,
  menuOptions,
  maestroPath,
};
