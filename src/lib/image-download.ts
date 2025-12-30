/**
 * Utility functions for downloading images from URLs
 */

/**
 * Download an image from a URL with a custom filename
 * @param imageUrl - The URL of the image to download
 * @param filename - The filename to save the image as
 */
export const downloadImageFromUrl = async (imageUrl: string, filename: string): Promise<void> => {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get the image blob
    const blob = await response.blob();
    
    // Get file extension from URL or blob type
    const urlExtension = imageUrl.split('.').pop()?.split('?')[0]; // Remove query params
    const mimeExtension = blob.type.split('/')[1];
    const extension = urlExtension || mimeExtension || 'jpg';
    
    // Ensure filename has extension
    const finalFilename = filename.includes('.') ? filename : `${filename}.${extension}`;
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error;
  }
};

/**
 * Download all images of a product as a zip file
 * @param imageUrls - Array of image URLs
 * @param productName - Product name for the zip filename
 */
export const downloadAllProductImages = async (imageUrls: string[], productName: string): Promise<void> => {
  try {
    // Import JSZip dynamically to avoid bundle size issues
    const JSZip = (await import('jszip')).default;
    const { saveAs } = await import('file-saver');
    
    const zip = new JSZip();
    const sanitizedProductName = sanitizeFilename(productName);
    
    // Download all images and add them to zip
    const promises = imageUrls.map(async (url, index) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        // Get file extension
        const extension = getImageExtension(url, blob.type) || 'jpg';
        const filename = `${sanitizedProductName}_image_${index + 1}.${extension}`;
        
        zip.file(filename, blob);
      } catch (error) {
        console.error(`Failed to download image ${index + 1}:`, error);
      }
    });
    
    await Promise.all(promises);
    
    // Generate zip and download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${sanitizedProductName}_images.zip`);
    
  } catch (error) {
    console.error('Error creating zip file:', error);
    throw error;
  }
};

/**
 * Sanitize filename to remove invalid characters
 * @param filename - The filename to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9\-_\s]/g, '') // Remove invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase();
};

/**
 * Get image extension from URL or MIME type
 * @param url - Image URL
 * @param mimeType - MIME type of the image
 * @returns File extension
 */
export const getImageExtension = (url: string, mimeType: string): string => {
  // Try to get extension from URL first
  const urlExtension = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  
  // Map of common MIME types to extensions
  const mimeToExtension: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg'
  };
  
  // Return URL extension if valid, otherwise use MIME type
  const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
  
  if (urlExtension && validExtensions.includes(urlExtension)) {
    return urlExtension;
  }
  
  return mimeToExtension[mimeType] || 'jpg';
};
