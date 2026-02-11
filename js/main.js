// Mobile menu toggle
document.addEventListener('DOMContentLoaded', () => {
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
