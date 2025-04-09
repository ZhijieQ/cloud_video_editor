import { getFirestore, serverTimestamp } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";


const firebaseConfig = {
  apiKey: "AIzaSyDFF3UJq1snXYgkBe0OEKvD2On6v5jp0bo",
  authDomain: "cloud2-6d64d.firebaseapp.com",
  projectId: "cloud2-6d64d",
  storageBucket: "cloud2-6d64d.firebasestorage.app",
  messagingSenderId: "684858510473",
  appId: "1:684858510473:web:64b710b3f6c98bbd408a58",
  databaseURL: "https://cloud2-6d64d-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const projectFirestore = getFirestore(app);
const timestamp = serverTimestamp();
const storage = getStorage(app);
const database = getDatabase(app);
export {
    projectFirestore,
    timestamp,
    auth,
    storage,
    database
}