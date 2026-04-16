import { useEffect, useState } from "react";

/**
 * ColdStartScreen — detects when the Render server is cold-starting (sleeping)
 * and shows a friendly loading overlay so users understand the delay.
 *
 * Strategy:
 * 1. On mount, ping /api/health with a short timeout (3s).
 * 2. If it fails or takes longer than 3s, show the wake-up screen.
 * 3. Keep polling every 4s until the server responds.
 * 4. Once the server is up, fade out and unmount.
 */

const PING_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 4000;
const MESSAGES = [
  "Waking up the server...",
  "Almost there — server is starting up...",
  "Hang tight, this takes about 30 seconds on first load...",
  "Server is warming up — your signals will be ready soon...",
  "Nearly ready — fetching live forex data...",
];

export default function ColdStartScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let mounted = true;
    let pollTimer: ReturnType<typeof setTimeout>;
    let msgTimer: ReturnType<typeof setInterval>;
    let elapsedTimer: ReturnType<typeof setInterval>;
    let startTime = Date.now();

    const ping = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
        const res = await fetch("/api/health", { signal: controller.signal });
        clearTimeout(timeout);
        return res.ok;
      } catch {
        return false;
      }
    };

    const poll = async () => {
      const ok = await ping();
      if (!mounted) return;

      if (ok) {
        // Server is up — fade out
        setFading(true);
        setTimeout(() => {
          if (mounted) setVisible(false);
        }, 600);
        clearInterval(msgTimer);
        clearInterval(elapsedTimer);
      } else {
        // Server still sleeping — show screen and schedule next poll
        setVisible(true);
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    // Initial check — only show screen if first ping fails
    ping().then((ok) => {
      if (!mounted) return;
      if (!ok) {
        setVisible(true);
        startTime = Date.now();

        // Rotate messages every 6s
        msgTimer = setInterval(() => {
          if (mounted) setMsgIndex(i => (i + 1) % MESSAGES.length);
        }, 6000);

        // Update elapsed every second
        elapsedTimer = setInterval(() => {
          if (mounted) setElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        // Start polling
        pollTimer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(pollTimer);
      clearInterval(msgTimer);
      clearInterval(elapsedTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm transition-opacity duration-600"
      style={{ opacity: fading ? 0 : 1 }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        {/* Fox logo / spinner */}
        <div className="relative mx-auto mb-5 w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-orange-100 border-t-orange-500 animate-spin" />
          <div className="absolute inset-2 flex items-center justify-center text-2xl">🦊</div>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-1">Fox Trade Master</h2>
        <p className="text-sm text-orange-600 font-medium mb-4 min-h-[20px] transition-all">
          {MESSAGES[msgIndex]}
        </p>

        <div className="bg-orange-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            The server sleeps when inactive to save resources. It takes <strong>~30–60 seconds</strong> to wake up on the first visit of the day.
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-orange-300 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        {elapsed > 5 && (
          <p className="text-xs text-gray-400">
            Waiting {elapsed}s...
          </p>
        )}
      </div>
    </div>
  );
}
