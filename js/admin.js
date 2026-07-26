/* ==========================================================================
   DARBO — ADMIN PANEL CRUD & CATALOG MANAGEMENT JAVASCRIPT
   Full Create, Read, Update, Delete (CRUD) operations for products & categories.
   ========================================================================== */

let adminProducts = [];
let deleteTargetId = null;
let currentImageDataUrl = '';

document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});

function initAdminDashboard() {
  // Load products from localStorage or fallback to initial array in main.js
  const stored = localStorage.getItem('darbo_products');
  if (stored) {
    try {
      adminProducts = JSON.parse(stored);
    } catch (e) {
      adminProducts = typeof products !== 'undefined' ? [...products] : [];
    }
  } else {
    adminProducts = typeof products !== 'undefined' ? [...products] : [];
  }

  renderAdminTable(adminProducts);
  updateAdminStats();
  renderOrdersTable();
}

function updateAdminStats() {
  const totalElem = document.getElementById('statTotalProducts');
  const catElem = document.getElementById('statTotalCategories');
  const stockElem = document.getElementById('statInStockCount');
  const avgElem = document.getElementById('statAvgPrice');

  if (totalElem) totalElem.textContent = adminProducts.length;

  const categoriesSet = new Set(adminProducts.map(p => p.category));
  if (catElem) catElem.textContent = categoriesSet.size;

  const inStockCount = adminProducts.filter(p => (p.stock === undefined || p.stock > 0)).length;
  if (stockElem) stockElem.textContent = inStockCount;

  if (adminProducts.length > 0) {
    const totalPrice = adminProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);
    const avg = Math.round(totalPrice / adminProducts.length);
    if (avgElem) avgElem.textContent = `₹${avg}`;
  } else if (avgElem) {
    avgElem.textContent = '₹0';
  }
}

