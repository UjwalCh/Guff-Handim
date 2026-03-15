import { useState, useRef, useEffect } from 'react';
import api from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { ensureEncryptionKeys } from '../../utils/ensureKeys';

export default function OTPVerify({ phone, onBack }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const inputs = useRef([]);
  const { setAuth } = useAuthStore();

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  function handleDigit(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = [...otp];
    text.split('').forEach((ch, idx) => { if (idx < 6) next[idx] = ch; });
    setOtp(next);
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  async function verify() {
    const code = otp.join('');
    if (code.length !== 6) return;
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-otp', { phone, otp: code });
      await ensureEncryptionKeys(data.accessToken);

      setAuth(data.user, data.accessToken);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    try {
      await api.post('/auth/send-otp', { phone });
      setResendTimer(60);
      setOtp(['', '', '', '', '', '']);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend');
    }
  }

  // Auto-submit when all 6 digits entered
  useEffect(() => {
    if (otp.every(d => d !== '')) verify();
  }, [otp]);

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <button onClick={onBack} className="self-start text-wa-text_dim hover:text-wa-text text-sm flex items-center gap-1">
        ← Back
      </button>

      <div className="text-center">
        <h2 className="text-xl font-bold text-wa-text">Verify your number</h2>
        <p className="text-wa-text_dim text-sm mt-1">Enter the 6-digit OTP sent to</p>
        <p className="text-wa-green font-medium">{phone}</p>
      </div>

      <div className="flex gap-3" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={el => inputs.current[i] = el}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-11 h-12 text-center text-xl font-bold bg-wa-hover border-2 border-wa-border rounded-lg text-wa-text focus:outline-none focus:border-wa-green transition"
          />
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading && <p className="text-wa-text_dim text-sm">Verifying...</p>}

      <button
        onClick={resend}
        disabled={resendTimer > 0}
        className="text-wa-green text-sm disabled:text-wa-text_dim disabled:cursor-not-allowed"
      >
        {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
      </button>
    </div>
  );
}
