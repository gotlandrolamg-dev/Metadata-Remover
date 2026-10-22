# Vcorp Metadata Remover

Removes the metadata of your photos (camera, date, GPS position...) directly in your browser. Nothing is uploaded: you can check it in the Network tab of your browser's DevTools.

Live at [vcorp.app/metadata-remover](https://vcorp.app/metadata-remover/).

## How it works

- Drop one or more photos, or whole folders.
- Each photo is read and rewritten without its metadata by [ImageMagick](https://imagemagick.org) compiled to WebAssembly ([magick-wasm](https://github.com/dlemstra/magick-wasm)), in a Web Worker.
- The viewer shows the metadata before and after, read with [ExifReader](https://github.com/mattiasw/ExifReader).
- Several photos are downloaded as one zip ([JSZip](https://stuk.github.io/jszip/)), with the same folders.

Supported formats: JPEG, TIFF, PNG, WebP, HEIC/HEIF, AVIF and GIF.

## Development

```sh
npm install      # install the dependencies
npm run dev      # local server with live reload
npm run build    # production files in dist/
npm run preview  # serve dist/ locally
```

The build uses relative paths, so `dist/` works from any folder of a web server.

## License

[GNU Affero General Public License v3.0](LICENSE).
