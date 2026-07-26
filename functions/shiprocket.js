/* =======================================================================
   DARBO — Shiprocket Shipping Server Logic
   Handles: Auth Token, Shipment Creation, Order Tracking
   ======================================================================= */

const axios = require('axios');

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external';

/* ---------------------------------------------------------------
   Resolve env vars — Firebase Functions config OR process.env
   --------------------------------------------------------------- */
function getEnv(key) {
  try {
    const config = require('firebase-functions').config();
    if (config.shiprocket && config.shiprocket[key]) return config.shiprocket[key];
  } catch (_) {}
  return process.env[key] || '';
}

const SHIPROCKET_API_TOKEN = getEnv('SHIPROCKET_API_TOKEN') || 'k9ucbE57LOoAyGHgDDdKqe5w@uG0etvR';

/* ---------------------------------------------------------------
   Shared auth token cache
   If API token is provided directly, use it.
   Otherwise, login with email/password to get a token.
   --------------------------------------------------------------- */
let cachedToken = null;
let tokenExpiry = 0;

async function getAuthToken() {
  const now = Date.now();

  /* If a direct API token is configured, always use it */
  if (SHIPROCKET_API_TOKEN) {
    return SHIPROCKET_API_TOKEN;
  }

  /* Return cached token if still valid (with 1-hour buffer) */
  if (cachedToken && now < tokenExpiry - 3600000) {
    return cachedToken;
  }

  /* Login with email/password to get a bearer token */
  try {
    const response = await axios.post(`${SHIPROCKET_BASE}/auth/login`, {
      email: getEnv('SHIPROCKET_EMAIL'),
      password: getEnv('SHIPROCKET_PASSWORD')
    });

    cachedToken = response.data.token;
    tokenExpiry = now + (9 * 24 * 60 * 60 * 1000);

    return cachedToken;

  } catch (err) {
    console.error('Shiprocket auth error:', err.response?.data || err.message);
    throw new Error('Shiprocket authentication failed');
  }
}

function authHeaders(token) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

/* ---------------------------------------------------------------
   createShipment(req, res)
   POST body: {
     orderId,        — DARBO internal order ID
     customerName,
     customerPhone,
     customerEmail,
     shippingAddress, — full address string
     city,
     state,
     pincode,
     weight,         — in grams
     items: [{ name, sku, units, selling_price }]
   }
   Returns: { awb, courier, estimatedDelivery, shipmentId, trackingUrl }
   --------------------------------------------------------------- */
async function createShipment(req, res) {
  try {
    const {
      orderId, customerName, customerPhone, customerEmail,
      shippingAddress, city, state, pincode,
      weight, items
    } = req.body;

    if (!customerName || !customerPhone || !pincode || !items || !items.length) {
      return res.status(400).json({ success: false, error: 'Missing required shipment fields' });
    }

    const token = await getAuthToken();

    /* Step 1: Create order on Shiprocket */
    const orderPayload = {
      order_id: orderId || `DRB-${Date.now()}`,
      order_date: new Date().toISOString().split('T')[0],
      pickup_location: 'DARBO Studio',
      billing_customer_name: customerName,
      billing_address: shippingAddress || city,
      billing_city: city || 'Mumbai',
      billing_pincode: pincode,
      billing_state: state || 'Maharashtra',
      billing_country: 'India',
      billing_phone: customerPhone,
      billing_email: customerEmail || '',
      shipping_is_billing: true,
      order_items: items.map(item => ({
        name: item.name,
        sku: item.sku || `DRB-${Date.now()}`,
        units: item.units || 1,
        selling_price: item.selling_price || 799,
        discount: item.discount || 0,
        tax: item.tax || 0,
        hsn: item.hsn || 6109
      })),
      payment_method: 'Prepaid',
      sub_total: items.reduce((sum, i) => sum + ((i.selling_price || 799) * (i.units || 1)), 0),
      length: 30,
      breadth: 25,
      height: 5,
      weight: weight || 300
    };

    const orderRes = await axios.post(`${SHIPROCKET_BASE}/orders/create/adhoc`, orderPayload, authHeaders(token));
    const shiprocketOrderId = orderRes.data.order_id;

    /* Step 2: Assign courier and get AWB */
    const assignRes = await axios.post(`${SHIPROCKET_BASE}/courier/assign`, {
      id: shiprocketOrderId
    }, authHeaders(token));

    const awb = assignRes.data.response?.data?.awb || null;
    const courier = assignRes.data.response?.data?.courier_company || 'Standard Delivery';

    /* Step 3: Ship the order to generate tracking */
    if (awb) {
      await axios.post(`${SHIPROCKET_BASE}/courier/generate/shipment`, {
        awb,
        id: shiprocketOrderId
      }, authHeaders(token));
    }

    /* Calculate estimated delivery (3-5 business days from now) */
    const estDate = new Date();
    estDate.setDate(estDate.getDate() + 5);
    const estimatedDelivery = estDate.toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return res.status(200).json({
      success: true,
      awb: awb || 'PENDING',
      courier: courier,
      estimatedDelivery: estimatedDelivery,
      shipmentId: shiprocketOrderId,
      trackingUrl: awb ? `https://shiprocket.co/tracking/${awb}` : null
    });

  } catch (err) {
    console.error('Shiprocket createShipment error:', err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message || 'Shipment creation failed'
    });
  }
}

/* ---------------------------------------------------------------
   trackOrder(req, res)
   GET query: ?awb=XXXXXXXXXX
   Returns:  { status, currentLocation, expectedDelivery, checkpoints[] }
   --------------------------------------------------------------- */
async function trackOrder(req, res) {
  try {
    const { awb } = req.query;

    if (!awb) {
      return res.status(400).json({ success: false, error: 'AWB number is required' });
    }

    const token = await getAuthToken();

    const trackRes = await axios.get(`${SHIPROCKET_BASE}/courier/track/awb/${awb}`, authHeaders(token));

    const tracking = trackRes.data;

    /* Normalize tracking data from Shiprocket response */
    const shipments = tracking?.tracking_data?.shipment_track || [];
    const latest = shipments.length > 0 ? shipments[shipments.length - 1] : null;

    const checkpoints = shipments.map(s => ({
      status: s.status || 'Unknown',
      location: s.current_location || s.location || '',
      timestamp: s.awb_delivered_date || s.scan_date || s.current_timestamp || '',
      activity: s.activity || ''
    }));

    return res.status(200).json({
      success: true,
      status: latest?.status || tracking?.tracking_data?.shipment_track?.[0]?.status || 'No tracking data',
      currentLocation: latest?.current_location || latest?.location || '',
      expectedDelivery: latest?.edd || tracking?.tracking_data?.etd || '',
      awb: awb,
      checkpoints: checkpoints
    });

  } catch (err) {
    console.error('Shiprocket trackOrder error:', err.response?.data || err.message);
    return res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message || 'Tracking fetch failed'
    });
  }
}

module.exports = { createShipment, trackOrder };
