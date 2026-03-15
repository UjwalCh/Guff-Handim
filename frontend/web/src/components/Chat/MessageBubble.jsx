import { useState, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { formatMessageTime, clsx, getInitials } from '../../utils/helpers';
import MediaViewer from '../Media/MediaViewer';
import { toAbsoluteAssetUrl } from '../../utils/runtimeConfig';

export default function MessageBubble({ message, isGroup, onReply, onDelete, onReact }) {
  const myId = useAuthStore(s => s.user?.id);
  const isMine = message.senderId === myId;
  const [showActions, setShowActions] = useState(false);

  const mediaFileUrl = toAbsoluteAssetUrl(message.fileUrl);
  const mediaThumbnailUrl = toAbsoluteAssetUrl(message.thumbnailUrl);
  const senderAvatarUrl = toAbsoluteAssetUrl(message.sender?.avatar);

  const displayText = message.decryptedContent || (message.isDeleted ? null : '[Encrypted — open on your device]');

  if (message.isDeleted || message.type === 'deleted') {
    return (
      <div className={clsx('flex mb-1', isMine ? 'justify-end' : 'justify-start')}>
        <div className={clsx('px-3 py-1.5 rounded-xl text-xs italic text-wa-text_dim max-w-xs',
          isMine ? 'bg-wa-bubble_out/50' : 'bg-wa-bubble_in/50'
        )}>
          🚫 This message was deleted
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('flex mb-1 group', isMine ? 'justify-end' : 'justify-start')}>
      {/* Sender avatar for group chats */}
      {isGroup && !isMine && (
        <div className="w-7 h-7 rounded-full bg-wa-panel flex items-center justify-center text-xs mr-2 self-end shrink-0 overflow-hidden">
          {message.sender?.avatar
            ? <img src={senderAvatarUrl} alt="" className="w-full h-full object-cover" />
            : <span className="text-wa-text">{getInitials(message.sender?.name)}</span>
          }
        </div>
      )}

      <div className="max-w-[70%] relative">
        {/* Context menu trigger */}
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition z-10">
          <button
            onClick={() => onReact && onReact(message)}
            className="text-wa-text_dim hover:text-wa-text bg-wa-panel rounded-full p-0.5"
            title="React"
          >
            😊
          </button>
        </div>

        <div
          className={clsx(
            'px-3 py-2 shadow-sm',
            isMine ? 'chat-bubble-out' : 'chat-bubble-in'
          )}
        >
          {/* Sender name in group */}
          {isGroup && !isMine && (
            <p className="text-wa-green text-xs font-semibold mb-1">{message.sender?.name}</p>
          )}

          {/* Reply preview */}
          {message.replyTo && (
            <div className={clsx('border-l-2 border-wa-green pl-2 mb-2 text-xs opacity-70 rounded')}>
              <p className="text-wa-green font-medium">{message.replyTo.sender?.name || 'You'}</p>
              <p className="text-wa-text truncate">{message.replyTo.decryptedContent || '📎 Media'}</p>
            </div>
          )}

          {/* Media content */}
          {(message.type === 'image' || message.type === 'video') && mediaFileUrl && (
            <MediaViewer src={mediaFileUrl} type={message.type} thumbnail={mediaThumbnailUrl} />
          )}

          {message.type === 'audio' && mediaFileUrl && (
            <audio controls src={mediaFileUrl} className="max-w-full" />
          )}

          {message.type === 'file' && mediaFileUrl && (
            <a href={mediaFileUrl} download={message.fileName} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-wa-text hover:underline">
              <span className="text-2xl">📎</span>
              <div>
                <p className="text-sm font-medium">{message.fileName || 'Download file'}</p>
                <p className="text-xs text-wa-text_dim">{message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : ''}</p>
              </div>
            </a>
          )}

          {/* Text content */}
          {displayText && (
            <p className="text-wa-text text-sm whitespace-pre-wrap break-words">{displayText}</p>
          )}

          {/* Timestamp + read receipt */}
          <div className={clsx('flex items-center gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
            <span className="text-wa-text_dim text-[10px]">{formatMessageTime(message.createdAt)}</span>
            {isMine && (
              <span className="text-wa-text_dim text-[10px]">
                {message.readBy ? '✓✓' : '✓'}
              </span>
            )}
            {message.isForwarded && <span className="text-wa-text_dim text-[10px]">↪ Forwarded</span>}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions?.length > 0 && (
          <div className={clsx('flex gap-1 mt-1', isMine ? 'justify-end' : 'justify-start')}>
            {Object.entries(
              message.reactions.reduce((acc, r) => ({ ...acc, [r.emoji]: (acc[r.emoji] || 0) + 1 }), {})
            ).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => onReact && onReact(message, emoji)}
                className="bg-wa-panel border border-wa-border rounded-full px-2 py-0.5 text-xs flex items-center gap-0.5 hover:bg-wa-hover"
              >
                {emoji} {count > 1 && <span className="text-wa-text_dim">{count}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons on hover */}
        <div className={clsx('absolute -top-2 opacity-0 group-hover:opacity-100 transition flex gap-1 z-10',
          isMine ? 'right-full mr-2' : 'left-full ml-2'
        )}>
          <button onClick={() => onReply && onReply(message)} title="Reply"
            className="bg-wa-panel text-wa-icon hover:text-wa-text rounded-full p-1.5 shadow text-xs">
            ↩
          </button>
          {isMine && (
            <button onClick={() => onDelete && onDelete(message.id)} title="Delete"
              className="bg-wa-panel text-red-400 hover:text-red-500 rounded-full p-1.5 shadow text-xs">
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
