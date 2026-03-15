import { useState } from 'react';
import api from '../../utils/api';

export default function PhoneLogin({ onSuccess }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!phone.startsWith('+')) {
      setError('Include country code, e.g. +14155551234');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { phone });
      onSuccess(phone);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-wa-green flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="white" className="w-12 h-12">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-wa-text">Guff Handim</h1>
        <p className="text-wa-text_dim text-sm mt-1">End-to-end encrypted messaging</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
        <div>
          <label className="block text-wa-text_dim text-sm mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 415 555 1234"
            className="input-field"
            autoComplete="tel"
            required
          />
          <p className="text-wa-text_dim text-xs mt-1">Enter your number with country code</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button type="submit" disabled={loading || phone.length < 8} className="btn-primary">
          {loading ? 'Sending OTP...' : 'Send OTP'}
        </button>
      </form>
    </div>
  );
}
