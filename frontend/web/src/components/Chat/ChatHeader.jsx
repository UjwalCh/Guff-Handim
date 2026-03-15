import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useCallStore } from '../../store/callStore';
import { useWebRTC } from '../../hooks/useWebRTC';
import { formatLastSeen, getInitials } from '../../utils/helpers';

export default function ChatHeader({ chat, onBack, onOpenInfo, onTogglePin, onToggleArchive }) {
  const myId = useAuthStore(s => s.user?.id);
  const typingUsers = useChatStore(s => s.typingUsers[chat?.id]);
  const { startCall, hangUp } = useWebRTC();
  const { setOutgoingCall, callState } = useCallStore();

  if (!chat) return null;

  const other = !chat.isGroup ? chat.members?.find(m => m.id !== myId) : null;
  const name   = chat.isGroup ? chat.name : other?.name || 'Unknown';
  const avatar = chat.isGroup ? chat.avatar : other?.avatar;
  const isOnline = other?.isOnline;

  const typingArr = typingUsers ? [...typingUsers] : [];
  const typingText = typingArr.length === 1
    ? 'typing...'
    : typingArr.length > 1
    ? 'several people are typing...'
    : null;

  const subtitle = typingText
    ? typingText
    : chat.isGroup
    ? `${chat.members?.filter(m => m.ChatMember?.isActive !== false).length || 0} members`
    : isOnline
    ? 'online'
    : other?.lastSeen
    ? formatLastSeen(other.lastSeen)
    : '';

  async function initiateCall(type) {
    if (!other) return;
    setOutgoingCall(other, type);
    await startCall(other.id, type);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-wa-panel border-b border-wa-border">
      {/* Back button (mobile) */}
      <button onClick={onBack} className="md:hidden text-wa-icon hover:text-wa-text p-1">
        ←
      </button>

      {/* Avatar + name */}
      <button onClick={onOpenInfo} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-wa-hover flex items-center justify-center overflow-hidden">
            {avatar
              ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
              : <span className="text-wa-text_dim font-semibold text-sm">{getInitials(name)}</span>
            }
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-wa-green rounded-full border-2 border-wa-panel" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-wa-text font-medium text-sm truncate">{name}</p>
          <p className={`text-xs truncate ${typingText ? 'text-wa-green' : 'text-wa-text_dim'}`}>
            {subtitle}
          </p>
        </div>
      </button>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onTogglePin?.(!chat.myIsPinned)}
          className="text-wa-icon hover:text-wa-text transition p-2 rounded-full hover:bg-wa-hover"
          title={chat.myIsPinned ? 'Unpin chat' : 'Pin chat'}
        >
          {chat.myIsPinned ? '📌' : '📍'}
        </button>
        <button
          onClick={() => onToggleArchive?.(!chat.myIsArchived)}
          className="text-wa-icon hover:text-wa-text transition p-2 rounded-full hover:bg-wa-hover"
          title={chat.myIsArchived ? 'Unarchive chat' : 'Archive chat'}
        >
          {chat.myIsArchived ? '📂' : '🗄️'}
        </button>
        {!chat.isGroup && (
          <>
            <button
              onClick={() => initiateCall('voice')}
              disabled={!!callState}
              className="text-wa-icon hover:text-wa-text transition p-2 rounded-full hover:bg-wa-hover disabled:opacity-50"
              title="Voice call"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
            </button>
            <button
              onClick={() => initiateCall('video')}
              disabled={!!callState}
              className="text-wa-icon hover:text-wa-text transition p-2 rounded-full hover:bg-wa-hover disabled:opacity-50"
              title="Video call"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
