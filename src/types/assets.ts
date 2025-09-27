export interface ImageAsset {
  id?: string;
  url: string;
  alt?: string | null;
  caption?: string | null;
  filename?: string | null;
  createdAt?: string | null;
}

export interface ImageAssetPage {
  items: ImageAsset[];
  total?: number;
}
