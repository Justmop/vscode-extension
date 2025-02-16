const { coreSimulatorLogPath, emulatorPath } = require("./constants");

const vscode = require("vscode");
const { exec } = require("child_process");

function viewAndroid() {
  exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
    if (error) {
      vscode.window.showErrorMessage(`Error: ${stderr}`);
      return;
    }
    const androidOptions = stdout.split("\n").filter((line) => line);
    showAndroidOptions(androidOptions);
  });
}

function viewIOS() {
  exec(
    'xcrun simctl list devices available | grep -E "iPhone|iPad"',
    (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error: ${stderr}`);
        return;
      }
      const iosOptions = stdout.split("\n").filter((line) => line);

      exec(
        `ls -lt ${coreSimulatorLogPath} | awk '{print $9}' | grep -Eo '[0-9A-Fa-f-]{36}'`,
        (error, stdout, stderr) => {
          if (error) {
            vscode.window.showErrorMessage(
              `Error fetching simulator logs: ${stderr}`
            );
          }

          const logUDIDs = stdout
            .split("\n")
            .filter((line) => line)
            .map((line) => line.trim());

          let sortedDevices = [];
          let lastDevices = [];

          if (logUDIDs?.length ?? 0 > 0) {
            logUDIDs.forEach((id) => {
              iosOptions.forEach((item) => {
                const simulatorId = item.match(/\(([^)]+)\)/)[1];

                if (id === simulatorId) {
                  sortedDevices.push(item);
                } else {
                  lastDevices.push(item);
                }
              });
            });
          } else {
            sortedDevices = iosOptions;
          }

          showIOSOptions([...sortedDevices, lastDevices]);
        }
      );
    }
  );
}

function showIOSOptions(iosOptions) {
  vscode.window
    .showQuickPick(iosOptions, {
      placeHolder: "Select an iOS simulator",
    })
    .then((selectedIOS) => {
      if (selectedIOS) {
        const simulatorId = selectedIOS.match(/\(([^)]+)\)/)[1]; // Seçilen simülatörün ID'sini alıyoruz
        startIOSSimulator(simulatorId);
      }
    });
}

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
  exec(
    `xcrun simctl boot ${simulatorId} && open -a Simulator`,
    (error, stdout, stderr) => {
      if (error) {
        vscode.window.showErrorMessage(`Error starting simulator: ${stderr}`);
        return;
      }
      vscode.window.showInformationMessage(
        `iOS Simulator started: ${simulatorId}`
      );
    }
  );
}

module.exports = {
  viewAndroid,
  viewIOS,
};
