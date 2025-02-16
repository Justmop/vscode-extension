const {
  adbPath,
  androidAppPackage,
  idbPath,
  iosAppPackage,
} = require("../src/constants");

const vscode = require("vscode");
const { exec } = require("child_process");

function resetApp() {
  exec(
    'xcrun simctl list devices available | grep "(Booted)"',
    (error, stdout, stderr) => {
      if (error) {
        if (!stderr) {
          // No booted devices
        } else {
          vscode.window.showErrorMessage(
            `Warning fetching IOS devices: ${stderr}`
          );
          return;
        }
      }
      const iosDevices = stdout.split("\n").filter((line) => line);

      exec(`${adbPath} devices`, (error, stdout, stderr) => {
        if (error) {
          vscode.window.showErrorMessage(
            `Error fetching Android devices: ${stderr}`
          );
          return;
        }
        const androidDevices = stdout
          .split("\n")
          .filter(
            (line) =>
              line &&
              line.includes("device") &&
              !line.includes("List of devices")
          );

        const deviceOptions = [...iosDevices, ...androidDevices];
        if (deviceOptions.length === 0) {
          vscode.window.showWarningMessage(
            `No booted devices found. Please boot a device first.`
          );
          return;
        }

        vscode.window
          .showQuickPick(deviceOptions, {
            placeHolder: "Select a device to reset the app",
          })
          .then((selectedDevice) => {
            if (selectedDevice) {
              if (
                selectedDevice.includes("iPhone") ||
                selectedDevice.includes("iPad")
              ) {
                const udid = selectedDevice.match(/\(([^)]+)\)/)[1];
                exec(
                  `${idbPath} file rm --application ${iosAppPackage} --udid ${udid}`,
                  (error, stdout, stderr) => {
                    if (error) {
                      vscode.window.showErrorMessage(
                        `Error resetting iOS app: ${stderr}`
                      );
                      return;
                    }
                    vscode.window.showInformationMessage(
                      `iOS app reset on device: ${udid}`
                    );
                  }
                );
              } else {
                const emulatorName = selectedDevice.split(" ")[0]; // Emulator adını al
                exec(
                  `${adbPath} shell pm clear ${androidAppPackage}`,
                  (error, stdout, stderr) => {
                    if (error) {
                      vscode.window.showErrorMessage(
                        `Error resetting Android app: ${stderr}`
                      );
                      return;
                    }
                    vscode.window.showInformationMessage(
                      `Android app reset on device: ${emulatorName}`
                    );
                  }
                );
              }
            }
          });
      });
    }
  );
}

module.exports = {
  resetApp,
};
