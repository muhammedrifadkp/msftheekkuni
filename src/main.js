// Main Application Logic - Mobile First & Smart Auto-Focus Validation

import confetti from 'canvas-confetti';
import { saveRegistration } from './firebase.js';
import { renderDelegatePass, downloadPassAsImage, sharePassOnWhatsApp } from './passGenerator.js';
import { initAdminDashboardPage } from './adminDashboard.js';

let currentRegisteredData = null;

document.addEventListener('DOMContentLoaded', () => {
  // Views & Modals
  const publicView = document.getElementById('public-view');
  const adminView = document.getElementById('admin-view');
  const passModal = document.getElementById('pass-modal');
  const passRenderContainer = document.getElementById('pass-card-render-container');
  const posterModal = document.getElementById('poster-modal');

  const regForm = document.getElementById('delegate-registration-form');
  const downloadBtn = document.getElementById('download-pass-btn');
  const shareBtn = document.getElementById('share-pass-btn');
  const closePassModalBtn = document.getElementById('close-pass-modal-btn');

  const openPosterBtn = document.getElementById('open-poster-btn');
  const closePosterModalBtn = document.getElementById('close-poster-modal-btn');
  const scrollToFormBtn = document.getElementById('scroll-to-form-btn');
  const formSection = document.getElementById('registration-form-section');

  // Smooth Auto-Scroll Handler
  if (scrollToFormBtn && formSection) {
    scrollToFormBtn.addEventListener('click', () => {
      formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Router logic - hidden from public navigation, accessible via URL /admin or #admin
  const handleRouting = () => {
    const path = window.location.pathname;
    const hash = window.location.hash;

    if (path.includes('/admin') || hash === '#admin') {
      publicView.classList.add('hidden');
      adminView.classList.remove('hidden');
      adminDashboard.render();
    } else {
      adminView.classList.add('hidden');
      publicView.classList.remove('hidden');
    }
  };

  const navigateTo = (routePath, routeHash = '') => {
    history.pushState(null, '', routePath + routeHash);
    handleRouting();
  };

  // Initialize Admin Dashboard Controller for Full Page
  const adminDashboard = initAdminDashboardPage(
    adminView, 
    (delegateItem) => {
      currentRegisteredData = delegateItem;
      openPassModal(delegateItem);
    },
    () => {
      navigateTo('/', '');
    }
  );

  window.addEventListener('popstate', handleRouting);
  window.addEventListener('hashchange', handleRouting);

  // Run initial route check
  handleRouting();

  // Poster Lightbox Handlers
  if (openPosterBtn && posterModal) {
    openPosterBtn.addEventListener('click', () => {
      document.body.classList.add('modal-open');
      posterModal.classList.remove('hidden');
    });

    closePosterModalBtn.addEventListener('click', () => {
      document.body.classList.remove('modal-open');
      posterModal.classList.add('hidden');
    });

    posterModal.addEventListener('click', (e) => {
      if (e.target === posterModal) {
        document.body.classList.remove('modal-open');
        posterModal.classList.add('hidden');
      }
    });
  }

  // Countdown Clock for Event (Sept 20, 2026)
  const eventDate = new Date('2026-09-20T16:00:00+05:30').getTime();
  
  const updateCountdown = () => {
    const now = new Date().getTime();
    const distance = eventDate - now;

    if (distance > 0) {
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const daysEl = document.getElementById('cd-days');
      if (daysEl) {
        daysEl.innerText = String(days).padStart(2, '0');
        document.getElementById('cd-hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('cd-mins').innerText = String(minutes).padStart(2, '0');
        document.getElementById('cd-secs').innerText = String(seconds).padStart(2, '0');
      }
    }
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // Smart User-Friendly Form Submission & Scroll-To-Error Validation
  regForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const requiredFields = [
      { id: 'name', name: 'പൂർണ്ണ നാമം' },
      { id: 'dob', name: 'ജനന തീയതി / വയസ്സ്' },
      { id: 'educationClass', name: 'ക്ലാസ്സ് / കോഴ്സ്' },
      { id: 'institution', name: 'സ്കൂൾ / കോളേജ് പേര്' },
      { id: 'mobile', name: 'മൊബൈൽ നമ്പർ', isPhone: true },
      { id: 'address', name: 'മേൽവിലാസം / സ്ഥലം' },
      { id: 'guardianName', name: 'രക്ഷിതാവിന്റെ പേര്' },
      { id: 'guardianMobile', name: 'രക്ഷിതാവിന്റെ ഫോൺ', isPhone: true }
    ];

    // Find the first invalid field
    for (const field of requiredFields) {
      const el = document.getElementById(field.id);
      const val = el ? el.value.trim() : '';

      if (!val) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('input-error-shake');
        setTimeout(() => el.classList.remove('input-error-shake'), 1200);
        return;
      }

      if (field.isPhone && !/^\d{10}$/.test(val)) {
        alert(`ദയവായി ${field.name} സാധുവായ 10 അക്ക ഫോൺ നമ്പറായി നൽകുക!`);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('input-error-shake');
        setTimeout(() => el.classList.remove('input-error-shake'), 1200);
        return;
      }
    }

    const name = document.getElementById('name').value.trim();
    const dob = document.getElementById('dob').value.trim();
    const gender = document.querySelector('input[name="gender"]:checked')?.value || 'ആൺ (Male)';
    const educationClass = document.getElementById('educationClass').value;
    const institution = document.getElementById('institution').value.trim();
    const mobile = document.getElementById('mobile').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const guardianName = document.getElementById('guardianName').value.trim();
    const guardianMobile = document.getElementById('guardianMobile').value.trim();

    const submitBtn = document.getElementById('submit-reg-btn');
    submitBtn.disabled = true;
    submitBtn.innerText = '⏳ സബ്മിറ്റ് ചെയ്യുന്നു...';

    const formData = {
      name,
      dob,
      gender,
      educationClass,
      institution,
      mobile,
      email,
      address,
      guardianName,
      guardianMobile
    };

    try {
      const savedRecord = await saveRegistration(formData);
      currentRegisteredData = savedRecord;

      // Confetti Effect
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#008037', '#F24E1E', '#FFB800']
      });

      // Reset Form
      regForm.reset();
      submitBtn.disabled = false;
      submitBtn.innerText = '✨ രജിസ്റ്റർ ചെയ്യുക (Submit)';

      // Open Pass Modal
      await openPassModal(savedRecord);

    } catch (err) {
      console.error('Registration failed:', err);
      alert('രജിസ്ട്രേഷൻ സമർപ്പിക്കുന്നതിൽ പിശക് സംഭവിച്ചു!');
      submitBtn.disabled = false;
      submitBtn.innerText = '✨ രജിസ്റ്റർ ചെയ്യുക (Submit)';
    }
  });

  const openPassModal = async (delegateData) => {
    document.body.classList.add('modal-open');
    passModal.classList.remove('hidden');
    await renderDelegatePass(delegateData, passRenderContainer);
  };

  const closePassModal = () => {
    document.body.classList.remove('modal-open');
    passModal.classList.add('hidden');
  };

  closePassModalBtn.addEventListener('click', closePassModal);

  passModal.addEventListener('click', (e) => {
    if (e.target === passModal) {
      closePassModal();
    }
  });

  downloadBtn.addEventListener('click', async () => {
    const cardEl = document.getElementById('delegate-pass-card');
    if (cardEl && currentRegisteredData) {
      downloadBtn.innerText = '⏳ തയാറാക്കുന്നു...';
      const cleanName = currentRegisteredData.name ? currentRegisteredData.name.replace(/\s+/g, '_') : 'Delegate';
      await downloadPassAsImage(cardEl, `MSF_Theekkuni_Pass_${cleanName}.png`);
      downloadBtn.innerText = '📥 Digital Pass ഡൗൺലോഡ് (PNG)';
    }
  });

  shareBtn.addEventListener('click', () => {
    if (currentRegisteredData) {
      sharePassOnWhatsApp(currentRegisteredData);
    }
  });
});
