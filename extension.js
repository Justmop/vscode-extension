const vscode = require("vscode");
const { exec } = require("child_process");

const emulatorPath = "~/Library/Android/sdk/emulator/emulator";
const adbPath = "~/Library/Android/sdk/platform-tools/adb"; // Bu yolu kendi sisteminize göre güncelleyin
const idbPath = "/usr/local/bin/idb"; // Bu yolu kendi sisteminize göre güncelleyin


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
			const simulatorOptions = ["View Android", "View IOS", "Reset App"];
			const selectedSimulator = await vscode.window.showQuickPick(
				simulatorOptions,
				{
					placeHolder: "Select option",
				}
			);

			if (selectedSimulator) {
				if (selectedSimulator === "View IOS") {
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
				} else if (selectedSimulator === "View Android") {
					exec(`${emulatorPath} -list-avds`, (error, stdout, stderr) => {
						if (error) {
							vscode.window.showErrorMessage(`Error: ${stderr}`);
							return;
						}
						const androidOptions = stdout.split("\n").filter((line) => line);
						showAndroidOptions(androidOptions);
					});
				} else if (selectedSimulator === "Reset App") {
					resetApp();
				}
			}
		}
	);

	context.subscriptions.push(disposableHello);
	context.subscriptions.push(disposableSimulator);
}

function resetApp() {
	exec('xcrun simctl list devices available | grep "(Booted)"', (error, stdout, stderr) => {
		if (error) {
			vscode.window.showErrorMessage(`Error fetching iOS devices: ${stderr}`);
			return;
		}
		const iosDevices = stdout.split("\n").filter((line) => line);
		console.log("iOS Devices:", iosDevices);

		exec(`${adbPath} devices`, (error, stdout, stderr) => {
			if (error) {
				vscode.window.showErrorMessage(`Error fetching Android devices: ${stderr}`);
				return;
			}
			const androidDevices = stdout
				.split("\n")
				.filter((line) => 
					line && 
					line.includes("device") && 
					!line.includes("List of devices")
				);
			console.log("Android Devices:", androidDevices);

			const deviceOptions = [...iosDevices, ...androidDevices];
			vscode.window.showQuickPick(deviceOptions, {
				placeHolder: "Select a device to reset the app",
			}).then(selectedDevice => {
				if (selectedDevice) {
					if (selectedDevice.includes("iPhone") || selectedDevice.includes("iPad")) {
						const udid = selectedDevice.match(/\(([^)]+)\)/)[1];
						console.log(udid);
						exec(`${idbPath} file rm --application com.mobile.justmop --udid ${udid}`, (error, stdout, stderr) => {
							if (error) {
								vscode.window.showErrorMessage(`Error resetting iOS app: ${stderr}`);
								return;
							}
							vscode.window.showInformationMessage(`iOS app reset on device: ${udid}`);
						});
					} else {
						const emulatorName = selectedDevice.split(" ")[0]; // Emulator adını al
						exec(`${adbPath} shell pm clear com.mobile.justmop.debug`, (error, stdout, stderr) => {
							if (error) {
								vscode.window.showErrorMessage(`Error resetting Android app: ${stderr}`);
								return;
							}
							vscode.window.showInformationMessage(`Android app reset on device: ${emulatorName}`);
						});
					}
				}
			});
		});
	});
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
	// İki komutu birleştiriyoruz
	exec(`xcrun simctl boot ${simulatorId} && open -a Simulator`, (error, stdout, stderr) => {
		if (error) {
			vscode.window.showErrorMessage(`Error starting simulator: ${stderr}`);
			return;
		}
		vscode.window.showInformationMessage(`iOS Simulator started: ${simulatorId}`);
	});
}

function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
