/* =======================================================================
   DARBO — Razorpay Standard Checkout — Frontend Logic

   Flow:
     1. User fills shipping form, clicks "Pay"
     2. Frontend calls POST /api/create-order → gets order_id
     3. Frontend opens Razorpay checkout modal with order_id
     4. User completes payment inside modal
     5. On success: frontend sends {order_id, payment_id, signature} to /api/verify-payment
     6. Backend verifies HMAC-SHA256 signature → returns success
     7. Frontend shows confirmation / redirects

   Security:
     - KEY_ID comes from backend API response (never hardcoded in source)
     - KEY_SECRET never reaches the frontend
   ======================================================================= */

/* ================================================================
   CONFIGURATION — Cloud Function URLs
   Replace these with your actual deployed function URLs after
   running: firebase deploy --only functions
   ================================================================ */
const API = {
  createOrder:   'https://us-central1-darbo-e0752.cloudfunctions.net/razorpayCreateOrder',
  verifyPayment: 'https://us-central1-darbo-e0752.cloudfunctions.net/razorpayVerifyPayment',
  createShipment:'https://us-central1-darbo-e0752.cloudfunctions.net/shiprocketCreateShipment'
};

/* ================================================================
   HELPERS
   ================================================================ */

/** Calculate estimated delivery date (3-5 business days from now) */
function calculateDeliveryDate() {
  const now = new Date();
  let days = 5;
  while (days > 0) {
    now.setDate(now.getDate() + 1);
    const d = now.getDay();
    if (d !== 0 && d !== 6) days--;
  }
  return now.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Generate a unique DARBO order ID (DRB-XXXXXX) */
function generateDarboOrderId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'DRB-';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/* ================================================================
   CHECKOUT PAGE INIT
   ================================================================ */
function initCheckoutPage() {
  const cartData = JSON.parse(localStorage.getItem('darbo_cart') || '[]');

  if (cartData.length === 0) {
    window.location.href = 'index.html';
    return;
  }

  renderCheckoutSummary(cartData);
  renderDeliveryEstimate();
  updatePayButtonAmount();
}

/** Render order items in the summary sidebar */
function renderCheckoutSummary(cartData) {
  const summaryEl = document.getElementById('checkoutOrderSummary');
  if (!summaryEl) return;

  const subtotal = cartData.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const shipping = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shipping;

  summaryEl.innerHTML = cartData.map(item => `
    <div style="display:flex; gap:1rem; align-items:center; padding:0.75rem 0; border-bottom:1px solid var(--border-light);">
      <img src="${item.image}" alt="${item.title}" style="width:60px; height:60px; border-radius:var(--radius-sm); object-fit:cover; border:1px solid var(--border-light);" />
      <div style="flex:1; min-width:0;">
        <div style="font-weight:700; font-size:0.9rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.title}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${item.color || ''} / ${item.size || 'L'} × ${item.qty}</div>
      </div>
      <div style="font-weight:800; font-family:var(--font-heading); font-size:0.95rem;">₹${item.price * item.qty}</div>
    </div>
  `).join('');

  document.getElementById('checkoutSubtotal').textContent = `₹${subtotal}`;
  document.getElementById('checkoutShipping').textContent = shipping === 0 ? 'FREE' : `₹${shipping}`;
  document.getElementById('checkoutTotal').textContent = `₹${total}`;

  /* Store for Razorpay (in rupees, we convert to paise when calling API) */
  window._checkoutTotal = total;
  window._checkoutCart = cartData;
}

/** Show estimated delivery date */
function renderDeliveryEstimate() {
  const el = document.getElementById('checkoutDeliveryDate');
  if (el) el.textContent = calculateDeliveryDate();
}

/** Update pay button to show the amount */
function updatePayButtonAmount() {
  const btn = document.getElementById('payButton');
  if (btn && window._checkoutTotal) {
    btn.textContent = `Pay ₹${window._checkoutTotal} Securely →`;
  }
}

/* ================================================================
   FORM VALIDATION
   ================================================================ */
function validateShippingForm() {
  const name    = document.getElementById('shippingName')?.value?.trim();
  const phone   = document.getElementById('shippingPhone')?.value?.trim();
  const email   = document.getElementById('shippingEmail')?.value?.trim();
  const address = document.getElementById('shippingAddress')?.value?.trim();
  const city    = document.getElementById('shippingCity')?.value?.trim();
  const pincode = document.getElementById('shippingPincode')?.value?.trim();
  const state   = document.getElementById('shippingState')?.value?.trim();

  if (!name)                          return { valid: false, error: 'Please enter your full name' };
  if (!phone || phone.length < 10)    return { valid: false, error: 'Please enter a valid 10-digit phone number' };
  if (!email || !email.includes('@')) return { valid: false, error: 'Please enter a valid email address' };
  if (!address)                       return { valid: false, error: 'Please enter your shipping address' };
  if (!city)                          return { valid: false, error: 'Please enter your city' };
  if (!pincode || pincode.length !== 6) return { valid: false, error: 'Please enter a valid 6-digit pincode' };
  if (!state)                         return { valid: false, error: 'Please select your state' };

  return { valid: true, data: { name, phone, email, address, city, pincode, state } };
}

/* ================================================================
   UI STATE HELPERS
   ================================================================ */

/** Show/hide error banner */
function showFormError(msg) {
  const el = document.getElementById('checkoutError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 6000);
}

/** Toggle pay button loading state */
function setPayButtonLoading(loading) {
  const btn = document.getElementById('payButton');
  if (!btn) return;

  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="pay-btn-spinner"></span> Processing...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
  } else {
    btn.disabled = false;
    btn.textContent = `Pay ₹${window._checkoutTotal || 0} Securely →`;
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }
}

/* ================================================================
   MAIN PAYMENT FLOW
   ================================================================ */
async function initiateRazorpayPayment() {

  /* --- Validate form --- */
  const validation = validateShippingForm();
  if (!validation.valid) {
    showFormError(validation.error);
    return;
  }

  const shippingInfo = validation.data;
  const amountRupees = window._checkoutTotal;
  const cartData = window._checkoutCart;

  if (!amountRupees || amountRupees <= 0) {
    showFormError('Your cart is empty or the amount is invalid.');
    return;
  }

  /* --- Minimum amount check (Razorpay requires >= 100 paise) --- */
  const amountPaise = Math.round(amountRupees * 100);
  if (amountPaise < 100) {
    showFormError('Minimum payment amount is ₹1.');
    return;
  }

  setPayButtonLoading(true);

  try {
    /* ===========================================================
       STEP 2: Call backend to create Razorpay order
       =========================================================== */
    const createRes = await fetch(API.createOrder, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: generateDarboOrderId()
      })
    });

    const orderData = await createRes.json();

    if (!orderData.success) {
      throw new Error(orderData.error || 'Failed to create payment order');
    }

    /* ===========================================================
       STEP 3: Open Razorpay Standard Checkout modal
       =========================================================== */
    const options = {
      key: orderData.key_id,                               /* From backend — never hardcoded */
      amount: orderData.amount,                             /* In paise */
      currency: orderData.currency || 'INR',
      name: 'DARBO — Own Your Story',
      description: `Order — ${cartData.length} item(s)`,
      order_id: orderData.orderId,                          /* Razorpay order_id from backend */

      /* Called on successful payment */
      handler: async function (response) {
        await handlePaymentSuccess(response, shippingInfo, cartData);
      },

      /* Prefill customer info from shipping form */
      prefill: {
        name: shippingInfo.name,
        email: shippingInfo.email,
        contact: shippingInfo.phone
      },

      /* Additional notes (sent with order) */
      notes: {
        address: shippingInfo.address,
        city: shippingInfo.city,
        pincode: shippingInfo.pincode
      },

      /* Theme matching DARBO brand */
      theme: {
        color: '#F07167',
        backdrop_color: 'rgba(0,0,0,0.6)'
      },

      /* Handle modal dismiss (user closes without paying) */
      modal: {
        ondismiss: function () {
          setPayButtonLoading(false);
          showFormError('Payment cancelled. Please try again when ready.');
        }
      }
    };

    const rzp = new Razorpay(options);

    /* Handle payment failure event */
    rzp.on('payment.failed', function (response) {
      setPayButtonLoading(false);
      const desc = response.error?.description || 'Payment failed. Please try again.';
      const code = response.error?.code ? ` (${response.error.code})` : '';
      showFormError(desc + code);
    });

    /* Open the modal */
    rzp.open();

  } catch (err) {
    console.error('Payment initiation error:', err);
    setPayButtonLoading(false);
    showFormError(err.message || 'Something went wrong. Please try again.');
  }
}

