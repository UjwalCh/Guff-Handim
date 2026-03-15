import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';

export default function NewChatModal({ onClose, onChatCreated }) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['user-search', query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/users/search', { params: { query } });
      return data.users;
    },
    staleTime: 5000,
  });

  async function startChat(targetUserId) {
    setCreating(true);
    try {
      const { data } = await api.post('/chats', { targetUserId });
      onChatCreated(data.chat);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-wa-panel rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h3 className="text-wa-text font-semibold">New Chat</h3>
          <button onClick={onClose} className="text-wa-icon hover:text-wa-text">✕</button>
        </div>

        <div className="p-4">
          <input
            autoFocus
            type="text"
            placeholder="Search by name or phone..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="max-h-64 overflow-y-auto px-2 pb-4">
          {isLoading && <p className="text-wa-text_dim text-sm text-center py-4">Searching...</p>}
          {!isLoading && data?.length === 0 && query.length >= 2 && (
            <p className="text-wa-text_dim text-sm text-center py-4">No users found</p>
          )}
          {data?.map(user => (
            <button
              key={user.id}
              onClick={() => startChat(user.id)}
              disabled={creating}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-wa-hover rounded-xl transition"
            >
              <div className="w-10 h-10 rounded-full bg-wa-hover flex items-center justify-center overflow-hidden">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-wa-text text-sm font-semibold">{user.name?.[0] || '?'}</span>
                }
              </div>
              <div className="text-left">
                <p className="text-wa-text text-sm font-medium">{user.name}</p>
                <p className="text-wa-text_dim text-xs">{user.phone}</p>
              </div>
              <span className="ml-auto">
                {user.isOnline
                  ? <span className="w-2 h-2 bg-wa-green rounded-full inline-block" />
                  : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
