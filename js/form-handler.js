/* 
  DARBO — Order Form & Email Integration Engine (js/form-handler.js)
  Direct mail dispatch target: darbo@office@gmail.com
*/

document.addEventListener('DOMContentLoaded', () => {
  let customerOrders = JSON.parse(localStorage.getItem('darboOrders') || '[]');
  
  document.getElementById('darboOrderForm')?.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('custName')?.value.trim();
    const phone = document.getElementById('custPhone')?.value.trim();
    const email = document.getElementById('custEmail')?.value.trim();
    const city = document.getElementById('custCity')?.value.trim();
    const outfit = document.getElementById('custOutfit')?.value;
    const size = document.getElementById('custSize')?.value;
    const date = document.getElementById('custDate')?.value;
    const notes = document.getElementById('custNotes')?.value.trim();

    if (!name || !phone || !email || !outfit || !size) {
      showToast('⚠️ Please fill out all required fields marked with *');
      return;
    }

    const submitBtn = document.getElementById('submitFormBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⌛</span> Dispatching Order to darbo@office@gmail.com...';
    }

    const newOrderId = `DRB-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const orderRecord = {
      id: newOrderId,
      date: today,
      outfit: outfit,
      size: size,
      total: 1299, // default base price or calculated
      status: "Placed & Processing",
      stepIndex: 1
    };

    // Save to customer order history
    customerOrders.unshift(orderRecord);
    localStorage.setItem('darboOrders', JSON.stringify(customerOrders));

    // Prepare Email payload
    const formData = {
      order_id: newOrderId,
      name: name,
      phone: phone,
      email: email,
      city: city,
      outfit: outfit,
      size: size,
      preferred_delivery_date: date,
      customization_notes: notes,
      _replyto: email,
      _subject: `[NEW DARBO ORDER #${newOrderId}] From ${name}`
    };

    // FormSpree requires a hash ID, not an email. User must provide their own ID.
    fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData)
    })
    .then(response => {
      handleFormSuccess(formData);
    })
    .catch(error => {
      showToast('⚠️ Could not dispatch order email. Please try again or contact us on WhatsApp!');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>✉️</span> Submit Order to darbo@office@gmail.com';
      }
    });
  });
});

function handleFormSuccess(data) {
  const submitBtn = document.getElementById('submitFormBtn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>✉️</span> Submit Order to darbo@office@gmail.com';
  }

  showToast(`🎉 Order #${data.order_id} recorded & emailed to darbo@office@gmail.com!`);

  const waMsg = `Hi Darbo! 👗 I just submitted order #${data.order_id} on your website!
  
📌 *Order Summary:*
• *Order ID:* #${data.order_id}
• *Name:* ${data.name}
• *Phone:* ${data.phone}
• *Outfit Choice:* ${data.outfit}
• *Size:* ${data.size}
• *Delivery Date:* ${data.preferred_delivery_date || 'Standard'}
• *Notes:* ${data.customization_notes || 'None'}

Please confirm availability and dispatch date! 😊`;

  const detailsContainer = document.getElementById('formResultDetails');
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div style="text-align:center; padding:1rem 0;">
        <div style="font-size:3.5rem; margin-bottom:1rem;">🎉</div>
        <h3 style="font-family:var(--font-heading); font-size:1.8rem; font-weight:700; color:var(--text-dark); margin-bottom:0.5rem;">Order #${data.order_id} Placed!</h3>
        <p style="color:#666; font-size:0.9rem; line-height:1.7; margin-bottom:1.5rem;">
          Your order details have been dispatched to <strong>darbo@office@gmail.com</strong>.<br>
          You can now track this order live in your <strong>User Profile Drawer</strong>!
        </p>
        <a href="https://wa.me/918355983699?text=${encodeURIComponent(waMsg)}" target="_blank" class="btn-wa-pill" style="width:100%; justify-content:center; padding:1rem; font-size:0.92rem; text-decoration:none;">
          💬 Ping Us on WhatsApp With Order #${data.order_id}
        </a>
      </div>
    `;
  }

  document.getElementById('formResultModal')?.classList.add('open');
  document.getElementById('darboOrderForm')?.reset();
}

function closeModalDirectById(modalId) {
  document.getElementById(modalId)?.classList.remove('open');
}
