// Core Application Logic

// --- GLOBAL STATE ---
// Initialize these FIRST so they are available everywhere
let activeCategory = 'All';
let searchQuery = '';
let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
let selectedSizes = {};
let selectedProductColors = {}; // Store selected color per product
let products = []; // Global products array

// --- DATA LAYER ---
// Default Data (Fallback)
const defaultProducts = [];

// --- DYNAMIC CATEGORY FILTERING ---
function renderCategoryFilters() {
    const container = document.getElementById('filter-buttons-container');
    if (!container) return;

    // Get unique categories from products
    const categories = ['All', ...new Set(products.map(p => p.category))];

    // Clear existing buttons
    container.innerHTML = '';

    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.innerText = cat === 'All' ? 'All Drops' : cat;
        btn.className = 'filter-btn';
        if (activeCategory === cat) btn.classList.add('active');

        btn.onclick = () => filterProducts(cat);

        container.appendChild(btn);
    });
}

// Load Products (Intelligent Sync)
async function loadSystemData() {
    try {
        // 1. Identify User Role (Admin vs Customer)
        const user = JSON.parse(localStorage.getItem('currentUser'));
        const isAdmin = user && user.role === 'admin';

        const localData = localStorage.getItem('products');

        // 2. Try fetching the "Central Database" (The Published File)
        let serverData = [];
        try {
            const response = await fetch('product_data.json?t=' + listTimestamp());
            if (response.ok) {
                serverData = await response.json();
            }
        } catch (err) { console.log("Server file unreachable"); }

        // 3. DECISION LOGIC:
        if (isAdmin) {
            // ADMIN (PC): Trust LocalStorage first (User's Workstation)
            // But if LocalStorage is empty, load Server Data
            if (localData) {
                products = JSON.parse(localData);
                console.log("Admin Mode: Loaded Local Workstation Data");
            } else if (serverData.length > 0) {
                products = serverData;
                localStorage.setItem('products', JSON.stringify(products)); // Initialize admin workspace
            }

        } else {
            // CUSTOMER (Phone): ALWAYS trust the Server File (Published Data)
            // This ensures they see exactly what the Admin "Published"
            if (serverData.length > 0) {
                products = serverData;
                console.log("Customer Mode: Synced with Published Data");

                // Update local cache for offline/speed
                localStorage.setItem('products', JSON.stringify(products));
            } else if (localData) {
                // Fallback if server is down
                products = JSON.parse(localData);
            }
        }

        // Expose globally
        window.products = products;

    } catch (e) {
        console.log("Sync Error", e);
    }

    // Now Render
    renderCategoryFilters();
    renderProducts();

    // Also try to render admin list if we are on admin page
    if (window.location.pathname.includes('admin.html') && typeof renderAdminProducts === 'function') {
        renderAdminProducts();
    }
}

function listTimestamp() { return new Date().getTime(); }

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSystemData();
});

// Ensure this runs after DOM load
// The original DOMContentLoaded block is replaced by the new loadSystemData call.
// The logic about default products and merging is now handled by loadSystemData and the initial products declaration.

// Save Products (with Error Handling)
function saveProducts() {
    try {
        localStorage.setItem('products', JSON.stringify(products));
    } catch (e) {
        console.error("Storage limit reached", e);
        // Fallback: Save text details ONLY (strip images to save space)
        try {
            const textOnly = products.map(p => ({ ...p, image: '', imageHover: '' }));
            localStorage.setItem('products', JSON.stringify(textOnly));
            alert("⚠️ Warning: Storage is full! Images were removed from local save to protect your data. Please click 'Export' soon.");
        } catch (e2) {
            alert("CRITICAL: Cannot save products. Please click 'Export' immediately!");
        }
    }
}

