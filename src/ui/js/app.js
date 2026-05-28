/**
 * AI Web Scraper — Dashboard Application Logic
 * SPA Navigation with real API integration
 */

const API_BASE = window.location.origin;

/* ============================================
   AUTH HELPERS
   ============================================ */
function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
    throw new Error('Session expired');
  }
  return res;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function showConfirm(title, message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'custom-dialog-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4);
      backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      z-index: 9999; display: flex; align-items: center; justify-content: center;
      animation: fadeIn 0.2s ease-out;
    `;

    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog';
    dialog.style.cssText = `
      background: #ffffff; width: 440px; max-width: 90%; border-radius: 12px;
      padding: 24px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0; animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    `;

    dialog.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:40px;height:40px;border-radius:50%;background:#fee2e2;display:flex;align-items:center;justify-content:center;color:#ef4444;flex-shrink:0;">
          <i class="fas fa-triangle-exclamation" style="font-size:1.2rem;"></i>
        </div>
        <h4 style="font-size:1.1rem;font-weight:700;color:#1e293b;margin:0;">${escapeHtml(title)}</h4>
      </div>
      <p style="font-size:0.9rem;color:#64748b;line-height:1.5;margin-bottom:24px;">${escapeHtml(message)}</p>
      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <button id="custom-confirm-cancel" style="padding:9px 16px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;color:#64748b;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.15s;">Batal</button>
        <button id="custom-confirm-ok" style="padding:9px 16px;border-radius:8px;background:linear-gradient(135deg, #ef4444, #dc2626);color:white;font-size:0.85rem;font-weight:600;cursor:pointer;transition:all 0.15s;box-shadow:0 2px 4px rgba(239,68,68,0.2);">Hapus</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const btnCancel = dialog.querySelector('#custom-confirm-cancel');
    const btnOk = dialog.querySelector('#custom-confirm-ok');

    btnCancel.addEventListener('mouseenter', () => btnCancel.style.background = '#f8fafc');
    btnCancel.addEventListener('mouseleave', () => btnCancel.style.background = 'white');
    btnOk.addEventListener('mouseenter', () => btnOk.style.transform = 'translateY(-1px)');
    btnOk.addEventListener('mouseleave', () => btnOk.style.transform = 'none');

    const closeDialog = (resVal) => {
      overlay.remove();
      resolve(resVal);
    };

    btnCancel.addEventListener('click', () => closeDialog(false));
    btnOk.addEventListener('click', () => closeDialog(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDialog(false);
    });
  });
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed; top: 24px; right: 24px; z-index: 9999;
      display: flex; flex-direction: column; gap: 12px; max-width: 380px; width: 90%;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  let bg = '#10b981';
  let icon = 'fa-circle-check';
  if (type === 'error') {
    bg = '#ef4444';
    icon = 'fa-circle-xmark';
  } else if (type === 'info') {
    bg = '#3b82f6';
    icon = 'fa-circle-info';
  }

  toast.style.cssText = `
    background: #ffffff; color: #1e293b; border-left: 4px solid ${bg};
    padding: 14px 16px; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    display: flex; align-items: center; gap: 12px; font-size: 0.88rem; font-weight: 500;
    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1), fadeOut 0.2s ease-in 2.8s forwards;
    border: 1px solid #e2e8f0;
  `;

  toast.innerHTML = `
    <i class="fas ${icon}" style="color:${bg}; font-size: 1.1rem; flex-shrink: 0;"></i>
    <div style="flex:1; line-height: 1.4;">${escapeHtml(message)}</div>
    <button style="color:#94a3b8; cursor:pointer; font-size: 1.2rem; background:none; border:none;" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);
  setTimeout(() => { if (toast && toast.parentNode) toast.remove(); }, 3000);
}

function getTimeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ============================================
   SPA NAVIGATION SYSTEM
   ============================================ */
const PAGE_CONFIG = {
  'dashboard':       { title: 'Dashboard', subtitle: 'Monitor and manage your scraping tasks', showRightPanel: true, loader: loadPageDashboard },
  'new-scrape':      { title: 'New Scrape', subtitle: 'Start a new web scraping task', showRightPanel: false, loader: showNewScrapeModal },
  'my-scrapes':      { title: 'My Scrapes', subtitle: 'All your scraping tasks and results', showRightPanel: false, loader: loadPageMyScrapes },
  'monitoring':      { title: 'Monitoring', subtitle: 'Monitor URLs for changes automatically', showRightPanel: false, loader: loadPageMonitoring },
  'alerts':          { title: 'Alerts', subtitle: 'Notifications and alert history', showRightPanel: false, loader: loadPageAlerts },
  'change-history':  { title: 'Change History', subtitle: 'Detected changes across monitored URLs', showRightPanel: false, loader: loadPageChangeHistory },
  'chat':            { title: 'Chat with Data', subtitle: 'Ask AI questions about your scraped data', showRightPanel: false, loader: loadPageChat },
  'exports':         { title: 'Exports', subtitle: 'Download your scraped data', showRightPanel: false, loader: loadPageExports },
};

let currentPage = 'dashboard';

