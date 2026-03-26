const { projectPath, maestroPath } = require("./constants");
const vscode = require("vscode");
const { exec, spawn } = require("child_process");

let runShellScript;
let stopButton;

function maestroTestRunner() {
  exec(`sh ${__dirname}/UnitTestFolders.sh ${projectPath}`,
    (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error running UnitTestFolders.sh: ${stderr}`);
        return;
      }
      console.log({ error, stderr, stdout });
      const filteredMaestroFilePaths = stdout.split("\n").filter((item) => {
        return item && item != "flow";
      });



      vscode.window
        .showQuickPick(filteredMaestroFilePaths, {
          placeHolder: "Select a maestro test folder",
        })
        .then((selectedFolder) => {
          if (selectedFolder) {

            console.log({ selectedFolder, maestroPath });
            const shellScript = `PATH="${maestroPath}:$PATH" && which maestro && maestro test ${projectPath}/maestro/${selectedFolder}`;
            runShellScript = spawn('sh', ['-c', shellScript]);

            const outputChannel = vscode.window.createOutputChannel("Maestro test");
            outputChannel.show();
            outputChannel.appendLine(`Maestro command started. Selected Folder : maestro/${selectedFolder}`);

            runShellScript.stdout.on('data', (data) => {
              outputChannel.appendLine(data.toString() + "---stdout");
              showStopButton();

            });

            runShellScript.stderr.on('data', (data) => {
              outputChannel.appendLine(data.toString() + "---stderr");

            });

            runShellScript.on('close', (code) => {
              outputChannel.appendLine(`Process exited with code ${code}`);
              hideStopButton();
              if (code === 0) {
                vscode.window.showInformationMessage(`Maestro test script executed successfully for ${selectedFolder}`);
              }
            });
          } else {
            vscode.window.showWarningMessage('You should select a folder');
          }
        });
    });
}

function showStopButton() {
  stopButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  stopButton.text = '$(loading~spin) Stop Maestro Test';
  stopButton.command = 'extension.stopMaestroTest';
  stopButton.show();
}

function hideStopButton() {
  stopButton.dispose();
}


function stopMaestroTest() {
  if (runShellScript) {
    runShellScript.kill();
    vscode.window.showInformationMessage('Maestro test script has been stopped.');
  } else {
    vscode.window.showWarningMessage('No running maestro test script to stop.');
  }
  hideStopButton();
}

module.exports = {
  maestroTestRunner,
  stopMaestroTest,
};
