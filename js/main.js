/* ==========================================================================
   DARBO — OWN YOUR STORY | ENHANCED PRO MAX JAVASCRIPT
   Cart, Quick View Modal, Live Search, Customizer Studio 2.0, Coupons & Filters
   ========================================================================== */

// Initial State
let cart = [
  { id: 1, title: 'Chill Mode Oversized Tee', price: 699, color: 'Black', size: 'L', qty: 1, image: 'images/chill_mode_tee.jpg' },
  { id: 3, title: 'Good Vibes Only Tee', price: 699, color: 'White', size: 'M', qty: 1, image: 'images/good_vibes_tee.jpg' }
];

let wishlist = JSON.parse(localStorage.getItem('darbo_wishlist') || '[]');
let recentlyViewed = JSON.parse(localStorage.getItem('darbo_recent') || '[]');
let discountPercent = 0;

/* Firestore Sync Helper — saves cart/wishlist/recentlyViewed to cloud */
function syncDataToFirestore() {
  if (window.darboCurrentUser && window.saveUserDataToFirestore) {
    window.saveUserDataToFirestore({
      cart: cart,
      wishlist: wishlist,
      recentlyViewed: recentlyViewed
    });
  }
}

/* Called by auth.js when user logs in — loads cloud data */
window.onUserDataLoaded = function(userData) {
  if (userData.cart && userData.cart.length > 0) {
    cart = userData.cart;
    localStorage.setItem('darbo_cart', JSON.stringify(cart));
  }
  if (userData.wishlist && userData.wishlist.length > 0) {
    wishlist = userData.wishlist;
    localStorage.setItem('darbo_wishlist', JSON.stringify(wishlist));
  }
  if (userData.recentlyViewed && userData.recentlyViewed.length > 0) {
    recentlyViewed = userData.recentlyViewed;
    localStorage.setItem('darbo_recent', JSON.stringify(recentlyViewed));
  }
  updateCartUI();
  renderRecentlyViewed();
  showToast('Your saved data loaded from cloud! ☁️');
};

// Initial Products Data
const defaultProducts = [
  {
    id: 1,
    title: 'Chill Mode Oversized Tee',
    category: 'T-Shirts',
    price: 699,
    mrp: 1299,
    stock: 50,
    image: 'images/chill_mode_tee.jpg',
    colors: ['#1A1A1A', '#606470', '#FFC0CB'],
    description: 'Heavyweight 240 GSM 100% French Terry Cotton. High-density puff print graphic. Relaxed streetwear fit.'
  },
  {
    id: 2,
    title: 'Create Your Reality Hoodie',
    category: 'Hoodies',
    price: 999,
    mrp: 1799,
    stock: 30,
    image: 'images/create_reality_hoodie.jpg',
    colors: ['#F5F0EB', '#1A1A1A', '#556B2F'],
    description: 'Ultra-soft fleece hoodie featuring vintage streetwear typography. Double-lined hood with kangaroo pouch.'
  },
  {
    id: 3,
    title: 'Good Vibes Only Tee',
    category: 'T-Shirts',
    price: 699,
    mrp: 1199,
    stock: 45,
    image: 'images/good_vibes_tee.jpg',
    colors: ['#FFFFFF', '#FFC0CB', '#ADD8E6'],
    description: 'Vibrant flower graphic print tee crafted from super-combed organic cotton for all-day comfort.'
  },
  {
    id: 4,
    title: 'Make Memories Hoodie',
    category: 'Hoodies',
    price: 999,
    mrp: 1799,
    stock: 20,
    image: 'images/make_memories_hoodie.jpg',
    colors: ['#1A1A1A', '#FFFFFF', '#2E5A44'],
    description: 'Premium heavyweight cotton hoodie with statement typography print. Built to last through all seasons.'
  },
  {
    id: 5,
    title: 'Stay Wild Tee',
    category: 'T-Shirts',
    price: 699,
    mrp: 1299,
    stock: 15,
    image: 'images/stay_wild_tee.jpg',
    colors: ['#F5F0EB', '#1A1A1A', '#8B5A2B'],
    description: 'Vintage washed cream graphic tee with retro wild typography. Pre-shrunk relaxed unisex cut.'
  }
];