function navigateTo(page) {
  const config = PAGE_CONFIG[page];
  if (!config) return;

  // For new-scrape, always show modal on dashboard
  if (page === 'new-scrape') {
    config.loader();
    return;
  }

  currentPage = page;

  // Update header
  document.getElementById('page-title').textContent = config.title;
  document.getElementById('page-subtitle').textContent = config.subtitle;

  // Toggle page sections
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');

  // Toggle right panel
  const layout = document.querySelector('.app-layout');
  if (config.showRightPanel) {
    layout.classList.remove('hide-right-panel');
  } else {
    layout.classList.add('hide-right-panel');
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  // Toggle sidebar collapse state and toggle button visibility based on page
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (sidebar && toggleBtn) {
    if (page === 'dashboard') {
      toggleBtn.style.display = 'flex';
      
      // Restore user's collapsed preference on dashboard
      const isCollapsed = localStorage.getItem('sidebar-collapsed') === 'true';
      if (isCollapsed) {
        sidebar.classList.add('collapsed');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-chevron-right';
      } else {
        sidebar.classList.remove('collapsed');
        const icon = toggleBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-chevron-left';
      }
    } else {
      toggleBtn.style.display = 'none';
      
      // Force sidebar to be expanded on other pages
      sidebar.classList.remove('collapsed');
    }
  }

  // Toggle right panel collapse state and toggle button visibility based on page
  const rightPanel = document.getElementById('right-panel');
  const rightToggleBtn = document.getElementById('right-panel-toggle-btn');
  if (rightPanel && rightToggleBtn) {
    if (page === 'dashboard') {
      rightToggleBtn.style.display = 'flex';
      
      // Restore user's collapsed preference on dashboard
      const isRightCollapsed = localStorage.getItem('right-panel-collapsed') === 'true';
      if (isRightCollapsed) {
        rightPanel.classList.add('collapsed');
        const icon = rightToggleBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-chevron-left';
      } else {
        rightPanel.classList.remove('collapsed');
        const icon = rightToggleBtn.querySelector('i');
        if (icon) icon.className = 'fas fa-chevron-right';
      }
    } else {
      rightToggleBtn.style.display = 'none';
      
      // Force right panel to be expanded when returning/navigating
      rightPanel.classList.remove('collapsed');
    }
  }

  // Scroll to top
  document.getElementById('main-content').scrollTop = 0;

  // Load page data
  config.loader();
}

/* ============================================
   INITIALIZATION
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  if (!getToken()) { window.location.href = '/login.html'; return; }

  initUserProfile();
  initNavigation();
  initSidebarToggle();
  initRightPanelToggle();
  initLogout();
  initNotificationBtn();
  initChatWidgets();

  // Initial page load
  navigateTo('dashboard');
  loadNotificationBadge();
  loadSidebarStats();

  // Poll notifications
  setInterval(loadNotificationBadge, 60000);
});

/* ============================================
   USER PROFILE
   ============================================ */
function initUserProfile() {
  const user = getUser();
  if (!user) return;
  const el = document.querySelector('.user-name');
  if (el) el.textContent = user.username || 'User';
  const avatar = document.querySelector('.user-avatar');
  if (avatar && user.username) {
    const parts = user.username.split(/[\s._-]+/);
    avatar.textContent = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : user.username.slice(0, 2).toUpperCase();
  }
}

function initLogout() {
  const profile = document.getElementById('user-profile');
  if (profile) profile.addEventListener('click', (e) => {
    e.stopPropagation();
    showUserMenu(profile);
  });
}

function showUserMenu(anchor) {
  const existing = document.querySelector('.user-menu');
  if (existing) { existing.remove(); return; }

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'user-menu';
  menu.style.cssText = `
    position:fixed; top:${rect.bottom+6}px; right:24px;
    background:white; border:1px solid #e2e8f0; border-radius:10px;
    box-shadow:0 10px 25px rgba(0,0,0,0.1); padding:4px; z-index:2000;
    min-width:160px; animation:fadeInUp 0.2s ease-out;
  `;

  const items = [
    { icon: 'fa-user', label: 'Profile', action: () => {} },
    { icon: 'fa-gear', label: 'Settings', action: () => {} },
    { icon: 'fa-right-from-bracket', label: 'Logout', action: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }, color: '#ef4444' },
  ];

  items.forEach(item => {
    const el = document.createElement('div');
    el.style.cssText = `display:flex;align-items:center;gap:8px;padding:9px 12px;font-size:0.85rem;color:${item.color||'#334155'};cursor:pointer;border-radius:7px;transition:background 0.15s;`;
    el.innerHTML = `<i class="fas ${item.icon}" style="width:16px;text-align:center;"></i> ${item.label}`;
    el.addEventListener('mouseenter', () => el.style.background = '#f1f5f9');
    el.addEventListener('mouseleave', () => el.style.background = 'transparent');
    el.addEventListener('click', (e) => { e.stopPropagation(); menu.remove(); item.action(); });
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) {
        menu.remove(); document.removeEventListener('click', close);
      }
    });
  }, 10);
}

/* ============================================
   NAVIGATION
   ============================================ */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  // "View All" buttons cross-links
  const viewAllTasks = document.getElementById('btn-view-all-tasks');
  if (viewAllTasks) viewAllTasks.addEventListener('click', () => navigateTo('my-scrapes'));

  const viewAllMon = document.getElementById('btn-view-all-monitoring');
  if (viewAllMon) viewAllMon.addEventListener('click', () => navigateTo('monitoring'));

  const viewAllChanges = document.getElementById('btn-view-all-changes');
  if (viewAllChanges) viewAllChanges.addEventListener('click', () => navigateTo('change-history'));
}

function initSidebarToggle() {
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  if (!sidebar || !toggleBtn) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebar-collapsed', collapsed);
    
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.className = collapsed 
        ? 'fas fa-chevron-right' 
        : 'fas fa-chevron-left';
    }
  });
}

function initRightPanelToggle() {
  const rightPanel = document.getElementById('right-panel');
  const toggleBtn = document.getElementById('right-panel-toggle-btn');
  if (!rightPanel || !toggleBtn) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const collapsed = rightPanel.classList.toggle('collapsed');
    localStorage.setItem('right-panel-collapsed', collapsed);
    
    const icon = toggleBtn.querySelector('i');
    if (icon) {
      icon.className = collapsed 
        ? 'fas fa-chevron-left' 
        : 'fas fa-chevron-right';
    }
  });
}

/* ============================================
   NOTIFICATION BADGE
   ============================================ */
function initNotificationBtn() {
  const btn = document.getElementById('btn-notifications');
  if (btn) btn.addEventListener('click', (e) => {
    e.stopPropagation();
    showNotificationPanel();
  });
}

async function loadNotificationBadge() {
  try {
    const res = await apiFetch('/api/notifications/unread-count');
    if (!res.ok) return;
    const { count } = await res.json();
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  } catch {}
}

async function showNotificationPanel() {
  const existing = document.querySelector('.notif-panel');
  if (existing) { existing.remove(); return; }

  const btn = document.getElementById('btn-notifications');
  const rect = btn.getBoundingClientRect();

  const panel = document.createElement('div');
  panel.className = 'notif-panel';
  panel.style.cssText = `
    position:fixed; top:${rect.bottom+8}px; right:24px; width:360px; max-height:450px;
    background:white; border:1px solid #e2e8f0; border-radius:12px;
    box-shadow:0 15px 40px rgba(0,0,0,0.12); z-index:2000; overflow:hidden;
    animation:fadeInUp 0.2s ease-out;
  `;
  panel.innerHTML = '<div style="padding:20px;text-align:center;color:#94a3b8;"><i class="fas fa-spinner fa-spin"></i></div>';
  document.body.appendChild(panel);

  try {
    const res = await apiFetch('/api/notifications?limit=10');
    const { notifications, unreadCount } = await res.json();

    if (unreadCount > 0) {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      loadNotificationBadge();
    }

    let html = `<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:700;font-size:0.95rem;">Notifications</span>
      <span style="font-size:0.75rem;color:#6366f1;cursor:pointer;" onclick="navigateTo('alerts');document.querySelector('.notif-panel')?.remove();">View All</span>
    </div>`;

    if (notifications.length === 0) {
      html += '<div style="padding:32px;text-align:center;color:#94a3b8;"><i class="fas fa-bell-slash" style="font-size:1.5rem;margin-bottom:8px;display:block;"></i>Belum ada notifikasi</div>';
    } else {
      html += '<div style="max-height:380px;overflow-y:auto;">';
      notifications.forEach(n => {
        const icon = n.type === 'change_detected' ? 'fa-arrow-trend-up' : n.type === 'scrape_failed' ? 'fa-triangle-exclamation' : 'fa-bell';
        const iconColor = n.type === 'change_detected' ? '#10b981' : n.type === 'scrape_failed' ? '#ef4444' : '#6366f1';
        html += `<div style="padding:12px 16px;border-bottom:1px solid #f8fafc;${n.is_read?'':'background:#f8faff;'}">
          <div style="display:flex;gap:10px;">
            <div style="width:32px;height:32px;border-radius:8px;background:${iconColor}15;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas ${icon}" style="color:${iconColor};font-size:0.8rem;"></i>
            </div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.82rem;font-weight:600;color:#1e293b;">${escapeHtml(n.title)}</div>
              <div style="font-size:0.78rem;color:#64748b;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(n.message).substring(0,80)}</div>
              <div style="font-size:0.7rem;color:#94a3b8;margin-top:4px;">${getTimeAgo(n.created_at)}</div>
            </div>
          </div>
        </div>`;
      });
      html += '</div>';
    }
    panel.innerHTML = html;
  } catch {
    panel.innerHTML = '<div style="padding:16px;text-align:center;color:#ef4444;">Gagal memuat notifikasi</div>';
  }

  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        panel.remove(); document.removeEventListener('click', close);
      }
    });
  }, 10);
}

