import './style.css';

class MRTApp {
  constructor() {
    document.body.classList.add('loaded');
    document.body.style.opacity = '1';

    this.allProducts = [];
    this.init();
    this.initContactForm(); // Re-added contact form init
    
    // Bind global quick view for the buttons
    window.openQuickView = (id) => this.openQuickView(id);
  }

  initContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('contact-submit-btn');
      const status = document.getElementById('form-status');
      if (!btn) return;

      const originalText = btn.innerText;

      try {
        btn.disabled = true;
        btn.innerText = 'SENDING...';
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        
        if (result.success) {
          if (status) {
            status.innerText = 'MESSAGE SENT SUCCESSFULLY. WE WILL BE IN TOUCH.';
            status.classList.remove('hidden', 'text-red-500');
            status.classList.add('text-brand-btn');
          }
          form.reset();
        } else {
          throw new Error(result.error || 'Failed to send message');
        }
      } catch (err) {
        if (status) {
          status.innerText = 'ERROR: ' + err.message.toUpperCase();
          status.classList.remove('hidden', 'text-brand-btn');
          status.classList.add('text-red-500');
        }
      } finally {
        btn.disabled = false;
        btn.innerText = originalText;
      }
    });
  }

  async init() {
    const isCategoryPage = window.location.pathname.includes('category.html') || window.location.search.includes('c=');
    
    if (isCategoryPage) {
      // Handle individual category logic if needed, or fallback to general fetch
      await this.fetchAndRenderProducts();
    } else {
      await this.renderHomepage();
    }
  }

  async renderHomepage() {
    try {
      // CMS Fetch
      const [catsRes, prodsRes] = await Promise.all([
        fetch(`/api/categories?_t=${Date.now()}`),
        fetch(`/api/products?limit=24&_t=${Date.now()}`)
      ]);
      
      const categories = await catsRes.json();
      const productsData = await prodsRes.json();
      this.allProducts = Array.isArray(productsData) ? productsData : (productsData.products || []);

      // Render Categories
      const catGrid = document.getElementById('avory-categories-grid');
      if (catGrid && categories.length > 0) {
        catGrid.innerHTML = categories.slice(0, 4).map(c => `
          <a href="category.html?c=${c.slug}" class="block group">
            <div class="aspect-[4/5] bg-gray-100 overflow-hidden mb-4 relative">
              <img src="${c.image || `/assets/categories/${c.slug}.png`}" class="w-full h-full object-cover transition duration-700 group-hover:scale-105" onerror="this.src='/assets/products/premium_product_placeholder.png'">
            </div>
            <h3 class="text-sm uppercase tracking-widest text-center">${c.name}</h3>
          </a>
        `).join('');
      }

      // Render Products
      const prodGrid = document.getElementById('bestsellers-grid');
      if (prodGrid && this.allProducts.length > 0) {
        prodGrid.innerHTML = this.allProducts.slice(0, 12).map(p => this.createCardHTML(p)).join('');
      }

    } catch (err) {
      console.error('CMS Sync Error:', err);
    }
  }
  
  async fetchAndRenderProducts() {
      // Stub for category page rendering logic to avoid errors
      try {
          const prodsRes = await fetch(`/api/products?limit=50&_t=${Date.now()}`);
          const productsData = await prodsRes.json();
          this.allProducts = Array.isArray(productsData) ? productsData : (productsData.products || []);
          
          const prodGrid = document.getElementById('category-products-container') || document.getElementById('bestsellers-grid');
          if (prodGrid && this.allProducts.length > 0) {
              const urlParams = new URLSearchParams(window.location.search);
              const activeCategory = urlParams.get('c');
              
              let productsToRender = this.allProducts;
              if (activeCategory) {
                 productsToRender = this.allProducts.filter(p => p.category === activeCategory);
              }
              
              prodGrid.innerHTML = productsToRender.map(p => this.createCardHTML(p)).join('');
          }
      } catch(err) {
          console.error("Failed to render category products", err);
      }
  }

  createCardHTML(product) {
    const name = product.name || 'Premium Item';
    let img = product.image || `/assets/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    
    const price = product.price ? parseFloat(product.price).toFixed(2) : '0.00';
    const currency = product.currency === 'AED' ? 'د.إ ' : '$';

    return `
      <article class="boutique-card" data-id="${product.id}">
        <div class="boutique-img-wrap">
          <img src="${img}" alt="${name}" class="boutique-img" onerror="this.src='/assets/products/premium_product_placeholder.png'">
          <button class="boutique-quick-add" onclick="window.openQuickView('${product.id}'); event.preventDefault();">
            Quick Add
          </button>
        </div>
        <h3 class="boutique-title">${name}</h3>
        <p class="boutique-price">${currency}${price}</p>
      </article>
    `;
  }

  openQuickView(id) {
    // Simple redirect to cart or actual product page, or implement drawer
    const product = this.allProducts.find(p => String(p.id) === String(id));
    if(!product) return;
    
    // For exact Shopify feel, triggering an alert or adding to a cart object is standard before checkout
    console.log(`Adding ${product.name} to cart...`);
    alert(`Added ${product.name} to your cart!`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MRTApp();
});
