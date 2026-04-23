import { useEffect, useRef, useState } from 'react';
import { setBannerListener } from '../utils/celebrate';

export default function CelebrationBanner() {
  const [theme, setTheme]   = useState(null);
  const [visible, setVisible] = useState(false);
  const [barFull, setBarFull] = useState(false);
  const t1 = useRef(null);
  const t2 = useRef(null);
  const t3 = useRef(null);

  useEffect(() => {
    setBannerListener((t) => {
      clearTimeout(t1.current);
      clearTimeout(t2.current);
      clearTimeout(t3.current);

      setTheme(t);
      setVisible(false);
      setBarFull(false);

      // Slight delay so React re-mounts with fresh state, then animate in
      t1.current = setTimeout(() => {
        setVisible(true);
        t2.current = setTimeout(() => setBarFull(true), 60); // trigger bar after mount
        t3.current = setTimeout(() => setVisible(false), 2600);
      }, 30);
    });

    return () => {
      setBannerListener(null);
      clearTimeout(t1.current);
      clearTimeout(t2.current);
      clearTimeout(t3.current);
    };
  }, []);

  if (!theme) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
      dir="rtl"
    >
      {/* Banner card */}
      <div
        className="relative flex flex-col items-center gap-3 px-10 py-7 rounded-3xl text-center overflow-hidden"
        style={{
          background: theme.gradient,
          border: `2px solid ${theme.ring}55`,
          boxShadow: `0 0 0 5px ${theme.ring}20, 0 28px 70px rgba(0,0,0,0.35)`,
          minWidth: '280px',
          maxWidth: '380px',
          transform: visible ? 'scale(1) translateY(0px)'   : 'scale(0.7) translateY(20px)',
          opacity:   visible ? 1 : 0,
          transition: visible
            ? 'transform 0.45s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease'
            : 'transform 0.35s ease-in, opacity 0.3s ease-in',
        }}
      >
        {/* Glowing ring around icon */}
        <div className="relative mt-1">
          <div
            className="absolute inset-[-6px] rounded-full opacity-40 animate-ping"
            style={{ background: theme.ring, animationDuration: '1.4s' }}
          />
          <div
            className="relative w-16 h-16 rounded-full flex items-center justify-center text-[2.2rem] shadow-xl"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)' }}
          >
            {theme.icon}
          </div>
        </div>

        {/* Text */}
        <div className="pb-1">
          <p className="text-white font-extrabold text-[1.25rem] leading-snug">{theme.title}</p>
          <p className="text-white/65 text-sm mt-1 font-medium">{theme.sub}</p>
        </div>

        {/* Countdown bar */}
        <div
          className="absolute bottom-0 right-0 left-0 h-[3px]"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <div
            style={{
              height: '100%',
              background: theme.ring,
              borderRadius: '0 2px 2px 0',
              width: barFull ? '100%' : '0%',
              transition: barFull ? 'width 2.5s linear' : 'none',
              transformOrigin: 'right',
            }}
          />
        </div>
      </div>
    </div>
  );
}
