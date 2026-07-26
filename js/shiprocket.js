/* =======================================================================
   DARBO — Shiprocket Frontend Tracking Logic
   Handles: Real AWB tracking, delivery date calculation, tracking UI
   ======================================================================= */

const SHIPROCKET_FUNCTIONS = {
  trackOrder: 'https://us-central1-darbo-e0752.cloudfunctions.net/shiprocketTrackOrder'
};

/* ---------------------------------------------------------------
   Calculate estimated delivery date (3-5 business days)
   --------------------------------------------------------------- */
function getEstimatedDeliveryDate() {
  const now = new Date();
  let businessDays = 5;
  while (businessDays > 0) {
    now.setDate(now.getDate() + 1);
    const day = now.getDay();
    if (day !== 0 && day !== 6) businessDays--;
  }
  return now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/* ---------------------------------------------------------------
   Format short delivery date (for product cards)
   --------------------------------------------------------------- */
function getShortDeliveryDate() {
  const now = new Date();
  let businessDays = 3;
  while (businessDays > 0) {
    now.setDate(now.getDate() + 1);
    const day = now.getDay();
    if (day !== 0 && day !== 6) businessDays--;
  }
  return now.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/* ---------------------------------------------------------------
   Track order via Shiprocket AWB number
   --------------------------------------------------------------- */
async function trackDarboOrder(awbNumber) {
  if (!awbNumber || awbNumber === 'PENDING') {
    return {
      success: false,
      error: 'Tracking number not yet generated. Please try again later.'
    };
  }

  try {
    const response = await fetch(`${SHIPROCKET_FUNCTIONS.trackOrder}?awb=${encodeURIComponent(awbNumber)}`);
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Tracking fetch error:', err);
    return {
      success: false,
      error: 'Unable to fetch tracking data. Please try again.'
    };
  }
}

/* ---------------------------------------------------------------
   Map Shiprocket status to UI step (1-4)
   --------------------------------------------------------------- */
function mapStatusToStep(status) {
  if (!status) return 0;
  const s = status.toLowerCase();

  if (s.includes('delivered')) return 4;
  if (s.includes('out for delivery') || s.includes('out_for_delivery')) return 3;
  if (s.includes('in transit') || s.includes('transit') || s.includes('rider') || s.includes('dispatched') || s.includes('shipped')) return 2;
  if (s.includes('picked') || s.includes('manifested') || s.includes('pending') || s.includes('processing') || s.includes('placed')) return 1;
  return 0;
}

/* ---------------------------------------------------------------
   Get step label text
   --------------------------------------------------------------- */
function getStepLabel(step) {
  const labels = {
    0: 'Order Received',
    1: 'Order Placed',
    2: 'Shipped',
    3: 'Out for Delivery',
    4: 'Delivered'
  };
  return labels[step] || 'Processing';
}

/* ---------------------------------------------------------------
   Render real tracking data into the modal
   --------------------------------------------------------------- */
function renderRealTracking(trackingData, orderId) {
  const statusCard = document.getElementById('trackingStatusCard');
  const displayId = document.getElementById('trackDisplayId');
  const etaPill = document.getElementById('trackEta');
  const progressBar = statusCard?.querySelector('.tracking-progress-bar');

  if (!statusCard) return;

  if (!trackingData.success) {
    /* Show error state */
    if (displayId) {
      displayId.textContent = orderId ? `#${orderId}` : '#Order';
      displayId.style.color = '#DC2626';
    }
    if (etaPill) {
      etaPill.textContent = trackingData.error || 'Tracking unavailable';
      etaPill.style.background = '#FEF2F2';
      etaPill.style.color = '#DC2626';
    }
    return;
  }

  const currentStep = mapStatusToStep(trackingData.status);

  /* Update header */
  if (displayId) {
    displayId.textContent = `#${orderId} (${getStepLabel(currentStep)})`;
    displayId.style.color = currentStep === 4 ? '#059669' : 'var(--coral-primary)';
  }

  /* Update ETA pill */
  if (etaPill) {
    if (trackingData.expectedDelivery) {
      etaPill.textContent = `DELIVERY BY: ${trackingData.expectedDelivery}`;
    } else if (currentStep === 4) {
      etaPill.textContent = 'DELIVERED ✓';
      etaPill.style.background = '#ECFDF5';
      etaPill.style.color = '#059669';
    } else {
      const estDate = getEstimatedDeliveryDate();
      etaPill.textContent = `EST. DELIVERY: ${estDate}`;
    }
  }

  /* Update progress bar */
  if (progressBar) {
    const steps = progressBar.querySelectorAll('.progress-step');
    steps.forEach((step, i) => {
      step.classList.remove('active', 'completed');
      if (i + 1 < currentStep) {
        step.classList.add('completed');
      } else if (i + 1 === currentStep) {
        step.classList.add('active');
      }
    });
  }

  /* Render tracking history checkpoints */
  renderTrackingCheckpoints(trackingData.checkpoints || [], trackingData.status);

  /* Update the tracking map section — replace with tracking timeline */
  const mapContainer = document.getElementById('trackMiniMap');
  if (mapContainer) {
    mapContainer.innerHTML = '';
    mapContainer.style.height = 'auto';
    mapContainer.style.padding = '1rem';
    mapContainer.style.background = 'var(--bg-offwhite)';
    mapContainer.style.borderRadius = 'var(--radius-md)';
    mapContainer.style.border = '1px solid var(--border-light)';

    /* Current location info */
    if (trackingData.currentLocation) {
      mapContainer.innerHTML = `
        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.75rem;">
          <span style="width:10px; height:10px; background:var(--coral-primary); border-radius:50; animation:pulse 1.5s infinite;"></span>
          <span style="font-size:0.85rem; font-weight:700; color:var(--text-dark);">
            Current Location: ${trackingData.currentLocation}
          </span>
        </div>
      `;
    }

    /* Courier info */
    if (trackingData.awb) {
      mapContainer.innerHTML += `
        <div style="font-size:0.8rem; color:var(--text-muted);">
          Tracking ID: <strong style="color:var(--text-dark);">${trackingData.awb}</strong>
        </div>
      `;
    }
  }
}

/* ---------------------------------------------------------------
   Render tracking checkpoints as timeline
   --------------------------------------------------------------- */
function renderTrackingCheckpoints(checkpoints, latestStatus) {
  const mapContainer = document.getElementById('trackMiniMap');
  if (!mapContainer || checkpoints.length === 0) return;

  /* Build timeline HTML */
  let timelineHtml = '<div style="margin-top:1rem;">';
  timelineHtml += '<div style="font-size:0.8rem; font-weight:800; color:var(--text-dark); margin-bottom:0.75rem; text-transform:uppercase; letter-spacing:0.05em;">Tracking History</div>';

  /* Reverse to show most recent first */
  const reversed = [...checkpoints].reverse().slice(0, 6);

  reversed.forEach((cp, i) => {
    const isFirst = i === 0;
    timelineHtml += `
      <div style="display:flex; gap:0.75rem; padding:0.6rem 0; ${i < reversed.length - 1 ? 'border-bottom:1px solid var(--border-light);' : ''}">
        <div style="display:flex; flex-direction:column; align-items:center; min-width:20px;">
          <div style="width:10px; height:10px; border-radius:50%; background:${isFirst ? 'var(--coral-primary)' : 'var(--border-light)'}; flex-shrink:0;"></div>
          ${i < reversed.length - 1 ? '<div style="width:1px; flex:1; background:var(--border-light); margin-top:4px;"></div>' : ''}
        </div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:0.85rem; font-weight:${isFirst ? '800' : '600'}; color:${isFirst ? 'var(--text-dark)' : 'var(--text-muted)'};">
            ${cp.status || 'Update'}
          </div>
          ${cp.location ? `<div style="font-size:0.75rem; color:var(--text-light); margin-top:0.15rem;">📍 ${cp.location}</div>` : ''}
          ${cp.activity ? `<div style="font-size:0.75rem; color:var(--text-light); margin-top:0.1rem;">${cp.activity}</div>` : ''}
          ${cp.timestamp ? `<div style="font-size:0.7rem; color:var(--text-light); margin-top:0.15rem;">${cp.timestamp}</div>` : ''}
        </div>
      </div>
    `;
  });

  timelineHtml += '</div>';
  mapContainer.innerHTML += timelineHtml;
}

/* ---------------------------------------------------------------
   Override the existing live tracking modal functionality
   --------------------------------------------------------------- */
function startRealTrack() {
  const input = document.getElementById('trackOrderIdInput');
  const orderId = input?.value?.trim();

  if (!orderId) {
    if (typeof showToast === 'function') showToast('Please enter an Order ID');
    return;
  }

  /* Show loading state */
  const displayId = document.getElementById('trackDisplayId');
  const etaPill = document.getElementById('trackEta');
  if (displayId) {
    displayId.textContent = `#${orderId} (Loading...)`;
    displayId.style.color = 'var(--text-muted)';
  }
  if (etaPill) {
    etaPill.textContent = 'FETCHING TRACKING DATA...';
    etaPill.style.background = 'var(--coral-light)';
    etaPill.style.color = 'var(--coral-primary)';
  }

  /* Check localStorage for order with this ID */
  const orders = JSON.parse(localStorage.getItem('darboOrders') || '[]');
  const order = orders.find(o => o.id === orderId);

  if (order && order.awb && order.awb !== 'PENDING') {
    /* Has AWB — fetch real tracking */
    trackDarboOrder(order.awb).then(data => {
      renderRealTracking(data, orderId);
    });
  } else if (order) {
    /* Order exists but no AWB yet */
    if (displayId) {
      displayId.textContent = `#${orderId} (Processing)`;
      displayId.style.color = 'var(--coral-primary)';
    }
    if (etaPill) {
      etaPill.textContent = `EST. DELIVERY: ${order.estimatedDelivery || getEstimatedDeliveryDate()}`;
    }
    const mapContainer = document.getElementById('trackMiniMap');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="text-align:center; padding:2rem 1rem;">
          <div style="font-size:2rem; margin-bottom:0.5rem;">📦</div>
          <div style="font-weight:700; color:var(--text-dark); margin-bottom:0.25rem;">Order is being prepared</div>
          <div style="font-size:0.85rem; color:var(--text-muted);">Your outfit is being printed and quality-checked. Tracking will be available once shipped.</div>
        </div>
      `;
      mapContainer.style.height = 'auto';
      mapContainer.style.background = 'var(--bg-offwhite)';
      mapContainer.style.borderRadius = 'var(--radius-md)';
      mapContainer.style.border = '1px solid var(--border-light)';
    }
  } else {
    /* No order found — try direct AWB lookup */
    trackDarboOrder(orderId).then(data => {
      renderRealTracking(data, orderId);
    });
  }
}

/* ---------------------------------------------------------------
   Add delivery date badges to product cards (called from main.js)
   --------------------------------------------------------------- */
function addDeliveryBadges() {
  const cards = document.querySelectorAll('.product-card, .bestseller-card');
  cards.forEach(card => {
    /* Skip if badge already exists */
    if (card.querySelector('.delivery-badge')) return;

    const priceEl = card.querySelector('.product-price, .price');
    if (!priceEl) return;

    const badge = document.createElement('div');
    badge.className = 'delivery-badge';
    badge.innerHTML = `🚚 Delivery by ${getShortDeliveryDate()}`;
    badge.style.cssText = `
      font-size: 0.7rem;
      color: #059669;
      font-weight: 600;
      margin-top: 0.25rem;
    `;

    priceEl.parentNode.insertBefore(badge, priceEl.nextSibling);
  });
}

/* ---------------------------------------------------------------
   Auto-init
   --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  /* Add delivery badges to product cards after a short delay (let main.js render first) */
  setTimeout(addDeliveryBadges, 1000);

  /* Observe for new product cards (e.g., after filter) */
  const observer = new MutationObserver(() => {
    addDeliveryBadges();
  });

  const productGrids = document.querySelectorAll('#productGrid, .bestsellers-grid, .products-grid');
  productGrids.forEach(grid => {
    observer.observe(grid, { childList: true, subtree: true });
  });

  if (window.lucide) lucide.createIcons();
});
