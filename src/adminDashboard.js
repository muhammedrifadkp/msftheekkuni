// Organizers Admin Dashboard - Mobile First & Real-time WebSockets

import { listenToRegistrations, deleteRegistration, isFirebaseConnected, saveFirebaseConfig, getStoredFirebaseConfig } from './firebase.js';
import { renderDelegatePass } from './passGenerator.js';
import { renderEventAttendancePage } from './eventAttendance.js';

let allData = [];
let filteredData = [];
let unsubscribeListener = null;

const DEFAULT_PASSCODE = 'msftheekkuni2026';
const ADMIN_AUTH_KEY = 'msf_theekkuni_admin_session_v1';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000; // 7 Days in Milliseconds

function isSessionValid() {
  try {
    const raw = localStorage.getItem(ADMIN_AUTH_KEY);
    if (!raw) return false;
    const session = JSON.parse(raw);
    const now = Date.now();
    if (now - session.loginTime < ONE_WEEK_MS) {
      return true;
    } else {
      localStorage.removeItem(ADMIN_AUTH_KEY);
      return false;
    }
  } catch (e) {
    return false;
  }
}

function createSession() {
  const sessionData = {
    loginTime: Date.now(),
    authenticated: true
  };
  localStorage.setItem(ADMIN_AUTH_KEY, JSON.stringify(sessionData));
}

function clearSession() {
  localStorage.removeItem(ADMIN_AUTH_KEY);
}

