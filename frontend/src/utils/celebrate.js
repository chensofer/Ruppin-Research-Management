import confetti from 'canvas-confetti';

// Event bus for the banner overlay
let bannerListener = null;
export function setBannerListener(fn) { bannerListener = fn; }

const THEMES = {
  project_created: {
    icon: '🔬',
    title: 'המחקר נוצר בהצלחה!',
    sub: 'ברוכים הבאים למחקר החדש',
    gradient: 'linear-gradient(135deg, #003478 0%, #1B4080 100%)',
    ring: '#5CB800',
    confetti: () => {
      // Big central burst
      confetti({
        particleCount: 130,
        spread: 100,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#003478', '#5CB800', '#FFD700', '#93c5fd', '#FFFFFF', '#BBF7D0'],
        shapes: ['star', 'circle', 'square'],
        scalar: 1.2,
        gravity: 0.85,
        ticks: 220,
        disableForReducedMotion: true,
      });
      // Side cannons
      setTimeout(() => {
        confetti({ particleCount: 55, angle: 65, spread: 60, origin: { x: 0, y: 0.55 }, colors: ['#003478', '#5CB800', '#FFFFFF'], disableForReducedMotion: true });
        confetti({ particleCount: 55, angle: 115, spread: 60, origin: { x: 1, y: 0.55 }, colors: ['#003478', '#5CB800', '#FFFFFF'], disableForReducedMotion: true });
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
    confetti: () => {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { x: 0.5, y: 0.25 },
        colors: ['#1D4ED8', '#60A5FA', '#A78BFA', '#FFFFFF', '#E0E7FF'],
        shapes: ['circle', 'square'],
        scalar: 0.95,
        gravity: 1.0,
        ticks: 180,
        disableForReducedMotion: true,
      });
      setTimeout(() => {
        confetti({ particleCount: 40, spread: 50, origin: { x: 0.5, y: 0.4 }, colors: ['#60A5FA', '#FFFFFF'], shapes: ['circle'], scalar: 0.7, disableForReducedMotion: true });
      }, 300);
    },
  },

  payment_approved: {
    icon: '✅',
    title: 'הבקשה אושרה!',
    sub: 'נוצרה הוצאה מאושרת בפרויקט',
    gradient: 'linear-gradient(135deg, #15803D 0%, #5CB800 100%)',
    ring: '#FFD700',
    confetti: () => {
      // Gold + green burst
      confetti({
        particleCount: 110,
        spread: 85,
        origin: { x: 0.5, y: 0.25 },
        colors: ['#FFD700', '#F59E0B', '#5CB800', '#22C55E', '#FFFFFF'],
        shapes: ['star', 'circle'],
        scalar: 1.15,
        gravity: 1.1,
        ticks: 200,
        disableForReducedMotion: true,
      });
      setTimeout(() => {
        confetti({ particleCount: 70, spread: 110, origin: { x: 0.5, y: 0.35 }, shapes: ['star'], colors: ['#FFD700', '#FCD34D', '#F59E0B'], scalar: 1.4, gravity: 0.9, disableForReducedMotion: true });
      }, 300);
      setTimeout(() => {
        confetti({ particleCount: 40, angle: 70, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#5CB800', '#22C55E', '#FFD700'], disableForReducedMotion: true });
        confetti({ particleCount: 40, angle: 110, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#5CB800', '#22C55E', '#FFD700'], disableForReducedMotion: true });
      }, 550);
    },
  },

  hours_approved: {
    icon: '⏱️',
    title: 'השעות אושרו!',
    sub: 'נוצרה תשלום שכר עבור שעות העבודה',
    gradient: 'linear-gradient(135deg, #0369A1 0%, #5CB800 100%)',
    ring: '#34D399',
    confetti: () => {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { x: 0.5, y: 0.3 },
        colors: ['#0369A1', '#5CB800', '#34D399', '#FFFFFF', '#BAE6FD'],
        shapes: ['circle', 'square'],
        scalar: 1.0,
        gravity: 1.0,
        ticks: 180,
        disableForReducedMotion: true,
      });
    },
  },
};

export function celebrate(type) {
  const theme = THEMES[type];
  if (!theme) return;
  theme.confetti();
  bannerListener?.(theme);
}