/* ================================================================
   HANDLE SUCCESSFUL PAYMENT
   ================================================================ */
async function handlePaymentSuccess(paymentResponse, shippingInfo, cartData) {
  try {
    /* ===========================================================
       STEP 4: Verify payment signature on backend
       =========================================================== */
    const verifyRes = await fetch(API.verifyPayment, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature
      })
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success || !verifyData.verified) {
      throw new Error(verifyData.error || 'Payment verification failed');
    }

    /* --- Payment verified — save order --- */
    const darboOrderId = generateDarboOrderId();
    const orderRecord = {
      id: darboOrderId,
      razorpayOrderId: paymentResponse.razorpay_order_id,
      razorpayPaymentId: paymentResponse.razorpay_payment_id,
      items: cartData,
      shipping: shippingInfo,
      total: window._checkoutTotal,
      status: 'paid',
      trackingStatus: 'processing',
      createdAt: new Date().toISOString(),
      deliveryDate: calculateDeliveryDate()
    };

    /* Save to Firestore if user is logged in */
    if (window.darboCurrentUser && window.firebaseSaveOrder) {
      await window.firebaseSaveOrder(darboOrderId, orderRecord);
    }

    /* Save to localStorage */
    const existingOrders = JSON.parse(localStorage.getItem('darboOrders') || '[]');
    existingOrders.push(orderRecord);
    localStorage.setItem('darboOrders', JSON.stringify(existingOrders));

    /* --- Try to create Shiprocket shipment (non-critical) --- */
    let shipmentData = null;
    try {
      const shipRes = await fetch(API.createShipment, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: darboOrderId,
          customerName: shippingInfo.name,
          customerPhone: shippingInfo.phone,
          customerEmail: shippingInfo.email,
          shippingAddress: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          pincode: shippingInfo.pincode,
          weight: 300,
          items: cartData.map(item => ({
            name: item.title,
            sku: `DRB-${item.id}`,
            units: item.qty,
            selling_price: item.price
          }))
        })
      });
      shipmentData = await shipRes.json();
      if (shipmentData.success) {
        orderRecord.awb = shipmentData.awb;
        orderRecord.courier = shipmentData.courier;
        orderRecord.estimatedDelivery = shipmentData.estimatedDelivery;
        orderRecord.trackingUrl = shipmentData.trackingUrl;
        orderRecord.trackingStatus = 'shipped';
      }
    } catch (shipErr) {
      console.warn('Shiprocket shipment creation skipped:', shipErr);
    }

    /* --- Clear cart and redirect to success --- */
    localStorage.removeItem('darbo_cart');

    if (window.darboCurrentUser && window.firebaseSaveOrder) {
      await window.firebaseSaveOrder(darboOrderId, orderRecord);
    }

    const params = new URLSearchParams({
      orderId: darboOrderId,
      paymentId: paymentResponse.razorpay_payment_id,
      total: window._checkoutTotal,
      delivery: orderRecord.estimatedDelivery || calculateDeliveryDate(),
      awb: shipmentData?.awb || ''
    });

    window.location.href = `checkout.html?status=success&${params.toString()}`;

  } catch (err) {
    console.error('Order finalization error:', err);
    setPayButtonLoading(false);
    showFormError(
      'Payment received but confirmation failed. ' +
      'Your Payment ID: ' + (paymentResponse.razorpay_payment_id || 'N/A') +
      '. Contact support with this ID.'
    );
  }
}

