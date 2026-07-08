import { useState, useEffect, useCallback } from 'react';
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

function detectiOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useNotifications(userId: string | null) {
  const [permission, setPermission] = useState<PermissionState>(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as PermissionState;
  });

  const [preferences, setPreferencesState] = useState<NotificationPreferences>(loadPreferences);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isiOS, setIsiOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // Detect platform on mount
  useEffect(() => {
    setIsiOS(detectiOS());
    setIsPWA(isStandalone());
  }, []);

  // Determine if we should show the first-time modal
  useEffect(() => {
    if (
      userId &&
      permission === 'default' &&
      !isPromptDismissed() &&
      'Notification' in window
    ) {
      // Small delay so the app renders first
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

  // ─── Push Subscription ────────────────────────────────────────

  const subscribeToPush = useCallback(async () => {
    if (!userId || !('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      const res = await fetch('/api/vapidPublicKey');
      const publicVapidKey = await res.text();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription, userId }),
        headers: { 'content-type': 'application/json' },
      });

      setIsSubscribed(true);
    } catch (e) {
      console.error('Failed to subscribe to push notifications:', e);
    }
  }, [userId]);

  // Auto-subscribe when permission is already granted
  useEffect(() => {
    if (userId && permission === 'granted' && !isSubscribed) {
      subscribeToPush();
    }
  }, [userId, permission, isSubscribed, subscribeToPush]);

  // ─── Permission Request (called by modal) ─────────────────────

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);

      if (result === 'granted') {
        await subscribeToPush();
        setShowPermissionModal(false);
        return true;
      }
    } catch (e) {
      console.error('Failed to request notification permission:', e);
    }
    return false;
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
      // Can't revoke via API, guide user to browser settings
      return 'open-settings' as const;
    } else if (permission === 'default') {
      const granted = await requestPermission();
      return granted ? 'granted' as const : 'denied' as const;
    } else {
      // Permission denied — need to go to browser settings
      return 'open-settings' as const;
    }
  }, [permission, requestPermission]);

  // ─── Sync preferences to server on first load ─────────────────

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
  }, [userId]); // Only on mount/user change

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
