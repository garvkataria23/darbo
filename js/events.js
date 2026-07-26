/* =======================================================================
   DARBO — Events / Festivals Page Logic
   Ganesh Chaturthi | Independence Day | Raksha Bandhan | Onam
   ======================================================================= */

/* ---------------------------------------------------------------
   Festival Data — dates and product collections
   --------------------------------------------------------------- */
const festivals = [
  {
    id: 'ganesh-chaturthi',
    name: 'Ganesh Chaturthi',
    tagline: 'Celebrate Bappa with streetwear that vibes with devotion. Bold Ganpati prints, modak motifs, and divine drips.',
    date: '2026-08-26', /* Adjust to current year's date */
    themeClass: 'festival-ganesh',
    eyebrow: 'Festival Collection',
    badgeColor: '#FF6F00',
    products: [
      { title: 'Bappa Morya Oversized Tee', price: 799, mrp: 999, image: 'images/custom_tee_mockup.jpg', tag: 'GANESH SPECIAL' },
      { title: 'Modak Mood Hoodie', price: 1299, mrp: 1599, image: 'images/create_reality_hoodie.jpg', tag: 'GANESH SPECIAL' },
      { title: 'Divine Drip Printed Tee', price: 699, mrp: 899, image: 'images/chill_mode_tee.jpg', tag: 'GANESH SPECIAL' },
      { title: 'Elephant God Street Tee', price: 799, mrp: 999, image: 'images/good_vibes_tee.jpg', tag: 'GANESH SPECIAL' },
    ]
  },
  {
    id: 'independence-day',
    name: 'Independence Day',
    tagline: 'Wear your pride. Tricolor streetwear that screams patriotism with style — saffron, white, green, and bold.',
    date: '2026-08-15',
    themeClass: 'festival-independence',
    eyebrow: 'Proud Indian Collection',
    badgeColor: '#FF9933',
    products: [
      { title: 'Tricolor Wave Tee', price: 699, mrp: 899, image: 'images/stay_wild_tee.jpg', tag: 'TRICOLOR' },
      { title: 'Proud Indian Hoodie', price: 1299, mrp: 1599, image: 'images/create_reality_hoodie.jpg', tag: 'INDIA PRIDE' },
      { title: 'Freedom Street Oversized', price: 799, mrp: 999, image: 'images/chill_mode_tee.jpg', tag: 'FREEDOM DROP' },
      { title: 'Azadi Print Tee', price: 699, mrp: 899, image: 'images/meme_collection.jpg', tag: 'TRICOLOR' },
    ]
  },
  {
    id: 'raksha-bandhan',
    name: 'Raksha Bandhan',
    tagline: 'Match with your sibling. Coordinated combo tees and hoodies that celebrate the bond of love and protection.',
    date: '2026-08-09',
    themeClass: 'festival-raksha',
    eyebrow: 'Sibling Love Collection',
    badgeColor: '#E91E63',
    products: [
      { title: 'Best Sibling Duo Tee (Set of 2)', price: 1299, mrp: 1798, image: 'images/good_vibes_tee.jpg', tag: 'COMBO DEAL' },
      { title: 'Bro-Sis Hoodie Set', price: 2199, mrp: 2998, image: 'images/create_reality_hoodie.jpg', tag: 'COMBO DEAL' },
      { title: 'Rakhi Vibes Printed Tee', price: 699, mrp: 899, image: 'images/stay_wild_tee.jpg', tag: 'RAKHI SPECIAL' },
      { title: 'Protected & Loved Hoodie', price: 1299, mrp: 1599, image: 'images/make_memories_hoodie.jpg', tag: 'RAKHI SPECIAL' },
    ]
  },
  {
    id: 'onam',
    name: 'Onam',
    tagline: 'Pookalam patterns meet street culture. Gold, green, and traditional Kerala aesthetics in modern streetwear.',
    date: '2026-09-05',
    themeClass: 'festival-onam',
    eyebrow: 'Kerala Collection',
    badgeColor: '#2E7D32',
    products: [
      { title: 'Pookalam Pattern Tee', price: 699, mrp: 899, image: 'images/custom_tee_mockup.jpg', tag: 'ONAM SPECIAL' },
      { title: 'Kerala Gold Oversized', price: 799, mrp: 999, image: 'images/chill_mode_tee.jpg', tag: 'ONAM SPECIAL' },
      { title: 'Harvest Festival Hoodie', price: 1299, mrp: 1599, image: 'images/create_reality_hoodie.jpg', tag: 'ONAM SPECIAL' },
      { title: 'Onam Vibes Printed Tee', price: 699, mrp: 899, image: 'images/good_vibes_tee.jpg', tag: 'ONAM SPECIAL' },
    ]
  }
];

/* ---------------------------------------------------------------
   Init page
   --------------------------------------------------------------- */
function initEventsPage() {
  renderFestivalSections();
  startAllCountdowns();
  initScrollReveal();
  highlightActiveNav();
}

/* ---------------------------------------------------------------
   Render all festival sections into the DOM
   --------------------------------------------------------------- */
