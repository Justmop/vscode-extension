const vscode = require("vscode");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const { projectPath } = require("./constants");

const OUTPUT_CHANNEL_NAME = "Justlife Agent";
const CONFIG_SECTION = "justlife-vs-extension";

const cursorSubmenuOptions = {
  authorization: "Login",
  logout: "Logout",
  writeUnitTest: "WriteUnitTest",
};

const INSTALL_INSTRUCTIONS = `Cursor Agent does not appear to be installed (agent not found in PATH or ~/.local/bin).

Install with:
  curl https://cursor.com/install -fsS | bash

Next steps after install:

1. Add ~/.local/bin to your PATH:
   For bash:
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc

   For zsh:
   echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc

2. Start using Cursor Agent:
   agent
`;

/** @type {vscode.OutputChannel | undefined} */
let outputChannel;
/** @type {vscode.StatusBarItem | undefined} */
let unitTestStatusBar;

function getOutputChannel() {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return outputChannel;
}

function ensureUnitTestStatusBar() {
  if (!unitTestStatusBar) {
    unitTestStatusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
  }
  return unitTestStatusBar;
}

/**
 * @param {string} text
 */
function setUnitTestProgress(text) {
  const item = ensureUnitTestStatusBar();
  item.text = `$(sync~spin) ${text}`;
  item.tooltip = "Justlife Agent WriteUnitTest is running";
  item.show();
}

function clearUnitTestProgress() {
  if (unitTestStatusBar) {
    unitTestStatusBar.hide();
  }
}

function envWithLocalBin() {
  const env = { ...process.env };
  const localBin = path.join(os.homedir(), ".local", "bin");
  const sep = path.delimiter;
  env.PATH = `${localBin}${sep}${env.PATH || ""}`;
  return env;
}

function getExtensionConfig() {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

/**
 * Removes ANSI escape/control sequences to keep OutputChannel readable
 * and to make auth-status matching reliable.
 * @param {string} text
 * @returns {string}
 */
function stripAnsiAndControls(text) {
  return text
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, "")
    .replace(/\u001b\][^\u0007]*(\u0007|\u001b\\)/g, "")
    .replace(/\r/g, "");
}

function defaultAgentPath() {
  const name = process.platform === "win32" ? "agent.exe" : "agent";
  return path.join(os.homedir(), ".local", "bin", name);
}

