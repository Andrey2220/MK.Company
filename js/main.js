// Language switching
let currentLanguage = localStorage.getItem('language') || 'es';

function loadTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLanguage][key]) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = translations[currentLanguage][key];
      } else if (el.tagName === 'OPTION') {
        el.textContent = translations[currentLanguage][key];
      } else {
        el.innerHTML = translations[currentLanguage][key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (translations[currentLanguage][key]) {
      el.setAttribute('aria-label', translations[currentLanguage][key]);
    }
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (translations[currentLanguage][key]) {
      el.setAttribute('title', translations[currentLanguage][key]);
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (translations[currentLanguage][key]) {
      el.setAttribute('placeholder', translations[currentLanguage][key]);
    }
  });
  
  // Update page title
  const pageTitle = document.querySelector('title');
  if (pageTitle) {
    const titleKey = 'page_title_' + (window.location.pathname.includes('services') ? 'services' : 
                                      window.location.pathname.includes('team') ? 'team' :
                                      window.location.pathname.includes('gallery') ? 'gallery' :
                                      window.location.pathname.includes('contact') ? 'contact' : 'home');
    if (translations[currentLanguage][titleKey]) {
      pageTitle.textContent = translations[currentLanguage][titleKey];
    }
  }
  
  // Update html lang attribute
  document.documentElement.lang = currentLanguage;
  
  // Save language preference
  localStorage.setItem('language', currentLanguage);
}

