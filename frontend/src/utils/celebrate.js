import confetti from 'canvas-confetti';

// Event bus for the banner overlay
let bannerListener = null;
export function setBannerListener(fn) { bannerListener = fn; }

// Shared palette — every event uses the same brand colors
const PALETTE = ['#003478', '#5CB800', '#FFD700', '#93c5fd', '#FFFFFF', '#BBF7D0'];

const stdBurst = (extra = {}) =>
  confetti({
    particleCount: 90,
    spread: 80,
    origin: { x: 0.5, y: 0.3 },
    colors: PALETTE,
    shapes: ['circle', 'square'],
    scalar: 1.0,
    gravity: 1.0,
    ticks: 200,
    disableForReducedMotion: true,
    ...extra,
  });

const THEMES = {
  project_created: {
    icon: '🔬',
    title: 'המחקר נוצר בהצלחה!',
    sub: 'ברוכים הבאים למחקר החדש',
    gradient: 'linear-gradient(135deg, #003478 0%, #1B4080 100%)',
    ring: '#5CB800',
    confetti: () => {
      // Main central burst
      confetti({
        particleCount: 130, spread: 100, origin: { x: 0.5, y: 0.3 },
        colors: PALETTE, shapes: ['star', 'circle', 'square'],
        scalar: 1.2, gravity: 0.85, ticks: 220, disableForReducedMotion: true,
      });
      // Side cannons
      setTimeout(() => {
        confetti({ particleCount: 55, angle: 65,  spread: 60, origin: { x: 0, y: 0.55 }, colors: PALETTE, disableForReducedMotion: true });
        confetti({ particleCount: 55, angle: 115, spread: 60, origin: { x: 1, y: 0.55 }, colors: PALETTE, disableForReducedMotion: true });
      }, 250);
      // Star shower
      setTimeout(() => {
        confetti({ particleCount: 40, spread: 80, origin: { x: 0.5, y: 0.1 }, shapes: ['star'], colors: ['#FFD700', '#FCD34D', '#5CB800'], scalar: 1.4, gravity: 1.1, disableForReducedMotion: true });
      }, 500);
    },
  },

  payment_submitted: {
    icon: '📬',
    title: 'הבקשה נשלחה!',
    sub: 'הבקשה ממתינה לאישור החוקר',
    gradient: 'linear-gradient(135deg, #1D4ED8 0%, #4338CA 100%)',
    ring: '#60A5FA',
    confetti: () => stdBurst(),
  },

  payment_approved: {
    icon: '✅',
    title: 'הבקשה אושרה!',
    sub: 'נוצרה הוצאה מאושרת בפרויקט',
    gradient: 'linear-gradient(135deg, #15803D 0%, #5CB800 100%)',
    ring: '#FFD700',
    confetti: () => stdBurst(),
  },

  hours_approved: {
    icon: '⏱️',
    title: 'השעות אושרו!',
    sub: 'נוצר תשלום שכר עבור שעות העבודה',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #5CB800 100%)',
    ring: '#34D399',
    confetti: () => stdBurst(),
  },

  hours_submitted: {
    icon: '📋',
    title: 'הדוח נשלח לאישור!',
    sub: 'הדוח ממתין לאישור החוקר',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
    ring: '#C4B5FD',
    confetti: () => {
      stdBurst({ shapes: ['square'], scalar: 0.85 });
      setTimeout(() => {
        confetti({ particleCount: 50, angle: 70,  spread: 55, origin: { x: 0, y: 0.6 }, colors: PALETTE, disableForReducedMotion: true });
        confetti({ particleCount: 50, angle: 110, spread: 55, origin: { x: 1, y: 0.6 }, colors: PALETTE, disableForReducedMotion: true });
      }, 300);
    },
  },
};

export function celebrate(type, msg) {
  const theme = THEMES[type];
  if (!theme) return;

  theme.confetti();
  bannerListener?.(theme);
}
