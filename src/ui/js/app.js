/**
 * AI Web Scraper — Dashboard Application Logic
 * Handles interactivity, animations, and mock data flows
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initChat();
  initAnimations();
  initTooltips();
});

/* ============================================
   NAVIGATION
   ============================================ */
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Add active class to clicked
      item.classList.add('active');
      
      // Add a subtle ripple effect
      createRipple(item, e);
    });
  });
}

function createRipple(element, event) {
  const ripple = document.createElement('span');
  const rect = element.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  
  ripple.style.cssText = `
    position: absolute;
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    background: rgba(99, 102, 241, 0.15);
    transform: scale(0);
    animation: rippleEffect 0.6s ease-out;
    left: ${event.clientX - rect.left - size / 2}px;
    top: ${event.clientY - rect.top - size / 2}px;
    pointer-events: none;
  `;
  
  element.style.position = 'relative';
  element.style.overflow = 'hidden';
  element.appendChild(ripple);
  
  ripple.addEventListener('animationend', () => ripple.remove());
}

// Add ripple keyframes dynamically
const rippleStyle = document.createElement('style');
rippleStyle.textContent = `
  @keyframes rippleEffect {
    to {
      transform: scale(2.5);
      opacity: 0;
    }
  }
`;
document.head.appendChild(rippleStyle);

/* ============================================
   CHAT FUNCTIONALITY
   ============================================ */
function initChat() {
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('btn-chat-send');
  const chatMessages = document.getElementById('chat-messages');

  // Send message on button click
  sendBtn.addEventListener('click', () => sendMessage());

  // Send message on Enter key
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    appendMessage('user', text);
    chatInput.value = '';

    // Simulate AI thinking
    setTimeout(() => {
      const aiResponse = generateAIResponse(text);
      appendMessage('ai', aiResponse);
    }, 1000 + Math.random() * 1500);
  }

  function appendMessage(type, text) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    if (type === 'user') {
      messageDiv.innerHTML = `
        <div class="chat-bubble">
          ${escapeHtml(text)}
          <div class="chat-time">${timeStr} <span class="chat-check">✓✓</span></div>
        </div>
      `;
    } else {
      messageDiv.innerHTML = `
        <div class="chat-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-bubble">
          ${text}
          <div class="chat-time">${timeStr}</div>
        </div>
      `;
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function generateAIResponse(question) {
    const responses = [
      'Berdasarkan data yang telah di-scrape, saya menemukan <strong>126 produk</strong> dari tokopedia.com/kategori/elektronik. Rata-rata harga produk adalah <strong>Rp 17.699.200</strong>.',
      'Dari 5 produk teratas berdasarkan rating, <strong>iPhone 15 Pro Max</strong> dan <strong>MacBook Air M2</strong> memiliki rating tertinggi yaitu <strong>4.9 ⭐</strong>.',
      'Saya menemukan <strong>3 produk</strong> dengan harga di bawah Rp 10.000.000. Produk termurah adalah <strong>Sony WH-1000XM5</strong> seharga Rp 5.499.000.',
      'Analisis tren harga menunjukkan bahwa kategori <strong>smartphone</strong> memiliki rata-rata harga lebih tinggi dibanding kategori <strong>laptop</strong> dalam data yang tersedia.',
      'Terdapat <strong>5 toko official</strong> dalam data scraping terakhir. Semua produk dari toko official memiliki rating di atas <strong>4.5 ⭐</strong>.',
      'Berdasarkan data terakhir, tidak ada produk yang mengalami perubahan harga dalam 24 jam terakhir. Saya akan memberitahu Anda jika ada perubahan.',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/* ============================================
   ANIMATIONS & INTERACTIONS
   ============================================ */
function initAnimations() {
  // Hover effect on table rows
  const tableRows = document.querySelectorAll('.data-table tbody tr, .extracted-table tbody tr');
  tableRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      row.style.transform = 'scale(1.005)';
      row.style.transition = 'transform 0.15s ease';
    });
    row.addEventListener('mouseleave', () => {
      row.style.transform = 'scale(1)';
    });
  });

  // Animate plan stat bars on load
  const statFills = document.querySelectorAll('.plan-stat-fill');
  statFills.forEach((fill, index) => {
    const targetWidth = fill.style.width;
    fill.style.width = '0%';
    setTimeout(() => {
      fill.style.width = targetWidth;
    }, 300 + index * 150);
  });

  // Button hover effects
  const buttons = document.querySelectorAll('.btn-primary, .btn-outline, .card-action');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transition = 'all 0.2s ease';
    });
  });

  // Quick Start card pulse effect
  const quickStart = document.getElementById('quick-start-card');
  if (quickStart) {
    quickStart.addEventListener('mouseenter', () => {
      quickStart.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.12)';
      quickStart.style.transition = 'box-shadow 0.3s ease';
    });
    quickStart.addEventListener('mouseleave', () => {
      quickStart.style.boxShadow = 'none';
    });
  }

  // Counter animation for stats
  animateCounters();

  // Intersection Observer for scroll animations
  initScrollAnimations();
}

