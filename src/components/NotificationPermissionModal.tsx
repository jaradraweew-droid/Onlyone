import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Smartphone, X, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  isiOS: boolean;
  isPWA: boolean;
  onEnable: () => Promise<boolean>;
  onDismiss: () => void;
}

export default function NotificationPermissionModal({
  isOpen,
  isiOS,
  isPWA,
  onEnable,
  onDismiss,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsIOSInstall = isiOS && !isPWA;

  const handleEnable = async () => {
    if (needsIOSInstall) {
      setShowIOSGuide(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Set a UI timeout — if it takes more than 8 seconds, something is wrong
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
        setError('Taking too long. Please try again or check your browser settings.');
      }, 8000);

      const result = await onEnable();
      clearTimeout(timeoutId);
      setIsLoading(false);

      if (!result) {
        // User denied or something went wrong
        // Modal will be closed by the hook, but show brief feedback
        setError('Notifications were not enabled. You can change this in Settings later.');
        setTimeout(() => onDismiss(), 2500);
      }
      // If result is true, the hook already closed the modal
    } catch {
      setIsLoading(false);
      setError('Something went wrong. Please try again later.');
    }
  };

  const handleClose = () => {
    setError(null);
    setIsLoading(false);
    onDismiss();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-white rounded-[32px] shadow-2xl z-50 overflow-hidden"
          >
            {!showIOSGuide ? (
              /* ── Main Permission Screen ───────────────────── */
              <div className="p-6 text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-full bg-sage-50 flex items-center justify-center mx-auto mb-5">
                  <Bell size={28} className="text-sage-600" />
                </div>

                {/* Title */}
                <h3 className="font-serif text-xl text-sage-900 mb-2">
                  Stay Connected
                </h3>

                {/* Description */}
                <p className="text-sage-500 text-sm leading-relaxed mb-6 px-2">
                  Get notified instantly when your partner sends a message,
                  updates their mood, or sends you a leaf 🍃
                </p>

                {/* Benefits */}
                <div className="space-y-3 mb-7 text-left px-2">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-sm shrink-0">💬</span>
                    <span className="text-sage-700 text-[13px]">New message alerts — even when the app is closed</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-sm shrink-0">🍃</span>
                    <span className="text-sage-700 text-[13px]">Know when they're thinking of you</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-sm shrink-0">🐾</span>
                    <span className="text-sage-700 text-[13px]">Pet care reminders and partner actions</span>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 bg-amber-50 rounded-2xl px-4 py-3 mb-4 text-left">
                    <AlertCircle size={16} className="text-amber-500 shrink-0" />
                    <p className="text-amber-700 text-[12px] leading-relaxed">{error}</p>
                  </div>
                )}

                {/* Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleEnable}
                    disabled={isLoading}
                    className="w-full bg-sage-600 text-white rounded-full py-3.5 font-semibold text-[15px] hover:bg-sage-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enabling...</span>
                      </>
                    ) : (
                      <>
                        <Bell size={16} />
                        Enable Notifications
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="w-full text-sage-400 rounded-full py-3 font-medium text-[14px] hover:text-sage-600 hover:bg-sage-50 transition-all disabled:opacity-40"
                  >
                    Maybe Later
                  </button>
                </div>
              </div>
            ) : (
              /* ── iOS Installation Guide ───────────────────── */
              <div className="p-6 text-center relative">
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-sage-50 flex items-center justify-center text-sage-400 hover:text-sage-600 transition-colors"
                  aria-label="Go back"
                >
                  <X size={16} />
                </button>

                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-5">
                  <Smartphone size={28} className="text-blue-500" />
                </div>

                <h3 className="font-serif text-xl text-sage-900 mb-2">
                  Install OnlyOne First
                </h3>

                <p className="text-sage-500 text-sm leading-relaxed mb-6 px-2">
                  On iPhone &amp; iPad, notifications require the app to be installed on your Home Screen.
                </p>

                <div className="bg-sage-50 rounded-2xl p-4 text-left space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white text-sage-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">1</span>
                    <p className="text-sage-700 text-[13px] leading-relaxed">
                      Tap the <strong>Share</strong> button <span className="text-blue-500">⬆</span> at the bottom of Safari
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white text-sage-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">2</span>
                    <p className="text-sage-700 text-[13px] leading-relaxed">
                      Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-white text-sage-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm">3</span>
                    <p className="text-sage-700 text-[13px] leading-relaxed">
                      Open <strong>OnlyOne</strong> from your Home Screen, then enable notifications
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full text-sage-500 rounded-full py-3 font-medium text-[14px] hover:text-sage-700 hover:bg-sage-50 transition-all"
                >
                  Got it
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