function getLiveProducts() {
  const stored = localStorage.getItem('darbo_products');
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { return defaultProducts; }
  }
  return defaultProducts;
}

let products = getLiveProducts();

// Document Ready
document.addEventListener('DOMContentLoaded', () => {
  products = getLiveProducts();
  initScrollAnimations();
  updateCartUI();
  initCustomizerStudio();
  renderProductsGrid(products);
  initDarboMap();

  // Scroll-aware header + Active nav section spy
  const spySections = ['home', 'bestsellers', 'collections', 'customizer', 'about', 'contactSection', 'stores', 'contact'];
  
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.classList.toggle('scrolled', window.scrollY > 60);
    }
    // Back to top button
    const backToTop = document.getElementById('backToTopBtn');
    if (backToTop) {
      backToTop.classList.toggle('visible', window.scrollY > 500);
    }

    // Scroll Spy — highlight active nav link
    let currentSection = 'home';
    const scrollPos = window.scrollY + 150;

    for (const id of spySections) {
      const section = document.getElementById(id);
      if (section && section.offsetTop <= scrollPos) {
        currentSection = id;
      }
    }

    // Map section IDs to nav href anchors
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === '#' + currentSection) {
        link.classList.add('active');
      }
    });

    // Also update mobile nav links
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === '#' + currentSection) {
        link.classList.add('active');
      }
    });
  });

  initLazyImages();
  initTextReveal();
  renderRecentlyViewed();
});

// Lazy Loading
function initLazyImages() {
  const lazyImages = document.querySelectorAll('img[data-src]');
  const imgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
        imgObserver.unobserve(img);
      }
    });
  });
  lazyImages.forEach(img => imgObserver.observe(img));
}

// Text reveal
function initTextReveal() {
  const reveals = document.querySelectorAll('.animate-on-scroll');
  reveals.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('revealed');
    }, index * 100);
  });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterAndScroll(category) {
  filterProducts(category);
  const section = document.getElementById('bestsellers');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

/* Scroll Animations Observer */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.15 });

  animatedElements.forEach(el => observer.observe(el));
}

function filterProducts(category, e) {
  // Update active tab UI
  document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
  if (e && e.target) {
    e.target.classList.add('active');
  }

  let filtered = products;
  if (category !== 'All') {
    filtered = products.filter(p => p.category === category || (category === 'Custom' && p.price === 699));
  }
  renderProductsGrid(filtered);
}

function sortProducts(sortBy) {
  let filtered = [...products];
  const activeTab = document.querySelector('.filter-tab.active');
  const category = activeTab ? activeTab.innerText.trim() : 'All';
  if (category !== 'All') {
    filtered = products.filter(p => p.category === category || (category === 'Custom' && p.price === 699));
  }

  if (sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'newest') {
    filtered.sort((a, b) => b.id - a.id);
  } else if (sortBy === 'popular') {
    filtered.sort((a, b) => b.stock - a.stock);
  }
  
  renderProductsGrid(filtered);
}

function filterByPriceRange(min, max) {
  const filtered = products.filter(p => p.price >= min && p.price <= max);
  renderProductsGrid(filtered);
}

