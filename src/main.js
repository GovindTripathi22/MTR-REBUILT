import './style.css';

/**
 * MRTApp - Main application class for MRT International Storefront
 * Manages mobile navigation, dynamic category filtering, and product rendering.
 */
class MRTApp {
  constructor() {
    this.allProducts = [];
    this.activeCategory = new URLSearchParams(window.location.search).get('c');
    this.init();
    
    // Bind global quick view for buttons
    window.quickAddProduct = (id) => this.quickAddProduct(id);
  }

  async init() {
    // 1. Setup Navigation logic
    this.setupMobileMenu();
    this.handleScroll();

    // 2. Identify and populate grid
    const homeGrid = document.getElementById('bestsellers-grid');
    const categoryGrid = document.getElementById('category-products-container');
    const communityGrid = document.getElementById('community-grid');
    
    if (homeGrid) {
      await this.fetchAndRender(homeGrid, 8);
    } else if (categoryGrid) {
      await this.fetchAndRender(categoryGrid, 50);
      this.updateCategoryUI();
    }

    if (communityGrid) {
      this.renderTestimonials(communityGrid);
    }
  }

  setupMobileMenu() {
    const menuBtn   = document.getElementById('mobileMenuToggle');
    const mobileNav = document.getElementById('mobileNav');
    const closeBtn  = document.getElementById('mobileNavClose');
    const backdrop  = document.getElementById('mobileNavBackdrop');

    if (menuBtn && mobileNav && closeBtn && backdrop) {
      menuBtn.addEventListener('click', () => {
        mobileNav.style.display = 'flex';
        setTimeout(() => mobileNav.classList.add('open'), 10);
      });
      
      const close = () => {
        mobileNav.classList.remove('open');
        setTimeout(() => mobileNav.style.display = 'none', 300);
      };
      
      closeBtn.addEventListener('click', close);
      backdrop.addEventListener('click', close);
    }
  }

  handleScroll() {
    const nav = document.querySelector('.mrt-nav');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    });
  }

  async fetchAndRender(container, limit) {
    try {
      const res = await fetch(`/api/products?_t=${Date.now()}`);
      const data = await res.json();
      this.allProducts = Array.isArray(data) ? data : (data.products || []);

      let productsToRender = this.allProducts;
      if (this.activeCategory) {
        // FIX: Match against p.category.slug instead of p.category object
        productsToRender = this.allProducts.filter(p => p.category && p.category.slug === this.activeCategory);
      }

      if (productsToRender.length > 0) {
        container.innerHTML = productsToRender.slice(0, limit).map(p => this.createProductCard(p)).join('');
      } else {
        container.innerHTML = `
          <div class="w-full text-center py-32 opacity-40">
            <span class="material-symbols-outlined mb-4" style="font-size: 48px;">inventory_2</span>
            <p class="text-xl">No products found in this collection.</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('MRT CMS Error:', err);
      container.innerHTML = '<p class="w-full text-center py-20 text-red-400">Unable to load products. Please refresh.</p>';
    }
  }

  updateCategoryUI() {
    if (this.activeCategory) {
      const titleEl = document.getElementById('category-title-display');
      if (titleEl) {
        titleEl.innerText = this.activeCategory.replace(/-/g, ' ').toUpperCase();
      }
      
      // Update Hero Background based on slug (Editorial mapping)
      const hero = document.getElementById('category-hero');
      if (hero) {
        const assetMap = {
          'home-kitchen': '/assets/editorial_v3/cat_home.png',
          'beauty-personal-care': '/assets/editorial_v3/cat_beauty.png',
          'health-wellness': '/assets/editorial_v3/cat_garden.png',
          'baby-kids-essentials': '/assets/editorial_v3/cat_kids.png',
          'electronics-accessories': '/assets/editorial_v3/cat_tech.png',
          'sports-fitness': '/assets/editorial_v3/cat_men.png'
        };
        const bg = assetMap[this.activeCategory] || '/assets/editorial_v3/hero.png';
        hero.style.backgroundImage = `url('${bg}')`;
      }
    }
  }

  createProductCard(product) {
    const name = product.name || 'Premium Item';
    const img = product.image || `/assets/products/premium_product_placeholder.png`;
    const priceStr = product.price ? parseFloat(product.price).toFixed(2) : '0.00';
    const currency = product.currency === 'AED' ? 'د.إ ' : '$';

    return `
      <article class="prod-card-v2" data-id="${product.id}">
          <div class="prod-card-img-wrap">
              <img src="${img}" alt="${name}" loading="lazy">
          </div>
          <div class="prod-card-info">
              <h3 class="prod-card-title">${name}</h3>
              <div class="prod-card-price">${currency}${priceStr}</div>
              <div class="prod-card-actions">
                  <a href="#" class="btn-details-avory" onclick="event.preventDefault(); window.quickAddProduct('${product.id}');">
                      DETAILS
                  </a>
                  <a href="#" class="btn-buy-avory" onclick="event.preventDefault(); window.quickAddProduct('${product.id}');">
                      BUY NOW
                  </a>
              </div>
          </div>
      </article>
    `;
  }

  async renderTestimonials(container) {
    try {
      const res = await fetch('/api/testimonials');
      const data = await res.json();
      
      if (data && data.length > 0) {
        const usTestimonials = data.filter(t => t.region === 'us');
        const uaeTestimonials = data.filter(t => t.region === 'ae');

        let html = '';

        if (usTestimonials.length > 0) {
          html += `
            <div class="testimonial-region">
              <h3 class="region-header">🇺🇸 United States Customers</h3>
              <div class="testimonial-grid">
                ${usTestimonials.map(t => this.createTestimonialCard(t)).join('')}
              </div>
            </div>
          `;
        }

        if (uaeTestimonials.length > 0) {
          html += `
            <div class="testimonial-region">
              <h3 class="region-header">🇦🇪 United Arab Emirates Customers</h3>
              <div class="testimonial-grid">
                ${uaeTestimonials.map(t => this.createTestimonialCard(t)).join('')}
              </div>
            </div>
          `;
        }
        
        container.innerHTML = html;
        container.classList.remove('testimonial-grid'); // Clean up old class if present
      }
    } catch (err) {
      console.error('Testimonials Error:', err);
    }
  }

  createTestimonialCard(t) {
    // Generate star icons based on rating
    const stars = Array(t.rating || 5)
      .fill('<span class="material-symbols-outlined testimonial-star">star</span>')
      .join('');

    return `
      <div class="testimonial-card">
        <div class="testimonial-stars-wrap">${stars}</div>
        <p class="testimonial-quote">"${t.quote}"</p>
        <p class="testimonial-text">${t.text}</p>
        <div class="testimonial-author">
          <div class="author-info">
            <p>— ${t.name}, ${t.location}</p>
          </div>
        </div>
      </div>
    `;
  }

  quickAddProduct(id) {
    const btn = document.querySelector(`.prod-card-v2[data-id="${id}"] .btn-buy-avory`);
    if (btn) {
      const original = btn.innerText;
      btn.innerText = 'ADDED';
      btn.style.background = '#4CAF50';
      setTimeout(() => {
        btn.innerText = original;
        btn.style.background = '';
      }, 1200);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MRTApp();
});
