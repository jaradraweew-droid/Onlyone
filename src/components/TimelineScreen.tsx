import React, { useState, useRef, useMemo } from 'react';
import type { User, Message } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Smile, Send, Image as ImageIcon } from 'lucide-react';
import { useMessages } from '../hooks/useMessages';
import { REACTIONS } from '../constants';
import { formatDateTime, compressImage } from '../utils';

interface Props {
  user: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function TimelineScreen({ user, messages, setMessages }: Props) {
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);
  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { sendImageMessage, toggleReaction, addComment } = useMessages({
    user,
    messages,
    setMessages,
  });

  const sortedMessages = useMemo(
    () => [...messages].filter((m) => m.type === 'image').sort((a, b) => b.timestamp - a.timestamp),
    [messages],
  );

  const handleReact = (msgId: string, emoji: string) => {
    setShowReactionsFor(null);
    toggleReaction(msgId, emoji);
  };

  const handleAddComment = (msgId: string) => {
    addComment(msgId, commentText);
    setCommentText('');
    setCommentingOn(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await compressImage(file);
      sendImageMessage(dataUrl, undefined, true);
    } catch (err) {
      console.error('Image upload failed:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col h-full bg-mint overflow-hidden relative">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 lg:px-8 py-6 pb-8 no-scrollbar lg:desktop-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-end mb-8 md:mb-10">
          <div>
            <h3 className="font-serif text-2xl md:text-3xl text-sage-900">Scrapbook</h3>
            <p className="text-sage-500 text-sm mt-1">Shared moments</p>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-full bg-sage-500 text-white flex items-center justify-center shadow-lg hover:bg-sage-700 transition-colors active:scale-95"
            aria-label="Upload photo"
          >
            <ImageIcon size={22} />
          </button>
        </div>

        {/* Timeline Grid */}
        {sortedMessages.length === 0 ? (
          <div className="text-center text-sage-400 mt-10 italic">
            No photos yet. Add one or send a photo in chat!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
            {sortedMessages.map((memory, index) => (
              <TimelineCard
                key={memory.id}
                memory={memory}
                index={index}
                isMe={memory.senderId === user.id}
                userId={user.id}
                showReactionsFor={showReactionsFor}
                commentingOn={commentingOn}
                commentText={commentText}
                onReact={handleReact}
                onToggleReactions={setShowReactionsFor}
                onToggleComments={(id) => setCommentingOn(commentingOn === id ? null : id)}
                onCommentTextChange={setCommentText}
                onAddComment={handleAddComment}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TimelineCard ──────────────────────────────────────────────────

interface TimelineCardProps {
  key?: React.Key;
  memory: Message;
  index: number;
  isMe: boolean;
  userId: string;
  showReactionsFor: string | null;
  commentingOn: string | null;
  commentText: string;
  onReact: (msgId: string, emoji: string) => void;
  onToggleReactions: (id: string | null) => void;
  onToggleComments: (id: string) => void;
  onCommentTextChange: (text: string) => void;
  onAddComment: (msgId: string) => void;
}

function TimelineCard({
  memory,
  index,
  isMe,
  userId,
  showReactionsFor,
  commentingOn,
  commentText,
  onReact,
  onToggleReactions,
  onToggleComments,
  onCommentTextChange,
  onAddComment,
}: TimelineCardProps) {
  const senderName = isMe ? 'You' : 'Partner';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.08, 2), duration: 0.5, ease: 'easeOut' }}
      className="flex flex-col relative"
    >
      {/* Sender + Date */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-mint shadow-sm ${isMe ? 'bg-sage-500' : 'bg-blue-400'}`} />
        <div className="flex flex-col">
          <span className="text-[13px] font-bold text-sage-600">{senderName}</span>
          <span className="text-[11px] font-medium text-sage-500 uppercase tracking-widest">
            {formatDateTime(memory.timestamp)}
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[28px] md:rounded-[36px] shadow-sm border border-sage-100 pb-2 relative overflow-hidden">
        {/* Image */}
        <div className="w-full h-auto min-h-48 max-h-96 overflow-hidden bg-sage-100 relative group">
          <img
            src={memory.imageUrl || ''}
            alt={`Memory from ${formatDateTime(memory.timestamp)}`}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-sage-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Caption */}
        {memory.text && (
          <p className="px-5 md:px-6 py-4 text-sage-800 text-[15px]">{memory.text}</p>
        )}

        {/* Reactions & Actions */}
        <div className="px-5 md:px-6 mt-3 flex items-center justify-between pb-4">
          <div className="flex gap-1 flex-wrap">
            {memory.reactions &&
              Object.entries(memory.reactions).map(([emoji, users]) => (
                <span key={emoji} className="bg-sage-50 text-[13px] px-2 py-1 rounded-full shadow-sm border border-sage-100">
                  {emoji} {users.length > 1 ? users.length : ''}
                </span>
              ))}
          </div>

          <div className="flex gap-2 relative">
            {/* Reaction Picker */}
            <AnimatePresence>
              {showReactionsFor === memory.id && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 10 }}
                  className="absolute bottom-full right-0 mb-2 z-20 bg-white shadow-xl border border-sage-100 rounded-full py-2 px-3 flex gap-2"
                >
                  {REACTIONS.map((r) => (
                    <button
                      key={r.emoji}
                      onClick={() => onReact(memory.id, r.emoji)}
                      className="text-2xl hover:scale-125 transition-transform"
                      title={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                  <button onClick={() => onToggleReactions(null)} className="ml-2 text-sage-300 hover:text-sage-500">
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => onToggleReactions(memory.id)}
              className="p-2 text-sage-400 hover:text-sage-600 rounded-full hover:bg-sage-50 transition-colors"
              aria-label="React"
            >
              <Smile size={20} />
            </button>
            <button
              onClick={() => onToggleComments(memory.id)}
              className="p-2 text-sage-400 hover:text-sage-600 rounded-full hover:bg-sage-50 transition-colors"
              aria-label="Comment"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {(memory.comments?.length || commentingOn === memory.id) && (
          <div className="px-5 md:px-6 pb-5 pt-2 border-t border-sage-50">
            {memory.comments?.map((comment) => (
              <div key={comment.id} className="flex gap-2 mb-3 last:mb-0">
                <span className={`font-semibold text-[13px] shrink-0 ${comment.senderId === userId ? 'text-sage-600' : 'text-blue-500'}`}>
                  {comment.senderId === userId ? 'You' : 'Partner'}
                </span>
                <span className="text-[14px] text-sage-800">{comment.text}</span>
              </div>
            ))}

            <AnimatePresence>
              {commentingOn === memory.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 flex items-center gap-2 overflow-hidden"
                >
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => onCommentTextChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddComment(memory.id)}
                    placeholder="Write a comment..."
                    className="flex-1 bg-sage-50 border border-sage-200 rounded-full px-4 py-2 text-[14px] outline-none focus:border-sage-400 min-w-0"
                    autoFocus
                  />
                  <button
                    onClick={() => onAddComment(memory.id)}
                    disabled={!commentText.trim()}
                    className="w-9 h-9 bg-sage-500 text-white rounded-full flex items-center justify-center hover:bg-sage-600 disabled:opacity-50 transition-colors shrink-0 active:scale-95"
                    aria-label="Send comment"
                  >
                    <Send size={14} className="translate-x-[1px] translate-y-[-1px]" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
