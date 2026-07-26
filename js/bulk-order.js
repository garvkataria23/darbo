/* =======================================================================
   DARBO — Bulk Customization Order via WhatsApp
   Collects bulk order details → redirects to WhatsApp with pre-filled message
   ======================================================================= */

/* ---------------------------------------------------------------
   Open bulk order modal
   --------------------------------------------------------------- */
function openBulkOrderModal() {
  const modal = document.getElementById('bulkOrderModal');
  if (modal) modal.classList.add('active');
}

/* ---------------------------------------------------------------
   Close bulk order modal
   --------------------------------------------------------------- */
function closeBulkOrderModal() {
  const modal = document.getElementById('bulkOrderModal');
  if (modal) modal.classList.remove('active');
}

/* ---------------------------------------------------------------
   Submit bulk order → build WhatsApp message → navigate
   --------------------------------------------------------------- */
function submitBulkOrder() {
  const productType = document.getElementById('bulkProductType')?.value;
  const quantity = document.getElementById('bulkQuantity')?.value?.trim();
  const designNotes = document.getElementById('bulkDesignNotes')?.value?.trim();
  const eventName = document.getElementById('bulkEventName')?.value?.trim();
  const sizeBreakdown = document.getElementById('bulkSizes')?.value?.trim();
  const contactName = document.getElementById('bulkContactName')?.value?.trim();
  const contactPhone = document.getElementById('bulkContactPhone')?.value?.trim();

  /* Validation */
  if (!contactName) return showBulkError('Please enter your name');
  if (!contactPhone || contactPhone.length < 10) return showBulkError('Please enter a valid 10-digit phone number');
  if (!quantity || parseInt(quantity) < 10) return showBulkError('Minimum bulk order is 10 pieces');
  if (!productType) return showBulkError('Please select a product type');

  /* Build WhatsApp message */
  const lines = [
    `Hi DARBO! 👋`,
    ``,
    `I'm interested in a BULK CUSTOM ORDER.`,
    ``,
    `📋 *Bulk Order Details:*`,
    `━━━━━━━━━━━━━━━━━━━`,
    `• Product: ${productType}`,
    `• Quantity: ${quantity} pieces`,
    `• Sizes: ${sizeBreakdown || 'Mixed (S/M/L/XL/XXL)'}`,
  ];

  if (eventName) lines.push(`• Event/Occasion: ${eventName}`);
  if (designNotes) lines.push(`• Design Notes: ${designNotes}`);

  lines.push(
    `━━━━━━━━━━━━━━━━━━━`,
    ``,
    `👤 *Contact:*`,
    `Name: ${contactName}`,
    `Phone: ${contactPhone}`,
    ``,
    `Please share pricing, bulk discounts, and timeline. Thank you! 🙏`
  );

  const message = encodeURIComponent(lines.join('\n'));
  const whatsappUrl = `https://wa.me/918355983699?text=${message}`;

  /* Close modal and navigate to WhatsApp */
  closeBulkOrderModal();
  window.open(whatsappUrl, '_blank');

  /* Show toast if showToast is available */
  if (typeof showToast === 'function') {
    showToast('Redirecting to WhatsApp for bulk order details! 💬');
  }
}

/* ---------------------------------------------------------------
   Show error inside bulk order modal
   --------------------------------------------------------------- */
function showBulkError(msg) {
  const el = document.getElementById('bulkOrderError');
  if (el) {
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
  }
}

/* ---------------------------------------------------------------
   Validate quantity input (min 10)
   --------------------------------------------------------------- */
function validateBulkQuantity(input) {
  const val = parseInt(input.value);
  const hint = document.getElementById('bulkQtyHint');
  if (hint) {
    if (val < 10 && val > 0) {
      hint.textContent = 'Minimum 10 pieces for bulk orders';
      hint.style.color = '#DC2626';
    } else if (val >= 10) {
      hint.textContent = `${val} pieces — bulk discount applies! 🎉`;
      hint.style.color = '#059669';
    } else {
      hint.textContent = '';
    }
  }
}

/* ---------------------------------------------------------------
   Auto-init
   --------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  /* Reinitialize Lucide icons if available */
  if (window.lucide) lucide.createIcons();
});
