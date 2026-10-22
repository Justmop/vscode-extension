const { adbPath } = require("./constants");

const { exec } = require("child_process");

function run(command) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

// Wraps value in single quotes so &, ? etc. are not interpreted by the shell
function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

// Returns udids of booted iOS simulators and serials of connected Android devices
async function getBootedDevices() {
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

  return { iosDevices, androidDevices };
}

module.exports = {
  run,
  shellQuote,
  getBootedDevices,
};
