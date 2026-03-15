import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useCallStore } from '../store/callStore';
import { decryptDirect, decryptGroup, loadKeys } from '../utils/encryption';
import { SOCKET_URL } from '../utils/runtimeConfig';

let socket = null;

export function getSocket() {
  return socket;
}

export function useSocket() {
  const accessToken = useAuthStore(s => s.accessToken);
  const { appendMessage, updateMessage, updateMessageReactions, setTyping, updateUserPresence, upsertChat } = useChatStore();
  const { setIncomingCall } = useCallStore();
  const groupKeys = useChatStore(s => s.groupKeys);
  const groupKeysRef = useRef(groupKeys);
  groupKeysRef.current = groupKeys;

  useEffect(() => {
    if (!accessToken) return;

    socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => console.log('Socket connected:', socket.id));
    socket.on('disconnect', (reason) => console.log('Socket disconnected:', reason));
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    // ── Messages ───────────────────────────────────────────────────────────
    socket.on('new-message', ({ message }) => {
      const keys = loadKeys();
      let decrypted = { ...message };

      if (message.encryptedContent && !message.isDeleted) {
        try {
          const chatId = message.chatId;
          const gk = groupKeysRef.current[chatId];
          if (gk) {
            // Group message
            decrypted.decryptedContent = decryptGroup(message.encryptedContent, gk);
          } else if (keys && message.sender?.publicKey) {
            // 1:1 message
            decrypted.decryptedContent = decryptDirect(
              message.encryptedContent,
              message.sender.publicKey,
              keys.secretKey
            );
          }
        } catch (e) {
          decrypted.decryptedContent = '[Encrypted]';
        }
      }

      appendMessage(message.chatId, decrypted);
    });

    socket.on('message-deleted', ({ messageId, chatId }) => {
      updateMessage(chatId, messageId, { isDeleted: true, type: 'deleted', encryptedContent: null });
    });

    socket.on('message-updated', ({ chatId, messageId, updates }) => {
      const keys = loadKeys();
      const hydratedUpdates = { ...updates };
      if (updates?.encryptedContent && keys) {
        try {
          const gk = groupKeysRef.current[chatId];
          if (gk) {
            hydratedUpdates.decryptedContent = decryptGroup(updates.encryptedContent, gk);
          }
        } catch (_error) {
          hydratedUpdates.decryptedContent = '[Encrypted]';
        }
      }
      updateMessage(chatId, messageId, hydratedUpdates);
    });

    socket.on('reaction-update', ({ messageId, reactions }) => {
      updateMessageReactions(messageId, reactions);
    });

    socket.on('messages-read', ({ chatId, messageIds, readBy }) => {
      messageIds.forEach(id => updateMessage(chatId, id, { readBy }));
    });

    // ── Typing ─────────────────────────────────────────────────────────────
    socket.on('typing', ({ chatId, userId, isTyping }) => {
      setTyping(chatId, userId, isTyping);
    });

    // ── Presence ───────────────────────────────────────────────────────────
    socket.on('user-online', ({ userId }) => updateUserPresence(userId, true, null));
    socket.on('user-offline', ({ userId, lastSeen }) => updateUserPresence(userId, false, lastSeen));

    // ── Group Events ───────────────────────────────────────────────────────
    socket.on('added-to-group', ({ chat }) => {
      if (chat) upsertChat(chat);
      else socket.emit('join-chat', chat?.id);
    });

    socket.on('group-updated', ({ chatId, updates }) => {
      upsertChat({ id: chatId, ...updates });
    });

    // ── WebRTC Calls ───────────────────────────────────────────────────────
    socket.on('webrtc-offer', ({ from, fromName, fromAvatar, offer, type }) => {
      setIncomingCall({ id: from, name: fromName, avatar: fromAvatar }, type, offer);
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [accessToken]);

  return socket;
}
