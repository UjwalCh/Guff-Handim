import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { format } from 'date-fns';
import Sidebar from '../components/Layout/Sidebar';

export default function StatusPage() {
  const myId = useAuthStore(s => s.user?.id);
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState('');
  const [bgcolor, setBgcolor] = useState('#128C7E');
  const [viewStatus, setViewStatus] = useState(null);

  const { data, refetch } = useQuery({
    queryKey: ['statuses'],
    queryFn: async () => {
      const { data } = await api.get('/statuses');
      return data.statuses;
    },
  });

  const statuses = data || [];
  const mine   = statuses.filter(s => s.userId === myId);
  const others = statuses.filter(s => s.userId !== myId);

  // Group others by user
  const byUser = {};
  others.forEach(s => {
    if (!byUser[s.userId]) byUser[s.userId] = { user: s.author, statuses: [] };
    byUser[s.userId].statuses.push(s);
  });

  async function createTextStatus() {
    if (!text.trim()) return;
    await api.post('/statuses', { type: 'text', encryptedContent: text, backgroundColor: bgcolor });
    setText('');
    setCreating(false);
    refetch();
  }

  async function viewStatusHandler(s) {
    setViewStatus(s);
    await api.post(`/statuses/${s.id}/view`);
  }

  const BG_OPTIONS = ['#128C7E', '#25D366', '#075E54', '#1B4F72', '#6C3483', '#922B21', '#1A5276'];

  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex overflow-hidden">
        {/* Status list */}
        <div className="w-80 border-r border-wa-border flex flex-col">
          <div className="px-4 py-3 bg-wa-panel border-b border-wa-border">
            <h2 className="text-wa-text font-semibold">Status</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {/* My status */}
            <div className="mb-4">
              <p className="text-wa-text_dim text-xs uppercase tracking-wide mb-2 px-1">My Status</p>
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-wa-hover rounded-xl transition"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${mine.length ? 'ring-2 ring-wa-green' : 'border-2 border-dashed border-wa-border'}`}>
                  {mine.length ? '✓' : '+'}
                </div>
                <div className="text-left">
                  <p className="text-wa-text text-sm font-medium">{mine.length ? 'My status' : 'Add status'}</p>
                  <p className="text-wa-text_dim text-xs">{mine.length ? `${mine.length} update${mine.length > 1 ? 's' : ''}` : 'Tap to add a status update'}</p>
                </div>
              </button>
            </div>

            {/* Recent updates */}
            {Object.values(byUser).length > 0 && (
              <div>
                <p className="text-wa-text_dim text-xs uppercase tracking-wide mb-2 px-1">Recent updates</p>
                {Object.values(byUser).map(({ user, statuses: us }) => (
                  <button
                    key={user.id}
                    onClick={() => viewStatusHandler(us[0])}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-wa-hover rounded-xl transition"
                  >
                    <div className="w-12 h-12 rounded-full ring-2 ring-wa-green overflow-hidden flex items-center justify-center bg-wa-hover">
                      {user.avatar
                        ? <img src={user.avatar} className="w-full h-full object-cover" />
                        : <span className="text-wa-text font-semibold">{user.name?.[0]}</span>
                      }
                    </div>
                    <div className="text-left">
                      <p className="text-wa-text text-sm font-medium">{user.name}</p>
                      <p className="text-wa-text_dim text-xs">{format(new Date(us[0].createdAt), 'HH:mm')}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status viewer / creator */}
        <div className="flex-1 flex items-center justify-center bg-wa-bg">
          {creating ? (
            <div className="w-full max-w-sm flex flex-col gap-4 p-6">
              <h3 className="text-wa-text font-semibold">Create Status</h3>
              <div
                className="h-48 rounded-2xl flex items-center justify-center text-white text-lg font-medium p-6 text-center"
                style={{ backgroundColor: bgcolor }}
              >
                {text || 'Start typing...'}
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type a status message..."
                className="input-field resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="flex gap-2 flex-wrap">
                {BG_OPTIONS.map(c => (
                  <button
                    key={c}
                    onClick={() => setBgcolor(c)}
                    className={`w-8 h-8 rounded-full border-2 ${bgcolor === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCreating(false)} className="flex-1 bg-wa-hover text-wa-text py-2 rounded-lg">Cancel</button>
                <button onClick={createTextStatus} disabled={!text.trim()} className="flex-1 btn-primary">Post</button>
              </div>
            </div>
          ) : viewStatus ? (
            <div className="w-full max-w-sm">
              <div
                className="h-96 rounded-2xl flex items-center justify-center text-white text-xl font-medium p-8 text-center mx-4"
                style={{ backgroundColor: viewStatus.backgroundColor || '#128C7E' }}
              >
                {viewStatus.encryptedContent || viewStatus.mediaUrl
                  ? viewStatus.mediaUrl
                    ? <img src={viewStatus.mediaUrl} className="max-h-full max-w-full object-contain" />
                    : viewStatus.encryptedContent  // plaintext for now (text statuses in this view)
                  : ''}
              </div>
              <button onClick={() => setViewStatus(null)} className="mt-4 text-wa-text_dim text-sm mx-auto block">✕ Close</button>
            </div>
          ) : (
            <div className="text-center text-wa-text_dim">
              <p className="text-4xl mb-3">⏱</p>
              <p>Click a status or create your own</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
