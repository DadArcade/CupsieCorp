# Cupsie Corp Printer Provider

[**Cupsie Corp**](https://chromewebstore.google.com/detail/cupsie-corp/blocbkaedafljnkkmhmlhnlpokoajdjg) is an enterprise version of the original [Cupsie](https://github.com/DadArcade/cupsie) Chrome extension that connects CUPS print servers and standalone IPP/IPPS printers directly to the native Chrome print dialog.

Designed for **zero-touch deployment**, administrators can silently deploy and manage print queues across fleet devices via Chrome enterprise policies.

---

## Key Features

* **Seamless Deployment**: Silently force-install and configure printers via Chrome policy without user prompts.
* **Username enforcement**: Uses the `identity` API (or `${user_name}` placeholders) to authorize print requests under active profile accounts.
* **Native Chrome Print Integration**: Integrates IPP/CUPS printers seamlessly into the Chrome printer selection list.
* **Automatic Capability Mapping**: Auto-detects paper sizes, trays, duplex, color, scaling, and finishing options via IPP.
* **Policy Precedence**: Managed policies automatically override or take precedence over manual user settings.
* **Detailed logging**: Includes a logging UI to monitor connections, policy validation, and printer status codes.
* **Reliable Background Printing**: Employs an offscreen keep-alive connection and direct file streaming from the filesystem to ensure large print jobs transfer without worker timeouts.

---

## Enterprise Deployment

For complete instructions on policy schemas, Google Admin Console configuration, local policies, and dynamic identity resolution, see the official wiki:

👉 **[Enterprise Deployment Guide](https://github.com/DadArcade/CupsieCorp/wiki/Enterprise)**

---

## Manual Setup (Optional)

While Cupsie is optimized for enterprise management, printers can also be configured manually on individual devices:

1. **Install**: Add the [Cupsie Extension](https://chromewebstore.google.com/detail/blocbkaedafljnkkmhmlhnlpokoajdjg) from the Chrome Web Store.
2. **Open Options**: Right-click the extension icon and select **Options** (or navigate to `chrome://extensions`).
3. **Add CUPS Servers**: Under **CUPS Servers**, enter server URLs (e.g., `http://192.168.1.10:631`) to auto-discover queues. *(Note: HTTPS endpoints require trusted SSL certificates).*
4. **Add IPP Printers**: Under **Standalone IPP Printers**, enter direct endpoints (e.g., `http://192.168.1.50:631/ipp/print`) and a friendly display name.
5. **Save**: Adjust the background sync interval if desired, then click **Save Settings**.

---

## Privacy & Security

Cupsie operates entirely locally within the browser. Printer communications remain on your local network—no data is sent to external servers.
For details, view the full [Privacy Policy](privacy_policy.md).

## Personal version

If you're looking for a non-enterprise version of Cupsie Corp, check out [Cupsie](https://github.com/DadArcade/cupsie).

