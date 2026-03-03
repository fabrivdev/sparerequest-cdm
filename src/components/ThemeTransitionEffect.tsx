import { useCallback, useRef } from 'react';

const COLUMNS = 12;
const BASE_DURATION = 600;
const STAGGER = 80;

export function useThemeTransition(toggleTheme: () => void) {
  const isAnimating = useRef(false);

  const triggerTransition = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const isDark = document.documentElement.classList.contains('dark');
    const targetColor = isDark ? 'hsl(0, 0%, 98%)' : 'hsl(0, 0%, 5%)';

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 9999;
      pointer-events: none; display: flex;
    `;

    // Create drip columns with random heights
    const columns: HTMLDivElement[] = [];
    const delays: number[] = [];

    for (let i = 0; i < COLUMNS; i++) {
      const col = document.createElement('div');
      // Random delay pattern - center tends to be faster
      const centerDist = Math.abs(i - COLUMNS / 2) / (COLUMNS / 2);
      const randomOffset = (Math.random() - 0.3) * STAGGER * 3;
      const delay = centerDist * STAGGER * 2 + randomOffset;
      delays.push(Math.max(0, delay));

      col.style.cssText = `
        flex: 1;
        background: ${targetColor};
        transform: scaleY(0);
        transform-origin: top center;
        border-radius: 0 0 ${8 + Math.random() * 20}px ${8 + Math.random() * 20}px;
      `;
      columns.push(col);
      overlay.appendChild(col);
    }

    // Add drip blobs at bottom of some columns
    columns.forEach((col, i) => {
      if (Math.random() > 0.4) {
        const blob = document.createElement('div');
        const size = 6 + Math.random() * 14;
        blob.style.cssText = `
          position: absolute;
          bottom: -${size / 2}px;
          left: 50%;
          transform: translateX(-50%) scale(0);
          width: ${size}px;
          height: ${size * 1.3}px;
          background: ${targetColor};
          border-radius: 50%;
          transition: transform ${200 + Math.random() * 200}ms ease-in;
        `;
        col.style.position = 'relative';
        col.appendChild(blob);
      }
    });

    document.body.appendChild(overlay);

    // Animate each column
    const maxDelay = Math.max(...delays);
    const themeSwitchTime = maxDelay + BASE_DURATION * 0.4;

    columns.forEach((col, i) => {
      setTimeout(() => {
        col.style.transition = `transform ${BASE_DURATION + Math.random() * 200}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        col.style.transform = 'scaleY(1)';
        col.style.borderRadius = '0';

        // Animate blobs
        const blob = col.querySelector('div');
        if (blob) {
          setTimeout(() => {
            (blob as HTMLDivElement).style.transform = 'translateX(-50%) scale(1)';
          }, BASE_DURATION * 0.3);
        }
      }, delays[i]);
    });

    // Switch theme at midpoint
    setTimeout(() => {
      toggleTheme();
    }, themeSwitchTime);

    // Fade out and remove
    setTimeout(() => {
      overlay.style.transition = 'opacity 400ms ease-out';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        isAnimating.current = false;
      }, 400);
    }, maxDelay + BASE_DURATION + 100);
  }, [toggleTheme]);

  return triggerTransition;
}
