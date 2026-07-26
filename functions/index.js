/* =======================================================================
   DARBO — Firebase Cloud Functions Entry Point
   Exports: razorpayAPI, shiprocketAPI
   ======================================================================= */

const { onRequest } = require('firebase-functions/v2/https');
const cors = require('cors')({ origin: true });

const { createOrder, verifyPayment } = require('./razorpay');
const { createShipment, trackOrder } = require('./shiprocket');

/* Helper: wrap handler with CORS */
function withCors(handler) {
  return onRequest(async (req, res) => {
    return cors(req, res, () => handler(req, res));
  });
}

/* ---------------------------------------------------------------
   Razorpay Endpoints
   --------------------------------------------------------------- */
exports.razorpayCreateOrder = withCors(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return createOrder(req, res);
});

exports.razorpayVerifyPayment = withCors(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return verifyPayment(req, res);
});

/* ---------------------------------------------------------------
   Shiprocket Endpoints
   --------------------------------------------------------------- */
exports.shiprocketCreateShipment = withCors(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return createShipment(req, res);
});

exports.shiprocketTrackOrder = withCors(async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return trackOrder(req, res);
});