/* ================================================================
   ORDER CONFIRMATION SCREEN (after redirect)
   ================================================================ */
function showOrderConfirmation() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('status') !== 'success') return false;

  const formEl = document.getElementById('checkoutForm');
  const successEl = document.getElementById('orderSuccessCard');

  if (formEl) formEl.style.display = 'none';
  if (successEl) successEl.style.display = 'block';

  const orderId   = params.get('orderId');
  const paymentId = params.get('paymentId');
  const total     = params.get('total');
  const delivery  = params.get('delivery');
  const awb       = params.get('awb');

  if (document.getElementById('successOrderId'))   document.getElementById('successOrderId').textContent = orderId;
  if (document.getElementById('successPaymentId')) document.getElementById('successPaymentId').textContent = paymentId ? paymentId.substring(0, 20) + '...' : '';
  if (document.getElementById('successTotal'))     document.getElementById('successTotal').textContent = '₹' + total;
  if (document.getElementById('successDelivery'))  document.getElementById('successDelivery').textContent = delivery;

  if (awb && awb !== 'PENDING' && document.getElementById('successAWB')) {
    document.getElementById('successAWB').textContent = awb;
    const awbBox = document.getElementById('awbContainer');
    if (awbBox) awbBox.style.display = 'flex';
  }

  localStorage.removeItem('darbo_cart');
  return true;
}

/** WhatsApp order confirmation */
function sendWhatsAppConfirmation() {
  const params = new URLSearchParams(window.location.search);
  const msg = encodeURIComponent(
    `Hi DARBO! 👋\n\n` +
    `I just placed an order!\n` +
    `📦 Order ID: ${params.get('orderId') || 'N/A'}\n` +
    `💰 Total: ₹${params.get('total') || 'N/A'}\n` +
    `🚚 Expected Delivery: ${params.get('delivery') || 'N/A'}\n\n` +
    `Please confirm my order. Thank you!`
  );
  window.open(`https://wa.me/918355983699?text=${msg}`, '_blank');
}

/* ================================================================
   AUTO-INIT ON PAGE LOAD
   ================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  const isConfirmation = showOrderConfirmation();
  if (!isConfirmation) {
    initCheckoutPage();
  }
  if (window.lucide) lucide.createIcons();
});