/* ============================================
   SIDEBAR STATS
   ============================================ */
async function loadSidebarStats() {
  try {
    const [scrapeRes, schedRes] = await Promise.all([
      apiFetch('/api/scrape'),
      apiFetch('/api/schedule'),
    ]);
    const planHeaders = document.querySelectorAll('.plan-stat-header');
    const planFills = document.querySelectorAll('.plan-stat-fill');
    if (scrapeRes.ok) {
      const { jobs } = await scrapeRes.json();
      const c = jobs.length;
      if (planHeaders[0]) planHeaders[0].innerHTML = `<span>Scrapes / month</span><span>${c} / 50</span>`;
      if (planFills[0]) planFills[0].style.width = `${Math.min(c/50*100,100)}%`;
    }
    if (schedRes.ok) {
      const { schedules } = await schedRes.json();
      const c = schedules.length;
      if (planHeaders[1]) planHeaders[1].innerHTML = `<span>Monitored URLs</span><span>${c} / 10</span>`;
      if (planFills[1]) planFills[1].style.width = `${Math.min(c/10*100,100)}%`;
    }
  } catch {}
}

/* ============================================
   PAGE: DASHBOARD
   ============================================ */
async function loadPageDashboard() {
  loadDashboardTasks();
  loadMonitoringWidget();
  loadChangeWidget();
  loadDashboardChatHistory();
}

async function loadDashboardChatHistory() {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:20px;color:#94a3b8;">
      <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;margin-bottom:8px;display:block;color:#cbd5e1;"></i>
      <p style="font-size:0.8rem;">Memuat riwayat chat...</p>
    </div>
  `;

  try {
    const res = await apiFetch('/api/chat/history');
    if (res.ok) {
      const { messages } = await res.json();
      container.innerHTML = '';
      
      if (messages.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:20px;color:#94a3b8;">
            <i class="fas fa-comments" style="font-size:1.8rem;margin-bottom:8px;display:block;color:#cbd5e1;"></i>
            <p style="font-size:0.8rem;">Tanyakan tentang data Anda.</p>
          </div>`;
      } else {
        messages.forEach(m => appendChatBubble(container, m.role, m.content));
        container.scrollTop = container.scrollHeight;
      }
    }
  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center;padding:20px;color:#ef4444;">
        <i class="fas fa-circle-exclamation" style="font-size:1.8rem;margin-bottom:8px;display:block;"></i>
        <p style="font-size:0.8rem;">Gagal memuat riwayat.</p>
      </div>
    `;
  }
}

async function loadDashboardTasks() {
  try {
    const res = await apiFetch('/api/scrape');
    if (!res.ok) return;
    const { jobs } = await res.json();
    const tbody = document.querySelector('#tasks-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (jobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:32px;">Belum ada scraping task. Klik <b>New Scrape</b> untuk mulai!</td></tr>';
      return;
    }

    jobs.slice(0, 5).forEach(job => {
      const statusClass = job.status === 'success' ? 'status-success' : job.status === 'failed' ? 'status-failed' : 'status-running';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><div class="task-name"><div class="task-icon news"><i class="fas fa-globe"></i></div><span class="task-label">${escapeHtml(job.name)}</span></div></td>
        <td><span class="url-link">${escapeHtml(job.url?.replace(/^https?:\/\//, '').substring(0,35))}</span></td>
        <td><span class="status-badge ${statusClass}"><span class="status-dot"></span> ${job.status}</span></td>
        <td>${job.items_count || 0} items</td>
        <td style="color:var(--text-secondary);">${getTimeAgo(job.created_at)}</td>
        <td><button class="more-btn" onclick="showJobActions('${job.id}',this)"><i class="fas fa-ellipsis-vertical"></i></button></td>
      `;
      tbody.appendChild(tr);
    });
  } catch {}
}

async function loadMonitoringWidget() {
  try {
    const res = await apiFetch('/api/schedule');
    if (!res.ok) return;
    const { schedules } = await res.json();
    const card = document.getElementById('monitoring-status-card');
    if (!card) return;
    card.querySelectorAll('.monitor-item').forEach(i => i.remove());
    const addBtn = card.querySelector('#btn-add-monitor-widget');
    if (addBtn) addBtn.remove();

    if (schedules.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'padding:16px;text-align:center;color:#94a3b8;font-size:0.85rem;';
      empty.innerHTML = 'Belum ada monitoring.';
      empty.className = 'monitor-item';
      card.appendChild(empty);
    } else {
      schedules.slice(0, 3).forEach(s => {
        const badge = s.latestChange?.has_changes
          ? '<span class="monitor-badge changes-detected">Changes detected</span>'
          : '<span class="monitor-badge no-changes">No changes</span>';
        const el = document.createElement('div');
        el.className = 'monitor-item';
        el.innerHTML = `
          <div class="monitor-icon"><i class="fas fa-globe"></i></div>
          <div class="monitor-info">
            <div class="monitor-url">${escapeHtml(s.job_name)}</div>
            <div class="monitor-interval">${s.interval_label}</div>
          </div>
          <div class="monitor-status">
            <div class="monitor-time">${s.last_run_at ? getTimeAgo(s.last_run_at) : 'Pending'}</div>
            ${badge}
          </div>`;
        card.appendChild(el);
      });
    }
  } catch {}
}

