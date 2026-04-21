import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export function triggerSuccessFeedback(message) {
  toast.success(message, {
    duration: 3500,
    style: {
      direction: 'rtl',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      fontWeight: '600',
      background: '#fff',
      color: '#111827',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    },
    iconTheme: {
      primary: '#5CB800',
      secondary: '#fff',
    },
  });

  confetti({
    particleCount: 70,
    spread: 65,
    origin: { x: 0.5, y: 0.25 },
    colors: ['#003478', '#5CB800', '#93c5fd', '#bbf7d0', '#ffffff'],
    scalar: 0.85,
    gravity: 1.1,
    ticks: 160,
    disableForReducedMotion: true,
  });
}
