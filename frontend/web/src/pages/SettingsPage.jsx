import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { getInitials } from '../utils/helpers';
import Sidebar from '../components/Layout/Sidebar';

export default function SettingsPage() {
  const { user, setUser, logout } = useAuthStore();
  const [name, setName]   = useState(user?.name || '');
  const [bio, setBio]     = useState(user?.bio || '');
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview]       = useState(user?.avatar || null);

  function handleAvatar(e) {
    const f = e.target.files[0];
    if (f) { setAvatarFile(f); setPreview(URL.createObjectURL(f)); }
  }

  async function save() {
    setSaving(true);
    setSuccess(false);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('bio', bio.trim());
      if (avatarFile) form.append('avatar', avatarFile);

      const { data } = await api.put('/users/me', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data.user);
      setSuccess(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    logout();
  }

  return (
    <div className="h-full flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto bg-wa-bg p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-wa-text text-xl font-semibold mb-6">Settings</h1>

          {/* Profile section */}
          <div className="bg-wa-panel rounded-2xl p-6 mb-4 border border-wa-border">
            <h2 className="text-wa-text font-medium mb-4">Profile</h2>

            {/* Avatar */}
            <label className="cursor-pointer flex flex-col items-center mb-4 group">
              <div className="w-20 h-20 rounded-full bg-wa-hover flex items-center justify-center overflow-hidden relative">
                {preview
                  ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-wa-text_dim">{getInitials(name)}</span>
                }
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition">
                  Change
                </div>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-wa-text_dim text-xs mb-1 block">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="input-field" maxLength={100} />
              </div>
              <div>
                <label className="text-wa-text_dim text-xs mb-1 block">About</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} className="input-field resize-none" rows={2} maxLength={500} />
              </div>
              <div>
                <label className="text-wa-text_dim text-xs mb-1 block">Phone</label>
                <p className="text-wa-text text-sm px-1">{user?.phone}</p>
              </div>
            </div>

            {success && <p className="text-wa-green text-sm mt-3">✓ Profile saved</p>}
            <button onClick={save} disabled={saving} className="btn-primary mt-4 w-full">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

          {/* Security info */}
          <div className="bg-wa-panel rounded-2xl p-6 mb-4 border border-wa-border">
            <h2 className="text-wa-text font-medium mb-3">Security</h2>
            <div className="flex items-center gap-3 text-wa-text_dim text-sm">
              <span className="text-wa-green text-xl">🔒</span>
              <div>
                <p className="text-wa-text font-medium">End-to-end encrypted</p>
                <p className="text-xs mt-0.5">Messages are secured with X25519 + XSalsa20-Poly1305 encryption. Nobody — including SecureChat — can read your messages.</p>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="bg-wa-panel rounded-2xl p-6 border border-red-900/30">
            <h2 className="text-red-400 font-medium mb-3">Account</h2>
            <button onClick={handleLogout} className="text-red-400 hover:text-red-500 text-sm font-medium">
              Log out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