function setLanguage(lang) {
  if (translations[lang]) {
    currentLanguage = lang;
    loadTranslations();
    
    // Update trigger button text
    const trigger = document.getElementById('lang-trigger');
    if (trigger) {
      trigger.textContent = (lang === 'en' ? 'EN' : 'ES') + ' \u25bc';
    }
    
    // Update active language option
    document.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      }
    });
  }
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
  let commentsEnabled = false;
  let galleryItemsData = [];

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
  }

  function t(key, fallback = '') {
    return (translations[currentLanguage] && translations[currentLanguage][key])
      ? translations[currentLanguage][key]
      : fallback;
  }

  function normalizeName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function getReviewAvatarUrl(review) {
    if (review && typeof review.avatar === 'string' && review.avatar.trim()) {
      return review.avatar.trim();
    }

    const normalized = normalizeName(review && review.name);
    const femaleNames = new Set(['elena', 'anna', 'maria', 'sofia', 'olga', 'julia', 'julia', 'elena']);
    const maleNames = new Set(['maxim', 'maksim', 'andres', 'alex', 'alejandro', 'sergey', 'ivan', 'dmitry']);

    if (femaleNames.has(normalized)) {
      return `https://randomuser.me/api/portraits/women/${(normalized.length % 60) + 10}.jpg`;
    }

    if (maleNames.has(normalized)) {
      return `https://randomuser.me/api/portraits/men/${(normalized.length % 60) + 10}.jpg`;
    }

    return 'https://ui-avatars.com/api/?name=User&background=e5e7eb&color=374151&size=128';
  }

  function renderGalleryItems(items) {
    const galleryGrid = document.getElementById('gallery-grid');
    if (!galleryGrid || !Array.isArray(items) || !items.length) return;

    galleryItemsData = items.map((item) => {
      const normalizedImages = Array.isArray(item.images)
        ? item.images
            .filter((img) => typeof img === 'string')
            .map((img) => img.trim())
            .filter((img) => !!img)
        : [];
      const cover = (typeof item.image === 'string' ? item.image.trim() : '') || normalizedImages[0] || '';
      const images = normalizedImages.length ? normalizedImages : (cover ? [cover] : []);

      return {
        image: cover,
        images,
        alt: item.alt || '',
        title: item.title || '',
        description: item.description || ''
      };
    }).filter((item) => !!item.image);

    galleryGrid.innerHTML = galleryItemsData.map((item, index) => {
      const titleKey = `gallery_card_${index + 1}_title`;
      const descKey = `gallery_card_${index + 1}_desc`;
      const hasTitleTranslation = !!(translations.en && translations.en[titleKey]);
      const hasDescTranslation = !!(translations.en && translations.en[descKey]);

      return `
      <div class="gallery-item" data-card-index="${index}">
        <img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.alt || '')}" class="gallery-image">
        <div class="gallery-info">
          <h3${hasTitleTranslation ? ` data-i18n="${titleKey}"` : ''}>${escapeHtml(item.title || '')}</h3>
          <p${hasDescTranslation ? ` data-i18n="${descKey}"` : ''}>${escapeHtml(item.description || '')}</p>
        </div>
      </div>
    `;
    }).join('');

    loadTranslations();
  }

  async function loadPublicSiteConfig() {
    try {
      const [configRes, overridesRes, galleryRes] = await Promise.all([
        fetch('/api/public/config'),
        fetch('/api/public/overrides'),
        fetch('/api/public/gallery')
      ]);

      if (configRes.ok) {
        const configJson = await configRes.json();
        commentsEnabled = !!(configJson && configJson.commentsEnabled);
      }

      if (overridesRes.ok) {
        const overridesJson = await overridesRes.json();
        if (overridesJson && overridesJson.ok && Array.isArray(overridesJson.overrides)) {
          applyOverrides(overridesJson.overrides);
        }
      }

      if (galleryRes.ok) {
        const galleryJson = await galleryRes.json();
        if (galleryJson && galleryJson.ok && Array.isArray(galleryJson.galleryItems)) {
          renderGalleryItems(galleryJson.galleryItems);
        }
      }
    } catch (error) {
      console.warn('Site config is unavailable', error);
    }
  }

  function applyOverrides(overrides) {
    overrides.forEach((override) => {
      if (!override || !override.selector || !override.type) return;

      try {
        const elements = document.querySelectorAll(override.selector);
        elements.forEach((element) => {
          if (override.type === 'text') {
            element.textContent = override.value || '';
          } else if (override.type === 'html') {
            element.innerHTML = override.value || '';
          } else if (override.type === 'src' && 'src' in element) {
            element.src = override.value || '';
          }
        });
      } catch (error) {
        console.warn('Invalid override selector:', override.selector);
      }
    });
  }

  // Load translations on page load
  loadTranslations();
  
  // Set initial language button text
  const langTrigger = document.getElementById('lang-trigger');
  if (langTrigger) {
    langTrigger.textContent = (currentLanguage === 'en' ? 'EN' : 'ES') + ' \u25bc';
  }
  
  // Mark current language as active
  document.querySelectorAll('.lang-option').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-lang') === currentLanguage) {
      btn.classList.add('active');
    }
  });
  
  // Language dropdown functionality
  const langMenu = document.getElementById('lang-menu');
  
  if (langTrigger && langMenu) {
    // Toggle dropdown on trigger click
    langTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      langMenu.classList.toggle('active');
    });
    
    // Handle language option click
    document.querySelectorAll('.lang-option').forEach(btn => {
      // Set active option on load
      if (btn.getAttribute('data-lang') === currentLanguage) {
        btn.classList.add('active');
      }
      
      btn.addEventListener('click', () => {
        setLanguage(btn.getAttribute('data-lang'));
        langMenu.classList.remove('active');
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.lang-dropdown')) {
        langMenu.classList.remove('active');
      }
    });
  }
  
  const burger = document.getElementById('burger-menu');
  const navMenu = document.getElementById('nav-menu');

  if (burger && navMenu) {
    burger.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close menu when nav link is clicked
    document.querySelectorAll('.nav a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.site-header')) {
        navMenu.classList.remove('active');
      }
    });
  }

  // Form submission
  const form = document.getElementById('contact-form');
  const success = document.getElementById('form-success');

  if (form) {
    // Set category from URL parameter if present
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    if (categoryParam) {
      const categorySelect = form.elements['category'];
      if (categorySelect) {
        categorySelect.value = categoryParam;
      }
    }
    
    // Handle custom budget input
    const budgetSelect = document.getElementById('budget-select');
    const customBudgetLabel = document.getElementById('custom-budget-label');
    
    if (budgetSelect && customBudgetLabel) {
      budgetSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customBudgetLabel.style.display = 'block';
        } else {
          customBudgetLabel.style.display = 'none';
          document.querySelector('input[name="custom_budget"]').value = '';
        }
      });
    }
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      let budget = form.elements['budget'] ? form.elements['budget'].value : '';
      if (budget === 'custom') {
        const customBudgetValue = document.querySelector('input[name="custom_budget"]').value;
        budget = customBudgetValue ? `€${customBudgetValue}` : t('budget_custom', 'Custom amount');
      }

      const data = {
        name: form.elements['name'].value,
        email: form.elements['email'].value,
        phone: form.elements['phone'].value || '',
        category: form.elements['category'] ? form.elements['category'].value : '',
        budget: budget,
        message: form.elements['message'].value || ''
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const json = await res.json();

        if (res.ok && json.ok) {
          form.reset();
          if (success) {
            success.hidden = false;
            setTimeout(() => {
              success.hidden = true;
            }, 5000);
          }
        } else {
          alert((json && json.error) ? json.error : t('form_submit_error', 'Failed to send. Please try later.'));
        }
      } catch (err) {
        console.error('Form error:', err);
        alert(t('form_submit_connection', 'Could not submit the form. Please check your connection.'));
      }
    });
  }

  // Review Modal Handler
  // Load and render reviews gallery
  let reviewsData = [];
  let displayedCount = 0;
  const REVIEWS_PER_PAGE = 3;

  async function loadReviews() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;
    grid.innerHTML = `<div class="testimonial-loading">${t('reviews_loading', 'Loading reviews...')}</div>`;
    displayedCount = 0;
    try {
      const res = await fetch('/api/reviews');
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json && json.error ? json.error : 'Failed to load');

      reviewsData = (json.reviews || []).sort((a,b)=> (new Date(b.date)) - (new Date(a.date)));
      if (reviewsData.length === 0) {
        grid.innerHTML = `
          <div class="no-reviews">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⭐</div>
            <h3 data-i18n="reviews_empty_title">${t('reviews_empty_title', 'No reviews yet')}</h3>
            <p data-i18n="reviews_empty_text">${t('reviews_empty_text', 'Be the first to leave a review about our work!')}</p>
          </div>
        `;
        loadTranslations();
        return;
      }

      grid.innerHTML = '';
      renderMoreReviews();
    } catch (err) {
      console.error('Load reviews error:', err);
      grid.innerHTML = `<div class="no-reviews">${t('reviews_load_error', 'Failed to load reviews.')}</div>`;
    }
  }

  function renderMoreReviews() {
    const grid = document.getElementById('testimonials-grid');
    const endIdx = Math.min(displayedCount + REVIEWS_PER_PAGE, reviewsData.length);
    for (let i = displayedCount; i < endIdx; i++) {
      const r = reviewsData[i];
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      const card = document.createElement('div');
      card.className = 'testimonial-card';
      card.innerHTML = `
        <div class="stars">${stars}</div>
        <p>${escapeHtml(r.text || '')}</p>
        <div class="testimonial-author">
          <img src="${escapeHtml(getReviewAvatarUrl(r))}" alt="${escapeHtml(r.name)}">
          <div>
            <strong>${escapeHtml(r.name)}</strong>
            <small>${new Date(r.date).toLocaleDateString()}</small>
          </div>
        </div>`;
      grid.appendChild(card);
    }
    displayedCount = endIdx;

    // Add "Load More" button if there are more reviews
    const container = document.getElementById('load-more-container');
    container.innerHTML = '';
    if (endIdx < reviewsData.length) {
      const btn = document.createElement('button');
      btn.className = 'load-more-btn';
      btn.setAttribute('data-i18n', 'reviews_load_more');
      btn.textContent = (translations[currentLanguage] && translations[currentLanguage].reviews_load_more)
        ? translations[currentLanguage].reviews_load_more
        : 'More reviews';
      btn.addEventListener('click', renderMoreReviews);
      container.appendChild(btn);
    }
  }

  const modal = document.getElementById('review-modal');
  const reviewBtn = document.getElementById('leave-review-btn');
  const modalClose = document.getElementById('modal-close');
  const reviewForm = document.getElementById('review-form');
  const stars = document.querySelectorAll('.star');
  const ratingInput = document.querySelector('input[name="rating"]');
  const reviewSuccess = document.getElementById('review-success');

  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      if (!commentsEnabled) {
        return;
      }
      modal.classList.add('active');
    });
  }

  loadPublicSiteConfig().then(() => {
    if (reviewBtn) {
      reviewBtn.style.display = commentsEnabled ? '' : 'none';
      if (!commentsEnabled && modal) {
        modal.classList.remove('active');
      }
    }
  });

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });

  // Star Rating Handler
  stars.forEach(star => {
    star.addEventListener('click', (e) => {
      e.preventDefault();
      const value = parseInt(star.getAttribute('data-value'));
      ratingInput.value = value;

      stars.forEach(s => {
        const sValue = parseInt(s.getAttribute('data-value'));
        if (sValue <= value) {
          s.classList.add('active');
          s.classList.remove('hover');
        } else {
          s.classList.remove('active');
        }
      });
    });

    star.addEventListener('mouseenter', () => {
      const value = parseInt(star.getAttribute('data-value'));
      stars.forEach(s => {
        const sValue = parseInt(s.getAttribute('data-value'));
        if (sValue <= value) {
          s.classList.add('hover');
        } else {
          s.classList.remove('hover');
        }
      });
    });
  });

  const starsContainer = document.querySelector('.star-rating');
  if (starsContainer) {
    starsContainer.addEventListener('mouseleave', () => {
      stars.forEach(s => {
        if (!s.classList.contains('active')) {
          s.classList.remove('hover');
        }
      });
    });
  }

  // Review Form Submission
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!commentsEnabled) {
        alert(t('reviews_disabled_alert', 'Reviews are currently disabled.'));
        return;
      }

      const data = {
        name: reviewForm.elements['name'].value,
        email: reviewForm.elements['email'].value,
        rating: parseInt(reviewForm.elements['rating'].value),
        text: reviewForm.elements['text'].value
      };

      try {
        const res = await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });

        const json = await res.json();

        if (res.ok && json.ok) {
          reviewForm.reset();
          stars.forEach(s => s.classList.remove('active'));
          ratingInput.value = 5;

          if (reviewSuccess) {
            reviewSuccess.hidden = false;
            // reload gallery and close modal shortly after
            loadReviews();
            setTimeout(() => {
              modal.classList.remove('active');
              reviewSuccess.hidden = true;
            }, 1200);
          }
        } else {
          alert((json && json.error) ? json.error : t('reviews_submit_error', 'Error submitting review. Please try again.'));
        }
      } catch (err) {
        console.error('Review error:', err);
        alert(t('reviews_submit_connection', 'Failed to submit review. Please check your connection.'));
      }
    });
  }

  const galleryGrid = document.getElementById('gallery-grid');
  if (galleryGrid) {
    const lightbox = document.createElement('div');
    lightbox.className = 'gallery-lightbox';
    lightbox.innerHTML = `
      <button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" aria-label="${escapeHtml(t('gallery_prev', 'Previous'))}">‹</button>
      <button type="button" class="gallery-lightbox-close" aria-label="${escapeHtml(t('gallery_close', 'Close'))}">×</button>
      <img src="" alt="Preview" class="gallery-lightbox-image">
      <button type="button" class="gallery-lightbox-nav gallery-lightbox-next" aria-label="${escapeHtml(t('gallery_next', 'Next'))}">›</button>
    `;
    document.body.appendChild(lightbox);

    const lightboxImg = lightbox.querySelector('.gallery-lightbox-image');
    const lightboxClose = lightbox.querySelector('.gallery-lightbox-close');
    const lightboxPrev = lightbox.querySelector('.gallery-lightbox-prev');
    const lightboxNext = lightbox.querySelector('.gallery-lightbox-next');
    let currentCardImages = [];
    let currentCardImageIndex = -1;

    function updateCardNavigationVisibility() {
      const hasMany = currentCardImages.length > 1;
      lightboxPrev.hidden = !hasMany;
      lightboxNext.hidden = !hasMany;
    }

    function showImageByIndex(index, withTransition = true) {
      if (!currentCardImages.length) return;

      const total = currentCardImages.length;
      currentCardImageIndex = (index + total) % total;
      const imageData = currentCardImages[currentCardImageIndex];
      const nextSrc = imageData.src;
      const nextAlt = imageData.alt || t('gallery_preview_alt', 'Preview');

      if (!withTransition) {
        lightboxImg.src = nextSrc;
        lightboxImg.alt = nextAlt;
        return;
      }

      lightboxImg.classList.add('is-changing');
      window.setTimeout(() => {
        lightboxImg.src = nextSrc;
        lightboxImg.alt = nextAlt;
        lightboxImg.classList.remove('is-changing');
      }, 140);
    }

    galleryGrid.addEventListener('click', (event) => {
      const card = event.target.closest('.gallery-item');
      if (!card) return;

      const cardIndex = Number(card.getAttribute('data-card-index'));
      const selectedCard = Number.isInteger(cardIndex) ? galleryItemsData[cardIndex] : null;
      if (!selectedCard || !Array.isArray(selectedCard.images) || !selectedCard.images.length) {
        const image = card.querySelector('img');
        if (!image) return;

        currentCardImages = [{
          src: image.src,
          alt: image.alt || t('gallery_preview_alt', 'Preview')
        }];
      } else {
        currentCardImages = selectedCard.images.map((src) => ({
          src,
          alt: selectedCard.alt || selectedCard.title || t('gallery_preview_alt', 'Preview')
        }));
      }

      updateCardNavigationVisibility();

      showImageByIndex(0, false);
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    function closeLightbox() {
      lightbox.classList.remove('active');
      lightboxImg.src = '';
      currentCardImages = [];
      currentCardImageIndex = -1;
      document.body.style.overflow = '';
    }

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', () => showImageByIndex(currentCardImageIndex - 1));
    lightboxNext.addEventListener('click', () => showImageByIndex(currentCardImageIndex + 1));

    lightbox.addEventListener('click', (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });

    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && lightbox.classList.contains('active')) {
        closeLightbox();
        return;
      }

      if (!lightbox.classList.contains('active')) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        showImageByIndex(currentCardImageIndex - 1);
      } else if (event.key === 'ArrowRight') {
        showImageByIndex(currentCardImageIndex + 1);
      }
    });
  }
  // initial load of reviews
  loadReviews();
});
