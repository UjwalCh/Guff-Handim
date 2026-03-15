import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { decryptDirect, decryptGroup, loadKeys } from '../../utils/encryption';
import { groupMessagesByDate } from '../../utils/helpers';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import EmojiPicker from 'emoji-picker-react';

export default function ChatWindow({ chat, onBack }) {
  const [replyTo, setReplyTo] = useState(null);
  const [reactTarget, setReactTarget] = useState(null);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const bottomRef = useRef();
  const myId = useAuthStore(s => s.user?.id);
  const { setMessages, messages: allMsgs, groupKeys, updateMessage } = useChatStore();
  const msgs = allMsgs[chat?.id] || [];
  const gk = groupKeys[chat?.id];

  const { isLoading } = useQuery({
    queryKey: ['messages', chat?.id],
    enabled: !!chat?.id,
    queryFn: async () => {
      const { data } = await api.get(`/chats/${chat.id}/messages`, { params: { limit: 50 } });
      const keys = loadKeys();
      const decrypted = data.messages.map(m => {
        if (!m.encryptedContent || m.isDeleted) return m;
        try {
          let text = null;
          if (chat.isGroup && gk) {
            text = decryptGroup(m.encryptedContent, gk);
          } else if (keys && m.sender?.publicKey) {
            const senderPK = m.senderId === myId ? null : m.sender.publicKey;
            // If I sent it, use recipient's pubkey (other member)
            const pk = m.senderId === myId
              ? chat.members?.find(mb => mb.id !== myId)?.publicKey
              : senderPK;
            if (pk) text = decryptDirect(m.encryptedContent, pk, keys.secretKey);
          }
          return { ...m, decryptedContent: text };
        } catch { return m; }
      });
      setMessages(chat.id, decrypted);
      return decrypted;
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  // Mark as read
  useEffect(() => {
    if (!chat?.id || !msgs.length) return;
    const unread = msgs.filter(m => m.senderId !== myId && !m.readBy);
    if (!unread.length) return;
    api.patch('/messages/read', { chatId: chat.id, messageIds: unread.map(m => m.id) })
      .catch(() => {});
  }, [msgs.length, chat?.id]);

  async function handleDelete(messageId) {
    await api.delete(`/messages/${messageId}`);
  }

  async function handleReact(message, emoji) {
    if (emoji) {
      await api.post(`/messages/${message.id}/reactions`, { emoji });
    } else {
      setReactTarget(message);
      setShowReactPicker(true);
    }
  }

  async function handleEmojiReact({ emoji }) {
    if (!reactTarget) return;
    await api.post(`/messages/${reactTarget.id}/reactions`, { emoji });
    setShowReactPicker(false);
    setReactTarget(null);
  }

  const grouped = groupMessagesByDate(msgs);

  return (
    <div className="flex flex-col h-full">
      <ChatHeader chat={chat} onBack={onBack} onOpenInfo={() => {}} />

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0.5"
        style={{ backgroundImage: 'url("/chat-bg.png")', backgroundSize: '400px' }}
        onClick={() => setShowReactPicker(false)}
      >
        {isLoading && (
          <div className="flex justify-center py-8 text-wa-text_dim text-sm">Loading messages...</div>
        )}

        {grouped.map(item =>
          item.type === 'date' ? (
            <div key={item.key} className="flex justify-center my-3">
              <span className="bg-wa-panel text-wa-text_dim text-xs px-3 py-1 rounded-full shadow">
                {item.label}
              </span>
            </div>
          ) : (
            <MessageBubble
              key={item.key}
              message={item.message}
              isGroup={chat?.isGroup}
              onReply={setReplyTo}
              onDelete={handleDelete}
              onReact={handleReact}
            />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Emoji reaction picker overlay */}
      {showReactPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <EmojiPicker theme="dark" onEmojiClick={handleEmojiReact} height={300} width={280} />
        </div>
      )}

      <MessageInput
        chat={chat}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />
    </div>
  );
}
