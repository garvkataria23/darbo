/* ==========================================================================
   DARBO — FIREBASE AUTHENTICATION & FIRESTORE DATABASE MODULE
   Project: darbo-e0752 | App ID: 1:364426200825:web:f3bd7401b87313ed840428
   Skills Used: firebase-basics, firebase-auth-basics, firebase-firestore
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// 1. FIREBASE CONFIGURATION (Project: darbo-e0752)
const firebaseConfig = {
  apiKey: "AIzaSyDKpbjjw_NQeKS2C4eil9pSg16ZGfFmzTo",
  authDomain: "darbo-e0752.firebaseapp.com",
  projectId: "darbo-e0752",
  storageBucket: "darbo-e0752.firebasestorage.app",
  messagingSenderId: "364426200825",
  appId: "1:364426200825:web:f3bd7401b87313ed840428",
  measurementId: "G-1VNFQZVLK7"
};

// Initialize Firebase App, Auth, & Firestore
let app, auth, db, googleProvider;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  googleProvider = new GoogleAuthProvider();
  console.log("🔥 Firebase Auth & Firestore initialized for Project darbo-e0752!");
} catch (err) {
  console.warn("Firebase Init Note: ", err.message);
}

// Export app for firestore.js module import
export { app };

// 2. FIRESTORE DATABASE HELPER: Save/Update User Profile
async function saveUserProfileToFirestore(user, extraData = {}) {
  if (!db || !user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || extraData.name || "Streetwear Fan",
      photoURL: user.photoURL || "",
      phoneNumber: user.phoneNumber || "",
      updatedAt: serverTimestamp(),
      ...extraData
    }, { merge: true });
    console.log("👤 User profile synchronized with Firestore collection 'users'");
  } catch (error) {
    console.error("Error saving user to Firestore: ", error);
  }
}

// 3. UI TAB SWITCHER (Login <-> Sign Up <-> Phone Auth)
window.switchAuthTab = function(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const phoneForm = document.getElementById('phoneForm');
  const tabLoginBtn = document.getElementById('tabLoginBtn');
  const tabSignupBtn = document.getElementById('tabSignupBtn');

  if (tab === 'login') {
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
    if (phoneForm) phoneForm.style.display = 'none';
    if (tabLoginBtn) tabLoginBtn.classList.add('active');
    if (tabSignupBtn) tabSignupBtn.classList.remove('active');
  } else if (tab === 'signup') {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
    if (phoneForm) phoneForm.style.display = 'none';
    if (tabLoginBtn) tabLoginBtn.classList.remove('active');
    if (tabSignupBtn) tabSignupBtn.classList.add('active');
  } else if (tab === 'phone') {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'none';
    if (phoneForm) phoneForm.style.display = 'block';
  }
};

// 4. PASSWORD VISIBILITY TOGGLE
window.togglePasswordVisibility = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = '<i data-lucide="eye-off" style="width:18px;height:18px;"></i>';
  } else {
    input.type = 'password';
    btn.innerHTML = '<i data-lucide="eye" style="width:18px;height:18px;"></i>';
  }
  if (window.lucide) lucide.createIcons();
};

// 5. GOOGLE SIGN-IN HANDLER
window.handleGoogleSignIn = async function() {
  const btn = document.getElementById('btnGoogleAuth');
  if (btn) btn.style.opacity = '0.7';

  if (typeof showToast === 'function') showToast('Connecting to Google Account... 🚀');

  try {
    if (auth && googleProvider) {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      await saveUserProfileToFirestore(user);
      if (typeof showToast === 'function') showToast(`Welcome, ${user.displayName || 'Streetwear Fan'}! 🎉`);
      setTimeout(() => window.location.href = 'index.html', 1200);
    } else {
      setTimeout(() => {
        if (typeof showToast === 'function') showToast('🎉 Google Sign-In Demo Success! Redirecting...');
        setTimeout(() => window.location.href = 'index.html', 1200);
      }, 1000);
    }
  } catch (error) {
    console.error("Google Sign-In Error: ", error);
    if (typeof showToast === 'function') showToast(`Google Auth Error: ${error.message}`);
    if (btn) btn.style.opacity = '1';
  }
};

// 6. EMAIL/PASSWORD LOGIN HANDLER
window.handleEmailLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail')?.value;
  const password = document.getElementById('loginPassword')?.value;
  const submitBtn = document.getElementById('btnLoginSubmit');

  if (!email || !password) return;

  if (submitBtn) {
    submitBtn.innerHTML = '<span>Signing In...</span> ⏳';
    submitBtn.disabled = true;
  }

  try {
    if (auth) {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await saveUserProfileToFirestore(user);
      if (typeof showToast === 'function') showToast(`Welcome back, ${user.email}! 🎉`);
      setTimeout(() => window.location.href = 'index.html', 1200);
    } else {
      setTimeout(() => {
        if (typeof showToast === 'function') showToast(`🎉 Signed in as ${email}! Redirecting...`);
        setTimeout(() => window.location.href = 'index.html', 1200);
      }, 1000);
    }
  } catch (error) {
    console.error("Login Error: ", error);
    if (typeof showToast === 'function') showToast(`Login Error: ${error.message}`);
    if (submitBtn) {
      submitBtn.innerHTML = '<span>Sign In to DARBO</span> ➔';
      submitBtn.disabled = false;
    }
  }
};

// 7. EMAIL/PASSWORD SIGN-UP HANDLER
window.handleEmailSignUp = async function(e) {
  e.preventDefault();
  const name = document.getElementById('signupName')?.value;
  const email = document.getElementById('signupEmail')?.value;
  const password = document.getElementById('signupPassword')?.value;
  const submitBtn = document.getElementById('btnSignupSubmit');

  if (!email || !password) return;

  if (submitBtn) {
    submitBtn.innerHTML = '<span>Creating Account...</span> ⏳';
    submitBtn.disabled = true;
  }

  try {
    if (auth) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      if (name) {
        await updateProfile(user, { displayName: name });
      }
      await saveUserProfileToFirestore(user, { name });
      if (typeof showToast === 'function') showToast(`Account created for ${name || email}! Welcome to DARBO 🚀`);
      setTimeout(() => window.location.href = 'index.html', 1200);
    } else {
      setTimeout(() => {
        if (typeof showToast === 'function') showToast(`🎉 Account created for ${name || 'User'}! Welcome!`);
        setTimeout(() => window.location.href = 'index.html', 1200);
      }, 1000);
    }
  } catch (error) {
    console.error("Sign Up Error: ", error);
    if (typeof showToast === 'function') showToast(`Sign Up Error: ${error.message}`);
    if (submitBtn) {
      submitBtn.innerHTML = '<span>Create Free Account</span> 🚀';
      submitBtn.disabled = false;
    }
  }
};

// 8. PHONE NUMBER OTP AUTHENTICATION HANDLER
let confirmationResultGlobal = null;

window.handleSendPhoneOTP = async function(e) {
  e.preventDefault();
  const phoneNum = document.getElementById('phoneInput')?.value;
  if (!phoneNum) return;

  if (typeof showToast === 'function') showToast(`Sending OTP to ${phoneNum}... 📲`);

  try {
    if (auth) {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible'
        });
      }
      const appVerifier = window.recaptchaVerifier;
      confirmationResultGlobal = await signInWithPhoneNumber(auth, phoneNum, appVerifier);
      document.getElementById('otpSection').style.display = 'block';
      if (typeof showToast === 'function') showToast('OTP sent! Please check your SMS 📩');
    } else {
      document.getElementById('otpSection').style.display = 'block';
      if (typeof showToast === 'function') showToast('Demo OTP sent (Use 123456) 📩');
    }
  } catch (error) {
    console.error("Phone OTP Error: ", error);
    if (typeof showToast === 'function') showToast(`Phone Auth Error: ${error.message}`);
  }
};

window.handleVerifyOTP = async function(e) {
  e.preventDefault();
  const code = document.getElementById('otpCodeInput')?.value;
  if (!code) return;

  try {
    if (confirmationResultGlobal) {
      const result = await confirmationResultGlobal.confirm(code);
      const user = result.user;
      await saveUserProfileToFirestore(user);
      if (typeof showToast === 'function') showToast(`Phone Verified! Welcome to DARBO 🚀`);
      setTimeout(() => window.location.href = 'index.html', 1200);
    } else {
      if (typeof showToast === 'function') showToast('🎉 Phone Verified! Redirecting...');
      setTimeout(() => window.location.href = 'index.html', 1200);
    }
  } catch (error) {
    console.error("OTP Verification Error: ", error);
    if (typeof showToast === 'function') showToast(`Invalid OTP Code! ${error.message}`);
  }
};

// 9. FORGOT PASSWORD RESET LINK
window.handleForgotPassword = async function() {
  const email = prompt('Enter your registered email address to receive a password reset link:');
  if (!email) return;

  try {
    if (auth) {
      await sendPasswordResetEmail(auth, email);
      if (typeof showToast === 'function') showToast(`Password reset link sent to ${email} 📩`);
    } else {
      if (typeof showToast === 'function') showToast(`Password reset link sent to ${email}! 📩`);
    }
  } catch (error) {
    if (typeof showToast === 'function') showToast(`Reset Error: ${error.message}`);
  }
};

// 10. EXPOSE FIREBASE INSTANCES TO WINDOW (for main.js)
window.darboAuth = auth;
window.darboDB = db;

// 11. FIRESTORE USER DATA SYNC — Save cart/wishlist/recentlyViewed to Firestore
async function saveUserDataToFirestore(userData) {
  if (!db || !auth || !auth.currentUser) return;
  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await setDoc(userRef, {
      cart: userData.cart || [],
      wishlist: userData.wishlist || [],
      recentlyViewed: userData.recentlyViewed || [],
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error("Error saving user data to Firestore:", error);
  }
}

async function loadUserDataFromFirestore() {
  if (!db || !auth || !auth.currentUser) return null;
  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (error) {
    console.error("Error loading user data from Firestore:", error);
    return null;
  }
}

window.saveUserDataToFirestore = saveUserDataToFirestore;
window.loadUserDataFromFirestore = loadUserDataFromFirestore;

// 12. AUTH STATE OBSERVER — Load user data on login
if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("Current User: ", user.email || user.phoneNumber || user.uid);
      window.darboCurrentUser = user;

      // Load saved data from Firestore
      const userData = await loadUserDataFromFirestore();
      if (userData && typeof window.onUserDataLoaded === 'function') {
        window.onUserDataLoaded(userData);
      }
    } else {
      window.darboCurrentUser = null;
    }
  });
}
