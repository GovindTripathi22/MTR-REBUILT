import './style.css';

// Minimalist text logo injection to match the new editorial header
const SVG_LOGO = `<span class="text-2xl font-headline font-bold tracking-widest uppercase text-primary">MRT</span>`;

const ID_MAP = {
  '1': 'home-kitchen',
  '2': 'beauty-personal-care',
  '3': 'health-wellness',
  '4': 'pet-supplies',
  '5': 'baby-kids-essentials',
  '6': 'electronics-accessories',
  '7': 'sports-fitness'
};

class MRTApp {
  constructor() {
    // 1. CRITICAL: Force visibility before anything else
    document.body.classList.add('loaded');
    document.body.style.opacity = '1';

    this.lenis = null;
    this.lenisDriverInitialized = false;
    this.lenisRafId = null;
    this.lenisTicker = null;
    this.quickViewCleanupPending = false;
    this.previousBodyOverflow = '';
    this.globalEventsBound = false;

    // 2. Buttery smooth Lenis on Desktop, Native on Mobile
    if (window.innerWidth > 768 && typeof Lenis !== 'undefined') {
      this.lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
      });

      if (typeof gsap !== 'undefined') {
        gsap.ticker.add((time) => { this.lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (time) => {
          this.lenis.raf(time);
          requestAnimationFrame(raf);
        };
        requestAnimationFrame(raf);
      }
    }

    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category') || urlParams.get('c');
    const id = urlParams.get('id');
    this.currentCategory = category || ID_MAP[id] || 'home-kitchen';

    this.isBoutique = window.location.pathname.includes('category.html');

    this.injectLogos();
    this.init();

    // Global state for Quick View and persistence
    this.allProducts = [];
    this.allCategories = [];

    // Bind global functions for onclick handlers
    window.openQuickView = (id) => this.openQuickView(id);
    window.closeQuickView = () => this.closeQuickView();
    window.openReviewModal = (id, name) => this.openReviewModal(id, name);
    window.mrtApp = this;
  }

  async init() {
    try {
      if (this.isBoutique || window.location.search.includes('c=')) {
        this.initBoutique();
      } else {
        this.renderDynamicHomepage();
      }
      this.initHeaderScroll();
      this.initScrollReveal();
      this.initContactForm();
      this.animateReveals();
      this.bindEvents();

    } catch (err) {
      console.error('MRTApp Initialization Error:', err);
    }
  }

