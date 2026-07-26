/* =======================================================================
   DARBO — Razorpay Payment Server Logic
   Handles: Order Creation + Payment Signature Verification

   Security Rules:
   - KEY_SECRET never reaches the frontend
   - Minimum amount enforced: 100 paise (₹1)
   - HMAC-SHA256 signature verification on every payment
   ======================================================================= */

const Razorpay = require('razorpay');
const crypto = require('crypto');

/* ---------------------------------------------------------------
   Resolve env vars — Firebase Functions config OR process.env
   In production: firebase functions:config:set razorpay.key_id="xxx" razorpay.key_secret="xxx"
   In local dev: functions/.env loaded by firebase-functions
   --------------------------------------------------------------- */
function getEnv(key) {
  /* Firebase Functions v2: config() is available */
  try {
    const config = require('firebase-functions').config();
    if (config.razorpay && config.razorpay[key]) return config.razorpay[key];
  } catch (_) { /* not in Cloud Functions runtime */ }
  return process.env[key] || '';
}

const RAZORPAY_KEY_ID = getEnv('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = getEnv('RAZORPAY_KEY_SECRET');

/* ---------------------------------------------------------------
   Lazy-init Razorpay instance
   --------------------------------------------------------------- */
let razorpayInstance = null;

function getRazorpay() {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
  }
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET
    });
  }
  return razorpayInstance;
}

/* ===============================================================
   STEP 1 — createOrder
   POST /api/create-order

   Request body:
     { amount (paise), currency, receipt }

   Response:
     { success: true, orderId, amount, currency, key_id }
     OR
     { success: false, error: "..." }

   Minimum amount: 100 paise = ₹1
   =============================================================== */
async function createOrder(req, res) {
  try {
    const { amount, currency, receipt } = req.body;

    /* --- Validate amount (minimum 100 paise = ₹1) --- */
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, error: 'Amount is required' });
    }

    const amountNum = Number(amount);

    if (isNaN(amountNum) || amountNum < 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Minimum payment is ₹1 (100 paise).'
      });
    }

    /* --- Check credentials are configured --- */
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials missing from environment');
      return res.status(500).json({
        success: false,
        error: 'Payment gateway not configured. Please contact support.'
      });
    }

    /* --- Create order via Razorpay SDK --- */
    const rp = getRazorpay();

    const order = await rp.orders.create({
      amount: Math.round(amountNum),
      currency: currency || 'INR',
      receipt: receipt || `darbo_${Date.now()}`,
      notes: {}
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error('Razorpay createOrder error:', err);

    /* Handle specific Razorpay errors */
    if (err.statusCode === 401) {
      return res.status(500).json({
        success: false,
        error: 'Payment gateway authentication failed. Check API keys.'
      });
    }

    return res.status(500).json({
      success: false,
      error: err.message || 'Failed to create payment order'
    });
  }
}

/* ===============================================================
   STEP 3 — verifyPayment
   POST /api/verify-payment

   Request body:
     { razorpay_order_id, razorpay_payment_id, razorpay_signature }

   Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
   Compare generated signature with razorpay_signature.

   CRITICAL: Do NOT mark order as paid if signature mismatch.
   =============================================================== */
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    /* --- Validate required fields --- */
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment verification fields (order_id, payment_id, signature)'
      });
    }

    /* --- Check credentials --- */
    if (!RAZORPAY_KEY_SECRET) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment verification service not configured'
      });
    }

    /* --- Build expected HMAC signature --- */
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    /* --- Compare signatures (constant-time comparison) --- */
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    if (!isValid) {
      /* CRITICAL: Signature mismatch — do NOT mark as paid */
      console.error('Payment signature mismatch!', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
      return res.status(400).json({
        success: false,
        error: 'Payment signature verification failed. Payment not confirmed.'
      });
    }

    /* --- Signature valid — payment confirmed --- */
    return res.status(200).json({
      success: true,
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

  } catch (err) {
    console.error('Razorpay verifyPayment error:', err);
    return res.status(500).json({
      success: false,
      error: 'Payment verification failed due to server error'
    });
  }
}

module.exports = { createOrder, verifyPayment };
