// src/firebase.js
// Replace the placeholder values with your Firebase project configuration.
// You can find these values in your Firebase console under Project Settings.

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseConfig = {
    apiKey: "AIzaSyBwwZUDQPeqGuZz3CKToyrg_RGOcBGcp7E",
    authDomain: "superta-test.firebaseapp.com",
    projectId: "superta-test",
    storageBucket: "superta-test.firebasestorage.app",
    messagingSenderId: "395915598500",
    appId: "1:395915598500:web:56cd2ca64529cfa07ca431",
    measurementId: "G-K61C8K33ZQ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);