import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { decryptDirect, decryptGroup, encryptDirect, encryptGroup, loadKeys } from '../../utils/encryption';
import { groupMessagesByDate } from '../../utils/helpers';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import EmojiPicker from 'emoji-picker-react';
import { toAbsoluteAssetUrl } from '../../utils/runtimeConfig';

export default function ChatWindow({ chat, onBack }) {
  const [replyTo, setReplyTo] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [forwardToChats, setForwardToChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [starOnly, setStarOnly] = useState(false);
  const [reactTarget, setReactTarget] = useState(null);
  const [showReactPicker, setShowReactPicker] = useState(false);
  const bottomRef = useRef();
  const myId = useAuthStore(s => s.user?.id);
  const chats = useChatStore(s => s.chats);
  const { setMessages, messages: allMsgs, groupKeys, updateMessage, updateMessageStars, updateChatMeta } = useChatStore();
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
    if (editTarget?.id === messageId) setEditTarget(null);
  }

  async function handleEdit(message, nextEncryptedContent) {
    await api.patch(`/messages/${message.id}`, { encryptedContent: nextEncryptedContent });
    setEditTarget(null);
  }

  async function handleTogglePin(pinned) {
    await api.patch(`/chats/${chat.id}/pin`, { pinned });
    updateChatMeta(chat.id, {
      myIsPinned: pinned,
      myPinnedAt: pinned ? new Date().toISOString() : null,
    });
  }

  async function handleToggleArchive(archived) {
    await api.patch(`/chats/${chat.id}/archive`, { archived });
    updateChatMeta(chat.id, { myIsArchived: archived });
    if (archived) {
      onBack?.();
    }
  }

  async function handleReact(message, emoji) {
    if (emoji) {
      await api.post(`/messages/${message.id}/reactions`, { emoji });
    } else {
      setReactTarget(message);
      setShowReactPicker(true);
    }
  }

  async function handleToggleStar(message) {
    const isStarred = (message.starredBy || []).some((entry) => entry.userId === myId);
    const method = isStarred ? 'delete' : 'post';
    const { data } = await api[method](`/messages/${message.id}/star`);
    updateMessageStars(message.id, data.starredBy || []);
  }

  function openForward(message) {
    setForwardTarget(message);
    setForwardToChats([]);
  }

  function toggleForwardChat(chatId) {
    setForwardToChats((prev) => prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]);
  }

  function encryptForTargetChat(targetChat, plaintext) {
    const keys = loadKeys();
    if (!keys) return null;

    const gk = groupKeys[targetChat.id];
    if (targetChat.isGroup && gk) {
      return encryptGroup(plaintext, gk);
    }

    const other = targetChat.members?.find((member) => member.id !== myId);
    if (!other?.publicKey) return null;
    return encryptDirect(plaintext, other.publicKey, keys.secretKey);
  }

  async function submitForward() {
    if (!forwardTarget || forwardToChats.length === 0) return;

    for (const targetChatId of forwardToChats) {
      const targetChat = chats.find((entry) => entry.id === targetChatId);
      if (!targetChat) continue;

      if (forwardTarget.type === 'text') {
        const plain = forwardTarget.decryptedContent;
        if (!plain) continue;

        const encryptedContent = encryptForTargetChat(targetChat, plain);
        if (!encryptedContent) continue;

        await api.post(`/chats/${targetChat.id}/messages`, {
          type: 'text',
          encryptedContent,
          isForwarded: true,
        });
      } else {
        await api.post(`/chats/${targetChat.id}/messages`, {
          type: forwardTarget.type,
          fileUrl: forwardTarget.fileUrl,
          fileName: forwardTarget.fileName,
          fileSize: forwardTarget.fileSize,
          mimeType: forwardTarget.mimeType,
          thumbnailUrl: forwardTarget.thumbnailUrl,
          isForwarded: true,
        });
      }
    }

    setForwardTarget(null);
    setForwardToChats([]);
  }

  async function handleEmojiReact({ emoji }) {
    if (!reactTarget) return;
    await api.post(`/messages/${reactTarget.id}/reactions`, { emoji });
    setShowReactPicker(false);
    setReactTarget(null);
  }

  const filteredMessages = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return msgs.filter((msg) => {
      const isStarred = (msg.starredBy || []).some((entry) => entry.userId === myId);
      if (starOnly && !isStarred) return false;
      if (!q) return true;
      const haystack = `${msg.decryptedContent || ''} ${msg.fileName || ''}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [msgs, searchTerm, starOnly, myId]);

  const grouped = groupMessagesByDate(filteredMessages);
  const recentMedia = useMemo(
    () => msgs.filter((m) => (m.type === 'image' || m.type === 'video') && m.fileUrl).slice(-12).reverse(),
    [msgs]
  );

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        chat={chat}
        onBack={onBack}
        onOpenInfo={() => {}}
        onTogglePin={handleTogglePin}
        onToggleArchive={handleToggleArchive}
      />

      <div className="px-3 py-2 border-b border-wa-border bg-wa-panel/70 flex items-center gap-2">
        <button
          type="button"
          className={`text-xs px-3 py-1 rounded-full ${showSearch ? 'bg-wa-green text-white' : 'bg-wa-hover text-wa-text_dim'}`}
          onClick={() => setShowSearch((prev) => !prev)}
        >
          Search
        </button>
        <button
          type="button"
          className={`text-xs px-3 py-1 rounded-full ${starOnly ? 'bg-wa-green text-white' : 'bg-wa-hover text-wa-text_dim'}`}
          onClick={() => setStarOnly((prev) => !prev)}
        >
          Starred
        </button>
        {showSearch && (
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in this chat"
            className="flex-1 bg-wa-hover rounded-lg px-3 py-1.5 text-sm text-wa-text placeholder-wa-text_dim outline-none"
          />
        )}
      </div>

      {recentMedia.length > 0 && (
        <div className="px-3 py-2 border-b border-wa-border bg-wa-panel/80">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] uppercase tracking-[0.14em] text-wa-text_dim shrink-0">Recent media</span>
            {recentMedia.map((media) => (
              <a
                key={media.id}
                href={toAbsoluteAssetUrl(media.fileUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-wa-border ui-pop"
                title={media.type === 'video' ? 'Open video' : 'Open image'}
              >
                <img
                  src={toAbsoluteAssetUrl(media.thumbnailUrl || media.fileUrl)}
                  alt="media"
                  className="w-full h-full object-cover"
                />
                {media.type === 'video' && (
                  <span className="absolute inset-0 grid place-items-center bg-black/25 text-white text-xs">▶</span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

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
              onEdit={() => setEditTarget(item.message)}
              onForward={() => openForward(item.message)}
              onStar={() => handleToggleStar(item.message)}
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
        editTarget={editTarget}
        onEdit={handleEdit}
        onCancelEdit={() => setEditTarget(null)}
        onClearReply={() => setReplyTo(null)}
      />

      {forwardTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-wa-border bg-wa-panel p-4 max-h-[80vh] overflow-auto">
            <p className="text-wa-text font-semibold text-lg">Forward Message</p>
            <p className="text-wa-text_dim text-sm mt-1">Select one or more chats.</p>

            <div className="mt-4 space-y-2">
              {chats.filter((entry) => entry.id !== chat.id).map((entry) => {
                const checked = forwardToChats.includes(entry.id);
                const title = entry.isGroup ? entry.name : (entry.members?.find((m) => m.id !== myId)?.name || 'Direct chat');
                return (
                  <label key={entry.id} className="flex items-center gap-3 rounded-xl bg-wa-hover px-3 py-2 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggleForwardChat(entry.id)} />
                    <span className="text-wa-text text-sm">{title}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="px-4 py-2 rounded-xl bg-wa-hover text-wa-text_dim" onClick={() => setForwardTarget(null)}>Cancel</button>
              <button className="px-4 py-2 rounded-xl bg-wa-green text-white disabled:opacity-60" disabled={forwardToChats.length === 0} onClick={submitForward}>Forward</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
