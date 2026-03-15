import { useState, useRef, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import api from '../../utils/api';
import { getSocket } from '../../hooks/useSocket';
import { encryptDirect, encryptGroup, loadKeys } from '../../utils/encryption';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export default function MessageInput({ chat, replyTo, onClearReply }) {
  const myId = useAuthStore(s => s.user?.id);
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const quickEmojis = ['😀', '😂', '😍', '🔥', '👍', '🙏', '🎉', '❤️'];
  const fileRef = useRef();
  const textRef = useRef();
  const typingTimerRef = useRef(null);
  const socket = getSocket();
  const groupKeys = useChatStore(s => s.groupKeys);

  function encryptMessage(plaintext) {
    const keys = loadKeys();
    if (!keys) return null;

    const chatId = chat.id;
    const gk = groupKeys[chatId];

    if (chat.isGroup && gk) {
      return encryptGroup(plaintext, gk);
    }
    // 1:1: encrypt with the other member's public key
    const other = chat.members?.find(m => m.id !== myId);
    if (!other?.publicKey) return null;
    return encryptDirect(plaintext, other.publicKey, keys.secretKey);
  }

  function emitTyping(val) {
    const chatId = chat.id;
    clearTimeout(typingTimerRef.current);
    if (val.length > 0) {
      socket?.emit('typing', { chatId, isTyping: true });
      typingTimerRef.current = setTimeout(() => {
        socket?.emit('typing', { chatId, isTyping: false });
      }, 3000);
    } else {
      socket?.emit('typing', { chatId, isTyping: false });
    }
  }

  async function sendText(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    const encryptedContent = encryptMessage(trimmed);
    setText('');
    setShowEmoji(false);
    socket?.emit('typing', { chatId: chat.id, isTyping: false });

    try {
      await api.post(`/chats/${chat.id}/messages`, {
        encryptedContent,
        type: 'text',
        replyToId: replyTo?.id || null,
      });
      onClearReply?.();
    } catch (err) {
      console.error('Send failed:', err);
    }
  }

  async function sendFile(file) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post('/files/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio'
        : 'file';

      // For media files we still send encrypted metadata if desired
      await api.post(`/chats/${chat.id}/messages`, {
        type,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        thumbnailUrl: data.thumbnailUrl,
        replyToId: replyTo?.id || null,
      });
      onClearReply?.();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  }

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) sendFile(file);
    e.target.value = '';
  }, [chat]);

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  }

  function resizeTextArea(target) {
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
  }

  return (
    <div className="bg-wa-panel px-3 py-3 relative">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center bg-wa-hover rounded-lg px-3 py-2 mb-2 gap-2">
          <div className="flex-1 border-l-2 border-wa-green pl-2">
            <p className="text-wa-green text-xs font-medium">{replyTo.sender?.name || 'You'}</p>
            <p className="text-wa-text_dim text-xs truncate">{replyTo.decryptedContent || '📎 Media'}</p>
          </div>
          <button onClick={onClearReply} className="text-wa-text_dim hover:text-wa-text">✕</button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full left-0 mb-2 chat-emoji-panel">
          <div className="mb-2 flex gap-1.5 flex-wrap bg-wa-panel rounded-xl border border-wa-border p-2">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setText((t) => t + emoji)}
                className="w-9 h-9 rounded-lg bg-wa-hover hover:bg-wa-border transition"
              >
                {emoji}
              </button>
            ))}
          </div>
          <EmojiPicker
            theme="dark"
            onEmojiClick={({ emoji }) => setText(t => t + emoji)}
            height={350}
            width={320}
          />
        </div>
      )}

      <form onSubmit={sendText} className="flex items-end gap-2">
        {/* Emoji toggle */}
        <button
          type="button"
          onClick={() => setShowEmoji(p => !p)}
          className="text-wa-icon hover:text-wa-text transition p-2 hover:scale-110"
          title="Emoji"
        >
          😊
        </button>

        {/* Text input */}
        <textarea
          ref={textRef}
          value={text}
          onChange={e => {
            setText(e.target.value);
            emitTyping(e.target.value);
            resizeTextArea(e.target);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message"
          rows={1}
          className="flex-1 bg-wa-hover rounded-xl px-4 py-2.5 text-wa-text text-sm resize-none focus:outline-none placeholder-wa-text_dim"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
        />

        {/* File attachment */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-wa-icon hover:text-wa-text transition p-2"
          title="Attach file"
          disabled={uploading}
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
          onChange={handleFileChange}
        />

        {/* Send button */}
        <button
          type={text.trim() ? 'submit' : 'button'}
          onClick={() => {
            if (!text.trim()) {
              fileRef.current?.click();
            }
          }}
          disabled={uploading}
          className="w-10 h-10 bg-wa-green rounded-full flex items-center justify-center hover:bg-opacity-90 transition disabled:opacity-50"
          title={text.trim() ? 'Send' : 'Attach media'}
        >
          {uploading ? (
            <svg className="animate-spin w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" strokeWidth="3" />
            </svg>
          ) : text.trim() ? (
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
              <path d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3zm5-3a1 1 0 112 0 7 7 0 01-6 6.92V21h3a1 1 0 110 2H8a1 1 0 010-2h3v-3.08A7 7 0 015 11a1 1 0 112 0 5 5 0 0010 0z"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
