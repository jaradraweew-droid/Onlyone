import { useState, useEffect, useCallback, useRef } from 'react';
import { urlBase64ToUint8Array } from '../utils';
import { playNotificationSound } from '../notificationSounds';

// ─── Notification Preference Types ──────────────────────────────────

export interface NotificationPreferences {
  messages: boolean;
  mood: boolean;
  leaf: boolean;
  pet: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string;   // HH:MM format
  soundMode: 'default' | 'custom';
  soundId: string;         // ID from NOTIFICATION_SOUNDS
}

export const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  mood: true,
  leaf: true,
  pet: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundMode: 'default',
  soundId: 'gentle_bloom',
};

export type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

// ─── Local Storage Keys ─────────────────────────────────────────────

const PREFS_KEY = 'onlyone_notification_prefs';
const PROMPT_DISMISSED_KEY = 'onlyone_notification_prompt_dismissed';

// ─── Helpers ────────────────────────────────────────────────────────

function loadPreferences(): NotificationPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch {
    // Corrupted data, use defaults
  }
  return { ...DEFAULT_PREFERENCES };
}

function savePreferences(prefs: NotificationPreferences): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function isPromptDismissed(): boolean {
  return localStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
}

function setPromptDismissed(): void {
  localStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
}

/**
 * Detect if we're running on an iOS/iPadOS device.
 * - Checks UA for iPhone/iPad/iPod
 * - Also checks for iPadOS 13+ which reports as 'MacIntel' but has touch
 * - Excludes actual Macs by checking screen size + touch points
 */
function detectiOS(): boolean {
  const ua = navigator.userAgent;

  // Direct match for iPhone/iPad/iPod in UA
  if (/iPad|iPhone|iPod/.test(ua)) return true;

  // iPadOS 13+ reports as 'MacIntel' with touch support
  // Distinguish from actual MacBooks: iPads have maxTouchPoints > 1 AND
  // typically have screen width <= 1366 (iPad Pro max). MacBooks always have 0 touch points
  // in Safari (unless they have a Touch Bar which reports 1).
  if (
    navigator.platform === 'MacIntel' &&
    navigator.maxTouchPoints > 1 &&
    // Additional check: real Macs never report > 5 touch points
    // and iPadOS always has exactly 5
    navigator.maxTouchPoints >= 5
  ) {
    return true;
  }

  return false;
}

/**
 * Detect if the app is running as an installed PWA (standalone mode).
 */
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

/**
 * Check if the browser actually supports Web Push notifications.
 * Some browsers have `Notification` in window but don't support push.
 */
function supportsPushNotifications(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if we're in Safari (macOS or iOS).
 * Safari on macOS supports notifications, but iOS Safari (not PWA) does not.
 */
function isSafari(): boolean {
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua);
}

