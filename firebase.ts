import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  doc, 
  setDoc, 
  deleteDoc, 
  serverTimestamp,
  getDoc,
  updateDoc,
  addDoc,
  orderBy,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyBscsAkO_yJYfVVtCBh3rNF8Cm51_HLW54",
    authDomain: "teste-rede-fcb99.firebaseapp.com",
    projectId: "teste-rede-fcb99",
    storageBucket: "teste-rede-fcb99.firebasestorage.app",
    messagingSenderId: "1006477304115",
    appId: "1:1006477304115:web:e88d8e5f2e75d1b4df5e46"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app, `gs://${firebaseConfig.storageBucket}`);
const messaging = getMessaging(app);

export { 
  auth, 
  db,
  storage,
  messaging,
  getToken,
  onMessage,
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  storageRef,
  uploadBytes,
  uploadString,
  getDownloadURL,
  getDoc,
  updateDoc,
  addDoc,
  orderBy,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  writeBatch,
  deleteObject
};