function renderProductsGrid(items) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = items.map(prod => `
    <div class="product-card">
      <div class="product-image-box" onclick="openQuickView(${prod.id})">
        ${prod.stock < 25 ? '<div class="product-badge badge-bestseller">Best Seller</div>' : '<div class="product-badge badge-new">New</div>'}
        <button class="wishlist-btn" title="Save to Wishlist" onclick="event.stopPropagation(); toggleWishlist(this, ${prod.id})">
          <i data-lucide="heart" style="width:18px;height:18px;"></i>
        </button>
        <img src="${prod.image}" alt="${prod.title}" loading="lazy" />
        <div class="product-overlay">
          <div class="overlay-action-btn" onclick="event.stopPropagation(); openQuickView(${prod.id})"><i data-lucide="eye" style="width:20px;height:20px;"></i></div>
          <div class="overlay-action-btn" onclick="event.stopPropagation(); addToCart(${prod.id})"><i data-lucide="shopping-bag" style="width:20px;height:20px;"></i></div>
          <div class="overlay-action-btn" onclick="event.stopPropagation(); toggleWishlist(this, ${prod.id})"><i data-lucide="heart" style="width:20px;height:20px;"></i></div>
        </div>
      </div>
      <div class="product-info">
        <div class="product-title" onclick="openQuickView(${prod.id})" style="cursor:pointer;">${prod.title}</div>
        <div class="product-price">₹${prod.price}</div>
        <div class="product-swatches">
          ${prod.colors.map(c => `<div class="color-swatch" style="background:${c};"></div>`).join('')}
        </div>
        <button class="quick-add-btn" onclick="addToCart(${prod.id})">Add to Cart</button>
      </div>
    </div>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

/* Mobile Navigation Drawer Functions */
function toggleMobileNav() {
  const overlay = document.getElementById('mobileNavOverlay');
  if (overlay) {
    overlay.classList.toggle('active');
    document.body.style.overflow = overlay.classList.contains('active') ? 'hidden' : '';
  }
}

function closeMobileNav() {
  const overlay = document.getElementById('mobileNavOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
}

/* Cart Functions */
function toggleCart() {
  const drawer = document.getElementById('cartDrawerOverlay');
  if (drawer) {
    drawer.classList.toggle('active');
  }
}

function addToCart(productId, selectedSize = 'L') {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  const existing = cart.find(item => item.id === productId && item.size === selectedSize);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: prod.id,
      title: prod.title,
      price: prod.price,
      color: 'Default',
      size: selectedSize,
      qty: 1,
      image: prod.image
    });
  }

  updateCartUI();
  showToast(`Added "${prod.title}" to cart! 🛍️`);
  toggleCart();
}

function updateCartQuantity(id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += change;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  updateCartUI();
}

function applyCoupon() {
  const code = document.getElementById('couponInput')?.value.trim().toUpperCase();
  if (code === 'DARBO10' || code === 'DARBO') {
    discountPercent = 10;
    showToast('🎉 Coupon DARBO10 applied! 10% OFF!');
    updateCartUI();
  } else {
    showToast('Invalid coupon code. Try "DARBO10"');
  }
}

function updateCartUI() {
  const cartBody = document.getElementById('cartBody');
  const cartBadge = document.getElementById('cartBadgeCount');
  const cartSubtotal = document.getElementById('cartSubtotal');

  localStorage.setItem('darbo_cart', JSON.stringify(cart));
  syncDataToFirestore();

  const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
  let totalPrice = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);

  if (discountPercent > 0) {
    totalPrice = Math.round(totalPrice * (1 - discountPercent / 100));
  }

  if (cartBadge) cartBadge.innerText = totalItems;
  if (cartSubtotal) cartSubtotal.innerText = `₹${totalPrice}`;

  // Shipping Progress Bar (Threshold ₹999)
  const shippingMeter = document.getElementById('shippingMeter');
  if (shippingMeter) {
    const rawTotal = cart.reduce((sum, i) => sum + (i.price * i.qty), 0);
    const target = 999;
    if (rawTotal >= target || cart.length === 0) {
      shippingMeter.innerHTML = `
        <div class="shipping-text">
          <span>🎉 FREE SHIPPING UNLOCKED!</span>
          <span>100%</span>
        </div>
        <div class="meter-track"><div class="meter-fill" style="width:100%;"></div></div>
      `;
    } else {
      const remaining = target - rawTotal;
      const pct = Math.min(100, Math.round((rawTotal / target) * 100));
      shippingMeter.innerHTML = `
        <div class="shipping-text">
          <span>Add ₹${remaining} more for FREE Shipping</span>
          <span>${pct}%</span>
        </div>
        <div class="meter-track"><div class="meter-fill" style="width:${pct}%;"></div></div>
      `;
    }
  }

  if (cartBody) {
    if (cart.length === 0) {
      cartBody.innerHTML = `
        <div style="text-align:center; padding: 3rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛍️</div>
          <p style="font-weight: 600;">Your cart is empty</p>
          <p style="font-size: 0.85rem;">Discover our latest printed collection now!</p>
        </div>
      `;
    } else {
      cartBody.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.title}" />
          <div class="cart-item-details">
            <div class="cart-item-title">${item.title}</div>
            <div class="cart-item-price">₹${item.price}</div>
            <div class="cart-qty-controls">
              <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)">-</button>
              <span style="font-weight:700; font-size:0.85rem;">${item.qty}</span>
              <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }
}

function proceedToCheckout() {
  if (cart.length === 0) {
    showToast('Your cart is empty!');
    return;
  }
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.add('active');
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (modal) modal.classList.remove('active');
}

function completeOrder(e) {
  e.preventDefault();
  closeCheckoutModal();
  cart = [];
  localStorage.removeItem('darbo_cart');
  syncDataToFirestore();
  updateCartUI();
  toggleCart();
  showToast('🎉 Order Placed Successfully! Thank you for buying from DARBO!');
}

let selectedQuickViewSize = 'L';

function selectQuickViewSize(btn, size) {
  const sizeBtns = document.querySelectorAll('.size-btn');
  sizeBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  selectedQuickViewSize = size;
}

function openQuickView(productId) {
  const prod = products.find(p => p.id === productId);
  if (!prod) return;

  // Add to recently viewed
  recentlyViewed = recentlyViewed.filter(id => id !== productId);
  recentlyViewed.unshift(productId);
  if (recentlyViewed.length > 6) recentlyViewed.pop();
  localStorage.setItem('darbo_recent', JSON.stringify(recentlyViewed));
  syncDataToFirestore();
  renderRecentlyViewed();

  const modal = document.getElementById('quickViewModal');
  const content = document.getElementById('quickViewContent');
  if (!modal || !content) return;

  selectedQuickViewSize = 'L';

  content.innerHTML = `
    <div class="quickview-grid">
      <div class="quickview-img-box">
        <img src="${prod.image}" alt="${prod.title}" />
      </div>
      <div>
        <span style="font-size:0.75rem; font-weight:800; color:var(--coral-primary); letter-spacing:0.15em;">${prod.category.toUpperCase()}</span>
        <h2 style="font-family:var(--font-heading); font-weight:900; font-size:1.8rem; margin:0.25rem 0 0.5rem;">${prod.title}</h2>
        <div style="font-family:var(--font-heading); font-weight:800; font-size:1.4rem; color:var(--text-dark); margin-bottom:1rem;">₹${prod.price} <span style="text-decoration:line-through; color:var(--text-muted); font-size:1rem;">₹${prod.mrp || ''}</span></div>
        <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.6; margin-bottom:1.25rem;">${prod.description}</p>
        
        <div style="font-weight:700; font-size:0.85rem; margin-bottom:0.4rem;">Select Size:</div>
        <div class="size-selector">
          <button class="size-btn" onclick="selectQuickViewSize(this, 'S')">S</button>
          <button class="size-btn" onclick="selectQuickViewSize(this, 'M')">M</button>
          <button class="size-btn active" onclick="selectQuickViewSize(this, 'L')">L</button>
          <button class="size-btn" onclick="selectQuickViewSize(this, 'XL')">XL</button>
          <button class="size-btn" onclick="selectQuickViewSize(this, 'XXL')">XXL</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:0.6rem; margin-top:1rem;">
          <button class="btn-primary-pill" style="width:100%; justify-content:center;" onclick="addToCart(${prod.id}, selectedQuickViewSize); closeQuickView();">
            Add To Shopping Bag 🛍️
          </button>
          <a href="https://wa.me/918355983699?text=Hi%20DARBO!%20I%20want%20to%20order%20'${encodeURIComponent(prod.title)}'%20(Price:%20₹${prod.price})." target="_blank" class="btn-whatsapp-footer" style="margin-top:0; width:100%; justify-content:center;">
            💬 Order Directly on WhatsApp
          </a>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeQuickView() {
  const modal = document.getElementById('quickViewModal');
  if (modal) modal.classList.remove('active');
}

/* Search Modal */
function openSearchModal() {
  const modal = document.getElementById('searchModal');
  if (modal) modal.classList.add('active');
}

function closeSearchModal() {
  const modal = document.getElementById('searchModal');
  if (modal) modal.classList.remove('active');
}

function handleSearchInput(e) {
  const query = e.target.value.toLowerCase().trim();
  const resultsContainer = document.getElementById('searchResults');
  if (!resultsContainer) return;

  if (!query) {
    resultsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Type above to search T-shirts, hoodies and custom prints...</p>';
    return;
  }

  const matches = products.filter(p => p.title.toLowerCase().includes(query) || p.category.toLowerCase().includes(query));
  if (matches.length === 0) {
    resultsContainer.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">No matching items found.</p>';
  } else {
    resultsContainer.innerHTML = matches.map(m => `
      <div style="display:flex; align-items:center; gap:1rem; padding:0.75rem 0; border-bottom:1px solid var(--border-subtle); cursor:pointer;" onclick="closeSearchModal(); openQuickView(${m.id});">
        <img src="${m.image}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;" />
        <div>
          <div style="font-weight:700; font-size:0.95rem;">${m.title}</div>
          <div style="font-weight:800; font-size:0.85rem; color:var(--coral-primary);">₹${m.price}</div>
        </div>
      </div>
    `).join('');
  }
}

/* Wishlist Toggle */
function toggleWishlist(btn, productId) {
  btn.classList.toggle('active');
  const isWishlisted = btn.classList.contains('active');
  const prod = products.find(p => p.id === productId);

  if (isWishlisted) {
    if (!wishlist.includes(productId)) wishlist.push(productId);
    showToast(`Saved "${prod ? prod.title : 'Item'}" to Wishlist! ❤️`);
  } else {
    wishlist = wishlist.filter(id => id !== productId);
    showToast('Removed from Wishlist');
  }
  
  localStorage.setItem('darbo_wishlist', JSON.stringify(wishlist));
  syncDataToFirestore();
}

function getWishlistCount() {
  return wishlist.length;
}

function renderRecentlyViewed() {
  const container = document.getElementById('recentlyViewedStrip');
  if (!container) return;
  
  if (recentlyViewed.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); font-size:0.9rem; padding: 1rem;">No recently viewed products.</div>';
    return;
  }
  
  const recentItems = recentlyViewed.map(id => products.find(p => p.id === id)).filter(Boolean);
  
  container.innerHTML = '<div style="display:flex; gap:1rem; overflow-x:auto; padding: 1rem 0;">' + recentItems.map(prod => `
    <div style="min-width:150px; background:white; border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.05); cursor:pointer;" onclick="openQuickView(${prod.id})">
      <img src="${prod.image}" alt="${prod.title}" style="width:100%; height:150px; object-fit:cover;" />
      <div style="padding:0.75rem;">
        <div style="font-weight:700; font-size:0.85rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${prod.title}</div>
        <div style="color:var(--coral-primary); font-weight:800; font-size:0.9rem;">₹${prod.price}</div>
      </div>
    </div>
  `).join('') + '</div>';
}

