import { gsap } from "gsap";

import type { EntryFileOrDirectory, ClearEntryFileOrDirectory } from "./types.ts";
import { promiseHooks } from "node:v8";
import { log } from "node:console";

const worker_remove_metadata = new Worker(new URL("./worker_remove_metadata.ts", import.meta.url), { type: "module" });
const worker_compression = new Worker(new URL("./worker_compression.ts", import.meta.url), { type: "module" });






const logo_animation = document.querySelector(".footer_information > p:first-child");
let canAnimLogoAnimation: boolean = true

logo_animation?.addEventListener("mouseover", () => {

  if (!canAnimLogoAnimation) return;
  canAnimLogoAnimation = false;

  gsap.fromTo(logo_animation, {
    duration: 2,
    backgroundPositionX: "100%",
  },
  {
    duration: 2,
    backgroundPositionX: "0%",
    onComplete: () => {
      canAnimLogoAnimation = true;
    }
  })
})



const carrousel = document.querySelector(".hero_metadata_viewer_carrousel");

let isDown: boolean = false;
let startX: number;
let scrollLeft: number;

carrousel?.addEventListener("mousedown", (event: Event) => {
  if (event instanceof MouseEvent) {
    isDown = true;
    startX = event.pageX;
    scrollLeft = carrousel.scrollLeft;
  }
})

carrousel?.addEventListener("mouseup", () => {
  isDown = false;
});

carrousel?.addEventListener("mouseleave", () => {
  isDown = false;
});

carrousel?.addEventListener("mousemove", (event: Event) => {
  if (!isDown) return;

  if (event instanceof MouseEvent) {
    const distance = event.pageX - startX;
    carrousel.scrollLeft = scrollLeft - distance;
  }
  
})





let promiseLoader;
const input_file = document.querySelector("#input_file") as HTMLInputElement;

input_file?.addEventListener("change", () => {

  if (!permissionToLoadFile) return;

  permissionToLoadFile = false;

  let entriesFileOrDirectory: EntryFileOrDirectory[] = [];
  
  if(input_file.files) {
    for(let i=0; i<input_file.files?.length; i++) {
      entriesFileOrDirectory.push({ originFile: input_file.files[i], originFileFullPath: input_file.files[i].name});
    }
    promiseLoader = activeLoader();
    worker_remove_metadata.postMessage(entriesFileOrDirectory);
  }
  else {
    showError("Empty file.")
    permissionToLoadFile = true;
    return;
  }
})




const drag_drop_area = document.querySelector("#drag_drop_area") as HTMLAreaElement;

window.addEventListener("dragover", (event: Event) => {
  event.preventDefault();
  if (!permissionToLoadFile) return;
  drag_drop_area.classList.add("drag_drop_area_active"); 
  // !fileDroped && toggleDragDropAreaVrisibility(true)
});



window.addEventListener("dragleave", (event: Event) => {
  event.preventDefault();
  if (!permissionToLoadFile) return;
  drag_drop_area.classList.remove("drag_drop_area_active"); 
  // toggleDragDropArea(false);
});


let permissionToLoadFile: boolean = true;

window.addEventListener("drop", async (event) => {
  event.preventDefault();
  if (!permissionToLoadFile) return;

  permissionToLoadFile = false;
  drag_drop_area.classList.remove("drag_drop_area_active"); 

  const DataTransferItemList: DataTransferItemList = event.dataTransfer!.items;

  let allEntries: FileSystemEntry[] = [];

  for (let i = 0; i < DataTransferItemList.length; i++) {
    if (DataTransferItemList[i].kind != "file") {
      continue;
    }

    const fileOrDirectory = DataTransferItemList[i].webkitGetAsEntry();
    
    if (!fileOrDirectory) {
      continue;
    }

    else if (fileOrDirectory.isFile) {
      const fileEntry = fileOrDirectory as FileSystemFileEntry;
      allEntries.push(fileEntry);
    }

    else if (fileOrDirectory.isDirectory) {
      const directoryEntry = fileOrDirectory as FileSystemDirectoryEntry;
      let allEntriesTemp: FileSystemEntry[] = [];
      try {
        allEntriesTemp = await exploreTree(directoryEntry);
      }
      catch (error) {
        showError("The files could not be read.");
        return;
      }
      if (allEntriesTemp.length == 0) {
        allEntries.push(directoryEntry);
      }
      else {
        allEntries.push(...allEntriesTemp);
      }
    }
  }

  if(allEntries.length == 0) {
    showError("Zero file upload.")
    permissionToLoadFile = true;
    return
  }

  let entriesFileorDirectory: EntryFileOrDirectory[] = []

  for (let x=0; x<allEntries.length; x++) {
    if (allEntries[x].isFile) {
      try {
        const file: File = await getFileFromFileSystemFileEntry(allEntries[x] as FileSystemFileEntry);
        entriesFileorDirectory.push({ originFile: file, originFileFullPath: allEntries[x].fullPath })
      }
      catch (error) {
        continue;
      }
    }
    else if (allEntries[x].isDirectory) {
      entriesFileorDirectory.push({ originDirectoryFullPath: allEntries[x].fullPath })
    }
  }

  promiseLoader = activeLoader();
  worker_remove_metadata.postMessage(entriesFileorDirectory);
});
  




