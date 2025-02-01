const vscode = require("vscode");
const { exec } = require("child_process");

const emulatorPath = "~/Library/Android/sdk/emulator/emulator";

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
      const simulatorOptions = ["Android", "iOS"];
      const selectedSimulator = await vscode.window.showQuickPick(
        simulatorOptions,
        {
          placeHolder: "Select a simulator",
        }
      );

      if (selectedSimulator) {
        if (selectedSimulator === "iOS") {
          exec(
            'xcrun simctl list devices available | grep -E "iPhone|iPad"',
            (error, stdout, stderr) => {
              if (error) {
                vscode.window.showErrorMessage(`Error: ${stderr}`);
                return;
              }
              const iosOptions = stdout.split("\n").filter((line) => line);
              console.log(iosOptions);
              showIOSOptions(iosOptions);
            }
          );
        } else if (selectedSimulator === "Android") {
          exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
            if (error) {
              vscode.window.showErrorMessage(`Error: ${stderr}`);
              return;
            }
            const androidOptions = stdout.split("\n").filter((line) => line);
            showAndroidOptions(androidOptions);
          });
        }
      }
    }
  );

  context.subscriptions.push(disposableHello);
  context.subscriptions.push(disposableSimulator);
}

function showIOSOptions(iosOptions) {
  vscode.window
    .showQuickPick(iosOptions, {
      placeHolder: "Select an iOS simulator",
    })
    .then((selectedIOS) => {
      if (selectedIOS) {
        const simulatorId = selectedIOS.match(/\(([^)]+)\)/)[1]; // Seçilen simülatörün ID'sini alıyoruz
        console.log("Simulator ID ", simulatorId);
        startIOSSimulator(simulatorId);
      }
    });
}

// Android simülatörlerini gösteren fonksiyon
function showAndroidOptions(androidOptions) {
  vscode.window
    .showQuickPick(androidOptions, {
      placeHolder: "Select an Android emulator",
    })
    .then((selectedAndroid) => {
      if (selectedAndroid) {
        startAndroidSimulator(selectedAndroid); // Seçilen Android simülatörünü başlatıyoruz
      }
    });
}

function startAndroidSimulator(emulatorName) {
  exec(`${emulatorPath} -avd ${emulatorName}`, (error, stdout, stderr) => {
    if (error) {
      vscode.window.showErrorMessage(
        `Error starting Android emulator: ${stderr}`
      );
      return;
    }
    vscode.window.showInformationMessage(
      `Android Emulator started: ${emulatorName}`
    );
  });
}

function startIOSSimulator(simulatorId) {
  exec(`xcrun simctl boot ${simulatorId}`, (error, stdout, stderr) => {
    if (error) {
      vscode.window.showErrorMessage(`Error starting simulator: ${stderr}`);
      return;
    }
    exec("open -a Simulator", (error) => {
      if (error) {
        vscode.window.showErrorMessage(
          `Error opening Simulator app: ${error.message}`
        );
        return;
      }
    });
    vscode.window.showInformationMessage(
      `iOS Simulator started: ${simulatorId}`
    );
  });
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
