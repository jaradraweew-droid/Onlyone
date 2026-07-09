import { useState } from 'react';
import type { User, Mood, CustomMood } from '../types';
import type { NotificationPreferences, PermissionState } from '../hooks/useNotifications';
import { AlertTriangle, User as UserIcon, Calendar, Bell, BellOff, Volume2, Moon, Clock, CheckCircle, XCircle, CircleDot, Pencil, Plus } from 'lucide-react';
import { socket } from '../socket';
import { DEFAULT_MOODS } from '../constants';
import { NOTIFICATION_SOUNDS, playNotificationSound, isAudioSupported } from '../notificationSounds';

interface NotificationProps {
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  permission: PermissionState;
  toggleMasterSwitch: () => Promise<'granted' | 'denied' | 'open-settings'>;
}

interface Props {
  user: User;
  onUpdateUser: (user: User | null) => void;
  notificationProps: NotificationProps;
}

// ─── Toggle Switch Component ────────────────────────────────────────

function ToggleSwitch({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sage-300 ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${enabled ? 'bg-sage-500' : 'bg-sage-200'}`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── Permission Badge ───────────────────────────────────────────────

function PermissionBadge({ permission }: { permission: PermissionState }) {
  if (permission === 'granted') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-[11px] font-semibold">
        <CheckCircle size={12} /> Enabled
      </span>
    );
  }
  if (permission === 'denied') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-500 text-[11px] font-semibold">
        <XCircle size={12} /> Blocked
      </span>
    );
  }
  if (permission === 'unsupported') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sage-50 text-sage-400 text-[11px] font-semibold">
        <XCircle size={12} /> Unsupported
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-semibold">
      <CircleDot size={12} /> Not Set
    </span>
  );
}

// ─── Main Settings Screen ───────────────────────────────────────────

export default function SettingsScreen({ user, onUpdateUser, notificationProps }: Props) {
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [editingMood, setEditingMood] = useState<CustomMood | null>(null);
  const [isAddingMood, setIsAddingMood] = useState(false);

  const { preferences, updatePreferences, permission, toggleMasterSwitch } = notificationProps;
  const isNotifEnabled = permission === 'granted';

  const handleArchive = () => {
    onUpdateUser({
      ...user,
      partnerId: null,
      archivedAt: Date.now(),
    });
    setShowArchiveConfirm(false);
  };

  const setMood = (mood: CustomMood | string) => {
    onUpdateUser({ ...user, mood });
    if (user.partnerId) {
      socket.emit('update_mood', { from: user.seedCode, to: user.partnerId, mood });
    }
  };

  const handleSaveMood = (moodToSave: CustomMood) => {
    const currentMoods = user.customMoods || DEFAULT_MOODS;
    let newMoods;
    if (isAddingMood) {
      newMoods = [...currentMoods, { ...moodToSave, id: `m-${Date.now()}` }];
    } else {
      newMoods = currentMoods.map(m => m.id === moodToSave.id ? moodToSave : m);
    }
    onUpdateUser({ ...user, customMoods: newMoods });
    setEditingMood(null);
    setIsAddingMood(false);
  };

  const handleMasterToggle = async () => {
    const result = await toggleMasterSwitch();
    if (result === 'open-settings') {
      // Guide user to browser notification settings
      alert('To change notification permissions, please go to your browser or device settings for this site.');
    }
  };

  const handlePreviewSound = (soundId: string) => {
    if (!isAudioSupported()) return;
    setPlayingSoundId(soundId);
    const duration = playNotificationSound(soundId);
    setTimeout(() => setPlayingSoundId(null), duration * 1000 + 100);
  };

  return (
    <div className="flex flex-col h-full bg-mint overflow-y-auto px-4 md:px-6 lg:px-8 py-8 pb-32 no-scrollbar lg:desktop-scrollbar">
      <div className="w-full max-w-lg mx-auto">
        <h3 className="font-serif text-2xl md:text-3xl text-sage-900 mb-8">Sanctuary Settings</h3>

        {/* ─── Notification Section ───────────────────────────────── */}
        <div className="bg-white rounded-[28px] md:rounded-[36px] p-6 md:p-7 shadow-sm border border-sage-100 mb-6">
          <h4 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Bell size={14} /> Notifications
          </h4>

          {/* Master Toggle + Permission Status */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex flex-col gap-1">
              <span className="text-sage-900 font-medium text-[15px]">Push Notifications</span>
              <PermissionBadge permission={permission} />
            </div>
            <ToggleSwitch
              enabled={isNotifEnabled}
              onChange={handleMasterToggle}
              disabled={permission === 'unsupported'}
            />
          </div>

          {permission === 'denied' && (
            <div className="bg-amber-50 rounded-2xl p-3.5 mb-5">
              <p className="text-amber-700 text-[12px] leading-relaxed">
                Notifications are blocked. To enable them, go to your browser settings → Site Settings → Notifications, and allow this site.
              </p>
            </div>
          )}

          {/* Per-Type Toggles */}
          <div className="space-y-4 mb-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base">💬</span>
                <span className="text-sage-700 text-[14px]">Messages</span>
              </div>
              <ToggleSwitch
                enabled={preferences.messages}
                onChange={(v) => updatePreferences({ messages: v })}
                disabled={!isNotifEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base">😊</span>
                <span className="text-sage-700 text-[14px]">Mood Updates</span>
              </div>
              <ToggleSwitch
                enabled={preferences.mood}
                onChange={(v) => updatePreferences({ mood: v })}
                disabled={!isNotifEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🍃</span>
                <span className="text-sage-700 text-[14px]">Leaf Notifications</span>
              </div>
              <ToggleSwitch
                enabled={preferences.leaf}
                onChange={(v) => updatePreferences({ leaf: v })}
                disabled={!isNotifEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🐾</span>
                <span className="text-sage-700 text-[14px]">Pet Alerts</span>
              </div>
              <ToggleSwitch
                enabled={preferences.pet}
                onChange={(v) => updatePreferences({ pet: v })}
                disabled={!isNotifEnabled}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-sage-100 my-5" />

          {/* ─── Notification Sound ────────────────────────────────── */}
          <h4 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Volume2 size={14} /> Notification Sound
          </h4>

          {/* Sound Mode Selection */}
          <div className="space-y-3 mb-5">
            <button
              type="button"
              onClick={() => updatePreferences({ soundMode: 'default' })}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                preferences.soundMode === 'default'
                  ? 'border-sage-400 bg-sage-50/60'
                  : 'border-sage-100 bg-white hover:border-sage-200'
              }`}
              disabled={!isNotifEnabled}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                preferences.soundMode === 'default' ? 'border-sage-500' : 'border-sage-200'
              }`}>
                {preferences.soundMode === 'default' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-sage-500" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sage-900 text-[14px] font-medium">Device Default</p>
                <p className="text-sage-400 text-[11px]">Uses your system notification sound</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => updatePreferences({ soundMode: 'custom' })}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                preferences.soundMode === 'custom'
                  ? 'border-sage-400 bg-sage-50/60'
                  : 'border-sage-100 bg-white hover:border-sage-200'
              }`}
              disabled={!isNotifEnabled}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                preferences.soundMode === 'custom' ? 'border-sage-500' : 'border-sage-200'
              }`}>
                {preferences.soundMode === 'custom' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-sage-500" />
                )}
              </div>
              <div className="text-left">
                <p className="text-sage-900 text-[14px] font-medium">OnlyOne Sounds</p>
                <p className="text-sage-400 text-[11px]">Choose from 6 cute custom tones</p>
              </div>
            </button>
          </div>

          {/* Custom Sound Picker */}
          {preferences.soundMode === 'custom' && (
            <div className="grid grid-cols-2 gap-2.5 mb-5">
              {NOTIFICATION_SOUNDS.map((sound) => {
                const isSelected = preferences.soundId === sound.id;
                const isPlaying = playingSoundId === sound.id;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => {
                      updatePreferences({ soundId: sound.id });
                      handlePreviewSound(sound.id);
                    }}
                    disabled={!isNotifEnabled}
                    className={`relative flex flex-col items-center gap-1.5 p-3.5 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? 'border-sage-400 bg-sage-50/80 shadow-sm'
                        : 'border-sage-100 bg-white hover:border-sage-200 hover:bg-sage-50/40'
                    } ${!isNotifEnabled ? 'opacity-40' : ''}`}
                  >
                    {/* Playing indicator */}
                    {isPlaying && (
                      <div className="absolute top-2 right-2 flex gap-0.5">
                        <span className="w-1 h-3 bg-sage-400 rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-sage-500 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                        <span className="w-1 h-2.5 bg-sage-400 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                      </div>
                    )}
                    {/* Selected checkmark */}
                    {isSelected && !isPlaying && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle size={14} className="text-sage-500" />
                      </div>
                    )}
                    <span className="text-2xl">{sound.emoji}</span>
                    <span className="text-sage-900 text-[12px] font-semibold">{sound.name}</span>
                    <span className="text-sage-400 text-[10px] leading-tight text-center">{sound.description}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-sage-100 my-5" />

          {/* ─── Quiet Hours ──────────────────────────────────────── */}
          <h4 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Moon size={14} /> Quiet Hours
          </h4>

          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-sage-700 text-[14px]">Enable Quiet Hours</span>
              <span className="text-sage-400 text-[11px]">Silence notifications during sleep</span>
            </div>
            <ToggleSwitch
              enabled={preferences.quietHoursEnabled}
              onChange={(v) => updatePreferences({ quietHoursEnabled: v })}
              disabled={!isNotifEnabled}
            />
          </div>

          {preferences.quietHoursEnabled && (
            <div className="flex items-center gap-3 bg-sage-50/60 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2 flex-1">
                <Clock size={14} className="text-sage-400" />
                <label htmlFor="quiet-start" className="sr-only">Quiet hours start</label>
                <input
                  id="quiet-start"
                  type="time"
                  value={preferences.quietHoursStart}
                  onChange={(e) => updatePreferences({ quietHoursStart: e.target.value })}
                  className="bg-white border border-sage-200 rounded-xl px-3 py-2 text-sage-900 text-[13px] font-medium w-full focus:ring-2 focus:ring-sage-200 outline-none"
                  disabled={!isNotifEnabled}
                />
              </div>
              <span className="text-sage-400 text-[12px] font-medium">to</span>
              <div className="flex-1">
                <label htmlFor="quiet-end" className="sr-only">Quiet hours end</label>
                <input
                  id="quiet-end"
                  type="time"
                  value={preferences.quietHoursEnd}
                  onChange={(e) => updatePreferences({ quietHoursEnd: e.target.value })}
                  className="bg-white border border-sage-200 rounded-xl px-3 py-2 text-sage-900 text-[13px] font-medium w-full focus:ring-2 focus:ring-sage-200 outline-none"
                  disabled={!isNotifEnabled}
                />
              </div>
            </div>
          )}
        </div>

        {/* ─── Mood Section ──────────────────────────────────────── */}
        <div className="bg-white rounded-[28px] md:rounded-[36px] p-6 md:p-7 shadow-sm border border-sage-100 mb-6">
          <h4 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-6">How are you feeling?</h4>
          <div className="flex flex-wrap gap-4 px-2">
            {(user.customMoods || DEFAULT_MOODS).map((m) => {
              const isSelected = typeof user.mood === 'object' ? user.mood.id === m.id : user.mood === m.value;
              return (
                <div key={m.id} className="relative flex flex-col items-center gap-3 group">
                  <button
                    onClick={() => setMood(m)}
                    className="flex flex-col items-center gap-3"
                    aria-label={m.label}
                  >
                    <div
                      className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isSelected
                          ? 'ring-4 ring-sage-200 ring-offset-4 ring-offset-white scale-110 shadow-lg'
                          : 'opacity-60 group-hover:opacity-100 group-hover:scale-105'
                      }`}
                      style={{ backgroundColor: m.color }}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[13px] transition-colors ${
                        isSelected ? 'text-sage-900 font-semibold' : 'text-sage-400'
                      }`}
                    >
                      {m.label}
                    </span>
                  </button>
                  <button
                    onClick={() => { setEditingMood(m); setIsAddingMood(false); }}
                    className="absolute -top-1 -right-1 bg-white rounded-full p-1.5 shadow-md border border-sage-100 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sage-50 z-10"
                    aria-label={`Edit ${m.label}`}
                  >
                    <Pencil size={12} className="text-sage-500" />
                  </button>
                </div>
              );
            })}

            {/* Add Button */}
            <button
              onClick={() => { setEditingMood({ id: '', value: '', label: '', color: '#A0B0A3' }); setIsAddingMood(true); }}
              className="flex flex-col items-center gap-3 group"
              aria-label="Add new feeling"
            >
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-sage-300 flex items-center justify-center text-sage-400 group-hover:border-sage-500 group-hover:text-sage-500 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-[13px] text-sage-400 group-hover:text-sage-500">
                Add New
              </span>
            </button>
          </div>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-[28px] md:rounded-[36px] p-6 md:p-7 shadow-sm border border-sage-100 mb-6">
          <h4 className="text-[11px] font-bold text-sage-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <UserIcon size={14} /> My Profile
          </h4>
          <div className="space-y-4 md:space-y-5">
            <div className="bg-mint/50 p-4 rounded-[20px] md:rounded-[24px]">
              <p className="text-[11px] font-semibold text-sage-500 mb-1 tracking-wide uppercase">Name</p>
              <p className="text-sage-900 font-medium text-lg">{user.name}</p>
            </div>
            <div className="bg-mint/50 p-4 rounded-[20px] md:rounded-[24px]">
              <p className="text-[11px] font-semibold text-sage-500 mb-1 tracking-wide uppercase">Secret Seed Code</p>
              <p className="text-sage-900 font-mono font-bold tracking-wider select-all">{user.seedCode}</p>
            </div>
            <div className="bg-mint/50 p-4 rounded-[20px] md:rounded-[24px]">
              <p className="text-[11px] font-semibold text-sage-500 mb-1 tracking-wide uppercase flex items-center gap-1.5">
                <Calendar size={12} /> Anniversary Date
              </p>
              <label htmlFor="anniversary-date" className="sr-only">Anniversary Date</label>
              <input
                id="anniversary-date"
                type="date"
                value={user.anniversaryDate ? (() => {
                  const d = new Date(user.anniversaryDate);
                  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                })() : ''}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  const localDate = new Date(year, month - 1, day);
                  const updatedUser = { ...user, anniversaryDate: localDate.getTime() };
                  onUpdateUser(updatedUser);
                  if (user.partnerId) {
                    socket.emit('update_user', { to: user.partnerId, user: updatedUser });
                  }
                }}
                className="w-full bg-transparent border-none p-0 text-sage-900 font-medium text-lg focus:ring-0 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 space-y-4">
          {!showArchiveConfirm ? (
            <button
              onClick={() => setShowArchiveConfirm(true)}
              className="w-full bg-red-50 text-red-600/80 rounded-[24px] md:rounded-[30px] px-6 py-4 md:py-5 font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors text-[15px] active:scale-[0.98]"
            >
              <AlertTriangle size={18} />
              Archive Current Bond
            </button>
          ) : (
            <div className="bg-red-50 rounded-[24px] md:rounded-[30px] p-5 md:p-6 border border-red-200">
              <p className="text-red-700 text-sm font-medium text-center mb-4">
                Are you sure? This cannot be undone. You will need to wait 24 hours to bond with someone else.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="flex-1 bg-white text-sage-700 rounded-[20px] px-4 py-3 font-medium hover:bg-sage-50 transition-colors border border-sage-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchive}
                  className="flex-1 bg-red-500 text-white rounded-[20px] px-4 py-3 font-medium hover:bg-red-600 transition-colors"
                >
                  Yes, Archive
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Mood Edit Modal ────────────────────────────────────── */}
      {editingMood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sage-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-xl font-serif text-sage-900 mb-6 text-center">
              {isAddingMood ? 'Add New Feeling' : 'Edit Feeling'}
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-[12px] font-bold text-sage-500 uppercase tracking-wider mb-2">
                  Feeling Name
                </label>
                <input
                  type="text"
                  value={editingMood.label}
                  onChange={(e) => setEditingMood({ ...editingMood, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                  className="w-full bg-sage-50 border border-sage-200 rounded-xl px-4 py-3 text-sage-900 font-medium focus:ring-2 focus:ring-sage-300 outline-none"
                  placeholder="e.g. Excited"
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-bold text-sage-500 uppercase tracking-wider mb-2">
                  Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={editingMood.color.startsWith('#') ? editingMood.color : '#A0B0A3'}
                    onChange={(e) => setEditingMood({ ...editingMood, color: e.target.value })}
                    className="w-12 h-12 rounded-xl cursor-pointer bg-transparent border-0 p-0"
                  />
                  <span className="text-sage-700 font-medium">{editingMood.color}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => { setEditingMood(null); setIsAddingMood(false); }}
                className="flex-1 bg-sage-50 text-sage-700 rounded-2xl py-3.5 font-semibold hover:bg-sage-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveMood(editingMood)}
                disabled={!editingMood.label.trim()}
                className="flex-1 bg-sage-800 text-white rounded-2xl py-3.5 font-semibold hover:bg-sage-900 transition-colors disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