// Save Wishlist
function saveWishlist() {
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// --- AUTHENTICATION ---
function handleAuth(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Simulate Auth
    if (email === 'RAYANELHACHIMI7@GMAIL.COM' && password === 'RAYAN14ANS') {
        const user = { email: email, role: 'admin', name: 'Rayan Admin' };
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = 'admin.html';
    } else {
        // Customer Login (Mock)
        const user = { email: email, role: 'customer', name: 'Valued Customer' };
        localStorage.setItem('currentUser', JSON.stringify(user));
        window.location.href = 'index.html';
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const toggleText = document.getElementById('auth-toggle-text');

    if (title.innerText === 'Welcome Back') {
        title.innerText = 'Create Account';
        subtitle.innerText = 'Join the exclusive club';
        toggleText.innerHTML = 'Already have an account? <span onclick="toggleAuthMode()" class="auth-link">Login</span>';
    } else {
        title.innerText = 'Welcome Back';
        subtitle.innerText = 'Login to access your account';
        toggleText.innerHTML = 'Don\'t have an account? <span onclick="toggleAuthMode()" class="auth-link">Sign Up</span>';
    }
}

// --- ADMIN FUNCTIONS ---

// Define deleteProduct globally
window.deleteProduct = function (id) {
    console.log("Global delete called for ID:", id);
    // Ensure ID is treated consistently
    // If id is "170...", it's a string here.

    if (confirm('Are you sure you want to delete this product?')) {
        const initialLength = products.length;

        // Filter: coerce both to strings for safe comparison
        products = products.filter(p => String(p.id) !== String(id));

        console.log("Products length after filter:", products.length);

        if (products.length === initialLength) {
            // Try one more time with integer conversion if strictly numeric
            const numId = parseInt(id);
            if (!isNaN(numId)) {
                products = products.filter(p => p.id !== numId);
            }
        }

        if (products.length === initialLength) {
            alert('Error: Could not find product with ID: ' + id + '\nCheck console for details.');
            return;
        }

        saveProducts();
        renderAdminProducts(); // Re-draw

        // Force a toast or alert
        setTimeout(() => alert('Product deleted.'), 100);
    }
};

function renderAdminProducts() {
    const listContainer = document.getElementById('admin-product-list');
    if (!listContainer) return;

    // Clear previous content
    listContainer.innerHTML = '';

    // Check if empty
    if (products.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #666;">
                <p style="font-size: 1.2rem;">No products yet.</p>
                <p>Click "+ Add Product" to drop your first item.</p>
            </div>
        `;
        return;
    }

    // Generate HTML without inline onclick for delete
    listContainer.innerHTML = products.map(product => `
        <div class="admin-product-item glass" style="display: flex; align-items: center; padding: 1rem; margin-bottom: 1rem; border-radius: 12px; transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.05);">
            <!-- Image -->
            <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: #1a1a1a; flex-shrink: 0; margin-right: 1.5rem;">
                <img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            
            <!-- Info -->
            <div style="flex-grow: 1;">
                <h4 style="margin: 0; font-size: 1rem; margin-bottom: 0.2rem;">${product.name}</h4>
                <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: #888;">
                    <span style="color: var(--accent-primary); font-weight: 600;">${product.price.toFixed(2)}dh</span>
                    <span>${product.category || 'Uncategorized'}</span>
                    <span style="font-family: monospace; opacity: 0.5;">ID: ${product.id}</span>
                </div>
            </div>

            <!-- Actions -->
                <!-- Edit Button -->
                <button type="button" class="btn-edit-action btn-edit" data-id="${product.id}" style="background: rgba(139, 92, 246, 0.1); color: var(--accent-secondary); border: 1px solid rgba(139, 92, 246, 0.2); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s; margin-right: 0.5rem;" onmouseover="this.style.background='rgba(139, 92, 246, 0.2)'" onmouseout="this.style.background='rgba(139, 92, 246, 0.1)'">
                    Edit
                </button>
                <!-- Delete Button -->
                <button type="button" class="btn-delete-action btn-delete" data-id="${product.id}" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(239, 68, 68, 0.2)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.1)'">
                    Delete
                </button>
            </div>
        </div>
    `).join('');

    // Attach Event Listeners Manually to ensure no inline script issues
    document.querySelectorAll('.btn-delete-action').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            window.deleteProduct(id);
        });
    });

    document.querySelectorAll('.btn-edit-action').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            const id = this.getAttribute('data-id');
            openEditProductModal(id);
        });
    });
}

function toggleAddProductForm() {
    const form = document.getElementById('add-product-form');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

// Preview Image function
function previewImage(input, previewId) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const container = document.getElementById(previewId);
            container.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
        reader.readAsDataURL(file);
    }
}

// Convert File to Base64 Helper
const compressImage = (file, maxWidth = 800, quality = 0.8) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Output as JPEG with reduced quality
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
});

async function handleAddNewProduct(e) {
    e.preventDefault();

    const name = document.getElementById('new-name').value;
    const price = parseFloat(document.getElementById('new-price').value);
    const desc = document.getElementById('new-desc').value;
    const category = document.getElementById('new-category').value; // Read selected category
    const colorsInput = document.getElementById('product-colors');
    const colors = colorsInput ? JSON.parse(colorsInput.value) : [];

    const fileFront = document.getElementById('new-img-front-file').files[0];
    const fileBack = document.getElementById('new-img-back-file').files[0];

    // Validation
    if (!fileFront || !fileBack) {
        alert("Please upload both Front and Back images!");
        return;
    }

    try {
        const imgFrontBase64 = await compressImage(fileFront);
        const imgBackBase64 = await compressImage(fileBack);

        const newProduct = {
            id: Date.now(),
            name: name,
            price: price,
            description: desc,
            image: imgFrontBase64,
            imageHover: imgBackBase64,
            category: category, // Use selected category
            colors: colors // Add colors array
        };

        products.push(newProduct);
        saveProducts();

        // Reset Form & UI
        e.target.reset();
        document.getElementById('preview-front').innerHTML = '<span style="font-size: 2rem;">📷</span><span>Click to Upload Front Image</span>';
        document.getElementById('preview-back').innerHTML = '<span style="font-size: 2rem;">🔄</span><span>Click to Upload Back Image</span>';

        // Reset colors (if on admin page)
        if (typeof selectedColors !== 'undefined') {
            selectedColors = [];
            if (colorsInput) colorsInput.value = '[]';
            const display = document.getElementById('selected-colors-display');
            if (display) display.style.display = 'none';

            // Reset all color option checkmarks
            document.querySelectorAll('.color-option').forEach(option => {
                const checkmark = option.querySelector('.color-check');
                const colorBox = option.querySelector('div:first-child');
                if (checkmark) checkmark.style.opacity = '0';
                if (colorBox) {
                    colorBox.style.transform = 'scale(1)';
                    colorBox.style.borderColor = 'rgba(255,255,255,0.2)';
                    colorBox.style.boxShadow = 'none';
                }
            });
        }

        toggleAddProductForm();
        renderAdminProducts();
        alert('Product Launched Successfully! 🚀');

    } catch (error) {
        console.error(error);
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            alert("Storage limit reached! Please use smaller images (under 1MB).");
        } else {
            alert("Error processing images: " + error.message);
        }
    }
}

// --- EDIT PRODUCT FUNCTIONS ---

function toggleEditProductForm() {
    const form = document.getElementById('edit-product-form');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        if (form.style.display === 'block') {
            form.scrollIntoView({ behavior: 'smooth' });
        }
    }
}

function openEditProductModal(id) {
    // Coerce Strings
    const product = products.find(p => String(p.id) === String(id));
    if (!product) {
        alert("Product not found!");
        return;
    }

    // Populate Form
    document.getElementById('edit-id').value = product.id;
    document.getElementById('edit-name').value = product.name;
    document.getElementById('edit-price').value = product.price;
    document.getElementById('edit-desc').value = product.description;

    // Set Category if exists in dropdown, else default
    const catSelect = document.getElementById('edit-category');
    // Ensure custom categories are loaded in the select if not already
    const customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
    // Clear and rebuild options to ensure all are present
    catSelect.innerHTML = '<option value="Anime">Anime</option>';
    customCategories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        catSelect.appendChild(opt);
    });
    catSelect.value = product.category || 'Anime';

    // Reset Image Previews
    document.getElementById('edit-preview-front').innerHTML = `
        <img src="${product.image}" style="width: 100%; height: 100%; object-fit: cover;">
    `;
    document.getElementById('edit-preview-back').innerHTML = `
        <img src="${product.imageHover}" style="width: 100%; height: 100%; object-fit: cover;">
    `;

    // Clear File Inputs
    document.getElementById('edit-img-front-file').value = '';
    document.getElementById('edit-img-back-file').value = '';

    // Show Form
    const form = document.getElementById('edit-product-form');
    form.style.display = 'block';
    form.scrollIntoView({ behavior: 'smooth' });
}

async function handleEditProduct(e) {
    e.preventDefault();

    const id = document.getElementById('edit-id').value;
    const name = document.getElementById('edit-name').value;
    const price = parseFloat(document.getElementById('edit-price').value);
    const desc = document.getElementById('edit-desc').value;
    const category = document.getElementById('edit-category').value;

    const fileFront = document.getElementById('edit-img-front-file').files[0];
    const fileBack = document.getElementById('edit-img-back-file').files[0];

    // Find index
    const index = products.findIndex(p => String(p.id) === String(id));
    if (index === -1) {
        alert("Error: Product not found during save.");
        return;
    }

    // Keep existing images by default
    let imgFrontBase64 = products[index].image;
    let imgBackBase64 = products[index].imageHover;

    try {
        if (fileFront) {
            imgFrontBase64 = await compressImage(fileFront);
        }
        if (fileBack) {
            imgBackBase64 = await compressImage(fileBack);
        }

        // Update Object
        products[index] = {
            ...products[index], // Keep other fields like Colors, ID
            name: name,
            price: price,
            description: desc,
            category: category,
            image: imgFrontBase64,
            imageHover: imgBackBase64
        };

        saveProducts();
        renderAdminProducts();
        toggleEditProductForm();
        alert('Product Updated Successfully! ✨');

    } catch (error) {
        console.error(error);
        if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
            alert("Storage limit reached! Please use smaller images (under 1MB).");
        } else {
            alert("Error processing images: " + error.message);
        }
    }
}


// Cart State - Load from LocalStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// DOM Elements
const productGrid = document.getElementById('product-grid');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalElement = document.getElementById('cart-total');

// Save Cart to LocalStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

// Update Cart Badge
function updateCartBadge() {
    const count = cart.length;
    let badge = document.getElementById('cart-badge');
    const cartIcon = document.querySelector('.cart-icon');

    // If we are on the cart page, we might not have the cart icon in the same way, but let's keep it consistent
    if (!cartIcon) return;

    if (count > 0) {
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'cart-badge';
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: var(--accent-primary);
                color: white;
                font-size: 0.7rem;
                font-weight: bold;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            `;
            cartIcon.style.position = 'relative';
            cartIcon.appendChild(badge);
        }
        badge.innerText = count;
        badge.style.display = 'flex';

        // Pulse animation
        badge.animate([
            { transform: 'scale(1)' },
            { transform: 'scale(1.5)' },
            { transform: 'scale(1)' }
        ], { duration: 200 });
    } else if (badge) {
        badge.style.display = 'none';
    }
}

