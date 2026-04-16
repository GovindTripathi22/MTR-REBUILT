import './style.css';

class MRTApp {
  constructor() {
    document.body.classList.add('loaded');
    document.body.style.opacity = '1';

    this.allProducts = [];
    this.init();
    this.initContactForm();
    
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
            status.classList.add('text-[#f87c47]');
          }
          form.reset();
        } else {
          throw new Error(result.error || 'Failed to send message');
        }
      } catch (err) {
        if (status) {
          status.innerText = 'ERROR: ' + err.message.toUpperCase();
          status.classList.remove('hidden', 'text-[#f87c47]');
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
      await this.fetchAndRenderProducts();
    } else {
      await this.renderHomepage();
    }
  }

  async renderHomepage() {
    try {
      const [catsRes, prodsRes] = await Promise.all([
        fetch(`/api/categories?_t=${Date.now()}`),
        fetch(`/api/products?limit=24&_t=${Date.now()}`)
      ]);
      
      const categories = await catsRes.json();
      const productsData = await prodsRes.json();
      this.allProducts = Array.isArray(productsData) ? productsData : (productsData.products || []);

      // No dynamic category rendering on home anymore as it's hardcoded in index.html for specific Unsplash aesthetic

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

    // Updated to match the "PDF" style.css structure
    return `
      <article class="product-item" data-id="${product.id}">
        <img src="${img}" alt="${name}" onerror="this.src='/assets/products/premium_product_placeholder.png'">
        <h3 class="product-title">${name}</h3>
        <p class="product-excerpt">${currency}${price}</p>
        <div class="product-buttons">
          <a class="btn-primary" onclick="window.openQuickView('${product.id}'); event.preventDefault();">Quick Add</a>
        </div>
      </article>
    `;
  }

  openQuickView(id) {
    const product = this.allProducts.find(p => String(p.id) === String(id));
    if(!product) return;
    
    console.log(`Adding ${product.name} to cart...`);
    alert(`Added ${product.name} to your cart!`);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MRTApp();
});
