import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";

var firebaseConfig = {
    apiKey: "AIzaSyBO1uz4RGxrE5abjtdvoECvXmfx-CYEVBE",
    authDomain: "egysoroban-731cd.firebaseapp.com",
    projectId: "egysoroban-731cd",
    storageBucket: "egysoroban-731cd.firebasestorage.app",
    messagingSenderId: "474236789906",
    appId: "1:474236789906:web:d1abb574e3dbb9a5c7724b",
    measurementId: "G-3SQ5EWVVG1",
};

var firebaseApp = initializeApp(firebaseConfig);
export var db = getFirestore(firebaseApp);
export var auth = getAuth(firebaseApp);

/* Analytics only works in a real browser context (not every environment
   supports it), so guard it and export null if unavailable. */
export var analyticsReady = isAnalyticsSupported().then(function (supported) {
    return supported ? getAnalytics(firebaseApp) : null;
}).catch(function () { return null; });
