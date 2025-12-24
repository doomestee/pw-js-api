# PW-JS-Api

[PixelWalker](https://pixelwalker.net) API implementation for Node.js, Bun and modern browsers. NPM can be available here: https://www.npmjs.com/package/pw-js-api

Some of the typings may be incomplete, please let me know on discord (doomester) if you need help or clarifications.

## Install

NPM:
```bash
npm i pw-js-api
```

PNPM:
```bash
pnpm i pw-js-api
```

Yarn:
```bash
yarn add pw-js-api
```

Bun:
```bash
bun i pw-js-api
```

NOTE: installing pw-js-api#dev is also available if you wish, there may be no difference but if so, it could be from minor to major changes that changes the way the lib works.

## Install (Browser)

You could use a CDN like jsdelivr or unpkg. You can put this in your HTML page:

```html
<script src="https://cdn.jsdelivr.net/npm/pw-js-api@0.3.15/browser/pw.prod.js"></script>
```

```html
<script src="https://cdn.jsdelivr.net/npm/pw-js-api@0.3.15/browser/pw.dev.js"></script>
```

When you have these scripts in your HTML file, you will be able to use the global variable PW which contains PWGameClient, PWApiClient and Constants.

## Example

Feel free to take a look at the [source code for an example bot](/examples/index.mjs) that only does snake and listen to certain chat commands (.ping, .say and .disconnect)

## Why?

The difference between this and preexisting libraries is that this project aims to be as minimal as possible, trying to be more direct. As such, there are no helpers that comes along with the package itself.

## License

[MIT](/LICENSE) License.