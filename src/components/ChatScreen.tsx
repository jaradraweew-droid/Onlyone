import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { User, Message } from '../types';
import { Send, Image as ImageIcon, Camera, Check, CheckCheck, Reply, Smile, X, Search, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMessages } from '../hooks/useMessages';
import { REACTIONS } from '../constants';
import { formatTime, compressImage } from '../utils';
import VirtualKeyboard from './VirtualKeyboard';

interface Props {
  user: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const MOBILE_BREAKPOINT = 1024;

export default function ChatScreen({ user, messages, setMessages }: Props) {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const { sendTextMessage, sendImageMessage, toggleReaction, markAsRead } = useMessages({
    user,
    messages,
    setMessages,
  });

  // Auto-scroll & mark as read
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    markAsRead(messages);
  }, [messages, markAsRead]);

  // ─── Handlers ────────────────────────────────────────────────

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      sendImageMessage(dataUrl, replyingTo?.id);
      setReplyingTo(null);
    } catch (err) {
      console.error('Image upload failed:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendTextMessage(inputText, replyingTo?.id);
    setInputText('');
    setReplyingTo(null);
  };

  // ─── Virtual Keyboard Handlers ──────────────────────────────

  const handleVKKeyPress = useCallback((key: string) => {
    setInputText((prev) => prev + key);
  }, []);

  const handleVKBackspace = useCallback(() => {
    setInputText((prev) => prev.slice(0, -1));
  }, []);

  const handleVKEnter = useCallback(() => {
    handleSend();
  }, [inputText, replyingTo]);

  const toggleKeyboard = useCallback(() => {
    setShowKeyboard((prev) => !prev);
  }, []);

  const handleReact = (msgId: string, emoji: string) => {
    setShowReactionsFor(null);
    toggleReaction(msgId, emoji);
  };

  // Close reaction picker on outside click
  useEffect(() => {
    if (!showReactionsFor) return;
    const onClickOutside = () => setShowReactionsFor(null);
    const timer = setTimeout(() => document.addEventListener('click', onClickOutside), 0);
    return () => { clearTimeout(timer); document.removeEventListener('click', onClickOutside); };
  }, [showReactionsFor]);

  const filteredMessages = messages.filter((msg) => {
    if (!searchQuery) return true;
    return !!msg.text?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-mint relative">
      {/* Search Toggle */}
      <div className="absolute top-3 right-4 md:right-6 z-20">
        <button
          onClick={() => setIsSearchVisible(!isSearchVisible)}
          className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-sm border border-sage-100 flex items-center justify-center text-sage-500 hover:text-sage-700 hover:bg-white transition-all"
          aria-label="Search messages"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Search Bar */}
      <AnimatePresence>
        {isSearchVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-mint/80 backdrop-blur-md px-4 md:px-6 py-3 border-b border-sage-200 flex items-center gap-3 z-10 pt-14 shadow-sm"
          >
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-white/70 border-2 border-sage-200/50 rounded-full py-2.5 pl-11 pr-4 text-[15px] outline-none focus:border-sage-400 focus:bg-white transition-all text-sage-900 shadow-inner"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-sage-600 hover:text-sage-800 font-medium bg-sage-200/50 hover:bg-sage-300/50 px-4 py-2.5 rounded-full transition-colors"
              >
                Clear
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 lg:px-8 py-4 flex flex-col gap-4 md:gap-6 no-scrollbar lg:desktop-scrollbar pb-6"
      >
        <div className="text-center mt-2 mb-4">
          <span className="text-xs font-medium tracking-widest text-sage-400 uppercase bg-sage-100/50 px-4 py-1.5 rounded-full">
            Bonded Today
          </span>
        </div>

        {filteredMessages.map((msg) => {
          const isMe = msg.senderId === user.id || msg.senderId === 'me';
          const repliedMsg = msg.replyTo ? messages.find((m) => m.id === msg.replyTo) : null;

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={`flex flex-col max-w-[85%] md:max-w-[70%] lg:max-w-[60%] relative group ${
                isMe ? 'self-end items-end' : 'self-start items-start'
              }`}
            >
              {/* Hover Actions */}
              <div
                className={`absolute top-2 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm rounded-full shadow-sm p-1 z-10 ${
                  isMe ? '-left-16' : '-right-16'
                }`}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); setShowReactionsFor(msg.id); }}
                  className="p-1.5 text-sage-400 hover:text-sage-600 rounded-full hover:bg-sage-50 transition-colors"
                >
                  <Smile size={16} />
                </button>
                <button
                  onClick={() => setReplyingTo(msg)}
                  className="p-1.5 text-sage-400 hover:text-sage-600 rounded-full hover:bg-sage-50 transition-colors"
                >
                  <Reply size={16} />
                </button>
              </div>

              {/* Reaction Picker */}
              {showReactionsFor === msg.id && (
                <div
                  className={`absolute -top-12 z-20 bg-white shadow-lg border border-sage-100 rounded-full py-1.5 px-3 flex gap-1 ${
                    isMe ? 'right-0' : 'left-0'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  {REACTIONS.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => handleReact(msg.id, r.emoji)}
                      className="text-xl hover:scale-125 transition-transform p-0.5"
                      title={r.label}
                      aria-label={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                  <button onClick={() => setShowReactionsFor(null)} className="ml-2 text-sage-300 hover:text-sage-500">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`px-4 md:px-5 py-3 md:py-3.5 rounded-[24px] md:rounded-[28px] overflow-visible relative ${
                  isMe
                    ? 'bg-sage-500 text-white rounded-br-md shadow-sm'
                    : 'bg-white text-sage-900 shadow-sm border border-sage-100 rounded-bl-md'
                }`}
              >
                {/* Reply preview */}
                {repliedMsg && (
                  <div className={`mb-2 pl-3 border-l-2 text-[12px] opacity-80 ${isMe ? 'border-white/50' : 'border-sage-300'}`}>
                    <p className="font-semibold mb-0.5">{repliedMsg.senderId === user.id ? 'You' : 'Partner'}</p>
                    <p className="truncate max-w-[200px]">{repliedMsg.type === 'image' ? 'Photo' : repliedMsg.text}</p>
                  </div>
                )}

                {/* Image */}
                {msg.type === 'image' && msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="uploaded"
                    className="w-full max-w-[240px] rounded-[16px] object-cover mb-2 shadow-sm"
                    loading="lazy"
                  />
                )}

                <p className={`leading-relaxed ${msg.type === 'image' ? 'text-[12px] opacity-80' : 'text-[15px] md:text-[16px]'}`}>
                  {msg.text}
                </p>

                {/* Reactions */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className={`absolute -bottom-3 flex gap-1 ${isMe ? 'right-2' : 'left-2'}`}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <span key={emoji} className="bg-white text-[12px] px-1.5 py-0.5 rounded-full shadow-sm border border-sage-100/50">
                        {emoji} {users.length > 1 ? users.length : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp & Status */}
              <div className="flex items-center gap-1 mt-1.5 px-2">
                <span className="text-[11px] font-medium text-sage-400">{formatTime(msg.timestamp)}</span>
                {isMe && (
                  <span className="text-sage-400">
                    {msg.status === 'read' ? (
                      <CheckCheck size={14} className="text-blue-400" />
                    ) : msg.status === 'delivered' ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 md:p-4 bg-white/60 backdrop-blur-md border-t border-sage-100 shrink-0 safe-bottom">
        {/* Reply Preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: 10, height: 0 }}
              className="bg-white/90 backdrop-blur-md rounded-t-[24px] mx-2 p-3 px-5 border border-b-0 border-sage-200/50 flex justify-between items-center shadow-sm"
            >
              <div className="text-[13px] text-sage-600 truncate mr-4 border-l-2 border-sage-400 pl-2">
                <span className="font-semibold text-sage-800 mr-2">
                  Replying to {replyingTo.senderId === user.id ? 'yourself' : 'partner'}:
                </span>
                {replyingTo.type === 'image' ? 'Photo' : replyingTo.text}
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-sage-400 hover:text-sage-600 shrink-0">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className={`bg-white p-2 flex items-center shadow-sm border border-sage-100/80 backdrop-blur-md ${
            replyingTo ? 'rounded-b-[32px] rounded-t-none border-t-0 mx-2' : 'rounded-[32px]'
          }`}
        >
          {/* Hidden file inputs */}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} onChange={handleImageUpload} className="hidden" />

          <AnimatePresence>
            {!inputText && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 'auto', opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="flex items-center overflow-hidden"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 md:p-3 text-sage-400 hover:text-sage-600 transition-colors bg-sage-50 rounded-full mx-1 shrink-0"
                  aria-label="Upload image"
                >
                  <ImageIcon size={20} strokeWidth={2} />
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-2.5 md:p-3 text-sage-400 hover:text-sage-600 transition-colors bg-sage-50 rounded-full mr-2 shrink-0"
                  aria-label="Take photo"
                >
                  <Camera size={20} strokeWidth={2} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            onFocus={() => {
              if (window.innerWidth < MOBILE_BREAKPOINT) setShowKeyboard(true);
            }}
            placeholder="Whisper something..."
            inputMode={showKeyboard ? 'none' : undefined}
            className="flex-1 bg-transparent border-none outline-none px-3 md:px-4 text-sage-900 placeholder:text-sage-300 text-[15px] md:text-[16px] h-10 min-w-0"
          />

          <button
            onClick={toggleKeyboard}
            className={`p-2.5 md:p-3 rounded-full transition-colors mx-0.5 shrink-0 ${
              showKeyboard
                ? 'bg-sage-500 text-white'
                : 'text-sage-400 hover:text-sage-600 bg-sage-50'
            }`}
            aria-label="Toggle keyboard"
          >
            <Keyboard size={18} strokeWidth={2} />
          </button>

          <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-3 md:p-3.5 bg-sage-500 text-white rounded-full hover:bg-sage-700 transition-colors disabled:opacity-50 disabled:bg-sage-300 ml-1 shadow-sm shrink-0 active:scale-95"
            aria-label="Send message"
          >
            <Send size={18} className="translate-x-[1px] translate-y-[-1px]" />
          </button>
        </div>
      </div>

      {/* Virtual Keyboard */}
      <VirtualKeyboard
        isOpen={showKeyboard}
        onKeyPress={handleVKKeyPress}
        onBackspace={handleVKBackspace}
        onEnter={handleVKEnter}
      />
    </div>
  );
}
