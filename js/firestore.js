/* ==========================================================================
   DARBO — FIRESTORE DATABASE MODULE
   Handles: Products, Users, Orders, Custom Designs
   Project: darbo-e0752
   Skills Used: firebase-firestore
   ========================================================================== */

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";

import { app } from "./auth.js";

// Initialize Firestore
const db = getFirestore(app);

// Initialize Firebase Storage (may fail if Storage API isn't enabled)
let storage = null;
try {
  storage = getStorage(app);
} catch (e) {
  console.warn('Firebase Storage not available (enable it in Firebase Console):', e.message);
}

// ============================================================
// PRODUCTS — Read from Firestore catalog
// ============================================================

/** Fetch all products from Firestore */
async function fetchAllProducts() {
  try {
    const snapshot = await getDocs(collection(db, "products"));
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

/** Fetch products by category */
async function fetchProductsByCategory(category) {
  try {
    const q = query(
      collection(db, "products"),
      where("category", "==", category),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  } catch (error) {
    console.error("Error fetching products by category:", error);
    return [];
  }
}

/** Fetch featured products */
async function fetchFeaturedProducts() {
  try {
    const q = query(
      collection(db, "products"),
      where("featured", "==", true),
      orderBy("createdAt", "desc"),
      limit(8)
    );
    const snapshot = await getDocs(q);
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    return products;
  } catch (error) {
    console.error("Error fetching featured products:", error);
    return [];
  }
}

/** Fetch a single product by ID */
async function fetchProductById(productId) {
  try {
    const docRef = doc(db, "products", productId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching product:", error);
    return null;
  }
}

// ============================================================
// USERS — Profile CRUD
// ============================================================

/** Create or update user profile in Firestore */
async function saveUserProfile(user, extraData = {}) {
  if (!user) return;
  try {
    const userRef = doc(db, "users", user.uid);
    const existing = await getDoc(userRef);

    const profileData = {
      uid: user.uid,
      email: user.email || "",
      displayName: user.displayName || extraData.name || "Streetwear Fan",
      photoURL: user.photoURL || "",
      phoneNumber: user.phoneNumber || "",
      role: "customer",
      updatedAt: serverTimestamp()
    };

    if (!existing.exists()) {
      // New user — set createdAt and role
      profileData.createdAt = serverTimestamp();
      profileData.role = "customer";
      profileData.cart = [];
      profileData.wishlist = [];
      profileData.recentlyViewed = [];
      profileData.addresses = [];
    }

    // Merge any extra data
    Object.assign(profileData, extraData);

    await setDoc(userRef, profileData, { merge: true });
    console.log("👤 User profile saved to Firestore:", user.uid);
  } catch (error) {
    console.error("Error saving user profile:", error);
  }
}

/** Get user profile from Firestore */
async function getUserProfile(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}

/** Update specific fields of user profile */
async function updateUserProfile(userId, data) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    console.log("👤 User profile updated:", userId);
  } catch (error) {
    console.error("Error updating user profile:", error);
  }
}

// ============================================================
// CART — Firestore-backed cart
// ============================================================

/** Save user's cart to Firestore */
async function saveCart(userId, cartItems) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      cart: cartItems,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving cart:", error);
  }
}

/** Load user's cart from Firestore */
async function loadCart(userId) {
  try {
    const profile = await getUserProfile(userId);
    return profile?.cart || [];
  } catch (error) {
    console.error("Error loading cart:", error);
    return [];
  }
}

// ============================================================
// WISHLIST — Firestore-backed wishlist
// ============================================================

/** Save user's wishlist to Firestore */
async function saveWishlist(userId, wishlistItems) {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      wishlist: wishlistItems,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error saving wishlist:", error);
  }
}

/** Load user's wishlist from Firestore */
async function loadWishlist(userId) {
  try {
    const profile = await getUserProfile(userId);
    return profile?.wishlist || [];
  } catch (error) {
    console.error("Error loading wishlist:", error);
    return [];
  }
}

// ============================================================
// ORDERS — Create & Read
// ============================================================

/** Create a new order in Firestore */
async function createOrder(orderData) {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...orderData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log("📦 Order created:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating order:", error);
    return null;
  }
}

/** Fetch all orders for a user */
async function fetchUserOrders(userId) {
  try {
    const q = query(
      collection(db, "orders"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });
    return orders;
  } catch (error) {
    console.error("Error fetching orders:", error);
    return [];
  }
}

/** Fetch a single order by ID */
async function fetchOrderById(orderId) {
  try {
    const docRef = doc(db, "orders", orderId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

// ============================================================
// CUSTOM DESIGNS
// ============================================================

/** Save a custom design */
async function saveCustomDesign(userId, designData) {
  try {
    const docRef = await addDoc(collection(db, "custom_designs"), {
      userId,
      ...designData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log("🎨 Custom design saved:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving custom design:", error);
    return null;
  }
}

/** Fetch all custom designs for a user */
async function fetchUserDesigns(userId) {
  try {
    const q = query(
      collection(db, "custom_designs"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    const designs = [];
    snapshot.forEach(doc => {
      designs.push({ id: doc.id, ...doc.data() });
    });
    return designs;
  } catch (error) {
    console.error("Error fetching designs:", error);
    return [];
  }
}

// ============================================================
// REALTIME LISTENERS
// ============================================================

/** Listen to user profile changes in real-time */
function onUserProfileChange(userId, callback) {
  const userRef = doc(db, "users", userId);
  return onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    }
  });
}

/** Listen to products collection changes */
function onProductsChange(callback) {
  return onSnapshot(collection(db, "products"), (snapshot) => {
    const products = [];
    snapshot.forEach(doc => {
      products.push({ id: doc.id, ...doc.data() });
    });
    callback(products);
  });
}

// ============================================================
// STORAGE — Upload Custom Design Images
// ============================================================

/** Upload a custom design image to Firebase Storage */
async function uploadDesignImage(userId, file, fileName) {
  if (!storage) {
    console.warn('Firebase Storage not available — skipping upload');
    return null;
  }
  try {
    const timestamp = Date.now();
    const safeName = (fileName || file.name || 'design').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `custom_designs/${userId}/${timestamp}_${safeName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    console.log("🎨 Design image uploaded:", downloadURL);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading design image:", error);
    return null;
  }
}

/** Save custom design metadata to Firestore */
async function saveDesignMetadata(userId, designData) {
  try {
    const docRef = await addDoc(collection(db, "custom_designs"), {
      userId,
      ...designData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log("🎨 Design metadata saved:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving design metadata:", error);
    return null;
  }
}

// ============================================================
// EXPORTS — Expose to window for non-module scripts
// ============================================================
window.darboFirestore = {
  // Products
  fetchAllProducts,
  fetchProductsByCategory,
  fetchFeaturedProducts,
  fetchProductById,

  // Users
  saveUserProfile,
  getUserProfile,
  updateUserProfile,

  // Cart
  saveCart,
  loadCart,

  // Wishlist
  saveWishlist,
  loadWishlist,

  // Orders
  createOrder,
  fetchUserOrders,
  fetchOrderById,

  // Custom Designs
  saveCustomDesign,
  fetchUserDesigns,

  // Storage
  uploadDesignImage,
  saveDesignMetadata,

  // Realtime
  onUserProfileChange,
  onProductsChange
};

// Also export db instance for advanced use
window.darboDB = db;

console.log("📦 DARBO Firestore module loaded — Project darbo-e0752");
