import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file - The file to upload.
 * @param folder - The folder in Firebase Storage where the file will be stored.
 * @returns The download URL of the uploaded file.
 */
export const uploadFile = async (file: File, folder: string = "uploads"): Promise<string> => {
  const storageRef = ref(storage, `${folder}/${file.name}`);
  try {
    // Upload the file to Firebase Storage
    await uploadBytes(storageRef, file);

    // Get the file's download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};