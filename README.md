# Mattermost Persistent Online Status

This extension was developed to permanently display users as online in Mattermost. It prevents you from appearing as absent or inactive due to inactivity. The extension ensures that you are always shown as active, even if you are not actively using your computer. This is particularly useful in professional environments where it is important to be continuously available.

## Download

- Add-ons**: **Mozilla [https://addons.mozilla.org/en-US/firefox/addon/mattermost-online-status/](https://addons.mozilla.org/en-US/firefox/addon/mattermost-online-status/)

## Installation

### From Source (Developer Mode)

If you want to install from source or modify the extension:

1. Download the source code from GitHub

2. **Firefox**:
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on..."
   - Select the `manifest.json` file

3. **Chrome / Chromium (Brave, Edge, etc.)**:
   - Open `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension folder

## Features

1. **Automatic Status Update**: The extension periodically checks your status on any Mattermost instance and updates it to "online" if it detects that the status has changed to "away".

2. **User Interface**: Provides a simple popup interface where you can enable or disable the automatic status update feature and connect to your Mattermost instance.

3. **Session Storage**: Stores authentication tokens temporarily in your browser's session storage to keep your status online.

## How It Works

1. **Connect**: Open the extension popup and click "Connect to Mattermost" while on any Mattermost page.

2. **Enable**: Toggle "Keep Online" to ON.

3. **Automatic**: Every 2 minutes, the extension checks your status. If you're "away", it automatically sets you back to "online".

## Privacy

This extension does not collect or transmit any data. Your authentication tokens are stored locally in your browser's session storage only and are used solely to make API calls to keep your Mattermost status online.

## License

MIT
