// Digital Delegate Pass Generator and Canvas Renderer

import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

export async function renderDelegatePass(delegateData, containerElement) {
  const qrDataUrl = await QRCode.toDataURL(
    JSON.stringify({
      id: delegateData.regId,
      name: delegateData.name,
      shakha: 'തീക്കുനി (Theekkuni)',
      event: 'Nokyokkk MSF Velom'
    }), 
    { margin: 1, color: { dark: '#008037', light: '#FFFFFF' }, width: 140 }
  );

  const passHtml = `
    <div id="delegate-pass-card" class="delegate-pass-card">
      <div class="pass-header-strip">
        <div class="pass-logo-group">
          <div class="pass-nokyokkk-logo">
            <svg viewBox="0 0 100 100" width="36" height="36">
              <circle cx="50" cy="50" r="45" fill="#F24E1E" />
              <path d="M 15 50 Q 50 15 85 50 Q 50 85 15 50 Z" fill="#FFFFFF"/>
              <circle cx="50" cy="50" r="18" fill="#008037"/>
              <circle cx="50" cy="50" r="8" fill="#FFFFFF"/>
            </svg>
            <div class="pass-brand-text">
              <span class="nokyokkk-title">നോക്യോക്ക്</span>
              <span class="nokyokkk-sub">MSF വേളം പഞ്ചായത്ത്</span>
            </div>
          </div>
          <div class="pass-flag-badge">
            <span class="shakha-name-badge">തീക്കുനി ശാഖ</span>
          </div>
        </div>
      </div>

      <div class="pass-body">
        <div class="pass-watermark">MSF</div>
        
        <div class="delegate-photo-placeholder">
          <div class="avatar-circle">
            <span>${delegateData.name ? delegateData.name.charAt(0).toUpperCase() : 'M'}</span>
          </div>
          <div class="reg-id-badge">${delegateData.regId || 'TK-NKY-0000'}</div>
        </div>

        <div class="delegate-details">
          <h2 class="delegate-name">${delegateData.name || 'പ്രതിനിധി'}</h2>
          
          <div class="details-grid">
            <div class="detail-item">
              <span class="label">ക്ലാസ് / കോഴ്സ്</span>
              <span class="val">${delegateData.educationClass || '-'}</span>
            </div>
            <div class="detail-item">
              <span class="label">സ്ഥാപനം</span>
              <span class="val">${delegateData.institution || '-'}</span>
            </div>
            <div class="detail-item">
              <span class="label">മൊബൈൽ</span>
              <span class="val">${delegateData.mobile || '-'}</span>
            </div>
            <div class="detail-item">
              <span class="label">സ്ഥലം</span>
              <span class="val">${delegateData.address || 'തീക്കുനി'}</span>
            </div>
          </div>
        </div>

        <div class="qr-code-section">
          <img src="${qrDataUrl}" alt="QR Code" class="qr-img" />
          <span class="qr-label">DIGITAL DELEGATE PASS</span>
        </div>
      </div>

      <div class="pass-footer">
        <div class="event-meta">
          <span>🗓️ 2026 സെപ്റ്റംബർ 20</span>
          <span>📍 തീക്കുനി ശാഖാ സമ്മേളനം</span>
        </div>
        <div class="helpline">📞 Helpline: +91 97464 37858</div>
      </div>
    </div>
  `;

  containerElement.innerHTML = passHtml;
}

export async function downloadPassAsImage(cardElement, filename = 'MSF_Theekkuni_Pass.png') {
  try {
    const canvas = await html2canvas(cardElement, {
      scale: 3, // High quality PNG
      useCORS: true,
      backgroundColor: '#008037',
      logging: false
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    return true;
  } catch (err) {
    console.error('Failed to generate image:', err);
    alert('ചിത്രമായി ഡൗൺലോഡ് ചെയ്യുന്നതിൽ തടസ്സം നേരിട്ടു. സ്ക്രീൻഷോട്ട് എടുക്കാവുന്നതാണ്.');
    return false;
  }
}

export function sharePassOnWhatsApp(delegateData) {
  const text = `🟢 *MSF നോക്യോക്ക് - തീക്കുനി ശാഖാ സമ്മേളനം* 🟢\n` +
    `ഡിജിറ്റൽ ഡെലിഗേറ്റ് രജിസ്ട്രേഷൻ പൂർത്തിയായി!\n\n` +
    `👤 പേര്: ${delegateData.name}\n` +
    `🆔 Reg ID: ${delegateData.regId}\n` +
    `🎓 കോഴ്സ്/ക്ലാസ്: ${delegateData.educationClass}\n` +
    `🏫 സ്ഥാപനം: ${delegateData.institution}\n` +
    `🗓️ തീയതി: 2026 സെപ്റ്റംബർ 20\n` +
    `📍 വേദി: തീക്കുനി ശാഖാ സമ്മേളനം\n\n` +
    `Helpline: +91 97464 37858\n` +
    `#MSF #Theekkuni #Nokyokkk`;

  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
