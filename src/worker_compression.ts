import JSZip from "jszip"
import type { EntryFileOrDirectory, ClearEntryFileOrDirectory } from "./types.js";


onmessage = async function (event) {

  let clearEntriesFileorDirectory: ClearEntryFileOrDirectory[] = event.data;
  let zip = new JSZip();

  try {
    for (let x=0; x<clearEntriesFileorDirectory.length; x++) {
      const entry = clearEntriesFileorDirectory[x]

      if (entry.newFile) {
        zip.file(entry.originFileFullPath, entry.newFile);
      }
      else if (entry.originDirectoryFullPath) {
        zip.folder(entry.originDirectoryFullPath)
      }
      else {
        // File not in a supported format: left out of the zip
        continue;
      }
    }
    const zipFileBlob = await zip.generateAsync({ type: "blob" });
    postMessage(zipFileBlob);
  }

  catch(error) {
    postMessage({ status: "error", messageError: "Creation zip failed." });
  }
}