function openSizeGuide() {
  const modal = document.getElementById('sizeGuideModal');
  if (modal) modal.classList.add('active');
}
function closeSizeGuide() {
  const modal = document.getElementById('sizeGuideModal');
  if (modal) modal.classList.remove('active');
}

/* Customizer Studio Interactive Logic */
function initCustomizerStudio() {
  const textInput = document.getElementById('customTextInput');
  const printAreaText = document.getElementById('dashedPrintText');

  if (textInput && printAreaText) {
    textInput.addEventListener('input', (e) => {
      printAreaText.innerText = e.target.value.toUpperCase() || 'YOUR DESIGN HERE';
    });
  }
}

function setPresetText(preset) {
  const textInput = document.getElementById('customTextInput');
  const printAreaText = document.getElementById('dashedPrintText');
  if (textInput && printAreaText) {
    textInput.value = preset;
    printAreaText.innerText = preset.toUpperCase();
    showToast(`Graphic preset "${preset}" loaded! 🎨`);
  }
}

function addCustomTeeToCart() {
  const customText = document.getElementById('customTextInput')?.value || 'CUSTOM DESIGN';
  cart.push({
    id: Date.now(),
    title: `Custom Printed Tee ("${customText}")`,
    price: 799,
    color: 'Blush Pink',
    size: 'L',
    qty: 1,
    image: 'images/custom_tee_mockup.jpg'
  });
  updateCartUI();
  showToast('Your custom designed shirt was added to cart! 🛍️');
  toggleCart();
}

