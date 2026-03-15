import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useAdminStore } from '../store/adminStore';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('ChangeMe!12345');
  const [otp, setOtp] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setOtpPending = useAdminStore(s => s.setOtpPending);
  const setAdminAuth = useAdminStore(s => s.setAdminAuth);

  async function submitCredentials(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.post('/admin-auth/login', { username, password });
      if (data.requires2FA) {
        setRequires2FA(true);
        setOtpPending(username);
      } else if (data.token) {
        setAdminAuth(data.admin, data.token);
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Admin login failed');
    } finally {
      setLoading(false);
    }
  }

  async function submitOtp(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await adminApi.post('/admin-auth/verify-otp', { username, otp });
      setAdminAuth(data.admin, data.token);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-6 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Guff Handim</p>
          <h1 className="text-2xl font-semibold">Admin Console</h1>
          <p className="text-slate-300 text-sm mt-1">Admin secure access portal</p>
        </div>

        <div className="p-6">
          {!requires2FA ? (
            <form className="space-y-4" onSubmit={submitCredentials}>
              <div>
                <label className="text-sm text-slate-600">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              <div>
                <label className="text-sm text-slate-600">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2" />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button disabled={loading} className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60">
                {loading ? 'Checking...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={submitOtp}>
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                OTP sent to admin phone. Check backend console in local development.
              </div>
              <div>
                <label className="text-sm text-slate-600">6-digit OTP</label>
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 tracking-[0.35em] text-center font-semibold" />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button disabled={loading || otp.length !== 6} className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 disabled:opacity-60">
                {loading ? 'Verifying...' : 'Sign in'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
