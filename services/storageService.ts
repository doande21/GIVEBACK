import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload (File object from input)
 * @param path The path in storage (e.g., 'posts', 'avatars', 'missions')
 * @returns Promise<string> The download URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  try {
    // Create a unique filename to avoid collisions
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, `${path}/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get and return the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file to Firebase Storage:', error);
    throw error;
  }
};

/**
 * Uploads multiple files to Firebase Storage.
 */
export const uploadMultipleFiles = async (files: File[], path: string): Promise<string[]> => {
  const uploadPromises = files.map(file => uploadFile(file, path));
  return Promise.all(uploadPromises);
};

/**
 * Helper to check if a file is an image or video
 */
export const getFileType = (file: File): 'image' | 'video' => {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  throw new Error('Unsupported file type. Please upload an image or video.');
};
