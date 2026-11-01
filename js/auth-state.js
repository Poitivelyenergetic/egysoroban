import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { auth } from "./firebase-init.js";
import { state } from "./state.js";

onAuthStateChanged(auth, function (user) {
    state.isSignedIn = !!user;
});