async function exploreTree(directoryEntry: FileSystemDirectoryEntry) {
  let entries: FileSystemEntry[] = [];
  
  const directoryReader = directoryEntry.createReader();
  let readEntries = await readEntriesPromise(directoryReader);

  while (readEntries.length > 0) {
    entries.push(...readEntries);
    readEntries = await readEntriesPromise(directoryReader);
  }
  
  let entriesTemp: FileSystemEntry[] = [];
  
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].isDirectory) {
      entriesTemp.push(...await exploreTree(entries[i] as FileSystemDirectoryEntry));
    }
  }
  
  entries.push(...entriesTemp);
  return entries;
}




async function readEntriesPromise(directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    directoryReader.readEntries(resolve, reject);
  })
}



function getFileFromFileSystemFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}
  







worker_remove_metadata.onmessage = async function (event) {
  console.log(event.data);

  let clearEntriesFileOrDirectory: ClearEntryFileOrDirectory[] = [];
  clearEntriesFileOrDirectory = event.data;

  addFileNamesOnCarrousel(clearEntriesFileOrDirectory);
  setupCarrousel(clearEntriesFileOrDirectory);
  
  
  if (clearEntriesFileOrDirectory.length > 1) {
    worker_compression.postMessage(clearEntriesFileOrDirectory);
  }
  else if (clearEntriesFileOrDirectory[0].newFile) {
    blobToDownload(new Blob([clearEntriesFileOrDirectory[0].newFile]), clearEntriesFileOrDirectory[0].originFile.name);

    controllerPromiseLoader.abort();
    await promiseLoader;
  
    animInputFileToDonwloadButton();
    animHeroMetadataViewer();
  }
  else {
    input_file.disabled = true;
    
    controllerPromiseLoader.abort();
    await promiseLoader;
    
    animInputFileToDonwloadButton();
    animHeroMetadataViewer();
    const label_file =  document.querySelector(".hero label[for='input_file']") as HTMLDivElement;
    label_file.classList.add("hero_label_disable");
  }
}




worker_compression.onmessage = async function (event) {
  blobToDownload(event.data, "your_file.zip");

  controllerPromiseLoader.abort();
  await promiseLoader;
  
  animInputFileToDonwloadButton();
  animHeroMetadataViewer();
}





function addFileNamesOnCarrousel(clearEntriesFileOrDirectory: ClearEntryFileOrDirectory[]) {
  let x=0;
  
  function addFileNameOnCarrousel(originFileFullPath: string, fileGoodFormat: boolean, idObj: number) {
    document.querySelector(".hero_metadata_viewer_carrousel")!.innerHTML += 
    `<input type="radio" name="hero_metadata_viewer_carrousel_input" id="hero_metadata_viewer_carrousel_input${x}" data-idobj="${idObj}">
    <label for="hero_metadata_viewer_carrousel_input${x}" class="${fileGoodFormat ? "hero_metadata_viewer_carrousel_label_fileNameGray" : "hero_metadata_viewer_carrousel_label_fileNameRed"}">${originFileFullPath}</label>`
    x++;
  }
  
  for (let i = 0; i < clearEntriesFileOrDirectory.length; i++) {
    let currentClearEntriesFileOrDirectory = clearEntriesFileOrDirectory[i];
    
    if (currentClearEntriesFileOrDirectory.newFile) {
      addFileNameOnCarrousel(currentClearEntriesFileOrDirectory.originFileFullPath, true, i);
    }
    else if (currentClearEntriesFileOrDirectory.originDirectoryFullPath) {
      addFileNameOnCarrousel(currentClearEntriesFileOrDirectory.originDirectoryFullPath, false, i)
    }
    else if (currentClearEntriesFileOrDirectory.originFile) {
      addFileNameOnCarrousel(currentClearEntriesFileOrDirectory.originFileFullPath, false, i)
    }
  }
}





