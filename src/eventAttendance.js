// Event Day Attendance Module - MSF Theekkuni
import { Html5Qrcode } from 'html5-qrcode';
import { updateAttendanceStatus } from './firebase.js';

let html5QrcodeScanner = null;
let isScanning = false;
let currentAttendanceFilter = 'all'; // 'all', 'present', 'absent'

export function renderEventAttendancePage(containerElement, allRegistrations, backToDashboardCallback) {
  let registrations = [...allRegistrations];

  const calculateStats = (data) => {
    const total = data.length;
    const present = data.filter(d => Boolean(d.attended)).length;
    const absent = total - present;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, absent, percent };
  };

  const initialStats = calculateStats(registrations);

  containerElement.innerHTML = `
    <div class="admin-mobile-app attendance-app">
      <header class="admin-mobile-navbar attendance-navbar">
        <div class="admin-title-group">
          <h2>🎟️ സമ്മേളന ഹാജർ (Attendance)</h2>
          <span>2026 സെപ്റ്റംബർ 20 - തീക്കുനി ശാഖ</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button id="attn-export-csv-btn" class="btn btn-success btn-sm" style="padding:6px 10px; font-size:0.75rem;">📥 CSV</button>
          <button id="attn-back-btn" class="btn btn-secondary btn-sm" style="padding:6px 10px; font-size:0.75rem;">🔙 അഡ്മിൻ ബോർഡ്</button>
        </div>
      </header>

      <main class="admin-mobile-content">

        <!-- Attendance Stats Chips -->
        <div class="stats-mobile-chips">
          <div class="mobile-stat-card">
            <span class="m-stat-icon">👥</span>
            <div>
              <div class="m-stat-num" id="attn-stat-total">${initialStats.total}</div>
              <div class="m-stat-lbl">ആകെ രജിസ്ട്രേഷൻ</div>
            </div>
          </div>
          <div class="mobile-stat-card attn-card-present">
            <span class="m-stat-icon">✅</span>
            <div>
              <div class="m-stat-num" id="attn-stat-present">${initialStats.present}</div>
              <div class="m-stat-lbl">ഹാജരായവർ</div>
            </div>
          </div>
          <div class="mobile-stat-card attn-card-absent">
            <span class="m-stat-icon">⏳</span>
            <div>
              <div class="m-stat-num" id="attn-stat-absent">${initialStats.absent}</div>
              <div class="m-stat-lbl">ഹാജരാകാത്തവർ</div>
            </div>
          </div>
          <div class="mobile-stat-card">
            <span class="m-stat-icon">📊</span>
            <div>
              <div class="m-stat-num" id="attn-stat-percent">${initialStats.percent}%</div>
              <div class="m-stat-lbl">ഹാജർ ശതമാനം</div>
            </div>
          </div>
        </div>

        <!-- Feedback Alert Banner -->
        <div id="attn-alert-banner" class="attn-alert-banner hidden"></div>

        <!-- Attendance Marking Tools Box -->
        <div class="attendance-tools-card">
          <div class="attn-mode-tabs">
            <button id="tab-pass-code" class="attn-tab-btn active">🔢 Pass Code വഴി</button>
            <button id="tab-qr-scan" class="attn-tab-btn">📷 QR Scanner</button>
            <button id="tab-search-find" class="attn-tab-btn">🔍 പേര് / ഫോൺ തിരയുക</button>
          </div>

          <!-- Mode 1: Pass Code Quick Entry -->
          <div id="attn-mode-pass-container" class="attn-mode-panel">
            <form id="pass-code-form" class="pass-code-form">
              <label for="pass-code-input" class="pass-input-label">Pass ID / Reg Number നൽകുക:</label>
              <div class="pass-input-row">
                <input type="text" id="pass-code-input" class="mobile-input pass-code-input" placeholder="e.g. TK-NKY-1234 അല്ലെങ്കിൽ 1234" autofocus autocomplete="off" />
                <button type="submit" class="btn btn-primary btn-mark-pass">✅ Mark Present</button>
              </div>
              <p class="pass-hint">💡 digital pass-ൽ ഉള്ള Reg ID ടൈപ്പ് ചെയ്ത് Enter അമർത്തുക.</p>
            </form>
          </div>

          <!-- Mode 2: Live Camera QR Scanner -->
          <div id="attn-mode-qr-container" class="attn-mode-panel hidden">
            <div class="qr-scanner-box">
              <div id="qr-reader-view" class="qr-reader-element"></div>
              <div class="qr-controls">
                <button id="toggle-qr-cam-btn" class="btn btn-primary">📷 ക്യാമറ സ്റ്റാർട്ട് ചെയ്യുക</button>
                <p class="qr-instruction">ഡിജിറ്റൽ പാസ്സിലെ QR Code ക്യാമറയ്ക്ക് നേരെ കാണിക്കുക.</p>
              </div>
            </div>
          </div>

          <!-- Mode 3: Search & Find Delegate -->
          <div id="attn-mode-search-container" class="attn-mode-panel hidden">
            <div class="attn-search-bar-row">
              <input type="text" id="attn-search-input" class="mobile-search-input" placeholder="🔍 പേര്, ഫോൺ, സ്ഥാപനം വഴി തിരയുക..." />
            </div>
          </div>
        </div>

        <!-- Filter Chips Bar -->
        <div class="attn-filter-bar">
          <span class="attn-filter-label">ഫിൽട്ടർ:</span>
          <button class="attn-filter-chip active" data-filter="all">ആകെ (${initialStats.total})</button>
          <button class="attn-filter-chip present" data-filter="present">✅ ഹാജരായവർ (${initialStats.present})</button>
          <button class="attn-filter-chip absent" data-filter="absent">⏳ ഹാജരാകാത്തവർ (${initialStats.absent})</button>
        </div>

        <!-- Attendance Cards List View -->
        <div id="attn-delegates-list" class="attn-delegates-list"></div>

      </main>
    </div>
  `;

  // UI Element References
  const backBtn = document.getElementById('attn-back-btn');
  const exportCsvBtn = document.getElementById('attn-export-csv-btn');
  const alertBanner = document.getElementById('attn-alert-banner');

  const tabPassCode = document.getElementById('tab-pass-code');
  const tabQrScan = document.getElementById('tab-qr-scan');
  const tabSearchFind = document.getElementById('tab-search-find');

  const modePassContainer = document.getElementById('attn-mode-pass-container');
  const modeQrContainer = document.getElementById('attn-mode-qr-container');
  const modeSearchContainer = document.getElementById('attn-mode-search-container');

  const passCodeForm = document.getElementById('pass-code-form');
  const passCodeInput = document.getElementById('pass-code-input');
  const toggleQrCamBtn = document.getElementById('toggle-qr-cam-btn');
  const attnSearchInput = document.getElementById('attn-search-input');
  const delegatesListContainer = document.getElementById('attn-delegates-list');

  // Tab Switcher Logic
  const switchTab = (activeTab, showContainer) => {
    [tabPassCode, tabQrScan, tabSearchFind].forEach(t => t.classList.remove('active'));
    [modePassContainer, modeQrContainer, modeSearchContainer].forEach(c => c.classList.add('hidden'));

    activeTab.classList.add('active');
    showContainer.classList.remove('hidden');

    if (activeTab !== tabQrScan && isScanning) {
      stopQrScanner();
    }
  };

  tabPassCode.addEventListener('click', () => switchTab(tabPassCode, modePassContainer));
  tabQrScan.addEventListener('click', () => switchTab(tabQrScan, modeQrContainer));
  tabSearchFind.addEventListener('click', () => switchTab(tabSearchFind, modeSearchContainer));

  // Alert Banner Helper
  const showAlert = (message, type = 'success') => {
    alertBanner.className = `attn-alert-banner ${type}`;
    alertBanner.innerHTML = message;
    alertBanner.classList.remove('hidden');
    setTimeout(() => {
      alertBanner.classList.add('hidden');
    }, 4500);
  };

  // Mark Attendance Helper
  const markDelegateAttendance = async (delegateId, targetStatus) => {
    try {
      await updateAttendanceStatus(delegateId, targetStatus);
      const targetItem = registrations.find(r => r.id === delegateId);
      if (targetItem) {
        targetItem.attended = targetStatus;
        targetItem.attendedAt = targetStatus ? new Date().toISOString() : null;
      }
      refreshUI();
      return targetItem;
    } catch (err) {
      console.error('Failed to update attendance:', err);
      showAlert('❌ ഹാജർ രേഖപ്പെടുത്തുന്നതിൽ പിശക് സംഭവിച്ചു!', 'error');
      return null;
    }
  };

  // Find Delegate by Pass Code / Reg ID
  const processPassCodeSubmit = async (inputVal) => {
    if (!inputVal) return;
    const clean = inputVal.trim().toUpperCase();

    // Match exact regId (e.g. TK-NKY-1234) or numeric suffix (e.g. 1234)
    const matched = registrations.find(r => {
      if (!r.regId) return false;
      const rId = r.regId.toUpperCase();
      return rId === clean || rId === `TK-NKY-${clean}` || rId.endsWith(clean);
    });

    if (!matched) {
      showAlert(`⚠️ <strong>"${inputVal}"</strong> എണ്ണമുള്ള ഡിജിറ്റൽ പാസ്സ് കണ്ടെത്തിയില്ല!`, 'warning');
      return;
    }

    if (matched.attended) {
      showAlert(`ℹ️ <strong>${matched.name}</strong> (${matched.regId}) നേരത്തെ തന്നെ ഹാജർ രേഖപ്പെടുത്തിയതാണ്.`, 'info');
    } else {
      await markDelegateAttendance(matched.id, true);
      showAlert(`🎉 ✅ <strong>${matched.name}</strong> (${matched.regId}) - ഹാജർ വിജയകരമായി രേഖപ്പെടുത്തി!`, 'success');
    }

    passCodeInput.value = '';
    passCodeInput.focus();
  };

  passCodeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    processPassCodeSubmit(passCodeInput.value);
  });

  // QR Scanner Logic using Html5Qrcode
  const startQrScanner = async () => {
    try {
      if (!html5QrcodeScanner) {
        html5QrcodeScanner = new Html5Qrcode('qr-reader-view');
      }

      await html5QrcodeScanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          let regIdOrCode = decodedText;
          try {
            const parsed = JSON.parse(decodedText);
            if (parsed && parsed.id) {
              regIdOrCode = parsed.id;
            }
          } catch (e) {
            // raw string fallback
          }
          await processPassCodeSubmit(regIdOrCode);
        },
        () => {} // silent scan error handler
      );

      isScanning = true;
      toggleQrCamBtn.innerText = '🛑 ക്യാമറ ഓഫ് ചെയ്യുക';
      toggleQrCamBtn.className = 'btn btn-danger';
    } catch (err) {
      console.error('QR Scanner error:', err);
      showAlert('❌ ക്യാമറ പ്രവർത്തിപ്പിക്കുന്നതിൽ തടസ്സം നേരിട്ടു. ക്യാമറ പെർമിഷൻ അനുവദിച്ച് നൽകുക.', 'error');
    }
  };

  const stopQrScanner = async () => {
    if (html5QrcodeScanner && isScanning) {
      try {
        await html5QrcodeScanner.stop();
      } catch (e) {
        console.error('Stop scanner error:', e);
      }
      isScanning = false;
      toggleQrCamBtn.innerText = '📷 ക്യാമറ സ്റ്റാർട്ട് ചെയ്യുക';
      toggleQrCamBtn.className = 'btn btn-primary';
    }
  };

  toggleQrCamBtn.addEventListener('click', () => {
    if (isScanning) {
      stopQrScanner();
    } else {
      startQrScanner();
    }
  });

  // Filter Buttons Handler
  document.querySelectorAll('.attn-filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.attn-filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAttendanceFilter = btn.getAttribute('data-filter');
      renderDelegatesList();
    });
  });

  // Search Input Handler
  attnSearchInput.addEventListener('input', () => {
    renderDelegatesList();
  });

  // Render Delegates List Card View
  const renderDelegatesList = () => {
    const q = (attnSearchInput.value || '').trim().toLowerCase();

    const filtered = registrations.filter(item => {
      // Attendance filter
      if (currentAttendanceFilter === 'present' && !item.attended) return false;
      if (currentAttendanceFilter === 'absent' && item.attended) return false;

      // Text query
      if (!q) return true;
      return (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.regId && item.regId.toLowerCase().includes(q)) ||
        (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (item.institution && item.institution.toLowerCase().includes(q)) ||
        (item.address && item.address.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      delegatesListContainer.innerHTML = `<div class="attn-empty-box">രജിസ്ട്രേഷനുകൾ ഒന്നും കണ്ടെത്തിയില്ല.</div>`;
      return;
    }

    delegatesListContainer.innerHTML = filtered.map(item => `
      <div class="attn-item-card ${item.attended ? 'is-present' : 'is-absent'}">
        <div class="attn-card-top">
          <div class="attn-reg-badge">${item.regId || '-'}</div>
          <div class="attn-status-pill ${item.attended ? 'pill-present' : 'pill-absent'}">
            ${item.attended ? '✅ ഹാജർ (Present)' : '⏳ ഹാജരായിട്ടില്ല'}
          </div>
        </div>
        <div class="attn-delegate-name">${item.name || '-'}</div>
        <div class="attn-meta-grid">
          <span>🎓 ${item.educationClass || '-'}</span>
          <span>🏫 ${item.institution || '-'}</span>
          <span>📞 ${item.mobile || '-'}</span>
          <span>🏠 ${item.address || 'തീക്കുനി'}</span>
        </div>
        <div class="attn-action-row">
          ${item.attended ? `
            <button class="btn-toggle-attn btn-mark-absent" data-id="${item.id}">❌ Absent ആക്കുക</button>
          ` : `
            <button class="btn-toggle-attn btn-mark-present" data-id="${item.id}">✅ Present അടയാളപ്പെടുത്തുക</button>
          `}
        </div>
      </div>
    `).join('');

    // Attach Toggle Click Listeners
    delegatesListContainer.querySelectorAll('.btn-mark-present').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        const item = await markDelegateAttendance(id, true);
        if (item) {
          showAlert(`✅ <strong>${item.name}</strong> ഹാജർ രേഖപ്പെടുത്തി!`, 'success');
        }
      });
    });

    delegatesListContainer.querySelectorAll('.btn-mark-absent').forEach(b => {
      b.addEventListener('click', async () => {
        const id = b.getAttribute('data-id');
        const item = await markDelegateAttendance(id, false);
        if (item) {
          showAlert(`⏳ <strong>${item.name}</strong> ഹാജരാകാത്തവരിൽ ഉൾപ്പെടുത്തി.`, 'info');
        }
      });
    });
  };

  // Refresh Stats & UI
  const refreshUI = () => {
    const stats = calculateStats(registrations);
    document.getElementById('attn-stat-total').innerText = stats.total;
    document.getElementById('attn-stat-present').innerText = stats.present;
    document.getElementById('attn-stat-absent').innerText = stats.absent;
    document.getElementById('attn-stat-percent').innerText = `${stats.percent}%`;

    // Update filter pill counts
    const chips = document.querySelectorAll('.attn-filter-chip');
    if (chips.length >= 3) {
      chips[0].innerText = `ആകെ (${stats.total})`;
      chips[1].innerText = `✅ ഹാജരായവർ (${stats.present})`;
      chips[2].innerText = `⏳ ഹാജരാകാത്തവർ (${stats.absent})`;
    }

    renderDelegatesList();
  };

  // CSV Export for Attendance
  exportCsvBtn.addEventListener('click', () => {
    if (registrations.length === 0) {
      showAlert('ഡൗൺലോഡ് ചെയ്യാൻ വിവരങ്ങൾ ഒന്നുമില്ല!', 'warning');
      return;
    }

    const headers = ['Reg ID', 'Name', 'Gender', 'Class', 'Institution', 'Mobile', 'Attended Status', 'Attended Time'];
    const rows = registrations.map(item => [
      `"${item.regId || ''}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${item.gender || ''}"`,
      `"${(item.educationClass || '').replace(/"/g, '""')}"`,
      `"${(item.institution || '').replace(/"/g, '""')}"`,
      `"${item.mobile || ''}"`,
      `"${item.attended ? 'PRESENT' : 'ABSENT'}"`,
      `"${item.attendedAt || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MSF_Theekkuni_Attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Back Button Navigation
  backBtn.addEventListener('click', () => {
    if (isScanning) stopQrScanner();
    backToDashboardCallback();
  });

  // Initial Render
  renderDelegatesList();
}