export function initAdminDashboardPage(containerElement, openPassModalCallback, navigateHomeCallback) {

  const renderAuthPage = () => {
    if (unsubscribeListener) {
      unsubscribeListener();
      unsubscribeListener = null;
    }

    containerElement.innerHTML = `
      <div class="admin-auth-wrapper">
        <div class="admin-auth-card">
          <div class="auth-header">
            <div class="auth-icon-circle">🔐</div>
            <h2 class="auth-title">MSF തീക്കുനി ശാഖ</h2>
            <h3 class="auth-subtitle">ഭാരവാഹികളുടെ അഡ്മിൻ പോർട്ടൽ</h3>
            <p class="auth-desc">രജിസ്ട്രേഷൻ വിവരങ്ങൾ പരിശോധിക്കാൻ പാസ്‌വേഡ് നൽകുക</p>
          </div>
          <form id="admin-login-form" class="auth-form">
            <div class="form-field" style="text-align:left; margin-bottom:16px;">
              <label for="admin-pass">അഡ്മിൻ പാസ്‌വേഡ്</label>
              <input type="password" id="admin-pass" class="mobile-input" placeholder="Password നൽകുക" required autofocus />
            </div>
            <div id="auth-error" class="auth-error hidden">തെറ്റായ പാസ്‌വേഡ്! ദയവായി വീണ്ടും ശ്രമിക്കുക.</div>
            <div class="auth-actions-stack">
              <button type="submit" class="btn btn-primary">പ്രവേശിക്കുക (Login)</button>
              <button type="button" class="btn btn-secondary" id="back-to-home-btn">🏠 ഹോം പേജിലേക്ക് (Home)</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('back-to-home-btn').addEventListener('click', () => {
      navigateHomeCallback();
    });

    document.getElementById('admin-login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const inputPass = document.getElementById('admin-pass').value.trim();
      if (inputPass === DEFAULT_PASSCODE) {
        createSession();
        loadAndRenderDashboard();
      } else {
        document.getElementById('auth-error').classList.remove('hidden');
      }
    });
  };

  const loadAndRenderDashboard = async () => {
    containerElement.innerHTML = `
      <div class="admin-mobile-app">
        <header class="admin-mobile-navbar">
          <div class="admin-nav-top-row">
            <div class="admin-title-group">
              <div class="admin-title-main">
                <h2>📊 അഡ്മിൻ പാനൽ</h2>
                <span class="admin-live-badge">LIVE 🟢</span>
              </div>
              <span class="admin-sub-text">തീക്കുനി ശാഖ - നോക്യോക്ക്</span>
            </div>
            <div class="admin-top-icons">
              <button id="nav-home-btn" class="nav-icon-btn" title="Home Page">🏠</button>
              <button id="logout-btn" class="nav-icon-btn logout" title="Logout">🚪</button>
            </div>
          </div>
          <div class="admin-nav-bottom-row">
            <button id="nav-attendance-btn" class="nav-action-pill attn">🎟️ സമ്മേളനം ഹാജർ (Attendance)</button>
            <button id="export-csv-btn" class="nav-action-pill csv">📥 ഡാറ്റ CSV</button>
          </div>
        </header>

        <main class="admin-mobile-content">
          
          <!-- Mobile Stats Grid Chips -->
          <div class="stats-mobile-chips">
            <div class="mobile-stat-card">
              <span class="m-stat-icon">👥</span>
              <div>
                <div class="m-stat-num" id="stat-total">0</div>
                <div class="m-stat-lbl">രജിസ്ട്രേഷനുകൾ</div>
              </div>
            </div>
            <div class="mobile-stat-card">
              <span class="m-stat-icon">👨</span>
              <div>
                <div class="m-stat-num" id="stat-male">0</div>
                <div class="m-stat-lbl">ആൺകുട്ടികൾ</div>
              </div>
            </div>
            <div class="mobile-stat-card">
              <span class="m-stat-icon">👩</span>
              <div>
                <div class="m-stat-num" id="stat-female">0</div>
                <div class="m-stat-lbl">പെൺകുട്ടികൾ</div>
              </div>
            </div>
            <div class="mobile-stat-card">
              <span class="m-stat-icon">🏫</span>
              <div>
                <div class="m-stat-num" id="stat-colleges">0</div>
                <div class="m-stat-lbl">സ്ഥാപനങ്ങൾ</div>
              </div>
            </div>
          </div>

          <!-- Mobile Filters & Search -->
          <div class="mobile-filter-bar">
            <input type="text" id="admin-search-input" class="mobile-search-input" placeholder="🔍 പേര്, ഫോൺ, സ്കൂൾ തിരയുക..." />
            <div class="mobile-dropdown-row">
              <select id="gender-filter">
                <option value="all">Gender: All</option>
                <option value="ആൺ (Male)">ആൺ (Male)</option>
                <option value="പെൺ (Female)">പെൺ (Female)</option>
              </select>
              <select id="class-filter">
                <option value="all">ക്ലാസ്സ്: All</option>
                <option value="High School (8-10)">High School</option>
                <option value="Plus One / Plus Two">Plus One/Two</option>
                <option value="Degree / UG">Degree / UG</option>
                <option value="PG / Post Graduation">PG</option>
                <option value="മറ്റുള്ളവ (Other)">Other</option>
              </select>
            </div>
          </div>

          <!-- Mobile Card List View -->
          <div id="mobile-cards-container" class="delegate-cards-list">
            <div class="admin-loader-container"><div class="admin-spinner"></div></div>
          </div>

          <!-- Desktop Table View -->
          <div class="desktop-table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Reg ID</th>
                  <th>പേര്</th>
                  <th>വയസ്സ്/DOB</th>
                  <th>Gender</th>
                  <th>ക്ലാസ്സ്</th>
                  <th>സ്ഥാപനം</th>
                  <th>മൊബൈൽ</th>
                  <th>രക്ഷിതാവ്</th>
                  <th>നടപടികൾ</th>
                </tr>
              </thead>
              <tbody id="table-body">
                <tr><td colspan="9" style="text-align:center;"><div class="admin-loader-container"><div class="admin-spinner"></div></div></td></tr>
              </tbody>
            </table>
          </div>

        </main>
      </div>
    `;

    document.getElementById('nav-home-btn').addEventListener('click', () => {
      navigateHomeCallback();
    });

    document.getElementById('logout-btn').addEventListener('click', () => {
      clearSession();
      renderAuthPage();
    });

    document.getElementById('nav-attendance-btn').addEventListener('click', () => {
      renderEventAttendancePage(containerElement, allData, loadAndRenderDashboard);
    });

    document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
    document.getElementById('admin-search-input').addEventListener('input', applyFilters);
    document.getElementById('gender-filter').addEventListener('change', applyFilters);
    document.getElementById('class-filter').addEventListener('change', applyFilters);

    // Subscribe to Realtime WebSocket listener!
    if (unsubscribeListener) unsubscribeListener();
    unsubscribeListener = listenToRegistrations((freshData) => {
      allData = freshData;
      applyFilters();
    });
  };

  const applyFilters = () => {
    const queryStr = (document.getElementById('admin-search-input')?.value || '').toLowerCase();
    const genderVal = document.getElementById('gender-filter')?.value || 'all';
    const classVal = document.getElementById('class-filter')?.value || 'all';

    filteredData = allData.filter(item => {
      const matchSearch = !queryStr || 
        (item.name && item.name.toLowerCase().includes(queryStr)) ||
        (item.mobile && item.mobile.toLowerCase().includes(queryStr)) ||
        (item.institution && item.institution.toLowerCase().includes(queryStr)) ||
        (item.regId && item.regId.toLowerCase().includes(queryStr)) ||
        (item.address && item.address.toLowerCase().includes(queryStr));

      const matchGender = genderVal === 'all' || item.gender === genderVal;
      const matchClass = classVal === 'all' || item.educationClass === classVal;

      return matchSearch && matchGender && matchClass;
    });

    updateStats();
    renderMobileCards();
    renderDesktopTable();
  };

  const updateStats = () => {
    document.getElementById('stat-total').innerText = allData.length;
    document.getElementById('stat-male').innerText = allData.filter(i => i.gender && i.gender.includes('ആൺ')).length;
    document.getElementById('stat-female').innerText = allData.filter(i => i.gender && i.gender.includes('പെൺ')).length;
    const uniqueInst = new Set(allData.map(i => i.institution ? i.institution.trim().toLowerCase() : '')).size;
    document.getElementById('stat-colleges').innerText = uniqueInst;
  };

  const renderMobileCards = () => {
    const cardContainer = document.getElementById('mobile-cards-container');
    if (!cardContainer) return;

    if (filteredData.length === 0) {
      cardContainer.innerHTML = `<div style="text-align:center; padding:30px; background:#fff; border-radius:14px; font-weight:700; color:var(--text-muted);">രജിസ്ട്രേഷനുകൾ ഒന്നും കണ്ടെത്തിയില്ല</div>`;
      return;
    }

    cardContainer.innerHTML = filteredData.map(item => `
      <div class="delegate-item-card">
        <div class="card-top-row">
          <span class="reg-tag">${item.regId || '-'}</span>
          <span class="gender-tag ${item.gender && item.gender.includes('ആൺ') ? 'boy' : 'girl'}">${item.gender || '-'}</span>
        </div>
        <div class="delegate-item-name">${item.name || '-'}</div>
        <div class="meta-row">
          <span>🎓 ${item.educationClass || '-'}</span>
          <span>🏫 ${item.institution || '-'}</span>
        </div>
        <div class="meta-row" style="font-size:0.75rem;">
          <span>📞 ${item.mobile || '-'}</span>
          <span>🏠 ${item.address || 'തീക്കുനി'}</span>
        </div>
        <div class="card-action-bar">
          <button class="btn-card-pass view-btn" data-id="${item.id}">🪪 Pass</button>
          <a href="https://wa.me/91${item.mobile}" target="_blank" class="btn-card-wa">💬 WhatsApp</a>
          <button class="btn-card-del del-btn" data-id="${item.id}">🗑️</button>
        </div>
      </div>
    `).join('');

    attachActionListeners(cardContainer);
  };

  const renderDesktopTable = () => {
    const tbody = document.getElementById('table-body');
    if (!tbody) return;

    if (filteredData.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:20px;">രജിസ്ട്രേഷനുകൾ ഒന്നും കണ്ടെത്തിയില്ല.</td></tr>`;
      return;
    }

    tbody.innerHTML = filteredData.map(item => `
      <tr>
        <td><strong>${item.regId || '-'}</strong></td>
        <td><strong>${item.name || '-'}</strong></td>
        <td>${item.dob || '-'}</td>
        <td><span class="badge ${item.gender && item.gender.includes('ആൺ') ? 'badge-boy' : 'badge-girl'}">${item.gender || '-'}</span></td>
        <td>${item.educationClass || '-'}</td>
        <td>${item.institution || '-'}</td>
        <td><a href="https://wa.me/91${item.mobile}" target="_blank" class="phone-link">📱 ${item.mobile || '-'}</a></td>
        <td>${item.guardianName || '-'}</td>
        <td class="actions-td">
          <button class="btn-action view-btn" data-id="${item.id}">🪪 Pass</button>
          <button class="btn-action del-btn" data-id="${item.id}">🗑️</button>
        </td>
      </tr>
    `).join('');

    attachActionListeners(tbody);
  };

  const attachActionListeners = (parentEl) => {
    parentEl.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = allData.find(i => i.id === id);
        if (item) {
          openPassModalCallback(item);
        }
      });
    });

    parentEl.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (confirm('ഈ രജിസ്ട്രേഷൻ വിവരങ്ങൾ മായ്ക്കണമെന്ന് ഉറപ്പാണോ?')) {
          await deleteRegistration(id);
        }
      });
    });
  };

  const exportToCSV = () => {
    if (allData.length === 0) {
      alert('ഡൗൺലോഡ് ചെയ്യാൻ ഡാറ്റ ഒന്നുമില്ല!');
      return;
    }

    const headers = ['Reg ID', 'Name', 'Age/DOB', 'Gender', 'Class/Course', 'School/College', 'Mobile', 'Email', 'Address', 'Guardian Name', 'Guardian Mobile', 'Registration Date'];
    
    const rows = allData.map(item => [
      `"${item.regId || ''}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.dob || item.age || ''}"`,
      `"${item.gender || ''}"`,
      `"${(item.educationClass || '').replace(/"/g, '""')}"`,
      `"${(item.institution || '').replace(/"/g, '""')}"`,
      `"${item.mobile || ''}"`,
      `"${item.email || ''}"`,
      `"${(item.address || '').replace(/"/g, '""')}"`,
      `"${(item.guardianName || '').replace(/"/g, '""')}"`,
      `"${item.guardianMobile || ''}"`,
      `"${item.formattedDate || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `MSF_Theekkuni_Nokyokkk_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    render: () => {
      if (isSessionValid()) {
        loadAndRenderDashboard();
      } else {
        renderAuthPage();
      }
    }
  };
}