function setupCarrousel(clearEntriesFileOrDirectory: ClearEntryFileOrDirectory[]) {

  function changeTextInBlockMetadata(originMetadataText: string, newMetadataText: string) {
    const metadateBlock = document.querySelectorAll(".hero_metadata_viewer_container_block_item_text > code");
    
    metadateBlock[0]!.innerHTML = originMetadataText;
    metadateBlock[1]!.innerHTML = newMetadataText;
  }

  function objMetadataToHtml(objMetadata: Record<string, any>) {
    let allMetadata: string = "";
    
    for (let x in objMetadata) {
      const objMetadataType = objMetadata[x];
      
      for (let y in objMetadataType) {
        if (objMetadataType[y].description !== undefined) {
          const html = `${y}: ${objMetadataType[y].description}<br>`
          allMetadata += html;
        }
      }
    }
    
    return allMetadata;
  }

  const inputCarrousel = document.querySelectorAll("input[name='hero_metadata_viewer_carrousel_input']") as NodeListOf<HTMLInputElement>;
  
  for(let i=0; i < inputCarrousel.length; i++) {
    inputCarrousel[i].addEventListener("change", function () {
      if (this.checked) {
        const idObj = parseInt(this.dataset.idobj!, 10);
        
        if (clearEntriesFileOrDirectory[idObj].newFile) {
          const originMetadataText = objMetadataToHtml(clearEntriesFileOrDirectory[idObj].originFileMetadata);
          const newMetadataText = objMetadataToHtml(clearEntriesFileOrDirectory[idObj].newFileMetadata);
          changeTextInBlockMetadata(originMetadataText, newMetadataText);
        }
        else if (clearEntriesFileOrDirectory[idObj].originDirectoryFullPath) {
          changeTextInBlockMetadata("No metadata.", "No metadata.");
        }
        else if (clearEntriesFileOrDirectory[idObj].originFile) {
          const errorPhrase = "Error with this file.<br>It may not be in a supported format.<br>Supported formats are JPEG, TIFF, PNG, WebP, HEIC/HEIF, AVIF, and GIF.";
          changeTextInBlockMetadata(errorPhrase, errorPhrase);
        }
      }
    })
  }
  
  inputCarrousel[0].checked = true;
  inputCarrousel[0].dispatchEvent(new Event("change"));
}




function showError(message: string): void {
  document.querySelector(".second_title")!.textContent = message;
}




function animInputFileToDonwloadButton() {
  gsap.to(".hero label[for='input_file']",
    {
      duration: 1,
      color: "#FFFFFF",
      background: "#000000",
      borderRadius: "8px",
      innerHTML: "Download",
      height: 42,
      width: 100,
      border: "none",
      ease: "power4.out"
    })
  }
  
  


  function animHeroMetadataViewer() {
    gsap.set(".hero_metadata_viewer", {
      display: "flex",
    });
    
    gsap.to(".hero_metadata_viewer", 
    {
      opacity: 1,
      duration: 1,
      ease: "power4.out",
    });
  }
  
  

  function blobToDownload(blob: Blob, fileOrZipName: string) {
    const url = URL.createObjectURL(blob);
  
    const button_download = document.querySelector("#download") as HTMLAnchorElement;
    button_download.href = url;
    button_download.download = fileOrZipName;
  
    input_file.addEventListener("click", (event) => {
      event.preventDefault();
      button_download.click();
    })
  }
  



  let controllerPromiseLoader: AbortController;
  
  function activeLoader() {
    controllerPromiseLoader = new AbortController();
    
    return new Promise(function(resolve, reject) {
      gsap.to(".hero label[for='input_file']", {
        repeat: -1,
        delay: 0.5,
        yoyo: false,
        duration: 2,
        backgroundPositionX:"0%",
        onRepeat: () => {if(controllerPromiseLoader.signal.aborted){resolve()}}
      })
    })
  };