function selectStudioColor(colorHex) {
  const shirtMockup = document.querySelector('.shirt-mockup-wrapper');
  if (shirtMockup) {
    shirtMockup.style.backgroundColor = colorHex;
  }
  showToast(`T-shirt color updated!`);
}

/* Instagram Carousel Scroll */
function scrollSocialCarousel(direction) {
  const carousel = document.getElementById('socialCarousel');
  if (carousel) {
    const scrollAmount = direction * 240;
    carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }
}

/* Newsletter Subscription */
function handleSubscribe(event) {
  event.preventDefault();
  const input = document.getElementById('newsletterEmail');
  if (input && input.value) {
    const card = input.closest('.newsletter-card');
    if (card) {
      card.classList.add('newsletter-success');
    }
    showToast('Thank you for subscribing! Check your inbox for 10% off. 🎉');
    
    const counter = document.createElement('div');
    counter.className = 'social-proof-counter';
    counter.style.cssText = 'animation: countUp 2s ease-out forwards; color: var(--coral-primary); font-weight: 700; margin-top: 1rem;';
    counter.innerHTML = 'Join <span id="subCount">10,482</span> others!';
    
    if (card && !card.querySelector('.social-proof-counter')) {
      card.querySelector('.newsletter-left').appendChild(counter);
    }
    input.value = '';
  }
}

