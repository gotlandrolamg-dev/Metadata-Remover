import { ImageMagick, initializeImageMagick, Magick, MagickImage } from '@imagemagick/magick-wasm';
import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm?url';
const response = await fetch(magickWasmUrl)
const wasmBytes = await response.arrayBuffer();;
await initializeImageMagick(wasmBytes);

import ExifReader from 'exifreader';

import type { EntryFileOrDirectory, ClearEntryFileOrDirectory } from "./types.js";


onmessage = async function (event) {

  let entriesFileorDirectory: EntryFileOrDirectory[] = event.data;
  let clearEntriesFileOrDirectory: ClearEntryFileOrDirectory[] = [];

  for (let x = 0; x < entriesFileorDirectory.length; x++) {
    if (entriesFileorDirectory[x].originFile) {
      try {
        // A FileSystemEntry cannot be sent to a worker, so the main thread already turned each entry into a File
        const originFileMetadata = await ExifReader.load(entriesFileorDirectory[x].originFile, { expanded: true });

        const fileClear: Uint8Array = await createFileClear(new Uint8Array(await entriesFileorDirectory[x].originFile.arrayBuffer()));
        const newMetadata = await ExifReader.load(new File([fileClear.buffer as ArrayBuffer], "the name is not important"), { expanded: true });

        clearEntriesFileOrDirectory.push({ originFile: entriesFileorDirectory[x].originFile, originFileFullPath: entriesFileorDirectory[x].originFileFullPath, originFileMetadata: originFileMetadata, newFile: fileClear, newFileMetadata: newMetadata });
      }
      catch (error) {
        clearEntriesFileOrDirectory.push({ originFile: entriesFileorDirectory[x].originFile, originFileFullPath: entriesFileorDirectory[x].originFileFullPath });
        continue;
      }
    }
    else if (entriesFileorDirectory[x].originDirectoryFullPath) {
      clearEntriesFileOrDirectory.push({ originDirectoryFullPath: entriesFileorDirectory[x].originDirectoryFullPath })
    }
  }

  postMessage(clearEntriesFileOrDirectory)
}



async function createFileClear(file: Uint8Array): Promise<Uint8Array> {
  return ImageMagick.read(file, async (image) => {
    image.autoOrient();
    image.strip();
    return await writeImage(image);
  });
}



function writeImage(image: any): Promise<Uint8Array> {
  return new Promise((resolve) => {
    image.write((data: Uint8Array) => {
      resolve(new Uint8Array(data));
    });
  });
}