// Render Cart Items
function renderCart() {
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty. Start shopping!</div>';
        if (cartTotalElement) cartTotalElement.innerText = '0dh';
        return;
    }

    let total = 0;
    cartItemsContainer.innerHTML = cart.map((item, index) => {
        total += item.price;
        return `
            <div class="cart-item">
                <div class="cart-item-left">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.name}</div>

                        <div class="cart-item-meta">
                            <span>Size: <strong style="color: white;">${item.selectedSize}</strong></span> • 
                            <span>Color: <strong style="color: white;">${item.selectedColor || 'Standard'}</strong></span>
                        </div>
                    </div>
                </div>
                
                <div class="cart-item-right">
                    <div class="cart-item-price">${item.price.toFixed(2)}dh</div>
                    <button onclick="removeFromCart(${index})" class="cart-item-remove">✕</button>
                </div>
            </div>
        `;
    }).join('');

    if (cartTotalElement) cartTotalElement.innerText = total.toFixed(2) + 'dh';
}

function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {

        const size = selectedSizes[productId] || 'L';
        const color = selectedProductColors[productId] || (product.colors && product.colors.length > 0 ? product.colors[0].name : 'Standard');

        cart.push({
            ...product,
            selectedSize: size,
            selectedColor: color
        });
        saveCart();
        showToast(`${product.name} (Size: ${size}, Color: ${color})`);
    }
}


