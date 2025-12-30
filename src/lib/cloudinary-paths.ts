export interface CloudinaryPathOptions {
  categoryName: string;
  subcategoryName: string;
  productId: string;
  imageIndex: number;
}

export interface CloudinaryComputedPaths {
  folderPath: string;
  publicId: string;
}

// Keep this in sync with `CloudinaryService`.
export function safeName(text: string): string {
  return (text || '').replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function computeCloudinaryPaths(opts: CloudinaryPathOptions): CloudinaryComputedPaths {
  const catSafe = safeName(opts.categoryName);
  const subcatSafe = safeName(opts.subcategoryName);
  const safeProductId = safeName(opts.productId);

  return {
    folderPath: `ProsmartProducts/${catSafe}/${subcatSafe}/${safeProductId}`,
    // public_id must be only the filename (no slashes)
    publicId: `${safeProductId}_img${opts.imageIndex}`,
  };
}
