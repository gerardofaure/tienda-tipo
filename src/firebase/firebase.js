import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

function assertEnv(name, value) {
  if (!value) {
    throw new Error(
      `Falta variable de entorno ${name}. Crea un archivo .env en la raíz con la config de Firebase (VITE_...).`
    );
  }
}

assertEnv("VITE_FIREBASE_API_KEY", firebaseConfig.apiKey);
assertEnv("VITE_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain);
assertEnv("VITE_FIREBASE_PROJECT_ID", firebaseConfig.projectId);
assertEnv("VITE_FIREBASE_STORAGE_BUCKET", firebaseConfig.storageBucket);
assertEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", firebaseConfig.messagingSenderId);
assertEnv("VITE_FIREBASE_APP_ID", firebaseConfig.appId);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);