import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { formatChatTime, getInitials, clsx } from '../../utils/helpers';

export default function ChatList({ onNewChat, onSelectChat }) {
  const chats = useChatStore(s => s.chats);
  const activeChatId = useChatStore(s => s.activeChatId);
  const unread = useChatStore(s => s.unreadCounts);
  const myId = useAuthStore(s => s.user?.id);

  function getChatDisplay(chat) {
    if (chat.isGroup) return { name: chat.name, avatar: chat.avatar, subtitle: chat.description };
    const other = chat.members?.find(m => m.id !== myId);
    return {
      name: other?.name || 'Unknown',
      avatar: other?.avatar,
      isOnline: other?.isOnline,
      subtitle: other ? (other.isOnline ? 'online' : '') : '',
    };
  }

  function getLastMessage(chat) {
    const last = chat.messages?.[0];
    if (!last) return '';
    if (last.isDeleted) return '🚫 Message deleted';
    if (last.type === 'image') return '📷 Photo';
    if (last.type === 'video') return '🎥 Video';
    if (last.type === 'audio') return '🎵 Voice message';
    if (last.type === 'file')  return `📎 ${last.fileName || 'File'}`;
    return last.decryptedContent || last.encryptedContent ? '🔒 Encrypted message' : '';
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-wa-panel">
        <h2 className="text-wa-text font-semibold text-lg">Chats</h2>
        <button
          onClick={onNewChat}
          className="text-wa-icon hover:text-wa-text transition p-2 rounded-full hover:bg-wa-hover"
          title="New chat"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z"/>
          </svg>
        </button>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 bg-wa-bg">
        <div className="flex items-center bg-wa-hover rounded-lg px-3 py-1.5 gap-2">
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-wa-icon shrink-0">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            placeholder="Search chats"
            className="bg-transparent text-wa-text text-sm w-full focus:outline-none placeholder-wa-text_dim"
          />
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-wa-text_dim text-sm gap-2">
            <p>No chats yet.</p>
            <button onClick={onNewChat} className="text-wa-green hover:underline">Start a new chat</button>
          </div>
        )}
        {chats.map(chat => {
          const { name, avatar, isOnline, subtitle } = getChatDisplay(chat);
          const lastMsg = getLastMessage(chat);
          const lastTime = chat.messages?.[0]?.createdAt;
          const count = unread[chat.id] || 0;

          return (
            <button
              key={chat.id}
              onClick={() => { useChatStore.getState().setActiveChat(chat.id); onSelectChat(chat); }}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-3 hover:bg-wa-hover transition border-b border-wa-border/30 text-left',
                activeChatId === chat.id && 'bg-wa-hover'
              )}
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full bg-wa-panel flex items-center justify-center overflow-hidden">
                  {avatar
                    ? <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    : <span className="text-wa-text font-semibold">{getInitials(name)}</span>
                  }
                </div>
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa-green rounded-full border-2 border-wa-bg" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="text-wa-text font-medium text-sm truncate">{name}</span>
                  {lastTime && (
                    <span className={clsx('text-xs shrink-0 ml-2', count > 0 ? 'text-wa-green' : 'text-wa-text_dim')}>
                      {formatChatTime(lastTime)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center mt-0.5">
                  <p className="text-wa-text_dim text-xs truncate flex-1">
                    {lastMsg || subtitle || '\u00A0'}
                  </p>
                  {count > 0 && (
                    <span className="ml-2 bg-wa-green text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
