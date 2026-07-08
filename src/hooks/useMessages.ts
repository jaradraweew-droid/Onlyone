import React, { useCallback } from 'react';
import type { Message, User } from '../types';
import { socket } from '../socket';
import { generateId } from '../utils';

interface UseMessagesOptions {
  user: User;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

/**
 * Custom hook that encapsulates message operations:
 * sending text/image, reacting, commenting, and marking as read.
 */
export function useMessages({ user, messages, setMessages }: UseMessagesOptions) {
  /** Sends a text message. */
  const sendTextMessage = useCallback(
    (text: string, replyToId?: string) => {
      if (!text.trim()) return;

      const newMsg: Message = {
        id: generateId(),
        senderId: user.id,
        text,
        timestamp: Date.now(),
        type: 'text',
        status: 'sent',
        replyTo: replyToId,
      };

      setMessages((prev) => [...prev, newMsg]);

      if (user.partnerId) {
        socket.emit('send_message', {
          from: user.seedCode,
          to: user.partnerId,
          message: newMsg,
        });
      }

      return newMsg;
    },
    [user, setMessages],
  );

  /** Sends an image message with a data URL. */
  const sendImageMessage = useCallback(
    (imageUrl: string, replyToId?: string, isTimelineOnly = false) => {
      const newMsg: Message = {
        id: generateId(),
        senderId: user.id,
        text: isTimelineOnly ? '' : 'Sent a photo',
        timestamp: Date.now(),
        type: 'image',
        imageUrl,
        status: 'sent',
        replyTo: replyToId,
        isTimelineOnly,
      };

      setMessages((prev) => [...prev, newMsg]);

      if (user.partnerId) {
        socket.emit('send_message', {
          from: user.seedCode,
          to: user.partnerId,
          message: newMsg,
        });
      }

      return newMsg;
    },
    [user, setMessages],
  );

  /** Toggles a reaction on a message. */
  const toggleReaction = useCallback(
    (msgId: string, emoji: string) => {
      if (!user.partnerId) return;

      setMessages((prev) => {
        const msg = prev.find((m) => m.id === msgId);
        if (!msg) return prev;

        const currentReactions = msg.reactions || {};
        const usersWithEmoji = currentReactions[emoji] || [];

        const newUsers = usersWithEmoji.includes(user.id)
          ? usersWithEmoji.filter((id) => id !== user.id)
          : [...usersWithEmoji, user.id];

        const updatedReactions = { ...currentReactions, [emoji]: newUsers };
        if (newUsers.length === 0) delete updatedReactions[emoji];

        socket.emit('update_message', {
          from: user.seedCode,
          to: user.partnerId,
          messageId: msgId,
          updates: { reactions: updatedReactions },
        });

        return prev.map((m) =>
          m.id === msgId ? { ...m, reactions: updatedReactions } : m,
        );
      });
    },
    [user, setMessages],
  );

  /** Adds a comment to a message. */
  const addComment = useCallback(
    (msgId: string, text: string) => {
      if (!text.trim() || !user.partnerId) return;

      const newComment = {
        id: generateId(),
        senderId: user.id,
        text,
        timestamp: Date.now(),
      };

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, comments: [...(m.comments || []), newComment] }
            : m,
        ),
      );

      socket.emit('update_message', {
        from: user.seedCode,
        to: user.partnerId,
        messageId: msgId,
        updates: { comment: newComment },
      });
    },
    [user, setMessages],
  );

  /** Marks unread messages from partner as read. */
  const markAsRead = useCallback(
    (messagesToMark: Message[]) => {
      if (!user.partnerId) return;

      const unread = messagesToMark.filter(
        (m) => m.senderId !== user.id && m.status !== 'read',
      );
      if (unread.length === 0) return;

      setMessages((prev) =>
        prev.map((m) =>
          unread.some((u) => u.id === m.id) ? { ...m, status: 'read' as const } : m,
        ),
      );

      for (const msg of unread) {
        socket.emit('update_message', {
          from: user.seedCode,
          to: user.partnerId!,
          messageId: msg.id,
          updates: { status: 'read' },
        });
      }
    },
    [user, setMessages],
  );

  return {
    sendTextMessage,
    sendImageMessage,
    toggleReaction,
    addComment,
    markAsRead,
  };
}
