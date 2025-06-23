export interface MaterialFolder {
  id: string;
  name: string;
}

export interface MaterialFolderTree {
  id: string;
  name: string;
  children?: MaterialFolderTree[];
}
