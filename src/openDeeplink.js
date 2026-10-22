const { adbPath, getAppPackages } = require("./constants");

const vscode = require("vscode");
const { exec } = require("child_process");

let lastDeeplink = "";

function run(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

// Wraps value in single quotes so &, ? etc. in the url are not interpreted by the shell
function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function startAndroidIntent(serial, url, packageName = "") {
  // adb shell passes the command to the device shell, so the url is quoted twice
  const { error, stdout, stderr } = await run(
    `${adbPath} -s ${serial} shell ${shellQuote(
      `am start -a android.intent.action.VIEW -d ${shellQuote(url)} ${packageName}`
    )}`
  );
  const failed = error || /Error/.test(stdout);
  return { error: failed && (stderr || stdout) };
}

async function openOnAndroid(serial, url) {
  // Universal links are not verified on debug builds and would open in the browser,
  // so try the opened project's app first
  if (/^https?:\/\//i.test(url)) {
    const { androidAppPackage } = getAppPackages();
    const result = await startAndroidIntent(serial, url, androidAppPackage);
    if (!result.error) {
      return result;
    }
  }
  return startAndroidIntent(serial, url);
}

async function openDeeplink() {
  const deeplink = await vscode.window.showInputBox({
    prompt: "Paste the deeplink to open on booted iOS simulators and Android emulators",
    placeHolder: "justlife://funnel?appointment_id=123 or https://www.justlife.com/...",
    value: lastDeeplink,
    ignoreFocusOut: true,
    validateInput: (value) =>
      /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S+$/.test(value.trim())
        ? null
        : "Enter a valid deeplink (e.g. scheme://path)",
  });

  if (!deeplink) {
    return;
  }

  const url = deeplink.trim();
  lastDeeplink = url;

  const [iosResult, androidResult] = await Promise.all([
    run('xcrun simctl list devices booted | grep -oE "[0-9A-F-]{36}"'),
    run(`${adbPath} devices`),
  ]);

  const iosDevices = iosResult.stdout.split("\n").filter((line) => line);
  const androidDevices = androidResult.stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter(([serial, state]) => serial && state === "device")
    .map(([serial]) => serial);

  if (iosDevices.length === 0 && androidDevices.length === 0) {
    vscode.window.showWarningMessage(
      "No booted devices found. Please boot a device first."
    );
    return;
  }

  const results = await Promise.all([
    ...iosDevices.map(async (udid) => {
      const { error, stderr } = await run(
        `xcrun simctl openurl ${udid} ${shellQuote(url)}`
      );
      return { platform: "iOS", device: udid, error: error && stderr };
    }),
    ...androidDevices.map(async (serial) => {
      const { error } = await openOnAndroid(serial, url);
      return { platform: "Android", device: serial, error };
    }),
  ]);

  const succeeded = results.filter((result) => !result.error);
  const failed = results.filter((result) => result.error);

  if (succeeded.length > 0) {
    vscode.window.showInformationMessage(
      `Deeplink opened on: ${succeeded
        .map((result) => `${result.platform} (${result.device})`)
        .join(", ")}`
    );
  }
  failed.forEach((result) => {
    vscode.window.showErrorMessage(
      `Error opening deeplink on ${result.platform} (${result.device}): ${result.error}`
    );
  });
}

module.exports = {
  openDeeplink,
};
