# Lampions

This is a small browser extension for managing [Lampions] email aliases.

## Development

Run

```shell
yarn run dev
```

to compile the extension in development mode and launch it in an empty Firefox
session.

## Building

Run

```shell
yarn install && yarn run build
```

to install all dependencies, and build the extension, placing the unpackaged
extension in the `addon` directory.

## Installation

The extension currently needs to be installed manually. To install it in
Chrome, go to `chrome://extensions`, make sure the `Developer mode` box is
checked, and use the `Load unpacked extension...` button to install the
extension from the `addon` directory.

To install it in Firefox, the extension needs to be signed first after it was
built.
To that end, add a valid API key and API secret to the
`~/.web-ext-config.js` file:

```javascript
module.exports = {
  sign: {
    apiKey: <API_KEY>
    apiSecret: <API_SECRET>
  }
}
```

(see the [web-ext guide] for details).
(Note that required arguments to `web-ext` commands cannot presently be
specified via config files.
For consistency, we still expect `apiKey` and `apiSecret` to be present under
the `sign` key.)
Then simply run

```shell
yarn run sign
```

to sign the extension, after which the signed addon will be placed in the
`web-ext-artifacts` directory from where it can be installed via `Addons >
Install Add-ons From File...` in Firefox.

[Lampions]: https://github.com/lampions/lampions
[web-ext guide]: https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/