/* Toast System */
function showToast(message) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ==========================================================================
   STORE LOCATOR & INTERACTIVE LEAFLET MAP SYSTEM
   ========================================================================== */
const storesData = [
  {
    id: 1,
    name: "DARBO Head Office & Flagship Studio",
    category: "flagship",
    city: "Mumbai",
    pincode: "400103",
    lat: 19.2435,
    lng: 72.8465,
    address: "Shop No. 1 Link Bird CHSL 2, Shanti Ashram Rd, Devki Nagar, Borivali West, Mumbai, Maharashtra 400103",
    hours: "10:00 AM - 8:00 PM IST",
    phone: "+91 8355983699",
    status: "Open Now",
    image: "images/hero_models.jpg"
  }
];

let darboMapInstance = null;
let currentTileLayer = null;
let mapMarkers = [];
let miniTrackMapInstance = null;
let riderMarker = null;
let trackingAnimTimer = null;

const mapTileUrls = {
  voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};

function initDarboMap() {
  const mapElement = document.getElementById('darboMap');
  if (!mapElement || typeof L === 'undefined') return;

  darboMapInstance = L.map('darboMap', {
    center: [19.2435, 72.8465],
    zoom: 15,
    zoomControl: true,
    scrollWheelZoom: false
  });

  currentTileLayer = L.tileLayer(mapTileUrls.voyager, {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(darboMapInstance);

  renderStoreListCards(storesData);
  addStoreMarkersToMap(storesData);
}

function createCustomMapIcon(category) {
  let emoji = '📍';
  if (category === 'flagship') emoji = '🏬';
  else if (category === 'custom') emoji = '🎨';
  else if (category === 'express') emoji = '🚀';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="marker-pulse-wrapper">
        <div class="marker-pulse-ring"></div>
        <div class="marker-icon-box">${emoji}</div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -40]
  });
}

