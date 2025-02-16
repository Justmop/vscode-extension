const vscode = require("vscode");

const { listOfAbTestFolder } = require("./src/abtestdiff");
const { menuOptions } = require("./src/constants");
const { resetApp } = require("./src/resetApp");
const { maestroTestRunner } = require("./src/runMaestroTest");
const { viewAndroid, viewIOS } = require("./src/startSimulators");

function activate(context) {
  console.log(
    'Congratulations, your extension "justlife-vs-extension" is now active!'
  );

  const disposableHello = vscode.commands.registerCommand(
    "justlife-vs-extension.helloWorld",
    function () {
      vscode.window.showInformationMessage(
        "Hello World from justlife-vs-extension!"
      );
    }
  );

  const disposableSimulator = vscode.commands.registerCommand(
    "justlife-vs-extension.simulator",
    async function () {
      const selectedSimulator = await vscode.window.showQuickPick(
        Object.values(menuOptions),
        {
          placeHolder: "Select option",
        }
      );

      if (selectedSimulator) {
        if (selectedSimulator === menuOptions.viewIOS) {
          viewIOS();
        } else if (selectedSimulator === menuOptions.viewAndroid) {
          viewAndroid();
        } else if (selectedSimulator === menuOptions.resetApp) {
          resetApp();
        } else if (selectedSimulator === menuOptions.abtestDiff) {
          listOfAbTestFolder();
        } else if (selectedSimulator === menuOptions.runMaestroTest) {
          maestroTestRunner();
        }
      }
    }
  );

  context.subscriptions.push(disposableHello);
  context.subscriptions.push(disposableSimulator);
}

function deactivate() { }

module.exports = {
  activate,
  deactivate,
};
