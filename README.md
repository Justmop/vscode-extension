# Justlife VS Code Extension

A VS Code extension to help manage iOS and Android simulators/emulators for Justlife mobile app development.

## Features

- Quick access to iOS simulators and Android emulators
- Easy app reset functionality for both platforms
- AB test diff comparison tool
- Configurable paths for development tools

## Requirements

- iOS Development:
  - Xcode with iOS simulators
  - IDB tool installed (`idb`)
  - iOS app package configured
  
- Android Development:
  - Android SDK installed
  - Android emulators configured
  - ADB tool accessible
  - Android app package configured

## Extension Settings

This extension contributes the following settings:

* `justlife-vs-extension.emulatorPath`: Path to the Android emulator
* `justlife-vs-extension.adbPath`: Path to the ADB tool
* `justlife-vs-extension.idbPath`: Path to the IDB tool
* `justlife-vs-extension.coreSimulatorLogPath`: Path to the Core Simulator logs
* `justlife-vs-extension.iosAppPackage`: iOS app package name
* `justlife-vs-extension.androidAppPackage`: Android app package name

## Usage

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Type "Justlife" to see available commands
3. Select one of the following options:
   - View iOS: Launch iOS simulators
   - View Android: Launch Android emulators
   - Reset App: Clear app data on selected device
   - AbTest Diff: Compare AB test configurations

## Installation

1. Open VS Code
2. Go to Extensions view (Cmd+Shift+X / Ctrl+Shift+X)
3. Search for "Justlife"
4. Install the extension
5. Reload VS Code

## Known Issues

Please report issues on the GitHub repository.

## Release Notes

### 0.0.1
- Initial release
- Basic simulator/emulator management
- App reset functionality
- AB test diff tool
