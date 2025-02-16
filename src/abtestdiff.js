const { projectPath } = require("./constants");

const vscode = require("vscode");
const { exec } = require("child_process");

function listOfAbTestFolder() {
  exec(
    `find ${projectPath}/src/abtests -maxdepth 1 -type d -exec basename {} \\;`,
    (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(
          `Error listing AB test folders: ${stderr}`
        );
        return;
      }
      const abTestFolders = stdout
        .split("\n")
        .filter((line) => line.includes("AbTest"));
      vscode.window
        .showQuickPick(abTestFolders, {
          placeHolder: "Select an AB test folder",
        })
        .then((selectedFolder) => {
          if (selectedFolder) {
            const shellScript = `export PATH="$PATH:/Applications/Visual Studio Code.app/Contents/Resources/app/bin" && cd ${projectPath}/cli && sh ab-test-diff.sh ${selectedFolder.replace(
              "AbTest",
              ""
            )}`;
            console.log({ shellScript });
            exec(shellScript, (error, stdout, stderr) => {
              if (error) {
                vscode.window.showErrorMessage(
                  `Error running AB test diff script: ${stderr}`
                );
                return;
              }
              vscode.window.showInformationMessage(
                `AB test diff script executed successfully for ${stdout}`
              );
              const outputChannel =
                vscode.window.createOutputChannel("AB Test Diff");
              outputChannel.show();
              outputChannel.appendLine(stdout);
            });
          }
        });
    }
  );
}

module.exports = {
  listOfAbTestFolder,
};
