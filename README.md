# Mailgun Web Extension

This is a small browser extension to define email forwards via Mailgun.com.

## Building

Run

```shell
npm install && npm build
```

to install all dependencies, and build the extension.

## Installation

The extension currently needs to be installed manually. To install it in
Chrome, go to `chrome://extensions`, make sure the `Developer mode` box is
checked, and use the `Load unpacked extension...` button to install the
extension.

To install it in Firefox, the extension needs to be signed first after it was
built. To that end, add a valid API key and API secret to the
`~/.webext.credentials.json` file:

```raw
{
  "apiKey": <API_KEY>
  "apiSecret": <API_SECRET>
}
```

(see the [web-ext guide] for details). Then simply run

```shell
npm run sign
```

to sign the extension so it can be installed via `Addons > Install Add-ons From
File...`.

[ext]: https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/
