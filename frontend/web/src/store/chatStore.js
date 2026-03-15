import { create } from 'zustand';

export const useChatStore = create((set, get) => ({
  chats: [],
  activeChatId: null,
  messages: {},         // { [chatId]: Message[] }
  groupKeys: {},        // { [chatId]: base64GroupKey }  (decrypted)
  typingUsers: {},      // { [chatId]: Set of userIds }
  unreadCounts: {},     // { [chatId]: number }

  setChats: (chats) => set({ chats: sortChats(chats) }),

  upsertChat: (chat) => {
    set(s => {
      const existing = s.chats.findIndex(c => c.id === chat.id);
      if (existing >= 0) {
        const updated = [...s.chats];
        updated[existing] = { ...updated[existing], ...chat };
        return { chats: sortChats(updated) };
      }
      return { chats: sortChats([chat, ...s.chats]) };
    });
  },

  updateChatMeta: (chatId, updates) => {
    set((s) => {
      const chats = s.chats.map((chat) => (chat.id === chatId ? { ...chat, ...updates } : chat));
      return { chats: sortChats(chats) };
    });
  },

  setActiveChat: (chatId) => {
    set({ activeChatId: chatId });
    // Clear unread count
    set(s => ({ unreadCounts: { ...s.unreadCounts, [chatId]: 0 } }));
  },

  setMessages: (chatId, messages) =>
    set(s => ({ messages: { ...s.messages, [chatId]: messages } })),

  appendMessage: (chatId, message) => {
    set(s => {
      const current = s.messages[chatId] || [];
      const exists = current.some(m => m.id === message.id);
      if (exists) return s;
      const updated = [...current, message];
      // Bump chat to top
      const chats = [...s.chats];
      const idx = chats.findIndex(c => c.id === chatId);
      if (idx >= 0) {
        const [chat] = chats.splice(idx, 1);
        chats.unshift({ ...chat, messages: [message] });
      }
      // Unread if not active chat
      const unread = s.activeChatId !== chatId
        ? { ...s.unreadCounts, [chatId]: (s.unreadCounts[chatId] || 0) + 1 }
        : s.unreadCounts;
      return { messages: { ...s.messages, [chatId]: updated }, chats: sortChats(chats), unreadCounts: unread };
    });
  },

  updateMessage: (chatId, messageId, updates) => {
    set(s => {
      const msgs = (s.messages[chatId] || []).map(m =>
        m.id === messageId ? { ...m, ...updates } : m
      );
      return { messages: { ...s.messages, [chatId]: msgs } };
    });
  },

  updateMessageReactions: (messageId, reactions) => {
    set(s => {
      const newMsgs = { ...s.messages };
      for (const chatId of Object.keys(newMsgs)) {
        newMsgs[chatId] = newMsgs[chatId].map(m =>
          m.id === messageId ? { ...m, reactions } : m
        );
      }
      return { messages: newMsgs };
    });
  },

  updateMessageStars: (messageId, starredBy) => {
    set(s => {
      const newMsgs = { ...s.messages };
      for (const chatId of Object.keys(newMsgs)) {
        newMsgs[chatId] = newMsgs[chatId].map(m =>
          m.id === messageId ? { ...m, starredBy } : m
        );
      }
      return { messages: newMsgs };
    });
  },

  setGroupKey: (chatId, key) =>
    set(s => ({ groupKeys: { ...s.groupKeys, [chatId]: key } })),

  setTyping: (chatId, userId, isTyping) => {
    set(s => {
      const current = new Set(s.typingUsers[chatId] || []);
      isTyping ? current.add(userId) : current.delete(userId);
      return { typingUsers: { ...s.typingUsers, [chatId]: current } };
    });
  },

  updateUserPresence: (userId, isOnline, lastSeen) => {
    set(s => ({
      chats: s.chats.map(chat => ({
        ...chat,
        members: chat.members?.map(m =>
          m.id === userId ? { ...m, isOnline, lastSeen } : m
        ),
      })),
    }));
  },
}));

function sortChats(chats) {
  return [...chats].sort((a, b) => {
    const aArchived = Boolean(a.myIsArchived);
    const bArchived = Boolean(b.myIsArchived);
    if (aArchived !== bArchived) return aArchived ? 1 : -1;

    const aPinned = Boolean(a.myIsPinned);
    const bPinned = Boolean(b.myIsPinned);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    if (aPinned && bPinned) {
      const aPinnedAt = a.myPinnedAt ? new Date(a.myPinnedAt).getTime() : 0;
      const bPinnedAt = b.myPinnedAt ? new Date(b.myPinnedAt).getTime() : 0;
      if (aPinnedAt !== bPinnedAt) return bPinnedAt - aPinnedAt;
    }

    const aLast = a.messages?.[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
    const bLast = b.messages?.[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
    return bLast - aLast;
  });
}
