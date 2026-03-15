import { useState } from 'react';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../utils/helpers';

export default function ProfileSetup() {
  const [name, setName] = useState('');
  const [bio, setBio]   = useState('');
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const { user, setUser }   = useAuthStore();

  function handleAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    setAvatar(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', name.trim());
      form.append('bio', bio.trim());
      if (avatar) form.append('avatar', avatar);

      const { data } = await api.put('/auth/setup-profile', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <h2 className="text-xl font-bold text-wa-text">Set up your profile</h2>

      <label className="cursor-pointer group">
        <div className="w-24 h-24 rounded-full bg-wa-hover flex items-center justify-center overflow-hidden relative">
          {preview
            ? <img src={preview} alt="avatar" className="w-full h-full object-cover" />
            : <span className="text-2xl font-bold text-wa-text_dim">{getInitials(name || '?')}</span>
          }
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <span className="text-white text-xs">Change</span>
          </div>
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
      </label>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          maxLength={100}
          className="input-field"
          required
        />
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="About (optional)"
          maxLength={500}
          rows={2}
          className="input-field resize-none"
        />
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button type="submit" disabled={loading || !name.trim()} className="btn-primary">
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
