import { v2 as cloudinary } from 'cloudinary';
import { config } from '@/config/env';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true
});

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
}

export class CloudinaryService {
  private static safeName(text: string): string {
    // Match the Python migrator: allow alnum, dash, underscore; replace everything else with '_'
    return (text || '').replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  static async uploadImage(
    buffer: Buffer, 
    productId: string, 
    categoryName: string, 
    subcategoryName: string, 
    imageIndex: number
  ): Promise<string> {
    try {
      // Create folder structure exactly like your Python script:
      // ProsmartProducts/<safe category>/<safe subcategory>/<productId>
      const catSafe = this.safeName(categoryName);
      const subcatSafe = this.safeName(subcategoryName);
      const safeProductId = this.safeName(productId);
      const folderPath = `ProsmartProducts/${catSafe}/${subcatSafe}/${safeProductId}`;

      // Important: Cloudinary `public_id` must NOT include folder separators,
      // and it must not contain characters like '&'. Folder is handled separately.
      const publicId = `${safeProductId}_img${imageIndex}`;

      const result = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString('base64')}`,
        {
          public_id: publicId,
          overwrite: true,
          resource_type: 'image',
          // Prefer asset_folder (newer) but also set folder for compatibility.
          asset_folder: folderPath,
          folder: folderPath
        }
      );

      return result.secure_url;
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  static async uploadMultipleImages(
    files: Buffer[], 
    productId: string, 
    categoryName: string, 
    subcategoryName: string
  ): Promise<string[]> {
    const uploadPromises = files.map((buffer, index) => 
      this.uploadImage(buffer, productId, categoryName, subcategoryName, index + 1)
    );

    try {
      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      throw new Error('Failed to upload images to Cloudinary');
    }
  }

  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      throw new Error('Failed to delete image from Cloudinary');
    }
  }

  static extractPublicIdFromUrl(url: string): string {
    // Extract public_id from Cloudinary URL
    const parts = url.split('/');
    const uploadIndex = parts.findIndex(part => part === 'upload');
    if (uploadIndex !== -1 && uploadIndex + 2 < parts.length) {
      const pathParts = parts.slice(uploadIndex + 2);
      const publicIdWithExtension = pathParts.join('/');
      // Remove file extension
      return publicIdWithExtension.replace(/\.[^/.]+$/, '');
    }
    return '';
  }
}

export default CloudinaryService;