// ─── Timeout helper ─────────────────────────────────────────────────

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout: ${label} took longer than ${ms}ms`)), ms)
    ),
  ]);
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useNotifications(userId: string | null) {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!supportsPushNotifications()) return 'unsupported';
    return Notification.permission as PermissionState;
  });

  const [preferences, setPreferencesState] = useState<NotificationPreferences>(loadPreferences);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const subscribingRef = useRef(false);

  // Detect platform on mount
  useEffect(() => {
    const ios = detectiOS();
    setIsiOS(ios);
    setIsPWA(isStandalone());

    // On iOS Safari (not PWA), push is simply not supported
    if (ios && !isStandalone()) {
      setPermission('unsupported');
    }
  }, []);

  // Determine if we should show the first-time modal
  useEffect(() => {
    if (!userId) return;

    const ios = detectiOS();
    const pwa = isStandalone();

    // On iOS non-PWA: show modal (it will show the install guide)
    // On supported platforms: show modal if permission not yet decided
    const shouldShow =
      (ios && !pwa && !isPromptDismissed()) || // iOS non-PWA: show install guide
      (permission === 'default' && !isPromptDismissed() && supportsPushNotifications());

    if (shouldShow) {
      const timer = setTimeout(() => setShowPermissionModal(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [userId, permission]);

  // ─── Service Worker Message Listener (Custom Sound Playback) ──

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'PLAY_NOTIFICATION_SOUND' && event.data?.soundId) {
        playNotificationSound(event.data.soundId);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);

  // ─── Push Subscription (non-blocking, with timeout) ───────────

  const subscribeToPush = useCallback(async () => {
    if (!userId) return;
    if (!supportsPushNotifications()) return;
    if (subscribingRef.current) return; // Prevent double-subscribe

    subscribingRef.current = true;

    try {
      // Step 1: Register service worker (5s timeout)
      const registration = await withTimeout(
        navigator.serviceWorker.register('/sw.js'),
        5000,
        'SW registration'
      );

      // Step 2: Wait for SW to be ready (10s timeout)
      await withTimeout(
        navigator.serviceWorker.ready,
        10000,
        'SW ready'
      );

      // Step 3: Check existing subscription first
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Step 4: Get VAPID key (5s timeout)
        const res = await withTimeout(
          fetch('/api/vapidPublicKey'),
          5000,
          'VAPID key fetch'
        );
        const publicVapidKey = await res.text();

        // Step 5: Subscribe (10s timeout)
        subscription = await withTimeout(
          registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
          }),
          10000,
          'Push subscribe'
        );
      }

      // Step 6: Send subscription to server (5s timeout)
      await withTimeout(
        fetch('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription, userId }),
          headers: { 'content-type': 'application/json' },
        }),
        5000,
        'Server subscribe'
      );

      setIsSubscribed(true);
      console.log('Push notification subscription successful');
    } catch (e) {
      console.error('Push subscription failed:', e);
      // Don't throw — subscription failure should not block the UI
    } finally {
      subscribingRef.current = false;
    }
  }, [userId]);

  // Auto-subscribe when permission is already granted (in background)
  useEffect(() => {
    if (userId && permission === 'granted' && !isSubscribed) {
      // Fire and forget — don't block UI
      subscribeToPush();
    }
  }, [userId, permission, isSubscribed, subscribeToPush]);

  // ─── Permission Request (called by modal) ─────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!supportsPushNotifications()) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      setShowPermissionModal(false);

      if (result === 'granted') {
        // Subscribe in background — DON'T await it here
        // This is what caused the freeze: awaiting SW registration inside the modal
        subscribeToPush();
        return true;
      }

      return false;
    } catch (e) {
      console.error('Permission request failed:', e);
      setShowPermissionModal(false);
      return false;
    }
  }, [subscribeToPush]);

  // ─── Dismiss Modal ────────────────────────────────────────────

  const dismissPermissionModal = useCallback(() => {
    setPromptDismissed();
    setShowPermissionModal(false);
  }, []);

  // ─── Update Preferences ───────────────────────────────────────

  const updatePreferences = useCallback(async (
    updates: Partial<NotificationPreferences>
  ) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferencesState(newPrefs);
    savePreferences(newPrefs);

    // Sync to server (include timezone offset for quiet hours)
    if (userId) {
      try {
        await fetch('/api/notification-preferences', {
          method: 'POST',
          body: JSON.stringify({
            userId,
            preferences: newPrefs,
            timezoneOffset: new Date().getTimezoneOffset(),
          }),
          headers: { 'content-type': 'application/json' },
        });
      } catch (e) {
        console.error('Failed to sync notification preferences:', e);
      }
    }
  }, [preferences, userId]);

  // ─── Master Toggle ────────────────────────────────────────────

  const toggleMasterSwitch = useCallback(async () => {
    if (permission === 'granted') {
      return 'open-settings' as const;
    } else if (permission === 'default' && supportsPushNotifications()) {
      const granted = await requestPermission();
      return granted ? 'granted' as const : 'denied' as const;
    } else {
      return 'open-settings' as const;
    }
  }, [permission, requestPermission]);

  // ─── Sync preferences to server on mount ──────────────────────

  useEffect(() => {
    if (userId && permission === 'granted') {
      fetch('/api/notification-preferences', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          preferences,
          timezoneOffset: new Date().getTimezoneOffset(),
        }),
        headers: { 'content-type': 'application/json' },
      }).catch(() => { /* silent */ });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return {
    permission,
    preferences,
    showPermissionModal,
    isSubscribed,
    isiOS,
    isPWA,
    requestPermission,
    dismissPermissionModal,
    updatePreferences,
    toggleMasterSwitch,
  };
}
