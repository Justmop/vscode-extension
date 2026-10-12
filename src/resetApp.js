const { adbPath, idbPath, getAppPackages } = require("../src/constants");

const vscode = require("vscode");
const { exec } = require("child_process");

function resetApp() {
  const { appName, iosAppPackage, androidAppPackage } = getAppPackages();

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
            placeHolder: `Select a device to reset the ${appName} app`,
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
                        `Error resetting ${appName} iOS app: ${stderr}`
                      );
                      return;
                    }
                    vscode.window.showInformationMessage(
                      `${appName} iOS app reset on device: ${udid}`
                    );
                  }
                );
              } else {
                const emulatorName = selectedDevice.split(/\s+/)[0]; // Emulator adını al
                exec(
                  `${adbPath} -s ${emulatorName} shell pm clear ${androidAppPackage}`,
                  (error, stdout, stderr) => {
                    if (error) {
                      vscode.window.showErrorMessage(
                        `Error resetting ${appName} Android app: ${stderr}`
                      );
                      return;
                    }
                    vscode.window.showInformationMessage(
                      `${appName} Android app reset on device: ${emulatorName}`
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
