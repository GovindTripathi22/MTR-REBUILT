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
      // If we are on a specific category page, we fetch category details (theme + products)
      if (this.activeCategory) {
        const res = await fetch(`/api/categories/${this.activeCategory}?_t=${Date.now()}`);
        const categoryData = await res.json();
        
        if (categoryData && categoryData.products) {
          this.updateCategoryUI(categoryData); // Pass the full theme data

          const products = categoryData.products;
          
          if (products.length > 0) {
            container.innerHTML = products.map(p => this.createProductCard(p)).join('');
            container.classList.add('avory-product-grid'); // Restore grid styling
          } else {
            container.innerHTML = '<p class="text-center py-20 opacity-40">No products found in this collection.</p>';
          }
        }
      } else {
        // Fallback for general products list (e.g., Homepage)
        const res = await fetch(`/api/products?_t=${Date.now()}`);
        const data = await res.json();
        const products = Array.isArray(data) ? data : (data.products || []);
        
        if (products.length > 0) {
          container.innerHTML = products.slice(0, limit).map(p => this.createProductCard(p)).join('');
        } else {
          container.innerHTML = '<p class="text-center py-20 opacity-40">No curated finds available.</p>';
        }
      }
    } catch (err) {
      console.error('MRT CMS Error:', err);
      container.innerHTML = '<p class="w-full text-center py-20 text-red-400">Unable to load products. Please refresh.</p>';
    }
  }

  updateCategoryUI(categoryData) {
    const titleEl = document.getElementById('category-title-display');
    const descEl = document.getElementById('category-desc-display');
    
    if (categoryData && categoryData.theme) {
      const theme = categoryData.theme;
      if (titleEl) titleEl.innerText = theme.seoTitle || categoryData.name.toUpperCase();
      if (descEl)  descEl.innerText  = theme.seoIntro || theme.subtitle || '';
    }

    // Update Hero Background
    const hero = document.getElementById('category-hero');
    if (hero) {
      const assetMap = {
        'home-kitchen': '/assets/editorial_v3/cat_home.png',
        'beauty-personal-care': '/assets/editorial_v3/cat_beauty.png',
        'health-wellness': '/assets/editorial_v3/cat_health.png',
        'baby-kids-essentials': '/assets/editorial_v3/cat_kids.png',
        'electronics-accessories': '/assets/editorial_v3/cat_tech.png',
        'sports-fitness': '/assets/editorial_v3/cat_men.png',
        'pet-supplies': '/assets/editorial_v3/cat_pets.png'
      };
      const bg = assetMap[this.activeCategory] || '/assets/editorial_v3/hero.png';
      hero.style.backgroundImage = `url('${bg}')`;
    }
  }

  createProductCard(p) {
    const isAffiliate = p.affiliateUrl && p.affiliateUrl.length > 5;
    const buyUrl = isAffiliate ? p.affiliateUrl : `product.html?id=${p.id}`;
    
    return `
      <article class="product-card">
          <div class="image-wrapper">
              <img src="${p.image}" alt="${p.name}" loading="lazy">
          </div>
          <div class="product-info">
              <h2>${p.name}</h2>
              <a href="${buyUrl}" target="_blank" class="btn-primary">Buy Now</a>
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
    // Flag mapping
    const flags = {
      'us': '🇺🇸',
      'ae': '🇦🇪',
      'uk': '🇬🇧',
      'ca': '🇨🇦'
    };
    const flag = flags[(t.region || '').toLowerCase()] || '🌍';

    // Generate star icons based on rating
    const stars = Array(t.rating || 5)
      .fill('<span class="material-symbols-outlined testimonial-star">star</span>')
      .join('');

    const quoteHtml = t.quote && t.quote !== 'null' ? `<p class="testimonial-quote">"${t.quote}"</p>` : '';
    const textHtml = t.text && t.text !== 'null' ? `<p class="testimonial-text">${t.text}</p>` : '';

    return `
      <div class="testimonial-card">
        <div class="testimonial-badge">
          <span class="material-symbols-outlined" style="font-size: 14px;">verified</span>
          Verified Buyer
        </div>
        <div class="testimonial-stars-wrap">${stars}</div>
        ${quoteHtml}
        ${textHtml}
        <div class="testimonial-author">
          <div class="author-flag">${flag}</div>
          <div class="author-info">
            <h4>${t.name || 'Anonymous'}</h4>
            <p>${t.location || ''}</p>
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