function agentInstalledOnDisk() {
  try {
    fs.accessSync(defaultAgentPath(), fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} options
 * @returns {Promise<{ code: number | null; stdout: string; stderr: string }>}
 */
function runSpawn(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      env: options.env ?? envWithLocalBin(),
    });
    let stdout = "";
    let stderr = "";
    const ch = getOutputChannel();

    child.stdout?.on("data", (data) => {
      const chunk = stripAnsiAndControls(data.toString());
      stdout += chunk;
      ch.append(chunk);
    });
    child.stderr?.on("data", (data) => {
      const chunk = stripAnsiAndControls(data.toString());
      stderr += chunk;
      ch.append(chunk);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function openAgentLoginTerminal() {
  const localBin = path.join(os.homedir(), ".local", "bin");
  const term = vscode.window.createTerminal({ name: "Cursor Agent login" });
  term.show();
  if (process.platform === "win32") {
    term.sendText(`set "PATH=${localBin};%PATH%" && agent login`, true);
  } else {
    term.sendText(`export PATH="${localBin}:$PATH" && agent login`, true);
  }
}

/**
 * @param {string} promptFile
 * @param {vscode.OutputChannel} ch
 */
function deletePromptFileIfExists(promptFile, ch) {
  try {
    if (fs.existsSync(promptFile)) {
      fs.unlinkSync(promptFile);
      ch.appendLine("");
      ch.appendLine(`Removed temporary prompt file: ${promptFile}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ch.appendLine("");
    ch.appendLine(`Could not remove prompt file (${promptFile}): ${msg}`);
  }
}

/**
 * Runs `git diff origin/<branch>` in the repo root.
 * @param {string} root
 * @param {string} branch
 * @param {vscode.OutputChannel} ch
 * @returns {Promise<{ code: number | null; stdout: string }>}
 */
function runGitDiffOriginHead(root, branch, ch) {
  const remoteRef = `origin/${branch}`;
  return new Promise((resolve, reject) => {
    const child = spawn("git", ["diff", remoteRef], {
      cwd: root,
      env: { ...process.env },
    });
    let stdout = "";
    child.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      ch.append(chunk);
    });
    child.stderr.on("data", (data) => {
      ch.append(data.toString());
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout }));
  });
}

async function cursorAuthorization() {
  const ch = getOutputChannel();
  ch.clear();
  ch.show(true);
  ch.appendLine("=== Justlife Agent — Login ===");
  ch.appendLine("");

  if (!agentInstalledOnDisk()) {
    ch.appendLine(INSTALL_INSTRUCTIONS);
    vscode.window.showWarningMessage(
      "Cursor Agent not found. See Justlife Cursor output for install steps."
    );
    return;
  }

  ch.appendLine("Starting interactive login in terminal: agent login");
  ch.appendLine(
    "CLI should open your browser automatically. If not, use the login URL shown in that terminal."
  );
  ch.appendLine("");
  openAgentLoginTerminal();
  vscode.window.showInformationMessage(
    "Running `agent login` in terminal. Complete browser auth there."
  );
}

async function cursorLogout() {
  const ch = getOutputChannel();
  ch.clear();
  ch.show(true);
  ch.appendLine("=== Justlife Agent — Logout ===");
  ch.appendLine("");

  if (!agentInstalledOnDisk()) {
    ch.appendLine(INSTALL_INSTRUCTIONS);
    vscode.window.showWarningMessage(
      "Cursor Agent not found. See Justlife Cursor output for install steps."
    );
    return;
  }

  ch.appendLine("Running: agent logout");
  ch.appendLine("");
  try {
    const { code } = await runSpawn("agent", ["logout"], { cwd: projectPath });
    ch.appendLine("");
    ch.appendLine(`--- agent logout finished (exit ${code}) ---`);
    if (code === 0) {
      vscode.window.showInformationMessage("Cursor Agent logged out.");
    } else {
      vscode.window.showWarningMessage(
        `agent logout exited with code ${code}. See Justlife Cursor output.`
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ch.appendLine(`Error running agent logout: ${msg}`);
    vscode.window.showErrorMessage(msg);
  }
}

async function cursorWriteUnitTest() {
  const ch = getOutputChannel();
  ch.clear();
  ch.show(true);
  ch.appendLine("=== Justlife Agent — WriteUnitTest ===");
  ch.appendLine("");
  setUnitTestProgress("WriteUnitTest: Preparing");

  const root =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? projectPath;
  if (!root || root === ".") {
    clearUnitTestProgress();
    vscode.window.showErrorMessage(
      "Open a workspace folder before running WriteUnitTest."
    );
    return;
  }

  const cfg = getExtensionConfig();
  const branch =
    cfg.get("cursorGitDiffBaseBranch") ||
    cfg.get("cursorGitDiffLintBranch") ||
    "develop";
  const prePrompt = cfg.get("cursorUnitTestPrePrompt") || "";
  const force = !!cfg.get("cursorAgentForce");

  if (!agentInstalledOnDisk()) {
    clearUnitTestProgress();
    ch.appendLine(INSTALL_INSTRUCTIONS);
    vscode.window.showWarningMessage(
      "Cursor Agent not found. Install it before WriteUnitTest (see output)."
    );
    return;
  }

  setUnitTestProgress("WriteUnitTest: Collecting diff");
  ch.appendLine(`Running: git diff origin/${branch} (cwd: ${root})`);
  ch.appendLine("");

  let diffText = "";
  try {
    const result = await runGitDiffOriginHead(root, branch, ch);

    diffText = result.stdout;
    ch.appendLine("");
    ch.appendLine(`--- git diff finished (exit ${result.code}) ---`);

    if (result.code !== 0) {
      clearUnitTestProgress();
      vscode.window.showErrorMessage(
        `git diff exited with code ${result.code}. Fetch remotes if needed (e.g. git fetch origin).`
      );
      return;
    }
  } catch (err) {
    clearUnitTestProgress();
    const msg = err instanceof Error ? err.message : String(err);
    ch.appendLine(`Error running git diff: ${msg}`);
    vscode.window.showErrorMessage(msg);
    return;
  }

  const instructions =
    prePrompt.trim() ||
    "Write focused unit tests for the changes shown in the git diff below.";

  const body = `${instructions}

---

## Git diff (origin/${branch})

\`\`\`
${diffText}
\`\`\`
`;

  const cursorDir = path.join(root, ".cursor");
  try {
    fs.mkdirSync(cursorDir, { recursive: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ch.appendLine(`Could not create .cursor directory: ${msg}`);
    vscode.window.showErrorMessage(msg);
    return;
  }

  const promptFile = path.join(
    cursorDir,
    "justlife-extension-agent-prompt.md"
  );
  fs.writeFileSync(promptFile, body, "utf8");
  setUnitTestProgress("WriteUnitTest: Prompt file created");
  ch.appendLine("");
  ch.appendLine(`Wrote prompt file: ${promptFile}`);
  ch.appendLine("");
  ch.appendLine("Starting Cursor Agent (non-interactive)...");
  ch.appendLine("");

  const agentCliArgs = ["-p", "--trust", "--workspace", root];
  if (force) {
    agentCliArgs.push("-f");
  }
  agentCliArgs.push(`@${promptFile}`);

  setUnitTestProgress("WriteUnitTest: Cursor Agent running");
  try {
    const { code } = await runSpawn("agent", agentCliArgs, { cwd: root });
    ch.appendLine("");
    ch.appendLine(`--- agent finished (exit ${code}) ---`);
    if (code === 0) {
      setUnitTestProgress("WriteUnitTest: Completed");
      vscode.window.showInformationMessage("WriteUnitTest: Agent finished (see output).");
    } else {
      setUnitTestProgress("WriteUnitTest: Finished with warnings");
      vscode.window.showWarningMessage(
        `Agent exited with code ${code}. See Justlife Cursor output.`
      );
    }
  } catch (err) {
    setUnitTestProgress("WriteUnitTest: Failed");
    const msg = err instanceof Error ? err.message : String(err);
    ch.appendLine(`Error running agent: ${msg}`);
    vscode.window.showErrorMessage(msg);
  } finally {
    deletePromptFileIfExists(promptFile, ch);
    setTimeout(() => clearUnitTestProgress(), 2500);
  }
}

async function showCursorMenu() {
  const selected = await vscode.window.showQuickPick(
    Object.values(cursorSubmenuOptions),
    { placeHolder: "Justlife Agent" }
  );
  if (!selected) {
    return;
  }
  if (selected === cursorSubmenuOptions.authorization) {
    await cursorAuthorization();
  } else if (selected === cursorSubmenuOptions.logout) {
    await cursorLogout();
  } else if (selected === cursorSubmenuOptions.writeUnitTest) {
    await cursorWriteUnitTest();
  }
}

module.exports = {
  showCursorMenu,
  cursorSubmenuOptions,
  cursorAuthorization,
  cursorLogout,
  cursorWriteUnitTest,
};
