import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, BookImage, Settings, Leaf, X, PawPrint, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../utils';
import { PET_STAT_CRITICAL } from '../constants';

type TabId = 'chat' | 'timeline' | 'settings' | 'pet';

interface PetSummary {
  name: string;
  hunger: number;
  love: number;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onTriggerLeaf: () => void;
  userName: string;
  userAvatar?: string;
  onUpdateProfile?: (updates: { name?: string; avatarUrl?: string }) => void;
  petSummary?: PetSummary | null;
}

const NAV_ITEMS: { id: TabId; icon: React.ReactNode; label: string }[] = [
  { id: 'chat', icon: <MessageCircle size={20} />, label: 'Chat' },
  { id: 'timeline', icon: <BookImage size={20} />, label: 'Scrapbook' },
  { id: 'pet', icon: <PawPrint size={20} />, label: 'Our Pet' },
  { id: 'settings', icon: <Settings size={20} />, label: 'Settings' },
];

export default function Sidebar({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  onTriggerLeaf,
  userName,
  userAvatar,
  onUpdateProfile,
  petSummary,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  // Sync nameInput if userName prop changes
  useEffect(() => {
    setNameInput(userName);
  }, [userName]);

  // ─── Escape Key Handler ───────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.classList.add('sidebar-open');
    } else {
      document.body.classList.remove('sidebar-open');
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('sidebar-open');
    };
  }, [isOpen, handleKeyDown]);

  // ─── Focus Trap ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !sidebarRef.current) return;

    const sidebar = sidebarRef.current;
    const focusableEls = sidebar.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusableEls.length > 0) focusableEls[0].focus();

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [isOpen]);

  // ─── Profile Handlers ────────────────────────────────────────
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProfile) return;

    try {
      const compressed = await compressImage(file);
      onUpdateProfile({ avatarUrl: compressed });
    } catch {
      // Silently fail — image could not be processed
    }
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    const trimmed = nameInput.trim();
    if (trimmed.length > 0 && trimmed !== userName && onUpdateProfile) {
      onUpdateProfile({ name: trimmed });
    } else {
      setNameInput(userName);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNameSave();
    if (e.key === 'Escape') {
      setIsEditingName(false);
      setNameInput(userName);
    }
  };

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
    onClose();
  };

  const isPetHungry = petSummary != null && petSummary.hunger < PET_STAT_CRITICAL;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop Overlay ─────────────────────────────────── */}
          <motion.div
            data-testid="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="sidebar-backdrop"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* ── Sidebar Panel ────────────────────────────────────── */}
          <motion.aside
            ref={sidebarRef}
            role="dialog"
            aria-label="Navigation menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="sidebar-panel"
          >
            {/* Header — Editable Profile */}
            <div className="sidebar-header">
              <div className="flex items-center gap-3">
                {/* Avatar with upload */}
                <button
                  data-testid="sidebar-avatar-btn"
                  onClick={handleAvatarClick}
                  className="sidebar-avatar group relative"
                  aria-label="Change profile picture"
                  type="button"
                >
                  {userAvatar ? (
                    <img
                      src={userAvatar}
                      alt={`${userName}'s profile`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sage-600 font-semibold text-base">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={14} className="text-white" />
                  </div>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  aria-label="Upload profile picture"
                  data-testid="sidebar-avatar-input"
                />

                {/* Editable Name */}
                <div className="flex flex-col min-w-0">
                  {isEditingName ? (
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyDown}
                      autoFocus
                      maxLength={30}
                      className="text-sm font-semibold text-sage-900 bg-transparent border-b border-sage-300 outline-none w-full max-w-[140px]"
                      data-testid="sidebar-name-input"
                      aria-label="Edit display name"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-sm font-semibold text-sage-900 truncate max-w-[140px] text-left hover:text-sage-700 transition-colors cursor-pointer bg-transparent border-none p-0"
                      data-testid="sidebar-name-btn"
                      aria-label="Click to edit display name"
                      type="button"
                    >
                      {userName}
                    </button>
                  )}
                  <span className="text-[10px] text-sage-400 font-medium">MonoGreen</span>
                </div>
              </div>
              <button
                data-testid="sidebar-close"
                onClick={onClose}
                className="sidebar-close-btn"
                aria-label="Close menu"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-sage-100" />

            {/* Navigation */}
            <nav className="flex flex-col gap-1 px-2 py-3 flex-1" aria-label="Main navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = activeTab === item.id;
                const showPetAlert = item.id === 'pet' && isPetHungry;
                return (
                  <button
                    key={item.id}
                    data-testid={`sidebar-nav-${item.id}`}
                    onClick={() => handleTabClick(item.id)}
                    className={`sidebar-nav-item ${isActive ? 'sidebar-nav-active' : 'sidebar-nav-inactive'}`}
                    type="button"
                  >
                    <span className="sidebar-nav-icon">{item.icon}</span>
                    <span className="text-[13px] font-medium">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="sidebar-active-dot"
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      />
                    )}
                    {showPetAlert && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-red-400 animate-pulse" aria-label="Pet needs attention" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Pet Mini Status (if pet exists) */}
            {petSummary != null && (
              <div className="mx-2 px-3 py-2 bg-sage-50/60 rounded-xl mb-2">
                <p className="text-[11px] font-semibold text-sage-500 mb-1">🐾 {petSummary.name}</p>
                <div className="flex gap-3 text-[10px] text-sage-400">
                  <span>🍖 {petSummary.hunger}%</span>
                  <span>❤️ {petSummary.love}%</span>
                </div>
              </div>
            )}

            {/* Footer — Leaf button */}
            <div className="mt-auto px-2 pb-4 safe-bottom">
              <div className="mx-1 border-t border-sage-100 mb-3" />
              <button
                data-testid="sidebar-leaf-btn"
                onClick={() => {
                  onTriggerLeaf();
                  onClose();
                }}
                className="sidebar-leaf-btn"
                type="button"
              >
                <div className="w-8 h-8 rounded-full bg-sage-100 flex items-center justify-center">
                  <Leaf size={16} className="text-sage-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-sage-700">Thinking of you</span>
                  <span className="text-[10px] text-sage-400">Send a leaf</span>
                </div>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
