const { projectPath, maestroPath } = require("./constants");
const vscode = require("vscode");
const { exec, spawn } = require("child_process");

function maestroTestRunner() {
  exec(`sh ${__dirname}/UnitTestFolders.sh ${projectPath}`,
    (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error running UnitTestFolders.sh: ${stderr}`);
        return;
      }
      console.log({ error, stderr, stdout })
      const filteredMaestroFilePaths = stdout.split("\n").filter((item) => {
        return item && item != "flow";
      });

      vscode.window
        .showQuickPick(filteredMaestroFilePaths, {
          placeHolder: "Select an maestro test folder",
        })
        .then((selectedFolder) => {
          if (selectedFolder) {

            console.log({ selectedFolder, maestroPath });

            const shellScript = `PATH="${maestroPath}:$PATH" && which maestro && maestro test ${projectPath}/maestro/${selectedFolder}`;
            const runShellScript = spawn('sh', ['-c', shellScript]);

            const outputChannel = vscode.window.createOutputChannel("Maestro test");
            outputChannel.show();
            outputChannel.appendLine(`Selected Folder : maestro/${selectedFolder}`)

            runShellScript.stdout.on('data', (data) => {
              outputChannel.appendLine(data.toString());
            });

            runShellScript.stderr.on('data', (data) => {
              outputChannel.appendLine(data.toString());
              vscode.window.showErrorMessage(`Error running maestro test script: ${data}`);
            });

            runShellScript.on('close', (code) => {
              if (code === 0) {
                vscode.window.showInformationMessage(`Maestro test script executed successfully for ${selectedFolder}`);
              }
            });

          } else {

            vscode.window.showWarningMessage('You should select folder');
          }
        });
    });
}

module.exports = {
  maestroTestRunner,
};