function animateCounters() {
  const counters = document.querySelectorAll('[data-count]');
  counters.forEach(counter => {
    const target = parseInt(counter.dataset.count);
    let current = 0;
    const increment = target / 40;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        counter.textContent = target;
        clearInterval(timer);
      } else {
        counter.textContent = Math.floor(current);
      }
    }, 30);
  });
}

function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.card').forEach(card => {
    observer.observe(card);
  });
}

/* ============================================
   TOOLTIPS
   ============================================ */
function initTooltips() {
  // URL truncation hover shows full URL
  const urlLinks = document.querySelectorAll('.url-link');
  urlLinks.forEach(link => {
    link.title = link.textContent;
    link.style.cursor = 'pointer';
    
    link.addEventListener('click', () => {
      // Visual feedback
      const originalColor = link.style.color;
      link.style.color = 'var(--primary-700)';
      setTimeout(() => {
        link.style.color = originalColor;
      }, 200);
    });
  });

  // More button dropdown simulation
  const moreBtns = document.querySelectorAll('.more-btn');
  moreBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showContextMenu(btn);
    });
  });
}

function showContextMenu(button) {
  // Remove existing menus
  const existing = document.querySelector('.context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.cssText = `
    position: absolute;
    background: white;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    padding: 4px;
    z-index: 1000;
    min-width: 160px;
    animation: fadeInUp 0.2s ease-out;
  `;

  const items = [
    { icon: 'fa-eye', label: 'View Data', color: '' },
    { icon: 'fa-redo', label: 'Re-run Scrape', color: '' },
    { icon: 'fa-download', label: 'Export', color: '' },
    { icon: 'fa-clock', label: 'Schedule', color: '' },
    { icon: 'fa-trash', label: 'Delete', color: 'var(--error)' },
  ];

  items.forEach(item => {
    const menuItem = document.createElement('div');
    menuItem.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 0.82rem;
      color: ${item.color || 'var(--text-primary)'};
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.15s ease;
    `;
    menuItem.innerHTML = `<i class="fas ${item.icon}" style="width: 16px; text-align: center;"></i> ${item.label}`;
    menuItem.addEventListener('mouseenter', () => {
      menuItem.style.background = item.color ? 'var(--error-light)' : 'var(--gray-50)';
    });
    menuItem.addEventListener('mouseleave', () => {
      menuItem.style.background = 'transparent';
    });
    menuItem.addEventListener('click', () => {
      menu.remove();
    });
    menu.appendChild(menuItem);
  });

  // Position the menu
  const rect = button.getBoundingClientRect();
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left - 140}px`;
  
  document.body.appendChild(menu);

  // Close on outside click
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) {
      menu.remove();
      document.removeEventListener('click', closeMenu);
    }
  };
  setTimeout(() => document.addEventListener('click', closeMenu), 10);
}

/* ============================================
   NOTIFICATION BUTTON
   ============================================ */
const notifBtn = document.getElementById('btn-notifications');
if (notifBtn) {
  notifBtn.addEventListener('click', () => {
    const badge = notifBtn.querySelector('.notification-badge');
    if (badge) {
      badge.style.transform = 'scale(0)';
      badge.style.transition = 'transform 0.3s ease';
      setTimeout(() => badge.remove(), 300);
    }
  });
}

/* ============================================
   NEW CHAT BUTTON
   ============================================ */
const newChatBtn = document.getElementById('btn-new-chat');
if (newChatBtn) {
  newChatBtn.addEventListener('click', () => {
    const chatMessages = document.getElementById('chat-messages');
    if (chatMessages) {
      chatMessages.innerHTML = '';
      // Add welcome message
      const welcome = document.createElement('div');
      welcome.className = 'chat-message ai';
      welcome.innerHTML = `
        <div class="chat-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-bubble">
          Halo! Saya siap membantu menganalisis data scraping Anda. Apa yang ingin Anda ketahui?
          <div class="chat-time">${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      `;
      chatMessages.appendChild(welcome);
    }
  });
}