function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function checkoutWhatsApp() {
    if (cart.length === 0) return;

    const phoneNumber = "212657826479";
    let message = "Hello HRZ, I would like to order the following:\n\n";
    let total = 0;

    cart.forEach(item => {
        message += `- ${item.name} [Size: ${item.selectedSize}] [Color: ${item.selectedColor || 'Standard'}] (${item.price.toFixed(2)}dh)\n`;
        total += item.price;
    });

    message += `\nTotal: ${total.toFixed(2)}dh\n\nPlease confirm availability and shipping.`;
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Show Toast Notification
function showToast(productName) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(20, 20, 20, 0.95);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 12px;
            border: 1px solid var(--glass-border);
            backdrop-filter: blur(10px);
            transform: translateY(100px);
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 2000;
            display: flex;
            align-items: center;
            gap: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            font-weight: 500;
        `;
        document.body.appendChild(toast);
    }

    const shortName = productName.length > 25 ? productName.substring(0, 25) + '...' : productName;

    toast.innerHTML = `
        <div style="background: rgba(34, 197, 94, 0.2); border-radius: 50%; padding: 5px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
        <span>Added <strong>${shortName}</strong></span>
    `;

    requestAnimationFrame(() => {
        toast.style.transform = 'translateY(0)';
    });

    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.style.transform = 'translateY(100px)';
    }, 3000);
}

// Select Size
function selectSize(productId, size) {
    selectedSizes[productId] = size;
    const cardButtons = document.querySelectorAll(`.product-card[data-id="${productId}"] .size-btn`);
    cardButtons.forEach(btn => {
        if (btn.innerText === size) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    // Also update detail page if active
    const detailButtons = document.querySelectorAll(`.product-detail-wrapper .size-btn`);
    if (detailButtons.length > 0) {
        detailButtons.forEach(btn => {
            if (btn.innerText === size) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }
}

function filterProducts(category) {
    activeCategory = category;
    renderProducts();
    renderProducts();
    updateFilterButtons();
}

// Select Color
function selectColor(productId, colorName) {
    selectedProductColors[productId] = colorName;

    // Update UI in Detail Page
    const buttons = document.querySelectorAll(`.color-btn[data-product="${productId}"]`);
    buttons.forEach(btn => {
        if (btn.getAttribute('data-color-name') === colorName) {
            btn.classList.add('selected');
            btn.style.transform = 'scale(1.1)';
            btn.style.borderColor = 'white';
        } else {
            btn.classList.remove('selected');
            btn.style.transform = 'scale(1)';
            btn.style.borderColor = 'rgba(255,255,255,0.2)';
        }
    });
}

function handleSearch(e) {
    searchQuery = e.target.value.toLowerCase();
    renderProducts();
}

// Live Search with Dropdown
function handleSearchLive(e) {
    const query = e.target.value.toLowerCase().trim();
    const dropdown = document.getElementById('search-dropdown');

    // Update the main search
    searchQuery = query;
    renderProducts();

    // If empty, hide dropdown
    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    // Filter products matching the search
    const results = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
    );

    // Show dropdown with results
    if (results.length > 0) {
        dropdown.innerHTML = results.slice(0, 5).map(product => `
            <div onclick="goToProduct(${product.id})" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
                <img src="${product.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; background: #1a1a1a;">
                <div style="flex: 1;">
                    <div style="color: white; font-weight: 600; font-size: 0.95rem;">${product.name}</div>
                    <div style="color: #888; font-size: 0.85rem;">${product.price.toFixed(2)}dh • ${product.category || 'Product'}</div>
                </div>
            </div>
        `).join('');
        dropdown.style.display = 'block';
    } else {
        dropdown.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #666;">
                <p>No products found for "${query}"</p>
            </div>
        `;
        dropdown.style.display = 'block';
    }
}