function renderAdminTable(list) {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:3rem; color:var(--admin-text-sub);">
          <i data-lucide="package-search" style="width:42px;height:42px;margin-bottom:0.5rem;opacity:0.5;"></i>
          <p style="font-size:0.95rem; font-weight:700;">No products found in catalog.</p>
          <button class="btn-add-product" style="margin-top:1rem;" onclick="openAddProductModal()">+ Add Your First Product</button>
        </td>
      </tr>
    `;
    if (window.lucide) lucide.createIcons();
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>
        <img src="${item.image || 'images/hero_models.jpg'}" alt="${item.title}" class="product-thumb" onerror="this.src='images/hero_models.jpg'" />
      </td>
      <td>
        <div style="font-family:var(--font-heading); font-weight:800; color:var(--admin-text-main); font-size:0.95rem;">${item.title}</div>
        <div style="font-size:0.75rem; color:var(--admin-text-sub);">ID: #${item.id}</div>
      </td>
      <td>
        <span class="badge-category">${item.category || 'General'}</span>
      </td>
      <td>
        <div style="font-weight:800; color:var(--admin-text-main);">₹${item.price}</div>
        ${item.mrp ? `<div style="font-size:0.75rem; text-decoration:line-through; color:var(--admin-text-sub);">₹${item.mrp}</div>` : ''}
      </td>
      <td>
        ${(item.stock === undefined || item.stock > 0) 
          ? `<span class="badge-stock-in">In Stock (${item.stock || 25})</span>` 
          : `<span class="badge-stock-out">Out of Stock</span>`}
      </td>
      <td>
        <div class="action-btn-group">
          <button class="btn-action-icon edit" title="Edit Product" onclick="openEditProductModal(${item.id})">
            <i data-lucide="pencil" style="width:16px;height:16px;"></i>
          </button>
          <button class="btn-action-icon delete" title="Delete Product" onclick="openDeleteModal(${item.id})">
            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  if (window.lucide) lucide.createIcons();
}

function handleAdminSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  const filtered = adminProducts.filter(p => 
    p.title.toLowerCase().includes(query) || 
    p.category.toLowerCase().includes(query) ||
    String(p.price).includes(query)
  );
  renderAdminTable(filtered);
}

function filterAdminTable() {
  const category = document.getElementById('adminCategoryFilter')?.value;
  if (!category || category === 'all') {
    renderAdminTable(adminProducts);
  } else {
    const filtered = adminProducts.filter(p => p.category === category);
    renderAdminTable(filtered);
  }
}

/* CREATE / UPDATE MODAL CONTROLS */
function openAddProductModal() {
  document.getElementById('modalFormTitle').textContent = 'Add New Product';
  document.getElementById('editProductId').value = '';
  document.getElementById('productForm').reset();
  
  const imgPreview = document.getElementById('imgPreview');
  const placeholder = document.getElementById('previewPlaceholder');
  if (imgPreview) imgPreview.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';

  currentImageDataUrl = '';

  const modal = document.getElementById('productFormModal');
  if (modal) modal.classList.add('active');
}

function openEditProductModal(id) {
  const item = adminProducts.find(p => p.id === id);
  if (!item) return;

  document.getElementById('modalFormTitle').textContent = 'Edit Product #' + id;
  document.getElementById('editProductId').value = item.id;
  document.getElementById('prodTitle').value = item.title;
  document.getElementById('prodCategory').value = item.category;
  document.getElementById('prodPrice').value = item.price;
  document.getElementById('prodMRP').value = item.mrp || '';
  document.getElementById('prodStock').value = item.stock !== undefined ? item.stock : 25;
  document.getElementById('prodImageUrl').value = item.image || '';
  document.getElementById('prodDescription').value = item.description || '';

  currentImageDataUrl = item.image || '';
  updateImagePreview(currentImageDataUrl);

  const modal = document.getElementById('productFormModal');
  if (modal) modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('productFormModal');
  if (modal) modal.classList.remove('active');
}

function handleImageFileSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentImageDataUrl = evt.target.result;
    updateImagePreview(currentImageDataUrl);
  };
  reader.readAsDataURL(file);
}

function updateImagePreview(url) {
  const imgPreview = document.getElementById('imgPreview');
  const placeholder = document.getElementById('previewPlaceholder');
  if (!imgPreview || !placeholder) return;

  const src = url || currentImageDataUrl;
  if (src) {
    imgPreview.src = src;
    imgPreview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    imgPreview.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

/* SAVE PRODUCT (CREATE OR UPDATE) */
function saveProductSubmit(e) {
  e.preventDefault();
  
  const editId = document.getElementById('editProductId').value;
  const title = document.getElementById('prodTitle').value;
  const category = document.getElementById('prodCategory').value;
  const price = Number(document.getElementById('prodPrice').value);
  const mrp = document.getElementById('prodMRP').value ? Number(document.getElementById('prodMRP').value) : null;
  const stock = Number(document.getElementById('prodStock').value);
  const imageUrlInput = document.getElementById('prodImageUrl').value;
  const description = document.getElementById('prodDescription').value;

  if (!title || !category || !price) {
    showAdminToast('⚠️ Please fill all required fields', 'error');
    return;
  }

  const finalImage = currentImageDataUrl || imageUrlInput || 'images/hero_models.jpg';

  if (editId) {
    // UPDATE OPERATION
    const index = adminProducts.findIndex(p => p.id === Number(editId));
    if (index !== -1) {
      adminProducts[index] = {
        ...adminProducts[index],
        title,
        category,
        price,
        mrp,
        stock,
        image: finalImage,
        description
      };
      showAdminToast('✏️ Product updated successfully!', 'success');
    }
  } else {
    // CREATE OPERATION
    const newId = adminProducts.length > 0 ? Math.max(...adminProducts.map(p => p.id)) + 1 : 1;
    const newProd = {
      id: newId,
      title,
      category,
      price,
      mrp,
      stock,
      image: finalImage,
      colors: ['#1A1A1A', '#FFFFFF', '#F07167'],
      description: description || 'Heavyweight cotton streetwear garment.'
    };
    adminProducts.unshift(newProd);
    showAdminToast('✅ Product added to catalog!', 'success');
  }

  // Save updated catalog to localStorage
  localStorage.setItem('darbo_products', JSON.stringify(adminProducts));

  renderAdminTable(adminProducts);
  updateAdminStats();
  closeProductModal();
}

/* DELETE OPERATION */
function openDeleteModal(id) {
  deleteTargetId = id;
  const item = adminProducts.find(p => p.id === id);
  const textElem = document.getElementById('deleteConfirmText');
  if (textElem && item) {
    textElem.textContent = `Are you sure you want to remove '${item.title}' from catalog?`;
  }
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.add('active');
}

function closeDeleteModal() {
  deleteTargetId = null;
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.remove('active');
}

function confirmDeleteProduct() {
  if (!deleteTargetId) return;

  adminProducts = adminProducts.filter(p => p.id !== deleteTargetId);
  localStorage.setItem('darbo_products', JSON.stringify(adminProducts));

  showAdminToast('🗑️ Product removed from catalog', 'info');
  renderAdminTable(adminProducts);
  updateAdminStats();
  closeDeleteModal();
}

/* ADMIN TOAST SYSTEM */
function showAdminToast(message, type = 'success') {
  let container = document.getElementById('adminToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminToastContainer';
    container.className = 'admin-toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `admin-toast ${type}`;
  toast.innerHTML = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* ORDER MANAGEMENT */
function loadOrders() {
  return JSON.parse(localStorage.getItem('darboOrders') || '[]');
}

function renderOrdersTable() {
  const orders = loadOrders();
  const container = document.getElementById('ordersTableBody');
  const badge = document.getElementById('orderCountBadge');
  
  if (badge) badge.textContent = `${orders.length} Order${orders.length !== 1 ? 's' : ''}`;
  
  if (!container) return;
  
  if (orders.length === 0) {
    container.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:3rem; color:#94A3B8;">No orders yet. Orders will appear here when customers place them.</td></tr>';
    return;
  }
  
  container.innerHTML = orders.map((order, index) => {
    const statusColors = {
      'Placed & Processing': { bg: '#FEF3C7', color: '#D97706' },
      'Packed': { bg: '#DBEAFE', color: '#2563EB' },
      'Shipped': { bg: '#EDE9FE', color: '#7C3AED' },
      'Delivered': { bg: '#DCFCE7', color: '#16A34A' }
    };
    const sc = statusColors[order.status] || statusColors['Placed & Processing'];
    
    return `
      <tr>
        <td style="font-weight:700; color:#1E293B;">${order.id || 'N/A'}</td>
        <td>${order.date || 'N/A'}</td>
        <td>${order.outfit || 'N/A'}</td>
        <td>${order.size || 'N/A'}</td>
        <td style="font-weight:700;">₹${order.total || 0}</td>
        <td><span style="background:${sc.bg}; color:${sc.color}; padding:0.3rem 0.75rem; border-radius:999px; font-size:0.8rem; font-weight:700;">${order.status || 'Placed & Processing'}</span></td>
        <td>
          <select onchange="updateOrderStatus(${index}, this.value)" style="padding:0.3rem 0.5rem; border-radius:8px; border:1px solid #E2E8F0; font-size:0.8rem;">
            <option value="Placed & Processing" ${(!order.status || order.status === 'Placed & Processing') ? 'selected' : ''}>Placed</option>
            <option value="Packed" ${order.status === 'Packed' ? 'selected' : ''}>Packed</option>
            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

function updateOrderStatus(index, newStatus) {
  const orders = loadOrders();
  if (orders[index]) {
    orders[index].status = newStatus;
    localStorage.setItem('darboOrders', JSON.stringify(orders));
    renderOrdersTable();
    showAdminToast(`📦 Order ${orders[index].id || 'Unknown'} status updated to "${newStatus}"`, 'success');
  }
}