function renderFestivalSections() {
  const container = document.getElementById('festivalSections');
  if (!container) return;

  container.innerHTML = festivals.map(fest => `
    <section id="${fest.id}" class="festival-section ${fest.themeClass}">
      <div class="container">

        <!-- Festival Banner -->
        <div class="festival-banner festival-reveal">
          <div class="banner-bg"></div>
          <div class="banner-content">
            <div class="festival-eyebrow">${fest.eyebrow}</div>
            <h2 class="festival-name">${fest.name}</h2>
            <p class="festival-tagline">${fest.tagline}</p>

            <!-- Countdown -->
            <div class="countdown-container" id="countdown-${fest.id}">
              <div class="countdown-box">
                <div class="number" id="cd-${fest.id}-days">--</div>
                <div class="label">Days</div>
              </div>
              <div class="countdown-box">
                <div class="number" id="cd-${fest.id}-hours">--</div>
                <div class="label">Hours</div>
              </div>
              <div class="countdown-box">
                <div class="number" id="cd-${fest.id}-mins">--</div>
                <div class="label">Mins</div>
              </div>
              <div class="countdown-box">
                <div class="number" id="cd-${fest.id}-secs">--</div>
                <div class="label">Secs</div>
              </div>
            </div>

            <a href="#${fest.id}-products" class="festival-cta">
              Shop ${fest.name} Collection →
            </a>
          </div>
        </div>

        <!-- Products Grid -->
        <div id="${fest.id}-products" class="festival-products-grid festival-reveal">
          ${fest.products.map((prod, i) => `
            <div class="festival-product-card">
              <div class="product-img-wrap">
                <span class="festival-badge" style="background:${fest.badgeColor}; color:#fff;">${prod.tag}</span>
                <img src="${prod.image}" alt="${prod.title}" loading="lazy" />
              </div>
              <div class="product-info">
                <div class="product-title">${prod.title}</div>
                <div class="product-price">
                  ₹${prod.price}
                  <span class="original">₹${prod.mrp}</span>
                </div>
                <button class="add-to-cart-btn" onclick="addFestivalProductToCart('${fest.id}', ${i})">
                  Add to Bag
                </button>
              </div>
            </div>
          `).join('')}
        </div>

      </div>
    </section>
  `).join('');

  /* Re-initialize Lucide icons */
  if (window.lucide) lucide.createIcons();
}

/* ---------------------------------------------------------------
   Add festival product to cart (using main.js cart logic)
   --------------------------------------------------------------- */
function addFestivalProductToCart(festivalId, productIndex) {
  const fest = festivals.find(f => f.id === festivalId);
  if (!fest) return;
  const prod = fest.products[productIndex];
  if (!prod) return;

  /* Use main.js addToCart if available, otherwise manual */
  if (typeof addToCart === 'function' && window.cart) {
    /* Generate a unique ID based on festival + index */
    const fakeId = 9000 + festivals.indexOf(fest) * 100 + productIndex;
    window.cart.push({
      id: fakeId,
      title: prod.title,
      price: prod.price,
      color: 'Festival Edition',
      size: 'L',
      qty: 1,
      image: prod.image
    });
    if (typeof updateCartUI === 'function') updateCartUI();
    if (typeof showToast === 'function') showToast(`${prod.title} added to bag! 🎉`);
    if (typeof toggleCart === 'function') toggleCart();
  } else {
    /* Fallback: save to localStorage */
    const cart = JSON.parse(localStorage.getItem('darbo_cart') || '[]');
    cart.push({
      id: Date.now(),
      title: prod.title,
      price: prod.price,
      color: 'Festival Edition',
      size: 'L',
      qty: 1,
      image: prod.image
    });
    localStorage.setItem('darbo_cart', JSON.stringify(cart));
    if (typeof showToast === 'function') showToast(`${prod.title} added to bag! 🎉`);
  }
}

/* ---------------------------------------------------------------
   Countdown Timer — calculates time until target date
   --------------------------------------------------------------- */
function startAllCountdowns() {
  festivals.forEach(fest => {
    startCountdown(fest.id, fest.date);
  });

  /* Update every second */
  setInterval(() => {
    festivals.forEach(fest => {
      updateCountdownDisplay(fest.id, fest.date);
    });
  }, 1000);
}

function startCountdown(festivalId, targetDate) {
  updateCountdownDisplay(festivalId, targetDate);
}

function updateCountdownDisplay(festivalId, targetDate) {
  const now = new Date();
  const target = new Date(targetDate + 'T00:00:00+05:30'); /* IST */
  let diff = target - now;

  /* If festival has passed this year, target next year */
  if (diff < 0) {
    const nextYear = target;
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    diff = nextYear - now;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);

  const daysEl = document.getElementById(`cd-${festivalId}-days`);
  const hoursEl = document.getElementById(`cd-${festivalId}-hours`);
  const minsEl = document.getElementById(`cd-${festivalId}-mins`);
  const secsEl = document.getElementById(`cd-${festivalId}-secs`);

  if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
  if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
  if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
  if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
}

/* ---------------------------------------------------------------
   Scroll Reveal Animation
   --------------------------------------------------------------- */
function initScrollReveal() {
  const elements = document.querySelectorAll('.festival-reveal');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  elements.forEach(el => observer.observe(el));
}

/* ---------------------------------------------------------------
   Highlight active nav based on scroll position
   --------------------------------------------------------------- */
function highlightActiveNav() {
  const sections = festivals.map(f => f.id);
  const navLinks = document.querySelectorAll('.events-nav a');

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY + 200;

    sections.forEach((sectionId, i) => {
      const section = document.getElementById(sectionId);
      if (!section) return;

      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;

      if (scrollPos >= top && scrollPos < bottom) {
        navLinks.forEach(link => link.classList.remove('active'));
        if (navLinks[i]) navLinks[i].classList.add('active');
      }
    });
  });
}

/* ---------------------------------------------------------------
   Smooth scroll to festival section
   --------------------------------------------------------------- */
function scrollToFestival(festivalId) {
  const el = document.getElementById(festivalId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ---------------------------------------------------------------
   Auto-init on page load
   --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  initEventsPage();
  if (window.lucide) lucide.createIcons();
});
