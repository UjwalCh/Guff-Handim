import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { loadKeys, generateGroupKey, encryptGroupKeyFor } from '../../utils/encryption';
import { useAuthStore } from '../../store/authStore';

export default function CreateGroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const myId = useAuthStore(s => s.user?.id);
  const myPublicKey = useAuthStore(s => s.user?.publicKey);

  const { data: searchResults } = useQuery({
    queryKey: ['user-search', query],
    enabled: query.length >= 2,
    queryFn: async () => {
      const { data } = await api.get('/users/search', { params: { query } });
      return data.users;
    },
  });

  function toggleUser(user) {
    setSelected(prev =>
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  }

  async function create() {
    if (!name.trim() || selected.length === 0) return;
    setLoading(true);
    try {
      const keys = loadKeys();
      const groupKey = generateGroupKey();

      // Encrypt the group key for each participant (including myself)
      const allMembers = [...selected];
      const encryptedGroupKeys = {};

      for (const member of allMembers) {
        if (member.publicKey && keys?.secretKey) {
          encryptedGroupKeys[member.id] = encryptGroupKeyFor(groupKey, member.publicKey, keys.secretKey);
        }
      }
      // Also for myself
      if (myPublicKey && keys?.secretKey) {
        encryptedGroupKeys[myId] = encryptGroupKeyFor(groupKey, myPublicKey, keys.secretKey);
      }

      const { data } = await api.post('/groups', {
        name: name.trim(),
        description: desc.trim(),
        memberIds: selected.map(u => u.id),
        encryptedGroupKeys,
      });

      onCreated(data.chat);
    } catch (err) {
      console.error('Create group failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-wa-panel rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-wa-border">
          <h3 className="text-wa-text font-semibold">Create Group</h3>
          <button onClick={onClose} className="text-wa-icon hover:text-wa-text">✕</button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <input
            type="text"
            placeholder="Group name *"
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
            maxLength={100}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="input-field"
            maxLength={500}
          />

          <div>
            <p className="text-wa-text_dim text-sm mb-2">Add members</p>
            <input
              type="text"
              placeholder="Search users..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="input-field text-sm"
            />
          </div>

          {/* Selected members */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selected.map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u)}
                  className="flex items-center gap-1 bg-wa-green/20 border border-wa-green/30 text-wa-green text-xs rounded-full px-2 py-1"
                >
                  {u.name} ✕
                </button>
              ))}
            </div>
          )}

          {/* Search results */}
          <div className="max-h-40 overflow-y-auto">
            {searchResults?.filter(u => !selected.some(s => s.id === u.id)).map(u => (
              <button
                key={u.id}
                onClick={() => toggleUser(u)}
                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-wa-hover rounded-lg transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-wa-hover flex items-center justify-center text-xs font-semibold text-wa-text">
                  {u.name?.[0] || '?'}
                </div>
                <div>
                  <p className="text-wa-text text-sm">{u.name}</p>
                  <p className="text-wa-text_dim text-xs">{u.phone}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={create}
            disabled={loading || !name.trim() || selected.length === 0}
            className="btn-primary"
          >
            {loading ? 'Creating...' : `Create Group (${selected.length} members)`}
          </button>
        </div>
      </div>
    </div>
  );
}
