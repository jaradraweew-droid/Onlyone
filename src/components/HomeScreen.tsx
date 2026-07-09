import React, { useState, useEffect } from 'react';
import type { User, Message, Mood, CustomMood, Pet, PetStatus, PetAction, PetActionType } from '../types';
import type { NotificationPreferences, PermissionState } from '../hooks/useNotifications';
import ChatScreen from './ChatScreen';
import TimelineScreen from './TimelineScreen';
import SettingsScreen from './SettingsScreen';
import BondScreen from './BondScreen';
import Sidebar from './Sidebar';
import PetScreen from './PetScreen';
import PetSetupModal from './PetSetupModal';
import PetLiveActivity from './PetLiveActivity';
import { Menu, X, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import LeafAnimation from './LeafAnimation';
import { socket } from '../socket';
import { DEFAULT_MOODS } from '../constants';
import { calculateAnniversary, getMoodColor, getMoodLabel, generateId } from '../utils';
import { calculateDecayedStatus, createDefaultPetStatus } from '../petUtils';

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

type TabId = 'chat' | 'timeline' | 'settings' | 'pet';

const DEFAULT_ROOM_NAME = 'Sanctuary';

export default function HomeScreen({ user, onUpdateUser, notificationProps }: Props) {
  const [tab, setTab] = useState<TabId>('chat');
  const [showLeaves, setShowLeaves] = useState(false);
  const [partnerMood, setPartnerMood] = useState<any>('good');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isEditingRoomName, setIsEditingRoomName] = useState(false);
  const [roomNameInput, setRoomNameInput] = useState(user.roomName || DEFAULT_ROOM_NAME);
  const [showMoodCheckIn, setShowMoodCheckIn] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ─── Pet State ──────────────────────────────────────────────────
  const [pet, setPet] = useState<Pet | null>(null);
  const [petStatus, setPetStatus] = useState<PetStatus | null>(null);
  const [petLastUpdate, setPetLastUpdate] = useState<number>(Date.now());
  const [showPetSetup, setShowPetSetup] = useState(false);
  const [pendingProposal, setPendingProposal] = useState<{ pet: Pet; proposerName: string } | null>(null);
  const [lastPetAction, setLastPetAction] = useState<{ userName: string; type: string; timestamp: number } | null>(null);
  const [showLiveBanner, setShowLiveBanner] = useState(true);

  // ─── Socket Events ────────────────────────────────────────────
  useEffect(() => {
    const onLeafFall = () => {
      setShowLeaves(true);
      setTimeout(() => setShowLeaves(false), 4000);
    };

    const onPartnerMood = (mood: any) => setPartnerMood(mood);

    const onChatHistory = (history: Message[]) => setMessages(history);

    const onNewMessage = (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
      if (msg.senderId !== user.id && user.partnerId) {
        socket.emit('update_message', {
          from: user.seedCode,
          to: user.partnerId,
          messageId: msg.id,
          updates: { status: 'delivered' },
        });
      }
    };

    const onPartnerUpdated = (partnerUser: User) => {
      if (partnerUser.anniversaryDate && partnerUser.anniversaryDate !== user.anniversaryDate) {
        const updatedUser = { ...user, anniversaryDate: partnerUser.anniversaryDate };
        onUpdateUser(updatedUser);
      }
    };

    const onMessageUpdated = (data: { messageId: string; updates: Partial<Message> }) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === data.messageId ? { ...msg, ...data.updates } : msg)),
      );
    };

    // Pet socket events
    const onPetProposed = (data: { pet: Pet; proposerName: string }) => {
      setPendingProposal(data);
    };

    const onPetAccepted = (data: { pet: Pet; status: PetStatus }) => {
      setPet(data.pet);
      setPetStatus(data.status);
      setPetLastUpdate(Date.now());
      setPendingProposal(null);
      setShowLiveBanner(true);
    };

    const onPetActionDone = (data: { action: PetAction; newStatus: PetStatus }) => {
      setPetStatus(data.newStatus);
      setPetLastUpdate(Date.now());
      if (data.action.userId !== user.id) {
        setLastPetAction({
          userName: data.action.userName,
          type: data.action.type,
          timestamp: data.action.timestamp,
        });
        setShowLiveBanner(true);
      }
    };

    const onPetStatusSync = (data: { pet: Pet; status: PetStatus }) => {
      setPet(data.pet);
      setPetStatus(data.status);
      setPetLastUpdate(Date.now());
    };

    socket.on('leaf_fall', onLeafFall);
    socket.on('partner_mood_changed', onPartnerMood);
    socket.on('chat_history', onChatHistory);
    socket.on('new_message', onNewMessage);
    socket.on('partner_updated', onPartnerUpdated);
    socket.on('message_updated', onMessageUpdated);
    socket.on('pet_proposed', onPetProposed);
    socket.on('pet_accepted', onPetAccepted);
    socket.on('pet_action_done', onPetActionDone);
    socket.on('pet_status_sync', onPetStatusSync);

    return () => {
      socket.off('leaf_fall', onLeafFall);
      socket.off('partner_mood_changed', onPartnerMood);
      socket.off('chat_history', onChatHistory);
      socket.off('new_message', onNewMessage);
      socket.off('partner_updated', onPartnerUpdated);
      socket.off('message_updated', onMessageUpdated);
      socket.off('pet_proposed', onPetProposed);
      socket.off('pet_accepted', onPetAccepted);
      socket.off('pet_action_done', onPetActionDone);
      socket.off('pet_status_sync', onPetStatusSync);
    };
  }, [user, onUpdateUser]);

  // ─── Guards ──────────────────────────────────────────────────
  if (!user.partnerId) {
    return <BondScreen user={user} onUpdateUser={onUpdateUser} />;
  }

  // ─── Handlers ────────────────────────────────────────────────
  const triggerLeafFall = () => {
    setShowLeaves(true);
    setTimeout(() => setShowLeaves(false), 4000);
    if (user.partnerId) socket.emit('trigger_leaf', user.partnerId);
  };

  const handleSaveRoomName = () => {
    setIsEditingRoomName(false);
    if (roomNameInput.trim() !== '' && roomNameInput !== user.roomName) {
      onUpdateUser({ ...user, roomName: roomNameInput.trim() });
    }
  };

  const handleSetMood = (mood: CustomMood | string) => {
    onUpdateUser({ ...user, mood });
    if (user.partnerId) {
      socket.emit('update_mood', { from: user.seedCode, to: user.partnerId, mood });
    }
    localStorage.setItem('last_check_in_date', new Date().toDateString());
    setShowMoodCheckIn(false);
  };

  const handleUpdateProfile = (updates: { name?: string; avatarUrl?: string }) => {
    const updatedUser = { ...user, ...updates };
    onUpdateUser(updatedUser);
    if (user.partnerId) {
      socket.emit('update_user', { to: user.partnerId, user: updatedUser });
    }
  };

  // ─── Pet Handlers ────────────────────────────────────────────
  const handlePetPropose = (data: { type: 'cat' | 'dog'; name: string; birthday: number }) => {
    const newPet: Pet = {
      id: generateId(),
      type: data.type,
      name: data.name,
      birthday: data.birthday,
      createdAt: Date.now(),
      createdBy: user.id,
      confirmedBy: null,
    };

    // Set locally for the proposer
    setPet(newPet);
    setPetStatus(createDefaultPetStatus());
    setPetLastUpdate(Date.now());
    setShowPetSetup(false);
    setShowLiveBanner(true);

    if (user.partnerId) {
      socket.emit('pet_propose', {
        from: user.seedCode,
        to: user.partnerId,
        pet: newPet,
        proposerName: user.name,
      });
    }
  };

  const handlePetAccept = () => {
    if (!pendingProposal || !user.partnerId) return;

    const confirmedPet: Pet = { ...pendingProposal.pet, confirmedBy: user.id };
    const defaultStatus = createDefaultPetStatus();

    setPet(confirmedPet);
    setPetStatus(defaultStatus);
    setPetLastUpdate(Date.now());
    setPendingProposal(null);
    setShowLiveBanner(true);

    socket.emit('pet_accept', {
      from: user.seedCode,
      to: user.partnerId,
      pet: confirmedPet,
      status: defaultStatus,
    });
  };

  const handlePetReject = () => {
    setPendingProposal(null);
  };

  const handlePetAction = (actionType: PetActionType) => {
    if (!pet || !petStatus || !user.partnerId) return;

    const action: PetAction = {
      id: generateId(),
      userId: user.id,
      userName: user.name,
      type: actionType,
      timestamp: Date.now(),
    };

    socket.emit('pet_action', {
      from: user.seedCode,
      to: user.partnerId,
      petId: pet.id,
      action,
    });
  };

  const handleLiveBannerFeed = () => {
    handlePetAction('feed');
  };

  const handleLiveBannerMissYou = () => {
    triggerLeafFall();
  };

  const anniversary = calculateAnniversary(user.anniversaryDate);

  // Compute decayed pet status for display
  const displayPetStatus = petStatus
    ? calculateDecayedStatus(petStatus, petLastUpdate)
    : null;

  const petSummary = pet && displayPetStatus
    ? { name: pet.name, hunger: displayPetStatus.hunger, love: displayPetStatus.love }
    : null;

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-mint">
      {/* ── Sidebar + Overlay ──────────────────────────────────── */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeTab={tab}
        onTabChange={setTab}
        onTriggerLeaf={triggerLeafFall}
        userName={user.name}
        userAvatar={user.avatarUrl}
        onUpdateProfile={handleUpdateProfile}
        petSummary={petSummary}
      />

      {/* ── Main Content Column ─────────────────────────────────── */}
      <div className="flex-1 flex flex-col relative overflow-hidden w-full">
        {/* Header */}
        <header className="pt-[max(env(safe-area-inset-top),12px)] pb-3 px-3 sm:px-4 md:px-6 flex justify-between items-center bg-white/40 backdrop-blur-md z-10 border-b border-sage-100/50">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger Menu Button */}
            <button
              data-testid="hamburger-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="hamburger-btn"
              aria-label="Open menu"
              type="button"
            >
              <Menu size={20} />
            </button>

            <div className="flex flex-col">
              {anniversary && (
                <span className="text-[10px] font-medium text-sage-500 mb-0.5">{anniversary}</span>
              )}
              <div className="flex items-center gap-2 group h-8">
                {isEditingRoomName ? (
                  <input
                    type="text"
                    value={roomNameInput}
                    onChange={(e) => setRoomNameInput(e.target.value)}
                    onBlur={handleSaveRoomName}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveRoomName()}
                    autoFocus
                    className="font-serif text-lg sm:text-xl md:text-2xl text-sage-900 bg-transparent border-b border-sage-300 outline-none w-28 sm:w-32"
                  />
                ) : (
                  <h2
                    className="font-serif text-lg sm:text-xl md:text-2xl text-sage-900 cursor-pointer"
                    onClick={() => setIsEditingRoomName(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsEditingRoomName(true); } }}
                  >
                    {user.roomName || DEFAULT_ROOM_NAME}
                  </h2>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-sage-700 flex items-center gap-1.5 mt-0.5">
                <span 
                  className="w-2 h-2 rounded-full shadow-sm"
                  style={{ backgroundColor: typeof partnerMood === 'object' && partnerMood !== null ? partnerMood.color : getMoodColor(partnerMood) }}
                />
                Partner is feeling {typeof partnerMood === 'object' && partnerMood !== null ? partnerMood.label : getMoodLabel(partnerMood)}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowMoodCheckIn(!showMoodCheckIn)}
              className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full bg-white/80 border border-sage-100 flex items-center justify-center text-sage-500 hover:text-sage-700 hover:bg-white transition-all shadow-sm"
              title="Check-in mood"
              type="button"
            >
              <Smile size={18} />
            </button>
          </div>
        </header>

        {/* Pet Live Activity Banner */}
        {pet != null && displayPetStatus != null && showLiveBanner && (
          <PetLiveActivity
            pet={pet}
            status={displayPetStatus}
            onFeed={handleLiveBannerFeed}
            onMissYou={handleLiveBannerMissYou}
            lastAction={lastPetAction}
            onDismiss={() => setShowLiveBanner(false)}
          />
        )}

        {/* Daily Check-in Banner */}
        <AnimatePresence>
          {showMoodCheckIn && (
            <motion.div
              initial={{ opacity: 0, y: -20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -20, height: 0 }}
              className="bg-white px-3 sm:px-4 md:px-6 py-4 sm:py-5 shadow-sm border-b border-sage-100 relative z-10"
            >
              <button
                onClick={() => setShowMoodCheckIn(false)}
                className="absolute top-3 right-3 sm:right-4 text-sage-300 hover:text-sage-500 transition-colors p-1"
                aria-label="Close mood check-in"
                type="button"
              >
                <X size={16} />
              </button>
              <h4 className="text-[11px] sm:text-[12px] font-bold text-sage-500 uppercase tracking-widest mb-3 sm:mb-4">Daily Check-in</h4>
              <div className="flex justify-between items-center px-1 max-w-sm">
                {(user.customMoods || DEFAULT_MOODS).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSetMood(m)}
                    className="flex flex-col items-center gap-2 sm:gap-2.5 group"
                    type="button"
                  >
                    <div
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:scale-110 shadow-sm group-hover:shadow-md"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="text-[10px] sm:text-[12px] font-medium text-sage-500 group-hover:text-sage-900 transition-colors">
                      {m.label}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pet Setup Modal */}
        <PetSetupModal
          isOpen={showPetSetup}
          onClose={() => setShowPetSetup(false)}
          onPropose={handlePetPropose}
          anniversaryDate={user.anniversaryDate}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {tab === 'chat' && (
              <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <ChatScreen user={user} messages={messages.filter((m) => !m.isTimelineOnly)} setMessages={setMessages} />
              </motion.div>
            )}
            {tab === 'timeline' && (
              <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <TimelineScreen user={user} messages={messages.filter((m) => m.type === 'image')} setMessages={setMessages} />
              </motion.div>
            )}
            {tab === 'pet' && (
              <motion.div key="pet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <PetScreen
                  user={user}
                  pet={pet}
                  petStatus={displayPetStatus}
                  onSetupPet={() => setShowPetSetup(true)}
                  onPetAction={handlePetAction}
                  lastUpdateTime={petLastUpdate}
                  pendingProposal={pendingProposal}
                  onAcceptProposal={handlePetAccept}
                  onRejectProposal={handlePetReject}
                />
              </motion.div>
            )}
            {tab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                <SettingsScreen user={user} onUpdateUser={onUpdateUser} notificationProps={notificationProps} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Leaf Fall Animation Overlay */}
      <AnimatePresence>
        {showLeaves && <LeafAnimation />}
      </AnimatePresence>
    </div>
  );
}