function addStoreMarkersToMap(stores) {
  if (!darboMapInstance) return;

  mapMarkers.forEach(m => darboMapInstance.removeLayer(m.marker));
  mapMarkers = [];

  const bounds = L.latLngBounds();

  stores.forEach(store => {
    const icon = createCustomMapIcon(store.category);
    const marker = L.marker([store.lat, store.lng], { icon: icon }).addTo(darboMapInstance);

    const popupHtml = `
      <div class="map-popup-card">
        <img src="${store.image}" alt="${store.name}" class="map-popup-img" />
        <div class="map-popup-body">
          <span class="map-popup-badge">${store.category.toUpperCase()}</span>
          <h4 class="map-popup-title">${store.name}</h4>
          <p class="map-popup-address">📍 ${store.address}</p>
          <div class="map-popup-meta">
            <span>⏰ ${store.hours}</span>
            <span>🟢 ${store.status}</span>
          </div>
          <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}" target="_blank" class="map-popup-directions-btn">
            Get Directions 🗺️
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { maxWidth: 280, className: 'custom-map-popup' });

    marker.on('click', () => {
      highlightStoreCard(store.id);
    });

    mapMarkers.push({ id: store.id, marker: marker, data: store });
    bounds.extend([store.lat, store.lng]);
  });

  if (stores.length > 0 && darboMapInstance) {
    darboMapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }
}

function renderStoreListCards(stores) {
  const container = document.getElementById('storeCardsList');
  if (!container) return;

  if (stores.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:2rem; color:var(--text-muted);">No hubs found for your search. Try searching "Mumbai", "Delhi", or "400050".</div>`;
    return;
  }

  container.innerHTML = stores.map(store => `
    <div class="store-card-item" id="store-card-${store.id}" onclick="selectStoreOnMap(${store.id})">
      <div class="store-card-header">
        <div class="store-card-title">${store.name}</div>
        <span class="store-card-category">${store.category.toUpperCase()}</span>
      </div>
      <div class="store-card-address">📍 ${store.address}</div>
      <div class="store-card-footer">
        <span class="store-status-chip">🟢 ${store.status}</span>
        <span class="store-phone-chip">📞 ${store.phone}</span>
      </div>
    </div>
  `).join('');
}

function selectStoreOnMap(storeId) {
  const target = storesData.find(s => s.id === storeId);
  if (!target || !darboMapInstance) return;

  darboMapInstance.flyTo([target.lat, target.lng], 14, { duration: 1.2 });

  const markerObj = mapMarkers.find(m => m.id === storeId);
  if (markerObj) {
    markerObj.marker.openPopup();
  }

  highlightStoreCard(storeId);
}

function highlightStoreCard(storeId) {
  document.querySelectorAll('.store-card-item').forEach(card => card.classList.remove('active'));
  const activeCard = document.getElementById(`store-card-${storeId}`);
  if (activeCard) {
    activeCard.classList.add('active');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function filterMapMarkers(category, btnElement) {
  if (btnElement) {
    document.querySelectorAll('.map-tab').forEach(tab => tab.classList.remove('active'));
    btnElement.classList.add('active');
  }

  let filtered = storesData;
  if (category !== 'all') {
    filtered = storesData.filter(s => s.category === category);
  }

  renderStoreListCards(filtered);
  addStoreMarkersToMap(filtered);
}

function switchMapTile(theme, btnElement) {
  if (btnElement) {
    document.querySelectorAll('.map-tile-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
  }

  if (darboMapInstance && currentTileLayer) {
    darboMapInstance.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(mapTileUrls[theme], {
      attribution: '&copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(darboMapInstance);
  }
}

function handleMapSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const msgEl = document.getElementById('mapSearchResultMsg');

  if (!query) {
    if (msgEl) msgEl.innerHTML = '';
    renderStoreListCards(storesData);
    addStoreMarkersToMap(storesData);
    return;
  }

  const matches = storesData.filter(s => 
    s.city.toLowerCase().includes(query) || 
    s.pincode.includes(query) || 
    s.name.toLowerCase().includes(query) ||
    s.address.toLowerCase().includes(query)
  );

  if (matches.length > 0) {
    if (msgEl) msgEl.innerHTML = `<span style="color:#2E7D32; font-weight:700;">⚡ Found ${matches.length} DARBO Hub(s) in your area! 24-48h Express Delivery available.</span>`;
    renderStoreListCards(matches);
    addStoreMarkersToMap(matches);
  } else {
    if (msgEl) msgEl.innerHTML = `<span style="color:#D32F2F; font-weight:700;">No physical hub in "${query}", but Standard Express Shipping (2-3 Days) covers your area!</span>`;
  }
}

function triggerMapSearch() {
  const val = document.getElementById('mapSearchInput')?.value;
  if (val) {
    handleMapSearch({ target: { value: val } });
  }
}

/* Live Tracking Simulator */
function openLiveTrackingModal() {
  const modal = document.getElementById('liveTrackingModal');
  if (modal) {
    modal.classList.add('active');
    setTimeout(() => {
      initMiniTrackingMap();
    }, 250);
  }
}

function closeLiveTrackingModal() {
  const modal = document.getElementById('liveTrackingModal');
  if (modal) {
    modal.classList.remove('active');
  }
  if (trackingAnimTimer) clearInterval(trackingAnimTimer);
}

function initMiniTrackingMap() {
  const container = document.getElementById('trackMiniMap');
  if (!container || typeof L === 'undefined') return;

  if (miniTrackMapInstance) {
    miniTrackMapInstance.remove();
  }

  const routeCoords = [
    [19.0596, 72.8295],
    [19.0620, 72.8330],
    [19.0660, 72.8380],
    [19.0720, 72.8420],
    [19.0760, 72.8480]
  ];

  miniTrackMapInstance = L.map('trackMiniMap', {
    center: [19.0678, 72.8387],
    zoom: 13,
    zoomControl: false
  });

  L.tileLayer(mapTileUrls.voyager, { maxZoom: 19 }).addTo(miniTrackMapInstance);

  const polyline = L.polyline(routeCoords, { color: '#F07167', weight: 4, dashArray: '8, 8' }).addTo(miniTrackMapInstance);
  miniTrackMapInstance.fitBounds(polyline.getBounds(), { padding: [30, 30] });

  L.marker(routeCoords[0], {
    icon: L.divIcon({ html: '🏬', className: 'mini-map-emoji-pin' })
  }).addTo(miniTrackMapInstance).bindPopup('DARBO Hub (Bandra)');

  L.marker(routeCoords[routeCoords.length - 1], {
    icon: L.divIcon({ html: '🏠', className: 'mini-map-emoji-pin' })
  }).addTo(miniTrackMapInstance).bindPopup('Delivery Address');

  const riderIcon = L.divIcon({
    html: '<div class="rider-pulse-pin">🛵</div>',
    className: 'rider-marker-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });

  riderMarker = L.marker(routeCoords[1], { icon: riderIcon }).addTo(miniTrackMapInstance);
}

function startLiveTrackSim() {
  const idVal = document.getElementById('trackOrderIdInput')?.value || 'DARBO-8842';
  const displayEl = document.getElementById('trackDisplayId');
  const etaEl = document.getElementById('trackEta');

  if (displayEl) displayEl.innerText = `#${idVal.toUpperCase()} (Out For Delivery)`;
  showToast(`Live Tracking loaded for order #${idVal}! 🛵`);

  if (!miniTrackMapInstance) {
    initMiniTrackingMap();
    return;
  }

  const steps = [
    [19.0620, 72.8330],
    [19.0640, 72.8350],
    [19.0660, 72.8380],
    [19.0690, 72.8400],
    [19.0720, 72.8420],
    [19.0740, 72.8450],
    [19.0760, 72.8480]
  ];

  let stepIdx = 0;
  if (trackingAnimTimer) clearInterval(trackingAnimTimer);

  trackingAnimTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    if (riderMarker) {
      riderMarker.setLatLng(steps[stepIdx]);
    }
    const minsLeft = Math.max(2, 18 - Math.round(stepIdx * 2.5));
    if (etaEl) etaEl.innerText = `EST. DELIVERY: ${minsLeft} MINS`;
  }, 2000);
}

/* Copy to Clipboard Helper */
function copyToClipboard(text, label = 'Number') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`📋 ${label} copied to clipboard! (${text})`);
    }).catch(() => {
      fallbackCopyText(text, label);
    });
  } else {
    fallbackCopyText(text, label);
  }
}

function fallbackCopyText(text, label) {
  const input = document.createElement('textarea');
  input.value = text;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  showToast(`📋 ${label} copied to clipboard! (${text})`);
}

/* Open Direct Gmail Web Compose */
function openGmailCompose(email = 'darbooffice@gmail.com', subject = 'Inquiry for DARBO', body = 'Hi DARBO Team,\n\nI would like to inquire about...') {
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(gmailUrl, '_blank');
}

