// Language switching
let currentLanguage = localStorage.getItem('language') || 'en';

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
  
  // Language dropdown functionality
  const langTrigger = document.getElementById('lang-trigger');
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
        const res = await fetch('http://localhost:3000/api/contact', {
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
          alert((json && json.error) ? json.error : 'Ошибка отправки. Попробуйте позже.');
        }
      } catch (err) {
        console.error('Form error:', err);
        alert('Не удалось отправить форму. Проверьте соединение с сервером.');
      }
    });
  }
});
