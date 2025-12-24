// constants/firebase.tsx
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Thêm dòng này

const firebaseConfig = {
  apiKey: "AIzaSyCq_GGy9wrahCBx8HU_84-W_5WHw0NBC30",
  authDomain: "figure-app-d1912.firebaseapp.com",
  projectId: "figure-app-d1912",
  storageBucket: "figure-app-d1912.firebasestorage.app",
  messagingSenderId: "378743019240",
  appId: "1:378743019240:web:f6a992bc36182ce7785b5d",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); // Thêm dòng này để export Firestore