import { useState, useEffect } from 'react';
import WelcomeScreen from './components/WelcomeScreen';
import HomeScreen from './components/HomeScreen';
import NotificationPermissionModal from './components/NotificationPermissionModal';
import type { User } from './types';
import { socket } from './socket';
import { useNotifications } from './hooks/useNotifications';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('monogreen_user');
    try {
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse stored user data:', e);
    }
    return null;
  });

  // ─── Push Notifications (via custom hook) ─────────────────────
  const {
    showPermissionModal,
    isiOS,
    isPWA,
    requestPermission,
    dismissPermissionModal,
    preferences,
    updatePreferences,
    permission,
    toggleMasterSwitch,
  } = useNotifications(currentUser?.seedCode ?? null);

  // ─── Socket Auto-Join ───────────────────────────────────────────
  useEffect(() => {
    const handleConnect = () => {
      if (currentUser) {
        socket.emit('join_bond', { user: currentUser, partnerCode: currentUser.partnerId });
      }
    };

    socket.on('connect', handleConnect);
    if (socket.connected && currentUser) handleConnect();

    return () => { socket.off('connect', handleConnect); };
  }, [currentUser]);

  // ─── User Persistence ──────────────────────────────────────────
  const saveUser = (user: User | null) => {
    const prevPartnerId = currentUser?.partnerId;
    setCurrentUser(user);

    if (user) {
      localStorage.setItem('monogreen_user', JSON.stringify(user));
      localStorage.setItem('monogreen_identity', JSON.stringify({
        name: user.name,
        seedCode: user.seedCode,
        id: user.id,
      }));

      if (socket.connected && user.partnerId !== prevPartnerId) {
        socket.emit('join_bond', { user, partnerCode: user.partnerId });
      }
    } else {
      localStorage.removeItem('monogreen_user');
      socket.once('disconnect', () => socket.connect());
      socket.disconnect();
    }
  };

  return (
    <div className="app-container bg-mint">
      {currentUser ? (
        <HomeScreen
          user={currentUser}
          onUpdateUser={saveUser}
          notificationProps={{
            preferences,
            updatePreferences,
            permission,
            toggleMasterSwitch,
          }}
        />
      ) : (
        <WelcomeScreen onLogin={saveUser} />
      )}

      {/* First-time notification permission popup */}
      <NotificationPermissionModal
        isOpen={showPermissionModal}
        isiOS={isiOS}
        isPWA={isPWA}
        onEnable={requestPermission}
        onDismiss={dismissPermissionModal}
      />
    </div>
  );
}
