const vscode = require('vscode');

function activate(context) {

	console.log('Congratulations, your extension "justlife-vs-extension" is now active!');

	const disposable = vscode.commands.registerCommand('justlife-vs-extension.helloWorld', function () {
		vscode.window.showInformationMessage('Hello World from justlife-vs-extension!');
	});

	context.subscriptions.push(disposable);
}


function deactivate() {}

module.exports = {
	activate,
	deactivate
}
