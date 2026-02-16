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
  
  // Update page title
  const pageTitle = document.querySelector('title');
  if (pageTitle) {
    const titleKey = 'page_title_' + (window.location.pathname.includes('services') ? 'services' : 
                                      window.location.pathname.includes('team') ? 'team' :
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
    
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const data = {
        name: form.elements['name'].value,
        email: form.elements['email'].value,
        phone: form.elements['phone'].value || '',
        category: form.elements['category'] ? form.elements['category'].value : '',
        budget: form.elements['budget'] ? form.elements['budget'].value : '',
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
          alert((json && json.error) ? json.error : 'Error al enviar. Intenta más tarde.');
        }
      } catch (err) {
        console.error('Form error:', err);
        alert('No se pudo enviar el formulario. Verifica tu conexión con el servidor.');
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
    grid.innerHTML = '<div class="testimonial-loading">Cargando reseñas...</div>';
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
            <h3>Sin reseñas aún</h3>
            <p>¡Sé el primero en dejar una reseña sobre nuestro trabajo!</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = '';
      renderMoreReviews();
    } catch (err) {
      console.error('Load reviews error:', err);
      grid.innerHTML = '<div class="no-reviews">Error al cargar las reseñas.</div>';
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
        <p>${escapeHtml(r.text)}</p>
        <div class="testimonial-author">
          <img src="https://i.pravatar.cc/50?u=${encodeURIComponent(r.email)}" alt="${escapeHtml(r.name)}">
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
      btn.textContent = 'Ещё отзывы';
      btn.addEventListener('click', renderMoreReviews);
      container.appendChild(btn);
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]);
    });
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
      modal.classList.add('active');
    });
  }

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
          alert((json && json.error) ? json.error : 'Error submitting review. Please try again.');
        }
      } catch (err) {
        console.error('Review error:', err);
        alert('Failed to submit review. Please check your connection.');
      }
    });
  }
  // initial load of reviews
  loadReviews();
});