async function loadChangeWidget() {
  try {
    const res = await apiFetch('/api/schedule');
    if (!res.ok) return;
    const { schedules } = await res.json();
    const card = document.getElementById('change-summary-card');
    if (!card) return;
    card.querySelectorAll('.change-summary-item').forEach(i => i.remove());

    const changes = schedules.filter(s => s.latestChange?.has_changes);
    if (changes.length === 0) {
      const el = document.createElement('div');
      el.className = 'change-summary-item';
      el.style.cssText = 'text-align:center;color:#94a3b8;font-size:0.85rem;padding:12px;';
      el.textContent = 'Belum ada perubahan terdeteksi.';
      card.appendChild(el);
    } else {
      changes.slice(0, 2).forEach(s => {
        const el = document.createElement('div');
        el.className = 'change-summary-item';
        el.innerHTML = `
          <div class="change-summary-header">
            <div class="change-source"><div class="change-source-icon"><i class="fas fa-globe"></i></div>${escapeHtml(s.job_name)}</div>
            <span class="change-time">${getTimeAgo(s.latestChange.created_at)}</span>
          </div>
          <div class="change-label">AI Summary</div>
          <div class="change-text">${escapeHtml(s.latestChange.change_summary || '')}</div>`;
        card.appendChild(el);
      });
    }
  } catch {}
}

function showJobActions(jobId, btnEl) {
  const existing = document.querySelector('.job-actions-menu');
  if (existing) existing.remove();

  const rect = btnEl.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'job-actions-menu';
  menu.style.cssText = `position:fixed;top:${rect.bottom+4}px;left:${rect.left-120}px;background:white;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.1);padding:4px;z-index:1000;min-width:140px;`;

  const actions = [
    { icon: 'fa-eye', label: 'View Data', action: () => navigateTo('my-scrapes') },
    { icon: 'fa-file-export', label: 'Export JSON', action: () => window.open(`${API_BASE}/api/export/${jobId}?format=json&token=${getToken()}`, '_blank') },
    { icon: 'fa-file-csv', label: 'Export CSV', action: () => window.open(`${API_BASE}/api/export/${jobId}?format=csv&token=${getToken()}`, '_blank') },
    { icon: 'fa-trash', label: 'Delete', action: async () => { await apiFetch(`/api/scrape/${jobId}`, { method: 'DELETE' }); loadPageDashboard(); loadPageMyScrapes(); }, color: '#ef4444' },
  ];

  actions.forEach(a => {
    const el = document.createElement('div');
    el.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 12px;font-size:0.82rem;color:${a.color||'#334155'};cursor:pointer;border-radius:6px;transition:background 0.15s;`;
    el.innerHTML = `<i class="fas ${a.icon}" style="width:14px;text-align:center;"></i>${a.label}`;
    el.addEventListener('mouseenter', () => el.style.background = '#f1f5f9');
    el.addEventListener('mouseleave', () => el.style.background = 'transparent');
    el.addEventListener('click', () => { menu.remove(); a.action(); });
    menu.appendChild(el);
  });

  document.body.appendChild(menu);
  setTimeout(() => document.addEventListener('click', function close() { menu.remove(); document.removeEventListener('click', close); }), 10);
}

/* ============================================
   PAGE: MY SCRAPES
   ============================================ */
async function loadPageMyScrapes() {
  try {
    const res = await apiFetch('/api/scrape');
    if (!res.ok) return;
    const { jobs } = await res.json();
    const tbody = document.querySelector('#all-scrapes-table tbody');
    const empty = document.getElementById('scrapes-empty');

    if (jobs.length === 0) {
      if (tbody) tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (!tbody) return;
    tbody.innerHTML = '';

    jobs.forEach(job => {
      const statusClass = job.status === 'success' ? 'status-success' : job.status === 'failed' ? 'status-failed' : 'status-running';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><div class="task-name"><div class="task-icon news"><i class="fas fa-globe"></i></div><span class="task-label">${escapeHtml(job.name)}</span></div></td>
        <td><span class="url-link">${escapeHtml(job.url?.replace(/^https?:\/\//, '').substring(0,40))}</span></td>
        <td><span class="status-badge ${statusClass}"><span class="status-dot"></span> ${job.status}</span></td>
        <td>${job.items_count || 0} items</td>
        <td style="color:var(--text-secondary);">${getTimeAgo(job.created_at)}</td>
        <td>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="window.open('${API_BASE}/api/export/${job.id}?format=json&token=${getToken()}','_blank')"><i class="fas fa-download"></i></button>
            <button class="btn btn-outline btn-sm" onclick="deleteJob('${job.id}')" style="color:#ef4444;border-color:#fecaca;"><i class="fas fa-trash"></i></button>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch {}

  // Wire buttons
  const scrapeBtn = document.getElementById('btn-scrape-from-list');
  if (scrapeBtn) scrapeBtn.onclick = showNewScrapeModal;

  // Search filter
  const search = document.getElementById('scrapes-search');
  if (search) search.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#all-scrapes-table tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  });
}

async function deleteJob(jobId) {
  const confirmed = await showConfirm('Hapus Scraping Task', 'Apakah Anda yakin ingin menghapus scraping task ini beserta seluruh data hasilnya?');
  if (!confirmed) return;
  try {
    const res = await apiFetch(`/api/scrape/${jobId}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Scraping task berhasil dihapus.');
      loadPageMyScrapes();
      loadSidebarStats();
    } else {
      showToast('Gagal menghapus scraping task.', 'error');
    }
  } catch (err) {
    showToast(`Gagal menghapus: ${err.message}`, 'error');
  }
}

/* ============================================
   PAGE: MONITORING
   ============================================ */
async function loadPageMonitoring() {
  try {
    const res = await apiFetch('/api/schedule');
    if (!res.ok) return;
    const { schedules } = await res.json();
    const list = document.getElementById('monitoring-list');
    const empty = document.getElementById('monitoring-empty');
    if (!list) return;
    list.innerHTML = '';

    if (schedules.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      schedules.forEach(s => {
        const statusColor = s.status === 'active' ? '#10b981' : '#f59e0b';
        const el = document.createElement('div');
        el.className = 'monitor-card-item';
        el.innerHTML = `
          <div class="monitor-card-icon"><i class="fas fa-globe"></i></div>
          <div class="monitor-card-info">
            <div class="monitor-card-name">${escapeHtml(s.job_name)}</div>
            <div class="monitor-card-url">${escapeHtml(s.url)}</div>
            <div class="monitor-card-meta">${s.interval_label} · <span style="color:${statusColor};font-weight:600;">${s.status}</span> · ${s.run_count} runs · Last: ${s.last_run_at ? getTimeAgo(s.last_run_at) : 'Never'}</div>
          </div>
          <div class="monitor-card-actions">
            <button onclick="toggleSchedule('${s.id}','${s.status}')" title="${s.status==='active'?'Pause':'Resume'}">
              <i class="fas ${s.status==='active'?'fa-pause':'fa-play'}"></i>
            </button>
            <button class="danger" onclick="deleteSchedule('${s.id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>`;
        list.appendChild(el);
      });
    }
  } catch {}

  const btn = document.getElementById('btn-add-monitor-page');
  if (btn) btn.onclick = showAddMonitorModal;
}

