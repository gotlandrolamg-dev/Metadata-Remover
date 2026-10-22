export type ClearEntryFileOrDirectory =
  {
    originFile: File,
    originFileFullPath: string,
    originFileMetadata?: object,
    newFile?: Uint8Array,
    newFileMetadata?: object
  }
    |
  {
    originDirectoryFullPath: string
  }

export type EntryFileOrDirectory = 
  {
    originFile: File,
    originFileFullPath: string
  } 
    | 
  {
    originDirectoryFullPath: string
  };