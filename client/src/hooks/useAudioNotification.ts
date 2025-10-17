import { useEffect, useRef, useState } from "react";

export type NotificationType = "buy" | "sell" | "info";

/**
 * Hook for playing audio notifications with volume control
 */
export function useAudioNotification() {
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("audioVolume");
    return saved ? parseFloat(saved) : 0.7;
  });

  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem("audioEnabled");
    return saved !== "false";
  });

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    localStorage.setItem("audioVolume", volume.toString());
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("audioEnabled", enabled.toString());
  }, [enabled]);

  /**
   * Generate and play a tone notification
   */
  const playNotification = (type: NotificationType) => {
    if (!enabled) return;

    try {
      // Initialize AudioContext on first use
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const now = ctx.currentTime;

      // Create oscillator for tone
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different tones for different signal types
      let frequency1: number, frequency2: number;
      
      switch (type) {
        case "buy":
          // Ascending tone for BUY signals (optimistic)
          frequency1 = 523.25; // C5
          frequency2 = 659.25; // E5
          break;
        case "sell":
          // Descending tone for SELL signals (caution)
          frequency1 = 659.25; // E5
          frequency2 = 523.25; // C5
          break;
        case "info":
        default:
          // Single tone for info
          frequency1 = 587.33; // D5
          frequency2 = 587.33; // D5
          break;
      }

      // Set volume
      gainNode.gain.setValueAtTime(volume, now);

      // Play first note
      oscillator.frequency.setValueAtTime(frequency1, now);
      oscillator.frequency.exponentialRampToValueAtTime(frequency2, now + 0.1);

      // Fade out
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);

      // Play second beep for emphasis
      if (type !== "info") {
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();

          osc2.connect(gain2);
          gain2.connect(ctx.destination);

          const now2 = ctx.currentTime;
          osc2.frequency.setValueAtTime(frequency2, now2);
          gain2.gain.setValueAtTime(volume * 0.7, now2);
          gain2.gain.exponentialRampToValueAtTime(0.01, now2 + 0.2);

          osc2.start(now2);
          osc2.stop(now2 + 0.2);
        }, 150);
      }
    } catch (error) {
      console.error("Failed to play audio notification:", error);
    }
  };

  return {
    volume,
    setVolume,
    enabled,
    setEnabled,
    playNotification,
  };
}

