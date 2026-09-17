# MSF Nokyokkk - Theekkuni Shakha Sammelanam Web Application

Official Digital Registration & Delegate Pass Web Application for **MSF Velom Panchayat Shakthikarana Kalam - Theekkuni Shakha Sammelanam ("നോക്യോക്ക്")**.

## Features
- **Mobile-First Responsive UI**: Styled with authentic MSF Emerald Green & Nokyokkk Orange branding.
- **Event Countdown Clock**: Live countdown timer to September 20, 2026.
- **Digital Delegate Pass Generator**: Auto-generates downloadable high-resolution PNG badges with unique Registration ID & QR Code.
- **Firebase Firestore Integration**: Direct cloud storage with automated fallback and 3.5s timeout protection.
- **Organizer Admin Portal (`/admin`)**: 7-day persistent login, real-time search, category filters, and 1-click Excel/CSV export.

## Tech Stack
- HTML5 / CSS3 (Vanilla Vanilla Mobile-First Design System)
- JavaScript (ES6 Modules & Vite)
- Firebase Firestore (Cloud Database)
- html2canvas & QRCode (Pass rendering)
- canvas-confetti (Celebration effects)

## Setup & Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