async function toggleSchedule(id, currentStatus) {
  const action = currentStatus === 'active' ? 'pause' : 'resume';
  await apiFetch(`/api/schedule/${id}`, { method: 'PUT', body: JSON.stringify({ action }) });
  loadPageMonitoring();
}

async function deleteSchedule(id) {
  const confirmed = await showConfirm('Hapus Jadwal Monitoring', 'Apakah Anda yakin ingin menghapus jadwal monitoring ini?');
  if (!confirmed) return;
  try {
    const res = await apiFetch(`/api/schedule/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('Jadwal monitoring berhasil dihapus.');
      loadPageMonitoring();
      loadSidebarStats();
    } else {
      showToast('Gagal menghapus jadwal monitoring.', 'error');
    }
  } catch (err) {
    showToast(`Gagal menghapus: ${err.message}`, 'error');
  }
}

/* ============================================
   PAGE: ALERTS
   ============================================ */
async function loadPageAlerts() {
  try {
    const res = await apiFetch('/api/notifications?limit=50');
    if (!res.ok) return;
    const { notifications } = await res.json();
    const list = document.getElementById('alerts-list');
    const empty = document.getElementById('alerts-empty');
    if (!list) return;
    list.innerHTML = '';

    if (notifications.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      notifications.forEach(n => {
        const iconClass = n.type === 'change_detected' ? 'change' : n.type === 'scrape_failed' ? 'error' : 'info';
        const icon = n.type === 'change_detected' ? 'fa-arrow-trend-up' : n.type === 'scrape_failed' ? 'fa-triangle-exclamation' : 'fa-bell';
        const el = document.createElement('div');
        el.className = `alert-item ${n.is_read ? '' : 'unread'}`;
        el.innerHTML = `
          <div class="alert-icon-wrap ${iconClass}"><i class="fas ${icon}"></i></div>
          <div class="alert-body">
            <div class="alert-title">${escapeHtml(n.title)}</div>
            <div class="alert-message">${escapeHtml(n.message)}</div>
            <div class="alert-time">${getTimeAgo(n.created_at)}</div>
          </div>`;
        list.appendChild(el);
      });
    }
  } catch {}

  const markBtn = document.getElementById('btn-mark-all-read');
  if (markBtn) markBtn.onclick = async () => {
    await apiFetch('/api/notifications/read-all', { method: 'PUT' });
    loadPageAlerts();
    loadNotificationBadge();
  };
}

/* ============================================
   PAGE: CHANGE HISTORY
   ============================================ */
async function loadPageChangeHistory() {
  try {
    const res = await apiFetch('/api/schedule');
    if (!res.ok) return;
    const { schedules } = await res.json();
    const list = document.getElementById('change-history-list');
    const empty = document.getElementById('history-empty');
    if (!list) return;
    list.innerHTML = '';

    let allHistory = [];
    for (const s of schedules) {
      try {
        const hRes = await apiFetch(`/api/schedule/${s.id}/history`);
        if (hRes.ok) {
          const { history } = await hRes.json();
          history.forEach(h => allHistory.push({ ...h, scheduleName: s.job_name, url: s.url }));
        }
      } catch {}
    }

    // Sort by date
    allHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (allHistory.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      allHistory.slice(0, 30).forEach(h => {
        const el = document.createElement('div');
        el.className = 'change-item';
        el.innerHTML = `
          <div class="change-item-header">
            <div class="change-item-source">
              <i class="fas fa-globe" style="color:var(--primary-500);"></i>
              ${escapeHtml(h.scheduleName)}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="change-badge ${h.has_changes ? 'has-changes' : 'no-changes'}">${h.has_changes ? 'Changes' : 'No Changes'}</span>
              <span class="change-item-time">${getTimeAgo(h.created_at)}</span>
            </div>
          </div>
          <div class="change-item-summary">${escapeHtml(h.change_summary || 'No summary available.')}</div>`;
        list.appendChild(el);
      });
    }
  } catch {}
}

/* ============================================
   PAGE: CHAT
   ============================================ */
function initChatWidgets() {
  // Sidebar widget chat
  const sendBtn = document.getElementById('btn-chat-send');
  const chatInput = document.getElementById('chat-input');
  if (sendBtn && chatInput) {
    sendBtn.addEventListener('click', () => sendChatMessage(chatInput, 'chat-messages'));
    chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(chatInput, 'chat-messages'); });
  }

  // Fullpage chat
  const sendBtnFull = document.getElementById('btn-chat-send-full');
  const chatInputFull = document.getElementById('chat-input-full');
  if (sendBtnFull && chatInputFull) {
    sendBtnFull.addEventListener('click', () => sendChatMessage(chatInputFull, 'chat-messages-full'));
    chatInputFull.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(chatInputFull, 'chat-messages-full'); });
  }

  // New chat button (Sidebar Widget on Dashboard)
  const newChatBtn = document.getElementById('btn-new-chat');
  if (newChatBtn) newChatBtn.addEventListener('click', async () => {
    const confirmed = await showConfirm('Hapus Riwayat Chat', 'Apakah Anda yakin ingin menghapus seluruh riwayat chat untuk asisten global?');
    if (!confirmed) return;

    try {
      const res = await apiFetch('/api/chat/history', { method: 'DELETE' });
      if (res.ok) {
        showToast('Riwayat chat berhasil dihapus.');
        const container = document.getElementById('chat-messages');
        if (container) container.innerHTML = '';
      } else {
        showToast('Gagal menghapus riwayat chat.', 'error');
      }
    } catch (err) {
      showToast(`Gagal menghapus riwayat chat: ${err.message}`, 'error');
    }
  });

  // Clear Chat Button (Fullpage Chat)
  const clearChatBtn = document.getElementById('btn-clear-chat-page');
  if (clearChatBtn) clearChatBtn.addEventListener('click', async () => {
    const activeSourceName = document.getElementById('chat-active-source-name')?.textContent || 'percakapan ini';
    const confirmed = await showConfirm('Hapus Riwayat Chat', `Apakah Anda yakin ingin menghapus seluruh riwayat chat untuk "${activeSourceName}"?`);
    if (!confirmed) return;

    let url = '/api/chat/history';
    if (activeChatJobId) {
      url += `?jobId=${activeChatJobId}`;
    }
    try {
      const res = await apiFetch(url, { method: 'DELETE' });
      if (res.ok) {
        showToast('Riwayat chat berhasil dihapus.');
        activeChatJobId = null;
        await loadPageChat();
      } else {
        showToast('Gagal menghapus riwayat chat.', 'error');
      }
    } catch (err) {
      showToast(`Gagal menghapus riwayat chat: ${err.message}`, 'error');
    }
  });

  // Wire "+" New Chat Page button (in Fullpage Chat Sidebar)
  const newChatPageBtn = document.getElementById('btn-new-chat-page');
  const newChatDropdown = document.getElementById('new-chat-dropdown');
  if (newChatPageBtn && newChatDropdown) {
    newChatPageBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isVisible = newChatDropdown.style.display === 'block';
      if (isVisible) {
        newChatDropdown.style.display = 'none';
      } else {
        newChatDropdown.style.display = 'block';
        newChatDropdown.innerHTML = '<div style="padding:10px;text-align:center;color:#94a3b8;font-size:0.8rem;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</div>';
        
        try {
          const [scrapeRes, activeJobsRes] = await Promise.all([
            apiFetch('/api/scrape'),
            apiFetch('/api/chat/active-jobs')
          ]);
          
          if (scrapeRes.ok && activeJobsRes.ok) {
            const { jobs } = await scrapeRes.json();
            const { activeJobIds } = await activeJobsRes.json();
            
            const successJobs = jobs.filter(j => j.status === 'success');
            // Filter out jobs that already have active chats in the sidebar
            const availableJobs = successJobs.filter(j => !activeJobIds.includes(j.id));
            
            newChatDropdown.innerHTML = '';
            
            if (availableJobs.length === 0) {
              newChatDropdown.innerHTML = '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:0.8rem;">Semua data source sudah ada di chat.</div>';
            } else {
              availableJobs.forEach(job => {
                const item = document.createElement('div');
                item.className = 'new-chat-dropdown-item';
                
                let displayUrl = job.url;
                try { displayUrl = new URL(job.url).hostname; } catch {}
                
                item.innerHTML = `
                  <div class="new-chat-dropdown-title">${escapeHtml(job.name)}</div>
                  <div class="new-chat-dropdown-subtitle">${escapeHtml(displayUrl)}</div>
                `;
                item.addEventListener('click', async () => {
                  newChatDropdown.style.display = 'none';
                  activeChatJobId = job.id;
                  
                  // Clear previous history to start a fresh chat session
                  try {
                    await apiFetch(`/api/chat/history?jobId=${job.id}`, { method: 'DELETE' });
                  } catch (err) {
                    console.error('Failed to clear old chat history:', err);
                  }
                  
                  // Refresh sidebar list and load chat screen layout
                  await loadPageChat();
                  
                  // Clear container and trigger automatic AI summary/analysis
                  const container = document.getElementById('chat-messages-full');
                  if (container) {
                    container.innerHTML = '';
                    
                    // Show custom loading indicator
                    const typing = document.createElement('div');
                    typing.className = 'chat-message ai';
                    typing.innerHTML = '<div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble"><i class="fas fa-spinner fa-spin"></i> AI sedang menganalisis data dan membuat rangkuman...</div>';
                    container.appendChild(typing);
                    container.scrollTop = container.scrollHeight;
                    
                    try {
                      const res = await apiFetch('/api/chat', {
                        method: 'POST',
                        body: JSON.stringify({
                          message: "Tolong buat rangkuman singkat dari data scraping ini. Sebutkan nama tugas scraping, URL-nya, dan rangkuman data penting yang berhasil di-scrape. Setelah itu perkenalkan diri dan tawarkan bantuan.",
                          jobId: job.id
                        }),
                      });
                      typing.remove();
                      if (res.ok) {
                        const data = await res.json();
                        appendChatBubble(container, 'assistant', data.message);
                      } else {
                        appendChatBubble(container, 'assistant', '⚠️ Gagal membuat rangkuman otomatis.');
                      }
                    } catch (err) {
                      typing.remove();
                      appendChatBubble(container, 'assistant', `⚠️ Gagal membuat rangkuman otomatis: ${err.message}`);
                    }
                    container.scrollTop = container.scrollHeight;
                  }
                });
                newChatDropdown.appendChild(item);
              });
            }
          } else {
            newChatDropdown.innerHTML = '<div style="padding:12px;text-align:center;color:#ef4444;font-size:0.8rem;">Gagal memuat.</div>';
          }
        } catch (err) {
          newChatDropdown.innerHTML = `<div style="padding:12px;text-align:center;color:#ef4444;font-size:0.8rem;">Error: ${escapeHtml(err.message)}</div>`;
        }
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!newChatPageBtn.contains(e.target) && !newChatDropdown.contains(e.target)) {
        newChatDropdown.style.display = 'none';
      }
    });
  }
}

let activeChatJobId = null;

async function loadPageChat() {
  const sourcesList = document.getElementById('chat-sources-list');
  if (!sourcesList) return;

  try {
    const [scrapeRes, activeJobsRes] = await Promise.all([
      apiFetch('/api/scrape'),
      apiFetch('/api/chat/active-jobs')
    ]);

    if (scrapeRes.ok && activeJobsRes.ok) {
      const { jobs } = await scrapeRes.json();
      const { activeJobIds } = await activeJobsRes.json();
      
      const successJobs = jobs.filter(j => j.status === 'success');
      
      // Filter list of jobs to show in the sidebar:
      // Show if it has active chat history, or if it is currently selected (activeChatJobId)
      const chatJobsToShow = successJobs.filter(job => 
        activeJobIds.includes(job.id) || job.id === activeChatJobId
      );
      
      // Render sources list
      sourcesList.innerHTML = '';
      
      // 1. Add "All Data Sources" item
      const allItem = document.createElement('div');
      allItem.className = `chat-source-item ${activeChatJobId === null ? 'active' : ''}`;
      allItem.dataset.id = 'all';
      allItem.innerHTML = `
        <div class="chat-source-name">All Data Sources</div>
        <div class="chat-source-meta">
          <span>Global Assistant</span>
          <span>General</span>
        </div>
      `;
      allItem.addEventListener('click', () => selectChatSource(null, 'All Data Sources'));
      sourcesList.appendChild(allItem);
      
      // 2. Add each active job
      chatJobsToShow.forEach(job => {
        const item = document.createElement('div');
        item.className = `chat-source-item ${activeChatJobId === job.id ? 'active' : ''}`;
        item.dataset.id = job.id;
        
        let displayUrl = job.url;
        try { displayUrl = new URL(job.url).hostname; } catch {}
        
        item.innerHTML = `
          <div class="chat-source-name">${escapeHtml(job.name)}</div>
          <div class="chat-source-meta">
            <span>${escapeHtml(displayUrl)}</span>
            <span>${getTimeAgo(job.created_at)}</span>
          </div>
        `;
        item.addEventListener('click', () => selectChatSource(job.id, job.name));
        sourcesList.appendChild(item);
      });
      
      // If we don't have an active selection yet, default to All Data Sources
      if (activeChatJobId === null) {
        document.getElementById('chat-active-source-name').textContent = 'All Data Sources';
      } else {
        // Double check if active job still exists in successJobs, if not fallback to all
        const exists = successJobs.some(j => j.id === activeChatJobId);
        if (!exists) {
          activeChatJobId = null;
          document.getElementById('chat-active-source-name').textContent = 'All Data Sources';
          if (allItem) allItem.classList.add('active');
        } else {
          // Find active job name and display it
          const activeJob = successJobs.find(j => j.id === activeChatJobId);
          if (activeJob) {
            document.getElementById('chat-active-source-name').textContent = activeJob.name;
          }
        }
      }
    }
  } catch (err) {
    console.error('Failed to load chat sources:', err);
  }

  // Load chat messages for current selection
  await loadChatHistory();
}

async function selectChatSource(jobId, jobName) {
  activeChatJobId = jobId;
  
  // Update banner
  document.getElementById('chat-active-source-name').textContent = jobName;
  
  // Toggle active class on list items
  document.querySelectorAll('.chat-source-item').forEach(item => {
    const isAll = jobId === null && item.dataset.id === 'all';
    const isJob = jobId !== null && item.dataset.id === jobId;
    if (isAll || isJob) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Load history
  await loadChatHistory();
}

async function loadChatHistory() {
  const container = document.getElementById('chat-messages-full');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center;padding:40px;color:#94a3b8;">
      <i class="fas fa-spinner fa-spin" style="font-size:2.5rem;margin-bottom:12px;display:block;color:#cbd5e1;"></i>
      <p style="font-size:0.9rem;">Memuat riwayat chat...</p>
    </div>
  `;

  try {
    let url = `/api/chat/history?_t=${Date.now()}`;
    if (activeChatJobId) {
      url += `&jobId=${activeChatJobId}`;
    }
    const res = await apiFetch(url);
    if (res.ok) {
      const { messages } = await res.json();
      container.innerHTML = '';
      
      if (messages.length === 0) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px;color:#94a3b8;">
            <i class="fas fa-comments" style="font-size:2.5rem;margin-bottom:12px;display:block;color:#cbd5e1;"></i>
            <p style="font-size:0.9rem;">Mulai percakapan dengan AI tentang data ini.</p>
            <p style="font-size:0.78rem;margin-top:8px;">Contoh: "Buat rangkuman data", "Urutkan berdasarkan harga", "Bandingkan produk"</p>
          </div>`;
      } else {
        messages.forEach(m => appendChatBubble(container, m.role, m.content));
        container.scrollTop = container.scrollHeight;
      }
    }
  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#ef4444;">
        <i class="fas fa-circle-exclamation" style="font-size:2.5rem;margin-bottom:12px;display:block;"></i>
        <p style="font-size:0.9rem;">Gagal memuat riwayat chat.</p>
      </div>
    `;
  }
}

async function sendChatMessage(inputEl, containerId) {
  const msg = inputEl.value.trim();
  if (!msg) return;
  inputEl.value = '';

  const container = document.getElementById(containerId);
  if (!container) return;

  // Remove empty placeholder if exists
  const placeholder = container.querySelector('[style*="text-align:center"]');
  if (placeholder) placeholder.remove();

  appendChatBubble(container, 'user', msg);
  container.scrollTop = container.scrollHeight;

  // Typing indicator
  const typing = document.createElement('div');
  typing.className = 'chat-message ai';
  typing.innerHTML = '<div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble"><i class="fas fa-spinner fa-spin"></i> AI sedang mengetik...</div>';
  container.appendChild(typing);
  container.scrollTop = container.scrollHeight;

  try {
    const jobId = (containerId === 'chat-messages') ? null : activeChatJobId;
    const res = await apiFetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: msg, jobId }),
    });
    const data = await res.json();
    typing.remove();

    if (res.ok) {
      appendChatBubble(container, 'assistant', data.message);
    } else {
      appendChatBubble(container, 'assistant', `⚠️ ${data.error?.message || 'Error'}`);
    }
  } catch (err) {
    typing.remove();
    appendChatBubble(container, 'assistant', `⚠️ ${err.message}`);
  }
  container.scrollTop = container.scrollHeight;
}

