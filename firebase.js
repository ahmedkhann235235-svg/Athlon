import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC5ks5cfVoBlAddM7G83gG_eAkEIRvv-4E",
  authDomain: "aclon-789fb.firebaseapp.com",
  projectId: "aclon-789fb",
  storageBucket: "aclon-789fb.firebasestorage.app",
  messagingSenderId: "686587611572",
  appId: "1:686587611572:web:c4948cbda2bbb4848b4ae1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let resolveReady;
let initialResolved = false;

const ready = new Promise((resolve) => {
  resolveReady = resolve;
});

window.FB = {
  app,
  auth,
  db,
  ready,
  user: null,
  api: {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut,
    doc,
    setDoc,
    getDoc
  }
};

onAuthStateChanged(auth, (user) => {
  window.FB.user = user || null;

  if (!initialResolved) {
    initialResolved = true;
    resolveReady(user || null);
    window.dispatchEvent(new CustomEvent("hpos:firebase-ready", { detail: user || null }));
  }

  window.App?.onAuthStateChanged?.(user || null);
});
