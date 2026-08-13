# Cupsie Printer Provider (Enterprise Edition)

**Cupsie Printer Provider** is an enterprise-oriented Chrome extension that enables system administrators to centrally deploy and configure CUPS print queues and standalone IPP/IPPS printers directly into the native Chrome Print Dialog using Chrome's `printerProvider` API.

It is designed to be **zero-touch** for end users, allowing administrators to push printer configurations silently via Chrome Managed Storage policies.

---

## Key Enterprise Features

* **Zero-Touch Deployment**: Silently force-install the extension and push pre-configured CUPS servers and standalone IPP printers. End users receive no permission prompts.
* **Auto-Identity Resolution**: Queries the user's active Chrome Profile using the `identity` API to negotiate printing authorization on CUPS servers automatically, or can be overridden via policy. You can use the `"${user_name}"` placeholder to embed the user's resolved username into the configured `defaultRequestingUser`.
* **Native Chrome Print Integration**: Integrates IPP/CUPS printers seamlessly into the Chrome browser print destination picker.
* **Robust Capabilities Mapping**: Queries printer capabilities via IPP (paper sizes, tray selection, duplex, color, print scaling, stapling, hole punching, folding, etc.) and maps them to Chrome print settings automatically.
* **Managed Policy Precedence**: Configurations pushed via enterprise policy override or take precedence over manual user configurations.
* **Diagnostics & Troubleshooting**: Includes a built-in logging UI to inspect connection status, policy validation, and printer response codes.
* **Robust Background Printing**: Leverages a Chrome Offscreen Document keep-alive connection during active print cycles to prevent Chrome's memory optimizers from terminating the service worker during large print job transfers.

---

## Enterprise Deployment Guide

For comprehensive instructions on managed policy schemas, Google Admin Console configuration, local policy setup, dynamic identity resolution (`${user_name}`), and policy behavior, see the official wiki documentation:

👉 **[Enterprise Deployment Guide](https://github.com/DadArcade/CupsieCorp/wiki/Enterprise)**

---

## Manual & Ad-Hoc Configuration (Optional Feature)

While Cupsie is optimized for enterprise management, users or administrators can also configure printers manually on individual devices.

### Manual Installation
Open the [Cupsie Extension](https://chromewebstore.google.com/detail/dekecaodhfljnecmmkenlmjfcbmdokno/) on the Chrome Web Store and click **Add to Chrome**.

### Adding Printers Manually
1. Open the extension **Options** page (right-click the extension icon and select **Options**, or navigate to `chrome://extensions` and click **Extension options**).
2. **Adding CUPS Print Servers**:
   - Under **CUPS Servers**, enter your CUPS server IP addresses or URLs (one per line).
   - *Example*: `http://192.168.1.10:631` or `https://cups-server.example.com`
   - The extension automatically connects to each server and fetches all available printer queues.
3. **Adding Standalone IPP Printers**:
   - Under **Standalone IPP Printers**, enter the direct IPP URL endpoint and an optional friendly display name.
   - *Example*:
     - **URL**: `http://192.168.1.50:631/ipp/print`
     - **Name**: `Office Color Laser`
   - Click **+ Add Another Printer** to add more printers.
4. **Background Sync Interval**:
   - Adjust the **Background Sync Interval (minutes)** to control how frequently Cupsie polls your servers and printers for state changes.
   - Click **Save Settings** to persist configuration and trigger an immediate printer sync.

---

## Privacy & Security

By default, the extension does not send any data to external servers. All printer communication is performed locally from your browser to your print servers and printers.

For more details, see the full [Privacy Policy](privacy_policy.md).
