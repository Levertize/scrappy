/**
 * AI Web Scraper — Login / Register Page Logic
 */

const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, redirect to dashboard
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/';
    return;
  }

  initTabs();
  initForms();
  initPasswordToggles();
});

/* ============================================
   TABS
   ============================================ */
function initTabs() {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // Update tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update forms
      forms.forEach(f => f.classList.remove('active'));
      document.getElementById(`${target}-form`).classList.add('active');

      // Clear messages
      hideMessages();
    });
  });
}

/* ============================================
   FORMS
   ============================================ */
function initForms() {
  // Login form
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('btn-login');

    if (!email || !password) {
      showError('Mohon isi semua field.');
      return;
    }

    setLoading(btn, true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Login failed.');
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showSuccess('Login berhasil! Redirecting...');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(btn, false);
    }
  });

  // Register form
  const registerForm = document.getElementById('register-form');
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMessages();

    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const btn = document.getElementById('btn-register');

    if (!username || !email || !password) {
      showError('Mohon isi semua field.');
      return;
    }

    if (username.length < 3) {
      showError('Username minimal 3 karakter.');
      return;
    }

    if (password.length < 6) {
      showError('Password minimal 6 karakter.');
      return;
    }

    setLoading(btn, true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'Registration failed.');
      }

      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showSuccess('Akun berhasil dibuat! Redirecting...');

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 800);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(btn, false);
    }
  });
}

/* ============================================
   PASSWORD TOGGLE
   ============================================ */
function initPasswordToggles() {
  const toggles = document.querySelectorAll('.password-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.dataset.target;
      const input = document.getElementById(targetId);
      const icon = toggle.querySelector('i');

      if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
      } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
      }
    });
  });
}

/* ============================================
   MESSAGES
   ============================================ */
function showError(message) {
  const el = document.getElementById('form-error');
  document.getElementById('error-text').textContent = message;
  el.classList.add('visible');
}

function showSuccess(message) {
  const el = document.getElementById('form-success');
  document.getElementById('success-text').textContent = message;
  el.classList.add('visible');
}

function hideMessages() {
  document.getElementById('form-error').classList.remove('visible');
  document.getElementById('form-success').classList.remove('visible');
}

function setLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}
