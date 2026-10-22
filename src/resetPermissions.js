const { adbPath, getAppPackages } = require("./constants");
const { run, shellQuote, getBootedDevices } = require("./devices");

const vscode = require("vscode");
const fs = require("fs");
const os = require("os");
const path = require("path");

// Notification permission can not be reset with `simctl privacy`, so the app is reinstalled.
// App data is backed up and restored, so only the permissions are reset.
async function resetIOSPermissions(udid, bundleId) {
  const appResult = await run(
    `xcrun simctl get_app_container ${udid} ${bundleId} app`
  );
  if (appResult.error) {
    return { skipped: true };
  }
  const appPath = appResult.stdout.trim();
  const dataPath = (
    await run(`xcrun simctl get_app_container ${udid} ${bundleId} data`)
  ).stdout.trim();

  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), "justlife-permissions-"));
  const backupApp = path.join(backupDir, path.basename(appPath));
  const backupData = path.join(backupDir, "data");

  const backup = await run(
    `ditto ${shellQuote(appPath)} ${shellQuote(backupApp)} && ditto ${shellQuote(
      dataPath
    )} ${shellQuote(backupData)}`
  );
  if (backup.error) {
    fs.rmSync(backupDir, { recursive: true, force: true });
    return { error: `Backup failed: ${backup.stderr}` };
  }

  await run(`xcrun simctl terminate ${udid} ${bundleId}`);
  await run(`xcrun simctl uninstall ${udid} ${bundleId}`);
  await run(`xcrun simctl privacy ${udid} reset all ${bundleId}`);

  const install = await run(`xcrun simctl install ${udid} ${shellQuote(backupApp)}`);
  if (install.error) {
    // Keep the backup so the app can be installed again manually
    return { error: `Reinstall failed, backup kept at ${backupDir}: ${install.stderr}` };
  }

  const newDataPath = (
    await run(`xcrun simctl get_app_container ${udid} ${bundleId} data`)
  ).stdout.trim();
  const restore = await run(
    `ditto ${shellQuote(backupData)} ${shellQuote(newDataPath)}`
  );
  if (restore.error) {
    return { error: `Data restore failed, backup kept at ${backupDir}: ${restore.stderr}` };
  }

  fs.rmSync(backupDir, { recursive: true, force: true });
  return {};
}

// Revokes runtime permissions and clears user-set flags, so the permission dialogs are shown again
async function resetAndroidPermissions(serial, packageName) {
  const adb = `${adbPath} -s ${serial}`;

  const installed = await run(`${adb} shell pm path ${packageName}`);
  if (installed.error || !installed.stdout.trim()) {
    return { skipped: true };
  }

  const { stdout } = await run(`${adb} shell dumpsys package ${packageName}`);
  const runtimeSection = stdout.split("runtime permissions:")[1] || "";
  const permissions = [
    ...new Set(
      [...runtimeSection.matchAll(/^\s+([\w.]+): granted=/gm)].map(
        (match) => match[1]
      )
    ),
  ];

  await run(`${adb} shell am force-stop ${packageName}`);

  const commands = permissions.map(
    (permission) =>
      `pm revoke ${packageName} ${permission}; pm clear-permission-flags ${packageName} ${permission} user-set user-fixed`
  );
  if (commands.length > 0) {
    await run(`${adb} shell ${shellQuote(commands.join("; "))}`);
  }
  return {};
}

async function resetPermissions() {
  const { appName, iosAppPackage, androidAppPackage } = getAppPackages();
  const { iosDevices, androidDevices } = await getBootedDevices();

  if (iosDevices.length === 0 && androidDevices.length === 0) {
    vscode.window.showWarningMessage(
      "No booted devices found. Please boot a device first."
    );
    return;
  }

  const results = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Resetting ${appName} app permissions...`,
    },
    () =>
      Promise.all([
        ...iosDevices.map(async (udid) => ({
          platform: "iOS",
          device: udid,
          ...(await resetIOSPermissions(udid, iosAppPackage)),
        })),
        ...androidDevices.map(async (serial) => ({
          platform: "Android",
          device: serial,
          ...(await resetAndroidPermissions(serial, androidAppPackage)),
        })),
      ])
  );

  const succeeded = results.filter((result) => !result.skipped && !result.error);
  const failed = results.filter((result) => result.error);

  if (succeeded.length > 0) {
    vscode.window.showInformationMessage(
      `${appName} app permissions reset on: ${succeeded
        .map((result) => `${result.platform} (${result.device})`)
        .join(", ")}`
    );
  } else if (failed.length === 0) {
    vscode.window.showWarningMessage(
      `${appName} app is not installed on any booted device.`
    );
  }
  failed.forEach((result) => {
    vscode.window.showErrorMessage(
      `Error resetting permissions on ${result.platform} (${result.device}): ${result.error}`
    );
  });
}

module.exports = {
  resetPermissions,
};
