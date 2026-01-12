import { useRef, useCallback } from 'react';

export const useNotificationSound = () => {
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      // Create audio context if needed
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      
      // Resume context if suspended (required for some browsers)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Create oscillator for notification sound
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant notification tone
      oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      oscillator.type = 'sine';

      // Quick fade in/out for pleasant sound
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      // Second beep
      const oscillator2 = ctx.createOscillator();
      const gainNode2 = ctx.createGain();
      
      oscillator2.connect(gainNode2);
      gainNode2.connect(ctx.destination);
      
      oscillator2.frequency.setValueAtTime(1174, ctx.currentTime + 0.15); // D6 note
      oscillator2.type = 'sine';
      
      gainNode2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
      gainNode2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.2);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      
      oscillator2.start(ctx.currentTime + 0.15);
      oscillator2.stop(ctx.currentTime + 0.45);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }, []);

  return { playNotificationSound };
};