  initScrollReveal() {
    // ScrollTrigger reveal logic is primarily in animateReveals
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
            status.classList.add('text-primary');
          }
          form.reset();
        } else {
          throw new Error(result.error || 'Failed to send message');
        }
      } catch (err) {
        if (status) {
          status.innerText = 'ERROR: ' + err.message.toUpperCase();
          status.classList.remove('hidden', 'text-primary');
          status.classList.add('text-red-500');
        }
      } finally {
        btn.disabled = false;
        btn.innerText = originalText;
      }
    });
  }


  injectLogos() {
    document.querySelectorAll('[data-logo]').forEach(el => {
      el.innerHTML = SVG_LOGO;
    });
  }

  // --- EDITORIAL PRODUCT CARD RENDERER ---
  createProductCard(product, options = {}) {
    try {
      const name = product.name || 'Premium Product';
      let image = product.image || '';
      
      if (!image || image.includes('placeholder')) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        image = `/assets/products/${cleanName}.png`;
      }

      const currency = product.currency || 'USD';
      const sym = currency === 'USD' ? '$' : (currency === 'AED' ? 'د.إ ' : currency + ' ');
      const hasPrice = product.price && parseFloat(product.price) > 0;
      const price = hasPrice ? parseFloat(product.price).toFixed(2) : '0.00';
      const oldPrice = (hasPrice && product.originalPrice > product.price) ? parseFloat(product.originalPrice).toFixed(2) : null;
      
      const badge = product.badge || 'Curated';
      const productId = product.id;
      const isCarousel = options.isCarousel || false;

      // Output using the new minimalist CSS classes
      return `
        <article class="mrt-product-card ${isCarousel ? 'flex-none w-[220px] md:w-[280px] snap-center' : ''} group" data-id="${productId}" data-enhanced-card>
          <div class="mrt-card-img-wrap">
            <div class="mrt-badge-row">
              <span class="mrt-badge-pill">${badge}</span>
            </div>
            <img src="${image}" alt="${name}" class="mrt-card-img" loading="lazy" onerror="this.src='/assets/products/premium_product_placeholder.png'">
            <div class="mrt-img-overlay">
              <button class="mrt-qv-overlay-btn" data-qv-btn data-id="${productId}">Quick View</button>
            </div>
          </div>
          <div class="mrt-card-body">
            <h3 class="mrt-card-name">${name}</h3>
            <div class="mrt-price-row">
              <span class="mrt-price">${sym}${price}</span>
              ${oldPrice ? `<span class="mrt-old-price">${sym}${oldPrice}</span>` : ''}
            </div>
          </div>
        </article>
      `;
    } catch (err) {
      console.error('Error creating product card:', err);
      return '';
    }
  }

  async renderDynamicHomepage() {
    try {
      console.log("[MRT] Initializing Editorial Homepage...");
      const [catsRes, productsRes] = await Promise.all([
        fetch(`/api/categories?_t=${Date.now()}`),
        fetch(`/api/products?limit=20&_t=${Date.now()}`)
      ]);
      
      const categories = await catsRes.json();
      const productsData = await productsRes.json();
      const products = Array.isArray(productsData) ? productsData : (productsData.products || []);
      
      if (categories && categories.length > 0) {
        this.allCategories = categories;
        this.allProducts = products;
        
        // 1. Render Editorial Curated Finds Grid
        const grid = document.getElementById('avory-categories-grid');
        if (grid) {
          grid.innerHTML = categories.slice(0, 4).map(c => `
            <a href="category.html?c=${c.slug}" class="group block cursor-pointer reveal-up">
              <div class="aspect-[3/4] bg-surface-dim mb-4 overflow-hidden rounded-sm">
                <img src="${c.image || `/assets/categories/${c.slug}.png`}" alt="${c.name}" class="w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" onerror="this.src='/assets/products/premium_product_placeholder.png'">
              </div>
              <h3 class="text-sm font-headline uppercase tracking-widest text-primary">${c.name}</h3>
              <p class="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1 group-hover:text-accent transition-colors">Explore Edit</p>
            </a>
          `).join('');
        }
        
        // 2. Render Seamless Trending Carousel
        const carousel = document.getElementById('bestsellers-carousel');
        if (carousel && products.length > 0) {
          carousel.innerHTML = products.slice(0, 10).map(p => this.createProductCard(p, { isCarousel: true })).join('');
        }
      }
    } catch (err) { 
      console.error('Editorial homepage sync failed:', err); 
    } finally { 
      if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); 
    }
  }

  async initBoutique() {
    const container = document.getElementById('category-products-container') || document.getElementById('avory-categories-grid');
    if (!container) return;

    try {
      const res = await fetch(`/api/categories/${this.currentCategory}?_t=${Date.now()}`);
      if (!res.ok) throw new Error('Category not found');

      const data = await res.json();
      const products = data.products || [];
      this.allProducts = products;
      
      if (products.length === 0) {
        container.innerHTML = `<p class="col-span-full text-center font-headline italic opacity-40 py-20">No items available in this collection.</p>`;
        return;
      }

      container.className = "grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8";
      container.innerHTML = products.map((p, i) => `
        <div class="reveal-up" style="animation-delay: ${i * 0.05}s">
          ${this.createProductCard(p)}
        </div>
      `).join('');

      document.title = `${data.name} | MRT International`;

    } catch (err) {
      console.error('Boutique sync failed:', err);
    }
  }

  initHeaderScroll() {
    const header = document.getElementById('header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('bg-surface/95', window.scrollY > 20);
      header.classList.toggle('shadow-avory-nav', window.scrollY > 20);
    });
  }

  animateReveals() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.reveal-up').forEach(el => {
      gsap.from(el, {
        scrollTrigger: { 
          trigger: el, 
          start: 'top 90%', 
          toggleActions: 'play none none none',
        },
        y: 20, 
        opacity: 0, 
        duration: 1, 
        ease: 'power3.out',
        clearProps: "all"
      });
    });
  }

  bindEvents() {
    // Horizontal scroll binding
    document.querySelectorAll('.nav-prev, .nav-next').forEach(btn => {
      if (btn.dataset.bound === 'true') return;
      btn.dataset.bound = 'true';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Look for the closest carousel wrapper
        const wrapper = btn.closest('section').querySelector('.hide-scrollbar');
        if (wrapper) wrapper.scrollBy({ left: btn.classList.contains('nav-prev') ? -300 : 300, behavior: 'smooth' });
      });
    });

    // Global event delegation for Quick View
    if (!this.globalEventsBound) {
      document.addEventListener('click', (e) => {
        const qvBtn = e.target.closest('[data-qv-btn]');
        if (qvBtn) {
          e.stopPropagation();
          this.openQuickView(qvBtn.dataset.id);
          return;
        }

        if (e.target.closest('a, button, input, textarea')) return;

        const card = e.target.closest('[data-enhanced-card]');
        if (card) {
          this.openQuickView(card.dataset.id);
        }
      });
      this.globalEventsBound = true;
    }
  }

  // --- EDITORIAL QUICK VIEW MODAL ---
  async openQuickView(productId) {
    const product = this.allProducts.find(p => String(p.id) === String(productId));
    if (!product) return;

    let modal = document.getElementById('mrt-qv-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'mrt-qv-modal';
      document.body.appendChild(modal);
    }

    const price = product.price ? parseFloat(product.price).toFixed(2) : '0.00';
    modal.classList.remove('is-open');

    // New Editorial structure (Taupe/Black/White)
    modal.innerHTML = `
      <div class="mrt-qv-backdrop" id="mrt-qv-backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);opacity:0;transition:opacity 0.4s;z-index:9998;"></div>
      <div class="mrt-qv-panel" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-48%);z-index:9999;display:flex;width:100%;max-width:850px;background:#faf9f6;box-shadow:0 20px 60px rgba(0,0,0,0.15);opacity:0;transition:all 0.5s cubic-bezier(0.2,1,0.2,1);border-radius:4px;overflow:hidden;flex-wrap:wrap;">
        
        <button class="mrt-qv-close" id="mrt-qv-close-btn" style="position:absolute;top:16px;right:20px;background:none;border:none;cursor:pointer;font-size:28px;color:#111;z-index:10;transition:transform 0.3s;" onmouseover="this.style.transform='rotate(90deg)'" onmouseout="this.style.transform='rotate(0deg)'">&times;</button>
        
        <div class="mrt-qv-img-col" style="flex:1;min-width:300px;background:#f4f2ee;">
          <img src="${product.image || '/assets/products/premium_product_placeholder.png'}" alt="${product.name}" style="width:100%;height:100%;object-fit:cover;aspect-ratio:3/4;">
        </div>
        
        <div class="mrt-qv-content-col" style="flex:1;min-width:300px;padding:48px 40px;display:flex;flex-direction:column;justify-content:center;">
          <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.25em;color:#8c6b4a;margin-bottom:12px;font-weight:700;">${product.category?.name || 'Exclusive Edit'}</span>
          <h2 style="font-size:28px;font-family:'Noto Serif',serif;color:#111;margin-bottom:16px;line-height:1.1;letter-spacing:-0.02em;">${product.name}</h2>
          <p style="font-size:13px;color:#5a5a5a;line-height:1.7;margin-bottom:32px;">${product.description || 'Meticulously sourced to meet global boutique standards. Discover the difference in detail.'}</p>
          
          <div style="margin-top:auto;">
            <div style="font-size:22px;color:#111;margin-bottom:24px;font-weight:400;">$${price}</div>
            <a href="${product.affiliateUrl || '#'}" target="_blank" style="display:block;width:100%;text-align:center;background:#111;color:#fff;padding:18px;text-transform:uppercase;letter-spacing:0.15em;font-size:10px;font-weight:700;text-decoration:none;transition:background 0.3s;" onmouseover="this.style.background='#8c6b4a'" onmouseout="this.style.background='#111'">Acquire Item</a>
          </div>
        </div>
      </div>
    `;

    document.getElementById('mrt-qv-backdrop').addEventListener('click', () => this.closeQuickView());
    document.getElementById('mrt-qv-close-btn').addEventListener('click', () => this.closeQuickView());

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.add('is-open');
        modal.querySelector('.mrt-qv-backdrop').style.opacity = '1';
        modal.querySelector('.mrt-qv-panel').style.opacity = '1';
        modal.querySelector('.mrt-qv-panel').style.transform = 'translate(-50%,-50%)'; // Snap exactly to center
      });
    });

    document.body.style.overflow = 'hidden';
  }

  closeQuickView() {
    const modal = document.getElementById('mrt-qv-modal');
    if (!modal) return;
    
    const panel = modal.querySelector('.mrt-qv-panel');
    const backdrop = modal.querySelector('.mrt-qv-backdrop');
    
    if (panel) {
      panel.style.opacity = '0';
      panel.style.transform = 'translate(-50%, -48%)';
    }
    if (backdrop) backdrop.style.opacity = '0';
    
    document.body.style.overflow = '';
    
    setTimeout(() => {
        modal.classList.remove('is-open');
        modal.innerHTML = '';
    }, 400); // Matches CSS transition time
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MRTApp();
});