function appendChatBubble(container, role, content) {
  const div = document.createElement('div');
  div.className = `chat-message ${role === 'user' ? 'user' : 'ai'}`;

  const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  if (role === 'user') {
    div.innerHTML = `<div class="chat-bubble">${escapeHtml(content)}<div class="chat-time">${time} <span class="chat-check">✓✓</span></div></div>`;
  } else {
    // Simple markdown: bold, lists
    let html = escapeHtml(content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
    div.innerHTML = `<div class="chat-avatar"><i class="fas fa-robot"></i></div><div class="chat-bubble">${html}<div class="chat-time">${time}</div></div>`;
  }
  container.appendChild(div);
}

/* ============================================
   PAGE: EXPORTS
   ============================================ */
async function loadPageExports() {
  try {
    const res = await apiFetch('/api/scrape');
    if (!res.ok) return;
    const { jobs } = await res.json();
    const list = document.getElementById('exports-list');
    const empty = document.getElementById('exports-empty');
    if (!list) return;
    list.innerHTML = '';

    const successJobs = jobs.filter(j => j.status === 'success');
    if (successJobs.length === 0) {
      if (empty) empty.style.display = 'block';
    } else {
      if (empty) empty.style.display = 'none';
      successJobs.forEach(j => {
        const el = document.createElement('div');
        el.className = 'export-item';
        el.innerHTML = `
          <div class="export-icon"><i class="fas fa-database"></i></div>
          <div class="export-info">
            <div class="export-name">${escapeHtml(j.name)}</div>
            <div class="export-meta">${j.items_count || 0} items · ${getTimeAgo(j.created_at)}</div>
          </div>
          <div class="export-actions">
            <button class="btn-json" onclick="window.open('${API_BASE}/api/export/${j.id}?format=json&token=${getToken()}','_blank')">
              <i class="fas fa-code"></i> JSON
            </button>
            <button class="btn-csv" onclick="window.open('${API_BASE}/api/export/${j.id}?format=csv&token=${getToken()}','_blank')">
              <i class="fas fa-table"></i> CSV
            </button>
          </div>`;
        list.appendChild(el);
      });
    }
  } catch {}
}

/* ============================================
   NEW SCRAPE MODAL
   ============================================ */
function showNewScrapeModal() {
  const existing = document.getElementById('scrape-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'scrape-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:32px;width:500px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:fadeInUp 0.3s;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="font-size:1.15rem;font-weight:700;"><i class="fas fa-spider" style="color:#6366f1;"></i> New Scrape</h3>
        <button id="close-scrape-modal" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;color:#334155;margin-bottom:6px;">URL</label>
        <input type="url" id="scrape-url" placeholder="https://example.com" style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#818cf8'" onblur="this.style.borderColor='#e2e8f0'">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;color:#334155;margin-bottom:6px;">Name (optional)</label>
        <input type="text" id="scrape-name" placeholder="E.g., Product Data" style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#818cf8'" onblur="this.style.borderColor='#e2e8f0'">
      </div>
      <div id="scrape-status" style="display:none;margin-bottom:16px;padding:10px 14px;border-radius:8px;font-size:0.82rem;font-weight:500;"></div>
      <button id="btn-start-scrape" style="width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#4338ca);color:white;border:none;border-radius:8px;font-family:inherit;font-size:0.95rem;font-weight:600;cursor:pointer;transition:all 0.2s;">
        <i class="fas fa-play"></i> Start Scraping
      </button>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('close-scrape-modal').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('btn-start-scrape').addEventListener('click', async () => {
    const url = document.getElementById('scrape-url').value.trim();
    const name = document.getElementById('scrape-name').value.trim();
    const status = document.getElementById('scrape-status');
    const btn = document.getElementById('btn-start-scrape');

    if (!url) { status.style.display='block'; status.style.background='#fee2e2'; status.style.color='#ef4444'; status.textContent='⚠️ URL wajib diisi.'; return; }

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scraping...';
    status.style.display = 'block'; status.style.background = '#dbeafe'; status.style.color = '#3b82f6';
    status.textContent = '🔄 Memulai scraping...';

    try {
      const res = await apiFetch('/api/scrape', { method: 'POST', body: JSON.stringify({ url, name: name || undefined }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed');

      // Poll status
      const jobId = data.job.id;
      let tries = 0;
      const poll = setInterval(async () => {
        tries++;
        try {
          const jRes = await apiFetch(`/api/scrape/${jobId}`);
          const jData = await jRes.json();
          if (jData.job.status === 'success') {
            clearInterval(poll);
            status.style.background = '#d1fae5'; status.style.color = '#10b981';
            status.textContent = `✅ Berhasil! ${jData.job.items_count || 0} items extracted.`;
            btn.innerHTML = '<i class="fas fa-check"></i> Done!';
            setTimeout(() => { overlay.remove(); loadPageDashboard(); loadPageMyScrapes(); loadSidebarStats(); }, 1500);
          } else if (jData.job.status === 'failed') {
            clearInterval(poll);
            status.style.background = '#fee2e2'; status.style.color = '#ef4444';
            status.textContent = `❌ ${jData.job.error_message || 'Scraping gagal.'}`;
            btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Retry';
          } else {
            status.textContent = `🔄 Scraping... (${tries * 2}s)`;
          }
        } catch {}
        if (tries > 30) { clearInterval(poll); btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Retry'; }
      }, 2000);
    } catch (err) {
      status.style.background = '#fee2e2'; status.style.color = '#ef4444';
      status.textContent = `❌ ${err.message}`;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Start Scraping';
    }
  });
}

/* ============================================
   ADD MONITOR MODAL
   ============================================ */
async function showAddMonitorModal() {
  const existing = document.getElementById('monitor-modal');
  if (existing) existing.remove();

  let intervals = [];
  try {
    const res = await apiFetch('/api/schedule/intervals');
    const data = await res.json();
    intervals = data.intervals;
  } catch {
    intervals = [
      { key: '1h', label: 'Setiap 1 jam' },
      { key: '6h', label: 'Setiap 6 jam' },
      { key: '12h', label: 'Setiap 12 jam' },
      { key: '24h', label: 'Setiap 24 jam' },
    ];
  }

  const optionsHtml = intervals.map(i => `<option value="${i.key}">${i.label}</option>`).join('');

  const overlay = document.createElement('div');
  overlay.id = 'monitor-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:2000;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';
  overlay.innerHTML = `
    <div style="background:white;border-radius:16px;padding:32px;width:480px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,0.15);animation:fadeInUp 0.3s;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="font-size:1.15rem;font-weight:700;"><i class="fas fa-chart-line" style="color:#6366f1;"></i> Add Monitor</h3>
        <button id="close-monitor-modal" style="background:none;border:none;font-size:1.2rem;color:#94a3b8;cursor:pointer;">&times;</button>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;color:#334155;margin-bottom:6px;">URL to monitor</label>
        <input type="url" id="monitor-url" placeholder="https://example.com/products" style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#818cf8'" onblur="this.style.borderColor='#e2e8f0'">
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;color:#334155;margin-bottom:6px;">Name (optional)</label>
        <input type="text" id="monitor-name" placeholder="E.g., Product Price Watch" style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:0.9rem;outline:none;" onfocus="this.style.borderColor='#818cf8'" onblur="this.style.borderColor='#e2e8f0'">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:0.82rem;font-weight:600;color:#334155;margin-bottom:6px;">Check interval</label>
        <select id="monitor-interval" style="width:100%;padding:12px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:0.9rem;outline:none;background:white;">
          ${optionsHtml}
        </select>
      </div>
      <div id="monitor-status" style="display:none;margin-bottom:16px;padding:10px 14px;border-radius:8px;font-size:0.82rem;font-weight:500;"></div>
      <button id="btn-create-monitor" style="width:100%;padding:13px;background:linear-gradient(135deg,#6366f1,#4338ca);color:white;border:none;border-radius:8px;font-family:inherit;font-size:0.95rem;font-weight:600;cursor:pointer;transition:all 0.2s;">
        <i class="fas fa-play"></i> Start Monitoring
      </button>
    </div>`;

  document.body.appendChild(overlay);
  document.getElementById('close-monitor-modal').onclick = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  document.getElementById('btn-create-monitor').addEventListener('click', async () => {
    const url = document.getElementById('monitor-url').value.trim();
    const name = document.getElementById('monitor-name').value.trim();
    const interval = document.getElementById('monitor-interval').value;
    const status = document.getElementById('monitor-status');
    const btn = document.getElementById('btn-create-monitor');

    if (!url) { status.style.display='block'; status.style.background='#fee2e2'; status.style.color='#ef4444'; status.textContent='⚠️ URL wajib diisi.'; return; }

    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    status.style.display = 'block'; status.style.background = '#dbeafe'; status.style.color = '#3b82f6';
    status.textContent = '🔄 Membuat monitoring...';

    try {
      const res = await apiFetch('/api/schedule', { method: 'POST', body: JSON.stringify({ url, name: name || undefined, interval }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed');

      status.style.background = '#d1fae5'; status.style.color = '#10b981';
      status.textContent = `✅ Monitoring aktif: ${data.schedule.job_name}`;
      btn.innerHTML = '<i class="fas fa-check"></i> Created!';
      setTimeout(() => { overlay.remove(); loadPageMonitoring(); loadMonitoringWidget(); loadSidebarStats(); }, 1500);
    } catch (err) {
      status.style.background = '#fee2e2'; status.style.color = '#ef4444';
      status.textContent = `❌ ${err.message}`;
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-play"></i> Start Monitoring';
    }
  });
}