// Navigate to product
function goToProduct(productId) {
    window.location.href = `product.html?id=${productId}`;
}

// Close dropdown when clicking outside
document.addEventListener('click', function (e) {
    const dropdown = document.getElementById('search-dropdown');
    const searchInput = document.getElementById('search-input');
    if (dropdown && searchInput && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.innerText === activeCategory) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index === -1) {
        wishlist.push(productId);
        showToast("Added to Wishlist ❤️");
    } else {
        wishlist.splice(index, 1);
        showToast("Removed from Wishlist 💔");
    }
    saveWishlist();

    if (productGrid) renderProducts();
    const wishlistGrid = document.getElementById('wishlist-grid');
    if (typeof renderWishlistPage === 'function') renderWishlistPage();
}

// Render Products (Filtered)
function renderProducts() {
    if (!productGrid) return;

    let filtered = products;
    if (activeCategory !== 'All') {
        filtered = filtered.filter(p => p.category === activeCategory);
    }
    if (searchQuery) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery));
    }

    productGrid.innerHTML = filtered.map(product => {
        if (!selectedSizes[product.id]) selectedSizes[product.id] = 'L';
        const isWishlisted = wishlist.includes(product.id);

        return `
        <div class="product-card glass" data-id="${product.id}" style="padding: 1rem; border-radius: 12px; transition: transform 0.3s ease; display: flex; flex-direction: column; height: 100%; cursor: pointer; position: relative;" onclick="window.location.href='product.html?id=${product.id}'">
            
            <button onclick="event.stopPropagation(); toggleWishlist(${product.id})" style="position: absolute; top: 1rem; right: 1rem; z-index: 10; background: rgba(0,0,0,0.5); border: none; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                <span style="font-size: 1.2rem; line-height: 1; color: ${isWishlisted ? '#ef4444' : 'white'}; transition: color 0.2s;">
                    ${isWishlisted ? '❤️' : '🤍'}
                </span>
            </button>

            <div class="image-container" style="background: linear-gradient(to bottom, #1a1a1a, #0a0a0a); border-radius: 8px; margin-bottom: 1rem; overflow: hidden; position: relative; width: 100%; aspect-ratio: 1/1;">
                <img src="${product.image}" alt="${product.name}" class="product-img-main" style="width: 100%; height: 100%; object-fit: contain; display: block; transition: opacity 0.3s ease;">
                <img src="${product.imageHover}" alt="${product.name} Back" class="product-img-hover" style="width: 100%; height: 100%; object-fit: contain; display: block; position: absolute; top: 0; left: 0; opacity: 0; transition: opacity 0.3s ease;">
            </div>
            
            <div class="product-info" style="display: flex; flex-direction: column; flex-grow: 1;">
                <div style="flex-grow: 1;">
                    <div style="font-size: 0.7rem; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.2rem;">${product.category || 'Apparel'}</div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; line-height: 1.3;">${product.name}</h3>
                    <p style="font-size: 0.85rem; color: #a3a3a3; margin-bottom: 1rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                        ${product.description}
                    </p>
                </div>
                
                <div class="size-selector" onclick="event.stopPropagation()">
                    <button class="size-btn ${selectedSizes[product.id] === 'L' ? 'selected' : ''}" onclick="selectSize(${product.id}, 'L')">L</button>
                    <button class="size-btn ${selectedSizes[product.id] === 'XL' ? 'selected' : ''}" onclick="selectSize(${product.id}, 'XL')">XL</button>
                    <button class="size-btn ${selectedSizes[product.id] === 'XXL' ? 'selected' : ''}" onclick="selectSize(${product.id}, 'XXL')">XXL</button>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <p style="color: var(--accent-primary); font-weight: 700; font-size: 1.2rem;">${product.price.toFixed(2)}dh</p>
                    <button onclick="event.stopPropagation(); addToCart(${product.id})" class="btn-add" style="background: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.2s;" onmousedown="this.style.transform='scale(0.95)'" onmouseup="this.style.transform='scale(1)'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

// Render Product Detail Page
function renderProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id')); // Note: This might need to accommodate string IDs if navigation allows
    // But our home page passes ID via URL. Let's handle both.

    // Safety check: try finding by number, then string
    let product = products.find(p => p.id === id);
    if (!product) product = products.find(p => p.id == params.get('id'));

    if (!product) {
        const container = document.getElementById('product-detail-container');
        if (container) container.innerHTML = '<h2>Product not found</h2>';
        return;
    }

    if (!selectedSizes[product.id]) selectedSizes[product.id] = 'L';

    // Default color selection if available
    if (product.colors && product.colors.length > 0 && !selectedProductColors[product.id]) {
        selectedProductColors[product.id] = product.colors[0].name;
    }

    // Generate Colors HTML
    let colorsHtml = '';
    if (product.colors && product.colors.length > 0) {
        colorsHtml = `
            <div style="margin-bottom: 1.5rem;">
                <p style="margin-bottom: 0.5rem; font-weight: 600;">Select Color:</p>
                <div class="color-selector" style="display: flex; gap: 0.8rem;">
                    ${product.colors.map(color => `
                        <button class="color-btn ${selectedProductColors[product.id] === color.name ? 'selected' : ''}" 
                            data-product="${product.id}" 
                            data-color-name="${color.name}"
                            onclick="selectColor(${product.id}, '${color.name}')"
                            title="${color.name}"
                            style="
                                width: 35px; 
                                height: 35px; 
                                border-radius: 50%; 
                                border: 2px solid ${selectedProductColors[product.id] === color.name ? 'white' : 'rgba(255,255,255,0.2)'}; 
                                background-color: ${color.hex}; 
                                cursor: pointer; 
                                transition: all 0.2s;
                                transform: ${selectedProductColors[product.id] === color.name ? 'scale(1.1)' : 'scale(1)'};
                            ">
                        </button>
                    `).join('')}
                </div>
                <p style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">Selected: <span id="selected-color-name">${selectedProductColors[product.id]}</span></p>
            </div>
        `;
    }

    const container = document.getElementById('product-detail-container');
    container.innerHTML = `
        <div class="product-detail-wrapper">
            <div class="pd-images">
                <div class="main-img-wrapper" style="aspect-ratio: 1/1;">
                    <img id="main-detail-img" src="${product.image}" alt="${product.name}">
                </div>
                <div class="img-thumbnails" style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <div onclick="document.getElementById('main-detail-img').src='${product.image}'" style="width: 80px; height: 80px; border-radius: 10px; background: #1a1a1a; cursor: pointer; padding: 5px; border: 1px solid rgba(255,255,255,0.2);">
                        <img src="${product.image}" style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                    <div onclick="document.getElementById('main-detail-img').src='${product.imageHover}'" style="width: 80px; height: 80px; border-radius: 10px; background: #1a1a1a; cursor: pointer; padding: 5px; border: 1px solid rgba(255,255,255,0.2);">
                        <img src="${product.imageHover}" style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                </div>
            </div>
            
            <div class="pd-info">
                <h1>${product.name}</h1>
                <p class="pd-price">${product.price.toFixed(2)}dh</p>
                <div class="pd-description">
                    <p>${product.description}</p>
                </div>

                <div class="pd-actions">
                    ${colorsHtml}

                    <div>
                        <p style="margin-bottom: 0.5rem; font-weight: 600;">Select Size:</p>
                        <div class="size-selector">
                            <button class="size-btn ${selectedSizes[product.id] === 'L' ? 'selected' : ''}" onclick="selectSize(${product.id}, 'L')">L</button>
                            <button class="size-btn ${selectedSizes[product.id] === 'XL' ? 'selected' : ''}" onclick="selectSize(${product.id}, 'XL')">XL</button>
                            <button class="size-btn ${selectedSizes[product.id] === 'XXL' ? 'selected' : ''}" onclick="selectSize(${product.id}, 'XXL')">XXL</button>
                        </div>
                        <div class="size-guide-link" onclick="toggleSizeGuide()">Size Guide</div>
                    </div>

                    <button onclick="addToCart(${product.id})" class="btn-add-large">
                        ADD TO CART - ${product.price.toFixed(2)}dh
                    </button>
                </div>
            </div>
        </div>
    `;
}

function toggleSizeGuide() {
    const modal = document.getElementById('size-guide-modal');
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        modal.style.display = 'flex';
    }
}

// Load Custom Category Filter Buttons
function loadCustomCategoryButtons() {
    const customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
    const container = document.getElementById('filter-buttons-container');

    if (!container) return;

    // Add buttons for each custom category
    customCategories.forEach(categoryName => {
        // Check if button already exists
        const existingButtons = Array.from(container.querySelectorAll('.filter-btn')).map(btn => btn.textContent);
        if (existingButtons.includes(categoryName)) return;

        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.textContent = categoryName;
        btn.onclick = () => filterProducts(categoryName);
        container.appendChild(btn);
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    if (productGrid) renderProducts();

    const productDetailContainer = document.getElementById('product-detail-container');
    if (productDetailContainer) renderProductDetail();

    updateCartBadge();

    if (cartItemsContainer) renderCart();

    // Load custom category buttons
    loadCustomCategoryButtons();

    // Admin init is handled in admin.html inline script that calls renderAdminProducts
});
