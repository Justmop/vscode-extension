const vscode = require("vscode");
const { exec } = require("child_process");

const emulatorPath = vscode.workspace
	.getConfiguration("justlife-vs-extension")
	.get("emulatorPath");
const adbPath = vscode.workspace
	.getConfiguration("justlife-vs-extension")
	.get("adbPath");
const idbPath = vscode.workspace
	.getConfiguration("justlife-vs-extension")
	.get("idbPath");
const coreSimulatorLogPath = vscode.workspace
	.getConfiguration("justlife-vs-extension")
	.get("coreSimulatorLogPath");
const iosAppPackage = vscode.workspace
	.getConfiguration("justlife-vs-extension")
	.get("iosAppPackage");
const androidAppPackage = vscode.workspace
	.getConfiguration("justlife-vs-extension")
	.get("androidAppPackage");

const projectPath = (vscode.workspace.workspaceFolders?.length ?? 0) > 0 && vscode.workspace.workspaceFolders[0]?.uri?.fsPath || ".";

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
			const simulatorOptions = [
				"View IOS",
				"View Android",
				"AbTest Diff",
				"Reset App",
			];
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
				} else if (selectedSimulator === "AbTest Diff") {
					listOfAbTestFolder();
				}
			}
		}
	);

	context.subscriptions.push(disposableHello);
	context.subscriptions.push(disposableSimulator);
}

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
						exec(
							`sh ${projectPath}/cli/ab-test-diff.sh ${selectedFolder.replace(
								"AbTest",
								""
							)}`,
							(error, stdout, stderr) => {
								if (error) {
									vscode.window.showErrorMessage(
										`Error running AB test diff script: ${stderr}`
									);
									return;
								}
								vscode.window.showInformationMessage(
									`AB test diff script executed successfully for ${selectedFolder}`
								);
							}
						);
					}
				});
		}
	);
}

function deactivate() { }

module.exports = {
	activate,
	deactivate,
};
