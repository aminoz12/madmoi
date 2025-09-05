/**
 * Image Handler Utility
 * Handles image processing, validation, and storage
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Image storage configuration
const IMAGE_STORAGE_PATH = path.join(__dirname, '../../../public/uploads');
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate image file
 */
export function validateImage(file) {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.' };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'File size too large. Maximum size is 10MB.' };
  }

  return { valid: true };
}

/**
 * Generate unique filename
 */
export function generateImageFilename(originalName, extension = 'jpg') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}_${random}.${extension}`;
}

/**
 * Save image to local storage
 */
export async function saveImageToLocal(file) {
  try {
    // Ensure upload directory exists
    await fs.mkdir(IMAGE_STORAGE_PATH, { recursive: true });

    // Generate filename
    const extension = file.name.split('.').pop().toLowerCase();
    const filename = generateImageFilename(file.name, extension);
    const filepath = path.join(IMAGE_STORAGE_PATH, filename);

    // Convert file to buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filepath, buffer);

    // Return public URL
    return {
      url: `/api/uploads/${filename}`,
      filename: filename,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error('Error saving image:', error);
    throw new Error('Failed to save image');
  }
}

/**
 * Process featured image data
 */
export async function processFeaturedImage(imageData) {
  console.log('🔍 processFeaturedImage called with:', {
    type: typeof imageData,
    isObject: typeof imageData === 'object',
    hasUrl: typeof imageData === 'object' && imageData ? !!imageData.url : false,
    hasFile: typeof imageData === 'object' && imageData ? !!imageData.file : false,
    isFile: imageData instanceof File,
    data: imageData
  });

  if (!imageData) return null;

  // If it's already a processed object, return as is
  if (typeof imageData === 'object' && imageData.url) {
    console.log('✅ Returning processed object with URL:', imageData.url);
    return imageData;
  }

  // If it's a File object (file upload), save it
  if (imageData instanceof File) {
    try {
      console.log('📁 Processing file upload:', imageData.name, imageData.size, imageData.type);
      const savedImage = await saveImageToLocal(imageData);
      console.log('✅ Image saved successfully:', savedImage);
      return savedImage;
    } catch (error) {
      console.error('❌ Error saving uploaded image:', error);
      throw error;
    }
  }

  // If it's a string (URL), convert to object format
  if (typeof imageData === 'string') {
    console.log('📁 Processing string URL:', imageData);
    // Check if it's a valid URL
    try {
      new URL(imageData);
      const result = {
        url: imageData,
        alt: '',
        type: 'url'
      };
      console.log('✅ URL processed:', result);
      return result;
    } catch (e) {
      // If it's not a valid URL, treat as local path
      const result = {
        url: imageData,
        alt: '',
        type: 'local'
      };
      console.log('✅ Local path processed:', result);
      return result;
    }
  }

  // If it's an object with file data (from form submission)
  if (typeof imageData === 'object' && imageData.file) {
    try {
      console.log('📁 Processing file data from form:', imageData);
      // Convert the file data back to a File object if possible
      if (imageData.file instanceof File) {
        const savedImage = await saveImageToLocal(imageData.file);
        console.log('✅ Image saved successfully from form data:', savedImage);
        return savedImage;
      }
    } catch (error) {
      console.error('❌ Error processing form file data:', error);
      throw error;
    }
  }

  console.log('⚠️ Unrecognized image data format:', typeof imageData, imageData);
  return null;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url) {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Sanitize image URL (remove problematic query parameters)
 */
export function sanitizeImageUrl(url) {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    
    // Remove problematic query parameters that might cause authentication issues
    const problematicParams = ['sig', 'st', 'se', 'sp', 'sv', 'sr', 'skt', 'ske', 'sks', 'skv'];
    problematicParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Clean up old images
 */
export async function cleanupOldImages(keepDays = 30) {
  try {
    const files = await fs.readdir(IMAGE_STORAGE_PATH);
    const now = Date.now();
    const cutoff = now - (keepDays * 24 * 60 * 60 * 1000);

    for (const file of files) {
      const filepath = path.join(IMAGE_STORAGE_PATH, file);
      const stats = await fs.stat(filepath);
      
      if (stats.mtime.getTime() < cutoff) {
        await fs.unlink(filepath);
        console.log(`Cleaned up old image: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old images:', error);
  }
}

// Export for global use (so GPT service can access it)
if (typeof window !== 'undefined') {
  window.imageHandler = {
    saveImageToLocal,
    processFeaturedImage,
    validateImage,
    generateImageFilename
  };
}
