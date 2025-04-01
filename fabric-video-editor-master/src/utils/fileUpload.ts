import { ref, uploadBytes, getDownloadURL, listAll, getDownloadURL as getDownloadURLFromRef} from "firebase/storage";
import { storage } from "@/utils/firebaseConfig";

/**
 * Uploads a file to Firebase Storage and returns its download URL.
 * @param file - The file to upload.
 * @param folder - The folder in Firebase Storage where the file will be stored.
 * @returns The download URL of the uploaded file.
 */
const uploadFile = async (file: File, folder: string = "uploads"): Promise<string> => {
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

/**
 * Retrieves download URLs of all files in a specified folder from Firebase Storage.
 * @param folder - The folder in Firebase Storage to retrieve files from.
 * @returns An array of download URLs.
 */
const getFilesFromFolder = async (folder: string = "uploads"): Promise<string[]> => {
  const folderRef = ref(storage, folder);
  try {
    const result = await listAll(folderRef);
    const urls = await Promise.all(result.items.map(async (itemRef) => {
      return getDownloadURLFromRef(itemRef);
    }));
    return urls;
  } catch (error) {
    console.error("Error retrieving files from folder:", error);
    throw error;
  }
};

export { uploadFile, getFilesFromFolder };