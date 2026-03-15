import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import adminApi from '../utils/adminApi';
import { useAdminStore } from '../store/adminStore';

const TABS = [
  'Dashboard',
  'Online Users',
  'Activity Feed',
  'Admin Accounts',
  'Branding',
  'Landing Page',
  'Users',
  'Reports',
  'Moderation',
  'Support Tickets',
  'Broadcast',
  'Settings',
  'Security Center',
  'Bans',
  'OTP Monitor',
  'Audit Logs',
  'Privacy',
  'Sessions',
];

export default function AdminPanelPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const admin = useAdminStore(s => s.admin);
  const clearAdminAuth = useAdminStore(s => s.clearAdminAuth);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [userQuery, setUserQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tabFilter, setTabFilter] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('gh-admin-theme') || 'light');
  const role = admin?.role;
  const isLegacyAdmin = role === 'admin';
  const isSuperAdmin = role === 'super_admin';
  const isModerator = role === 'moderator' || isLegacyAdmin;
  const isSupport = role === 'support';
  const isSecurity = role === 'security';
  const isSupportOrSuper = isSupport || isSuperAdmin;
  const canSecurityControls = isSecurity || isSuperAdmin;
  const roleLabel = {
    super_admin: 'Super Admin',
    moderator: 'Moderator',
    support: 'Support Staff',
    security: 'Security Admin',
    admin: 'Legacy Admin',
  }[role] || 'Admin';
  const isDark = theme === 'dark';

  const dashboardQ = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await adminApi.get('/admin/dashboard')).data,
    enabled: isSuperAdmin || isSecurity,
  });
  const brandingQ = useQuery({
    queryKey: ['admin-branding'],
    queryFn: async () => (await adminApi.get('/admin/branding')).data,
    enabled: isSuperAdmin,
  });
  const landingQ = useQuery({
    queryKey: ['admin-landing'],
    queryFn: async () => (await adminApi.get('/admin/landing')).data,
    enabled: isSuperAdmin,
  });
  const usersQ = useQuery({
    queryKey: ['admin-users', userQuery],
    queryFn: async () => (await adminApi.get('/admin/users', { params: { query: userQuery } })).data,
    refetchInterval: 20000,
  });
  const userDetailsQ = useQuery({
    queryKey: ['admin-user-details', selectedUserId],
    queryFn: async () => (await adminApi.get(`/admin/users/${selectedUserId}`)).data,
    enabled: Boolean(selectedUserId),
  });
  const reportsQ = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => (await adminApi.get('/admin/reports')).data,
    enabled: isModerator,
  });
  const filesQ = useQuery({
    queryKey: ['admin-files'],
    queryFn: async () => (await adminApi.get('/admin/files')).data,
    enabled: isModerator,
  });
  const announcementsQ = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: async () => (await adminApi.get('/admin/announcements')).data,
    enabled: isSuperAdmin,
  });
  const settingsQ = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await adminApi.get('/admin/settings')).data,
    enabled: isSuperAdmin,
  });
  const bansQ = useQuery({
    queryKey: ['admin-bans'],
    queryFn: async () => (await adminApi.get('/admin/bans')).data,
    enabled: isSecurity,
  });
  const otpQ = useQuery({
    queryKey: ['admin-otp'],
    queryFn: async () => (await adminApi.get('/admin/otp-monitor')).data,
    enabled: isSecurity,
  });
  const logsQ = useQuery({
    queryKey: ['admin-logs'],
    queryFn: async () => (await adminApi.get('/admin/audit-logs')).data,
    enabled: isSuperAdmin,
  });
  const supportTicketsQ = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: async () => (await adminApi.get('/admin/support-tickets')).data,
    enabled: isSuperAdmin || isSupport,
  });
  const securityOverviewQ = useQuery({
    queryKey: ['admin-security-overview'],
    queryFn: async () => (await adminApi.get('/admin/security/overview')).data,
    enabled: isSuperAdmin || isSecurity,
  });
  const loginIpLogsQ = useQuery({
    queryKey: ['admin-security-login-ip-logs'],
    queryFn: async () => (await adminApi.get('/admin/security/login-ip-logs')).data,
    enabled: isSuperAdmin || isSecurity,
  });
  const sessionsQ = useQuery({ queryKey: ['admin-sessions'], queryFn: async () => (await adminApi.get('/admin-auth/sessions')).data });
  const adminAccountsQ = useQuery({
    queryKey: ['admin-accounts'],
    queryFn: async () => (await adminApi.get('/admin/admin-accounts')).data,
    enabled: isSuperAdmin,
  });

  const brandingMutation = useMutation({
    mutationFn: (payload) => adminApi.put('/admin/branding', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-branding'] }),
  });

  const landingMutation = useMutation({
    mutationFn: (payload) => adminApi.put('/admin/landing', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-landing'] }),
  });

  const suspendMutation = useMutation({
    mutationFn: ({ id, reason }) => adminApi.patch(`/admin/users/${id}/suspend`, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const restoreMutation = useMutation({
    mutationFn: (id) => adminApi.patch(`/admin/users/${id}/restore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const verifyMutation = useMutation({
    mutationFn: (id) => adminApi.patch(`/admin/users/${id}/verify`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });
  const pushResetMutation = useMutation({
    mutationFn: (id) => adminApi.post(`/admin/users/${id}/push-reset-password`),
  });
  const reportMutation = useMutation({
    mutationFn: ({ id, status }) => adminApi.patch(`/admin/reports/${id}/resolve`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-reports'] }),
  });
  const removeFileMutation = useMutation({
    mutationFn: (id) => adminApi.delete(`/admin/files/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-files'] }),
  });
  const createAnnouncementMutation = useMutation({
    mutationFn: (payload) => adminApi.post('/admin/announcements', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }),
  });
  const createBanMutation = useMutation({
    mutationFn: (payload) => adminApi.post('/admin/bans', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-bans'] }),
  });
  const createAdminMutation = useMutation({
    mutationFn: (payload) => adminApi.post('/admin/admin-accounts', payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-accounts'] }),
  });
  const updateAdminMutation = useMutation({
    mutationFn: ({ id, payload }) => adminApi.patch(`/admin/admin-accounts/${id}`, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-accounts'] }),
  });
  const updateMyCredentialsMutation = useMutation({
    mutationFn: (payload) => adminApi.put('/admin/me/credentials', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-accounts'] });
    },
  });
  const respondSupportTicketMutation = useMutation({
    mutationFn: ({ id, response, status }) => adminApi.patch(`/admin/support-tickets/${id}/respond`, { response, status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-support-tickets'] }),
  });
  const securityPolicyMutation = useMutation({
    mutationFn: ({ key, value }) => adminApi.put('/admin/security/policies', { key, value }),
  });

  async function logout() {
    try { await adminApi.post('/admin-auth/logout'); } catch {}
    clearAdminAuth();
    navigate('/admin/login', { replace: true });
  }

  const metrics = dashboardQ.data?.metrics || {};
  const topMetrics = useMemo(() => [
    ['Users', metrics.totalUsers || 0],
    ['Active', metrics.activeUsers || 0],
    ['Messages / 24h', metrics.messagesLast24h || 0],
    ['Open Reports', metrics.openReports || 0],
  ], [metrics]);

  const onlineUsers = useMemo(
    () => (usersQ.data?.users || []).filter((user) => user.isOnline),
    [usersQ.data?.users]
  );

  const recentlySeenUsers = useMemo(
    () => (usersQ.data?.users || [])
      .filter((user) => !user.isOnline && user.lastSeen)
      .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
      .slice(0, 12),
    [usersQ.data?.users]
  );

  const recentActivity = useMemo(
    () => (logsQ.data?.logs || []).slice(0, 25),
    [logsQ.data?.logs]
  );

  const filteredTabs = useMemo(
    () => {
      const tabAccess = {
        Dashboard: isSuperAdmin || isSecurity,
        'Online Users': true,
        'Activity Feed': isSuperAdmin,
        'Admin Accounts': isSuperAdmin,
        Branding: isSuperAdmin,
        'Landing Page': isSuperAdmin,
        Users: true,
        Reports: isModerator,
        Moderation: isModerator,
        'Support Tickets': isSuperAdmin || isSupport,
        Broadcast: isSuperAdmin,
        Settings: isSuperAdmin,
        'Security Center': isSuperAdmin || isSecurity,
        Bans: isSuperAdmin || isSecurity,
        'OTP Monitor': isSuperAdmin || isSecurity,
        'Audit Logs': isSuperAdmin,
        Privacy: isSuperAdmin,
        Sessions: true,
      };

      const allowedTabs = TABS.filter((tab) => tabAccess[tab]);
      return allowedTabs.filter((tab) => tab.toLowerCase().includes(tabFilter.toLowerCase()));
    },
    [tabFilter, isSuperAdmin, isModerator, isSupport, isSecurity]
  );

  useEffect(() => {
    if (!filteredTabs.includes(activeTab)) {
      setActiveTab(filteredTabs[0] || 'Sessions');
    }
  }, [activeTab, filteredTabs]);

  useEffect(() => {
    localStorage.setItem('gh-admin-theme', theme);
  }, [theme]);

  return (
    <div className={`${isDark ? 'admin-theme-dark text-slate-100 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,#020617,#0b1220)]' : 'admin-theme-light text-slate-900 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.10),_transparent_30%),linear-gradient(180deg,#f8fafc,#eef2ff)]'} h-screen overflow-hidden`}>
      <div className="grid lg:grid-cols-[300px_1fr] h-full">
        <aside className={`${isDark ? 'bg-slate-950/90 border-white/10 text-slate-100' : 'bg-white/80 border-slate-200 text-slate-900'} backdrop-blur border-r p-6 lg:sticky lg:top-0 lg:h-screen overflow-y-auto`}>
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <img src={brandingQ.data?.branding?.logoUrl || '/icon.svg'} alt="Guff Handim" className="w-12 h-12 rounded-2xl object-cover ring-1 ring-white/10" />
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-emerald-500">Guff Handim</p>
                <h1 className="text-2xl font-semibold">Admin Console</h1>
              </div>
            </div>
            <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'} mt-5 rounded-2xl border p-4`}>
              <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'} text-sm`}>Signed in as</p>
              <p className="font-medium mt-1">{admin?.username}</p>
              <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-xs mt-1`}>{roleLabel} · secured session</p>
            </div>
            <div className={`${isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'} mt-4 rounded-2xl border p-4 space-y-2`}>
              <p className={`${isDark ? 'text-emerald-300' : 'text-emerald-700'} text-xs uppercase tracking-[0.2em]`}>Realtime pulse</p>
              <p className={`${isDark ? 'text-white' : 'text-emerald-900'} text-2xl font-semibold`}>{onlineUsers.length}</p>
              <p className={`${isDark ? 'text-emerald-100/80' : 'text-emerald-700'} text-sm`}>users online now</p>
            </div>
          </div>

          <div className="mb-3">
            <input
              value={tabFilter}
              onChange={(e) => setTabFilter(e.target.value)}
              placeholder="Find tab..."
              className={`${isDark ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-400' : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500'} w-full rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400`}
            />
          </div>

          <nav className="space-y-1.5 max-h-[46vh] overflow-y-auto pr-1">
            {filteredTabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-200 ${activeTab === tab ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 translate-x-1' : isDark ? 'text-slate-300 hover:bg-white/8 hover:text-white hover:translate-x-1' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-1'}`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <button onClick={logout} className="mt-8 w-full rounded-2xl bg-rose-600 hover:bg-rose-500 py-3 font-medium">
            Logout
          </button>
        </aside>

        <main className="p-6 lg:p-8 h-screen overflow-y-auto">
          <div className={`${isDark ? 'bg-slate-900/70 border-slate-700 shadow-black/40' : 'bg-white/90 border-white shadow-slate-900/5'} rounded-[2rem] backdrop-blur border shadow-2xl min-h-full overflow-hidden`}>
            <div className={`${isDark ? 'border-slate-700 bg-slate-900/85' : 'border-slate-200 bg-white/90'} border-b px-6 py-5 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between sticky top-0 backdrop-blur z-10`}>
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-emerald-600">Admin Control Surface</p>
                <h2 className="text-3xl font-semibold">{activeTab}</h2>
              </div>
              <div className="flex items-center gap-3 text-sm flex-wrap">
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Platform healthy
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Online {onlineUsers.length}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Open reports {metrics.openReports || 0}
                </span>
                <button
                  type="button"
                  onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                  className={`${isDark ? 'bg-slate-800 text-slate-100 border-slate-600' : 'bg-white text-slate-900 border-slate-200'} inline-flex items-center gap-2 px-3 py-2 rounded-full border transition hover:scale-[1.02]`}
                >
                  {isDark ? 'Switch to Light' : 'Switch to Dark'}
                </button>
              </div>
            </div>

            <div className="p-6 animate-in fade-in duration-300">
              {activeTab === 'Dashboard' && (
                <section className="space-y-6">
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {topMetrics.map(([label, value]) => (
                      <MetricCard key={label} label={label} value={value} />
                    ))}
                  </div>
                  <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5">
                    <Card title="Security Signals" subtitle="OTP and moderation trends">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <MiniMetric label="OTP issued" value={dashboardQ.data?.otpStats?.issuedLast24h || 0} />
                        <MiniMetric label="OTP failed attempts" value={dashboardQ.data?.otpStats?.failedAttemptsLast24h || 0} />
                        <MiniMetric label="Flagged files" value={metrics.flaggedFiles || 0} />
                        <MiniMetric label="Active bans" value={metrics.activeBans || 0} />
                      </div>
                    </Card>
                    <Card title="Platform Summary" subtitle="Current environment overview">
                      <div className="space-y-3 text-sm text-slate-600">
                        <SummaryRow label="Total chats" value={metrics.totalChats || 0} />
                        <SummaryRow label="Group chats" value={metrics.groupChats || 0} />
                        <SummaryRow label="Suspended users" value={metrics.suspendedUsers || 0} />
                        <SummaryRow label="Total messages" value={metrics.totalMessages || 0} />
                      </div>
                    </Card>
                  </div>
                </section>
              )}

              {activeTab === 'Online Users' && (
                <OnlineUsersPanel onlineUsers={onlineUsers} recentlySeenUsers={recentlySeenUsers} />
              )}

              {activeTab === 'Activity Feed' && (
                <ActivityFeedPanel items={recentActivity} />
              )}

              {isSuperAdmin && activeTab === 'Admin Accounts' && (
                <AdminAccountsPanel
                  currentAdmin={admin}
                  admins={adminAccountsQ.data?.admins || []}
                  onCreate={(payload) => createAdminMutation.mutateAsync(payload)}
                  onUpdate={(id, payload) => updateAdminMutation.mutateAsync({ id, payload })}
                  onUpdateSelf={(payload) => updateMyCredentialsMutation.mutateAsync(payload)}
                />
              )}

              {activeTab === 'Branding' && (
                <BrandingPanel
                  branding={brandingQ.data?.branding}
                  onSave={(payload) => brandingMutation.mutate(payload)}
                  onUpload={async (target, file) => {
                    const form = new FormData();
                    form.append('asset', file);
                    form.append('target', target);
                    await adminApi.post('/admin/branding/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                    queryClient.invalidateQueries({ queryKey: ['admin-branding'] });
                  }}
                />
              )}

              {activeTab === 'Landing Page' && (
                <LandingPanel
                  landing={landingQ.data?.landing}
                  onSave={(payload) => landingMutation.mutate(payload)}
                  onUpload={async (target, file) => {
                    const form = new FormData();
                    form.append('asset', file);
                    form.append('target', target);
                    await adminApi.post('/admin/landing/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
                    queryClient.invalidateQueries({ queryKey: ['admin-landing'] });
                  }}
                />
              )}

              {activeTab === 'Users' && (
                <section className="space-y-4">
                  <input value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="Search users by name, email, or phone" className="w-full md:w-96 rounded-2xl border border-slate-300 px-4 py-3" />
                  {selectedUserId && (
                    <UserDetailsDrawer
                      details={userDetailsQ.data}
                      loading={userDetailsQ.isLoading}
                      onClose={() => setSelectedUserId('')}
                    />
                  )}
                  <Card title="User Management" subtitle="Suspend, restore, and verify accounts">
                    <div className="overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="text-left pb-3">User</th>
                            <th className="text-left pb-3">Contact</th>
                            <th className="text-left pb-3">State</th>
                            <th className="text-left pb-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(usersQ.data?.users || []).map((user) => (
                            <tr key={user.id} className="border-t border-slate-100 align-top">
                              <td className="py-3 pr-3">
                                <p className="font-medium">{user.name || 'Unnamed'}</p>
                                <p className="text-xs text-slate-400">{new Date(user.createdAt).toLocaleString()}</p>
                              </td>
                              <td className="py-3 pr-3">
                                <p>{user.phone}</p>
                                <p className="text-xs text-slate-400">{user.email || 'No email'}</p>
                              </td>
                              <td className="py-3 pr-3">
                                <StatusBadge label={user.isSuspended ? 'Suspended' : user.isVerified ? 'Verified' : 'Unverified'} tone={user.isSuspended ? 'rose' : user.isVerified ? 'emerald' : 'amber'} />
                              </td>
                              <td className="py-3 flex flex-wrap gap-2">
                                <ActionButton tone="slate" onClick={() => setSelectedUserId(user.id)}>Details</ActionButton>
                                {isModerator && (
                                  !user.isSuspended
                                    ? <ActionButton tone="amber" onClick={() => suspendMutation.mutate({ id: user.id, reason: 'Admin action' })}>Suspend</ActionButton>
                                    : <ActionButton tone="emerald" onClick={() => restoreMutation.mutate(user.id)}>Restore</ActionButton>
                                )}
                                {isSupportOrSuper && <ActionButton tone="sky" onClick={() => verifyMutation.mutate(user.id)}>Verify</ActionButton>}
                                {isSupportOrSuper && <ActionButton tone="slate" onClick={() => pushResetMutation.mutate(user.id)}>Push Reset OTP</ActionButton>}
                                {isSupportOrSuper && <ActionButton tone="rose" onClick={() => adminApi.post(`/admin/users/${user.id}/force-logout`)}>Force Logout</ActionButton>}
                                {canSecurityControls && user.phone && (
                                  <ActionButton tone="amber" onClick={() => createBanMutation.mutate({ type: 'phone', value: user.phone, reason: 'Blocked from user panel' })}>
                                    Block Phone
                                  </ActionButton>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </section>
              )}

              {activeTab === 'Reports' && (
                <Card title="Reports Queue" subtitle="Review and resolve incoming reports">
                  <div className="space-y-3">
                    {(reportsQ.data?.reports || []).map((report) => (
                      <div key={report.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div>
                          <p className="font-semibold">{report.targetType} · {report.reason}</p>
                          <p className="text-sm text-slate-500 mt-1">Target {report.targetId} · status {report.status}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <ActionButton tone="amber" onClick={() => reportMutation.mutate({ id: report.id, status: 'reviewing' })}>Reviewing</ActionButton>
                          <ActionButton tone="emerald" onClick={() => reportMutation.mutate({ id: report.id, status: 'resolved' })}>Resolve</ActionButton>
                          <ActionButton tone="rose" onClick={() => reportMutation.mutate({ id: report.id, status: 'rejected' })}>Reject</ActionButton>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {activeTab === 'Moderation' && (
                <Card title="Content Moderation" subtitle="Flag or remove uploaded files and attachments">
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-500">
                        <tr>
                          <th className="text-left pb-3">Type</th>
                          <th className="text-left pb-3">File</th>
                          <th className="text-left pb-3">Chat</th>
                          <th className="text-left pb-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(filesQ.data?.files || []).map((file) => (
                          <tr key={file.id} className="border-t border-slate-100">
                            <td className="py-3">{file.type}</td>
                            <td className="py-3">{file.fileName || file.fileUrl}</td>
                            <td className="py-3">{file.chatId.slice(0, 8)}...</td>
                            <td className="py-3 flex flex-wrap gap-2">
                              <ActionButton tone="amber" onClick={() => adminApi.post(`/admin/files/${file.id}/flag`, { reason: 'Flagged by admin panel' })}>Flag</ActionButton>
                              <ActionButton tone="rose" onClick={() => removeFileMutation.mutate(file.id)}>Remove</ActionButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {activeTab === 'Support Tickets' && (
                <SupportTicketsPanel
                  tickets={supportTicketsQ.data?.tickets || []}
                  onRespond={(id, response, status) => respondSupportTicketMutation.mutateAsync({ id, response, status })}
                />
              )}

              {activeTab === 'Broadcast' && <BroadcastPanel items={announcementsQ.data?.announcements || []} onCreate={(payload) => createAnnouncementMutation.mutate(payload)} onDelete={async (id) => { await adminApi.delete(`/admin/announcements/${id}`); queryClient.invalidateQueries({ queryKey: ['admin-announcements'] }); }} />}
              {activeTab === 'Settings' && <SettingsPanel settings={settingsQ.data?.settings || []} onSave={async (key, value) => { await adminApi.put('/admin/settings', { key, value }); queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); }} />}
              {activeTab === 'Security Center' && (
                <SecurityCenterPanel
                  overview={securityOverviewQ.data}
                  sessions={loginIpLogsQ.data?.sessions || []}
                  onPolicySave={async (key, value) => {
                    await securityPolicyMutation.mutateAsync({ key, value });
                  }}
                />
              )}
              {activeTab === 'Bans' && <BansPanel bans={bansQ.data?.bans || []} onCreate={(payload) => createBanMutation.mutate(payload)} onDelete={async (id) => { await adminApi.delete(`/admin/bans/${id}`); queryClient.invalidateQueries({ queryKey: ['admin-bans'] }); }} />}
              {activeTab === 'OTP Monitor' && <OtpMonitorPanel data={otpQ.data} />}
              {activeTab === 'Audit Logs' && <AuditPanel logs={logsQ.data?.logs || []} />}
              {activeTab === 'Privacy' && <PrivacyPanel users={usersQ.data?.users || []} onExport={async (id) => { const { data } = await adminApi.get(`/admin/privacy/export/${id}`); alert(JSON.stringify(data.export, null, 2).slice(0, 5000)); }} onDelete={async (id) => { await adminApi.delete(`/admin/privacy/delete/${id}`); queryClient.invalidateQueries({ queryKey: ['admin-users'] }); }} />}
              {activeTab === 'Sessions' && <SessionsPanel sessions={sessionsQ.data?.sessions || []} onRevoke={async (id) => { await adminApi.delete(`/admin-auth/sessions/${id}`); queryClient.invalidateQueries({ queryKey: ['admin-sessions'] }); }} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="admin-surface-card admin-fancy-card rounded-[1.5rem] border p-5 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="mb-4">
        <h3 className="text-xl font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="admin-metric-card rounded-[1.5rem] text-white p-5 shadow-xl">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="text-3xl font-semibold mt-2">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="admin-mini-metric rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return <div className="flex items-center justify-between"><span>{label}</span><strong>{value}</strong></div>;
}

function StatusBadge({ label, tone = 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
  };
  return <span className={`inline-flex px-2.5 py-1 rounded-full text-xs border ${tones[tone]}`}>{label}</span>;
}

function ActionButton({ tone = 'slate', onClick, children }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  };
  return <button onClick={onClick} className={`px-3 py-2 rounded-xl border text-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${tones[tone]}`}>{children}</button>;
}

function UserDetailsDrawer({ details, loading, onClose }) {
  return (
    <Card title="User Detail" subtitle="Deep account view for moderation, support, and security actions.">
      {loading && <p className="text-sm text-slate-500">Loading user profile...</p>}
      {!loading && !details && <p className="text-sm text-slate-500">Select a user to inspect details.</p>}
      {!loading && details && (
        <div className="grid xl:grid-cols-[1fr_0.95fr] gap-5">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Profile</p>
              <p className="text-lg font-semibold mt-2">{details.user.name || 'Unnamed user'}</p>
              <p className="text-sm text-slate-600 mt-1">{details.user.phone || 'No phone'} · {details.user.email || 'No email'}</p>
              <p className="text-xs text-slate-500 mt-2">Created {new Date(details.user.createdAt).toLocaleString()}</p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <StatusBadge label={details.user.isSuspended ? 'Suspended' : 'Active'} tone={details.user.isSuspended ? 'rose' : 'emerald'} />
                <StatusBadge label={details.user.isVerified ? 'Verified' : 'Unverified'} tone={details.user.isVerified ? 'sky' : 'amber'} />
                <StatusBadge label={details.user.isOnline ? 'Online' : 'Offline'} tone={details.user.isOnline ? 'emerald' : 'slate'} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <MiniMetric label="Messages sent" value={details.summary?.messageCount || 0} />
              <MiniMetric label="Active chats" value={details.summary?.chatCount || 0} />
              <MiniMetric label="Active sessions" value={details.summary?.activeSessionCount || 0} />
              <MiniMetric label="Warnings" value={details.summary?.warningCount || 0} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Latest OTP Activity</p>
              {details.latestOtp ? (
                <div className="mt-2 text-sm text-slate-600 space-y-1">
                  <p>Issued: {new Date(details.latestOtp.createdAt).toLocaleString()}</p>
                  <p>Expires: {new Date(details.latestOtp.expiresAt).toLocaleString()}</p>
                  <p>Attempts: {details.latestOtp.attempts || 0}</p>
                  <p>Status: {details.latestOtp.isUsed ? 'Used' : 'Pending'}</p>
                </div>
              ) : <p className="mt-2 text-sm text-slate-500">No OTP records found.</p>}
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Recent Reports by User</p>
              <div className="mt-2 space-y-2 max-h-44 overflow-auto pr-1">
                {(details.recentReports || []).length === 0 && <p className="text-sm text-slate-500">No reports submitted.</p>}
                {(details.recentReports || []).map((item) => (
                  <div key={item.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-sm font-medium">{item.targetType} · {item.reason}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleString()} · {item.status}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-4">
        <button onClick={onClose} className="rounded-2xl bg-slate-950 text-white px-4 py-2.5">Close Detail</button>
      </div>
    </Card>
  );
}

function BrandingPanel({ branding, onSave, onUpload }) {
  const [form, setForm] = useState(branding || {});

  if (!branding) return null;
  if (form.appName !== branding.appName && !form.primaryColor) {
    // keep current form when user is editing
  }

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid xl:grid-cols-[1fr_0.85fr] gap-5">
      <Card title="Brand Identity" subtitle="Change your app name, palette, and uploaded logos without touching code.">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="App name" value={form.appName || branding.appName} onChange={(value) => update('appName', value)} />
          <Input label="Tagline" value={form.tagline || branding.tagline} onChange={(value) => update('tagline', value)} />
          <Input label="Primary color" value={form.primaryColor || branding.primaryColor} onChange={(value) => update('primaryColor', value)} />
          <Input label="Accent color" value={form.accentColor || branding.accentColor} onChange={(value) => update('accentColor', value)} />
          <Input label="Logo URL" value={form.logoUrl || branding.logoUrl} onChange={(value) => update('logoUrl', value)} />
          <Input label="Wordmark URL" value={form.wordmarkUrl || branding.wordmarkUrl || ''} onChange={(value) => update('wordmarkUrl', value)} />
        </div>
        <div className="mt-4 flex gap-3 flex-wrap">
          <button onClick={() => onSave(form)} className="rounded-2xl bg-slate-950 text-white px-4 py-3">Save branding</button>
          <UploadButton label="Upload logo" onFile={(file) => onUpload('logoUrl', file)} />
          <UploadButton label="Upload favicon" onFile={(file) => onUpload('faviconUrl', file)} />
          <UploadButton label="Upload wordmark" onFile={(file) => onUpload('wordmarkUrl', file)} />
        </div>
      </Card>
      <Card title="Live Preview" subtitle="Current brand rendering">
        <div className="rounded-[1.5rem] p-6 text-white" style={{ background: `linear-gradient(135deg, ${form.accentColor || branding.accentColor}, ${form.primaryColor || branding.primaryColor})` }}>
          <img src={form.logoUrl || branding.logoUrl || '/icon.svg'} alt="logo" className="w-16 h-16 rounded-2xl object-cover bg-white/15 p-2" />
          <p className="text-3xl font-semibold mt-6">{form.appName || branding.appName}</p>
          <p className="text-white/80 mt-2">{form.tagline || branding.tagline}</p>
        </div>
      </Card>
    </div>
  );
}

function LandingPanel({ landing, onSave, onUpload }) {
  const [form, setForm] = useState(landing || {});
  if (!landing) return null;

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  return (
    <div className="grid xl:grid-cols-[1fr_0.95fr] gap-5">
      <Card title="Landing Content" subtitle="Edit hero copy, calls to action, footer text, and feature cards.">
        <div className="space-y-4">
          <Input label="Hero title" value={form.heroTitle || landing.heroTitle} onChange={(value) => update('heroTitle', value)} />
          <TextArea label="Hero subtitle" value={form.heroSubtitle || landing.heroSubtitle} onChange={(value) => update('heroSubtitle', value)} rows={4} />
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Primary CTA label" value={form.primaryCtaLabel || landing.primaryCtaLabel} onChange={(value) => update('primaryCtaLabel', value)} />
            <Input label="Primary CTA href" value={form.primaryCtaHref || landing.primaryCtaHref} onChange={(value) => update('primaryCtaHref', value)} />
            <Input label="Secondary CTA label" value={form.secondaryCtaLabel || landing.secondaryCtaLabel} onChange={(value) => update('secondaryCtaLabel', value)} />
            <Input label="Secondary CTA href" value={form.secondaryCtaHref || landing.secondaryCtaHref} onChange={(value) => update('secondaryCtaHref', value)} />
            <Input label="Forgot password label" value={form.tertiaryCtaLabel || landing.tertiaryCtaLabel} onChange={(value) => update('tertiaryCtaLabel', value)} />
            <Input label="Forgot password href" value={form.tertiaryCtaHref || landing.tertiaryCtaHref} onChange={(value) => update('tertiaryCtaHref', value)} />
          </div>
          <TextArea label="Feature cards JSON" value={JSON.stringify(form.featureCards || landing.featureCards, null, 2)} onChange={(value) => { try { update('featureCards', JSON.parse(value)); } catch {} }} rows={8} />
          <TextArea label="Stat cards JSON" value={JSON.stringify(form.statCards || landing.statCards, null, 2)} onChange={(value) => { try { update('statCards', JSON.parse(value)); } catch {} }} rows={6} />
          <TextArea label="Footer text" value={form.footerText || landing.footerText} onChange={(value) => update('footerText', value)} rows={3} />
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => onSave(form)} className="rounded-2xl bg-slate-950 text-white px-4 py-3">Save landing content</button>
            <UploadButton label="Upload hero image" onFile={(file) => onUpload('heroImageUrl', file)} />
          </div>
        </div>
      </Card>
      <Card title="Landing Preview" subtitle="Preview your editable public website content.">
        <div className="rounded-[1.75rem] border border-slate-200 overflow-hidden bg-[linear-gradient(135deg,#0f172a,#111827)] text-white">
          <div className="p-6 border-b border-white/10">
            <img src={form.heroImageUrl || landing.heroImageUrl || '/guff-handim-logo.svg'} alt="hero" className="w-16 h-16 rounded-2xl object-cover bg-white/10 p-2" />
            <h3 className="text-3xl font-semibold mt-6 leading-tight">{form.heroTitle || landing.heroTitle}</h3>
            <p className="text-white/75 mt-3 leading-7">{form.heroSubtitle || landing.heroSubtitle}</p>
          </div>
          <div className="p-6 grid gap-3">
            {(form.featureCards || landing.featureCards || []).slice(0, 3).map((card, index) => (
              <div key={`${card.title}-${index}`} className="rounded-2xl bg-white/6 border border-white/10 p-4">
                <p className="font-medium">{card.title}</p>
                <p className="text-sm text-white/75 mt-1">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function BroadcastPanel({ items, onCreate, onDelete }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  return (
    <Card title="Broadcast Announcements" subtitle="Push site-wide updates to the public website and admin overview.">
      <div className="grid lg:grid-cols-[1fr_0.9fr] gap-5">
        <div className="space-y-3">
          <Input label="Title" value={title} onChange={setTitle} />
          <TextArea label="Message" value={message} onChange={setMessage} rows={4} />
          <button onClick={() => onCreate({ title, message })} className="rounded-2xl bg-slate-950 text-white px-4 py-3">Publish announcement</button>
        </div>
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-slate-500 mt-1">{item.message}</p>
              </div>
              <button onClick={() => onDelete(item.id)} className="text-rose-600">Delete</button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [maintenance, setMaintenance] = useState('false');
  const [maxUpload, setMaxUpload] = useState('100');
  return (
    <Card title="System Settings" subtitle="Control maintenance mode and key operational limits.">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600">Maintenance mode</label>
            <select value={maintenance} onChange={e => setMaintenance(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3">
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-600">Max upload MB</label>
            <input value={maxUpload} onChange={e => setMaxUpload(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => onSave('maintenance_mode', { enabled: maintenance === 'true' })} className="rounded-2xl bg-slate-950 text-white px-4 py-3">Save maintenance</button>
            <button onClick={() => onSave('max_upload_mb', { value: Number(maxUpload || 100) })} className="rounded-2xl bg-slate-950 text-white px-4 py-3">Save upload limit</button>
          </div>
        </div>
        <pre className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs overflow-auto">{JSON.stringify(settings, null, 2)}</pre>
      </div>
    </Card>
  );
}

function BansPanel({ bans, onCreate, onDelete }) {
  const [type, setType] = useState('phone');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('Policy violation');
  return (
    <Card title="Ban Management" subtitle="Block phones, IPs, or device identifiers.">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-5">
        <div className="space-y-3">
          <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
            <option value="phone">Phone</option>
            <option value="ip">IP</option>
            <option value="device">Device</option>
          </select>
          <input value={value} onChange={e => setValue(e.target.value)} placeholder="Value" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" className="w-full rounded-2xl border border-slate-300 px-4 py-3" />
          <button onClick={() => onCreate({ type, value, reason })} className="rounded-2xl bg-slate-950 text-white px-4 py-3">Create ban</button>
        </div>
        <div className="space-y-3">
          {bans.map(item => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{item.type}: {item.value}</p>
                <p className="text-sm text-slate-500">{item.reason}</p>
              </div>
              <button onClick={() => onDelete(item.id)} className="text-rose-600">Remove</button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function OtpMonitorPanel({ data }) {
  return (
    <Card title="OTP Monitoring" subtitle="Track suspicious reset and verification patterns.">
      <div className="grid md:grid-cols-3 gap-4">
        <MiniMetric label="Total issued" value={data?.summary?.totalIssued || 0} />
        <MiniMetric label="Average attempts" value={data?.summary?.averageAttempts || 0} />
        <MiniMetric label="Unused OTPs" value={data?.summary?.unusedCount || 0} />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {(data?.summary?.highRiskPhones || []).map(phone => <StatusBadge key={phone} label={phone} tone="amber" />)}
      </div>
    </Card>
  );
}

function AuditPanel({ logs }) {
  return (
    <Card title="Audit Logs" subtitle="Every privileged action is recorded here.">
      <div className="space-y-3 max-h-[68vh] overflow-auto pr-1">
        {logs.map(log => (
          <div key={log.id} className="rounded-2xl border border-slate-200 p-4">
            <p className="font-medium">{log.action}</p>
            <p className="text-sm text-slate-500 mt-1">{log.resourceType} · {log.resourceId || '-'} · {log.admin?.username || 'system'}</p>
            <p className="text-xs text-slate-400 mt-2">{new Date(log.createdAt).toLocaleString()} · {log.ipAddress || 'n/a'}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PrivacyPanel({ users, onExport, onDelete }) {
  const [userId, setUserId] = useState('');
  return (
    <Card title="Privacy & Compliance" subtitle="Export or delete user data when needed.">
      <div className="space-y-4 max-w-xl">
        <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3">
          <option value="">Select user</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.name || 'Unnamed'} · {user.phone}</option>)}
        </select>
        <div className="flex gap-3">
          <button disabled={!userId} onClick={() => onExport(userId)} className="rounded-2xl bg-sky-600 text-white px-4 py-3 disabled:opacity-60">Export data</button>
          <button disabled={!userId} onClick={() => window.confirm('Delete all user data?') && onDelete(userId)} className="rounded-2xl bg-rose-600 text-white px-4 py-3 disabled:opacity-60">Delete data</button>
        </div>
      </div>
    </Card>
  );
}

function SessionsPanel({ sessions, onRevoke }) {
  return (
    <Card title="Admin Sessions" subtitle="Revoke devices or browsers currently holding an admin session.">
      <div className="space-y-3">
        {sessions.map(session => (
          <div key={session.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <p className="font-medium">{session.ipAddress || 'Unknown IP'}</p>
              <p className="text-sm text-slate-500">{session.userAgent || 'Unknown device'}</p>
              <p className="text-xs text-slate-400 mt-1">Expires {new Date(session.expiresAt).toLocaleString()}</p>
            </div>
            {!session.isRevoked && <button onClick={() => onRevoke(session.id)} className="text-rose-600">Revoke</button>}
          </div>
        ))}
      </div>
    </Card>
  );
}

function OnlineUsersPanel({ onlineUsers, recentlySeenUsers }) {
  return (
    <section className="space-y-5">
      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Online now" value={onlineUsers.length} />
        <MetricCard label="Recently seen" value={recentlySeenUsers.length} />
        <MetricCard label="Presence signal" value={onlineUsers.length > 0 ? 'Live' : 'Idle'} />
        <MetricCard label="Last sync" value={new Date().toLocaleTimeString()} />
      </div>

      <Card title="Live Users" subtitle="Users currently connected to the platform.">
        <div className="space-y-3">
          {onlineUsers.length === 0 && <p className="text-sm text-slate-500">No users are currently online.</p>}
          {onlineUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{user.name || 'Unnamed user'}</p>
                <p className="text-sm text-slate-600">{user.phone}</p>
              </div>
              <StatusBadge label="Online" tone="emerald" />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Recently Seen" subtitle="Most recent offline users with last-seen timestamps.">
        <div className="space-y-3">
          {recentlySeenUsers.length === 0 && <p className="text-sm text-slate-500">No recent presence data available yet.</p>}
          {recentlySeenUsers.map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{user.name || 'Unnamed user'}</p>
                <p className="text-sm text-slate-600">{user.phone}</p>
              </div>
              <p className="text-xs text-slate-500">{new Date(user.lastSeen).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function ActivityFeedPanel({ items }) {
  return (
    <Card title="Activity Timeline" subtitle="Recent admin actions and platform events from audit logs.">
      <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
        {items.length === 0 && <p className="text-sm text-slate-500">No activity records yet.</p>}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 p-4 flex gap-3">
            <div className="mt-1 w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{item.action}</p>
              <p className="text-sm text-slate-600 mt-1">{item.resourceType} {item.resourceId ? `· ${item.resourceId}` : ''}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(item.createdAt).toLocaleString()} · {item.admin?.username || 'system'}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AdminAccountsPanel({ currentAdmin, admins, onCreate, onUpdate, onUpdateSelf }) {
  const [createForm, setCreateForm] = useState({ username: '', phone: '', password: '', role: 'moderator', require2FA: true });
  const [selfForm, setSelfForm] = useState({ currentPassword: '', username: currentAdmin?.username || '', phone: currentAdmin?.phone || '', newPassword: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  async function submitCreate(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      await onCreate(createForm);
      setStatus('New admin account created successfully.');
      setCreateForm({ username: '', phone: '', password: '', role: 'moderator', require2FA: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to create admin account');
    }
  }

  async function submitSelfUpdate(e) {
    e.preventDefault();
    setError('');
    setStatus('');
    try {
      await onUpdateSelf(selfForm);
      setStatus('Your admin credentials were updated successfully.');
      setSelfForm((prev) => ({ ...prev, currentPassword: '', newPassword: '' }));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update your credentials');
    }
  }

  async function toggleActive(admin) {
    try {
      await onUpdate(admin.id, { isActive: !admin.isActive });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update admin status');
    }
  }

  async function toggle2FA(admin) {
    try {
      await onUpdate(admin.id, { require2FA: !admin.require2FA });
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to update 2FA setting');
    }
  }

  return (
    <section className="space-y-5">
      {(status || error) && (
        <div className={`rounded-2xl border px-4 py-3 text-sm ${error ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          {error || status}
        </div>
      )}

      <div className="grid xl:grid-cols-[1fr_1fr] gap-5">
        <Card title="Create Admin" subtitle="Add another admin account for your team.">
          <form onSubmit={submitCreate} className="space-y-3">
            <Input label="Username" value={createForm.username} onChange={(v) => setCreateForm((prev) => ({ ...prev, username: v }))} />
            <Input label="Phone" value={createForm.phone} onChange={(v) => setCreateForm((prev) => ({ ...prev, phone: v }))} />
            <Input label="Password" type="password" value={createForm.password} onChange={(v) => setCreateForm((prev) => ({ ...prev, password: v }))} />
            <div>
              <label className="text-sm text-slate-600">Role</label>
              <select className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3" value={createForm.role} onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}>
                <option value="moderator">Moderator</option>
                <option value="support">Support Staff</option>
                <option value="security">Security Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={createForm.require2FA} onChange={(e) => setCreateForm((prev) => ({ ...prev, require2FA: e.target.checked }))} />
              Require OTP 2FA on login
            </label>
            <button type="submit" className="rounded-2xl bg-slate-950 text-white px-4 py-3">Create admin account</button>
          </form>
        </Card>

        <Card title="My Credentials" subtitle="Update your own admin username, phone, or password.">
          <form onSubmit={submitSelfUpdate} className="space-y-3">
            <Input label="Current password" type="password" value={selfForm.currentPassword} onChange={(v) => setSelfForm((prev) => ({ ...prev, currentPassword: v }))} />
            <Input label="New username" value={selfForm.username} onChange={(v) => setSelfForm((prev) => ({ ...prev, username: v }))} />
            <Input label="New phone" value={selfForm.phone} onChange={(v) => setSelfForm((prev) => ({ ...prev, phone: v }))} />
            <Input label="New password (optional)" type="password" value={selfForm.newPassword} onChange={(v) => setSelfForm((prev) => ({ ...prev, newPassword: v }))} />
            <button type="submit" className="rounded-2xl bg-slate-950 text-white px-4 py-3">Save my credentials</button>
          </form>
        </Card>
      </div>

      <Card title="Admin Team" subtitle="Manage active admins and security controls.">
        <div className="space-y-3 max-h-[56vh] overflow-auto pr-1">
          {admins.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{item.username}</p>
                <p className="text-sm text-slate-600">{item.phone}</p>
                <p className="text-xs text-slate-400 mt-1">Last login: {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never'}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <StatusBadge label={{ super_admin: 'Super Admin', moderator: 'Moderator', support: 'Support Staff', security: 'Security Admin', admin: 'Legacy Admin' }[item.role] || item.role} tone={item.role === 'super_admin' ? 'sky' : item.role === 'security' ? 'amber' : item.role === 'support' ? 'emerald' : 'slate'} />
                <StatusBadge label={item.isActive ? 'Active' : 'Disabled'} tone={item.isActive ? 'emerald' : 'rose'} />
                <StatusBadge label={item.require2FA ? '2FA On' : '2FA Off'} tone={item.require2FA ? 'sky' : 'amber'} />
                <ActionButton tone={item.isActive ? 'rose' : 'emerald'} onClick={() => toggleActive(item)}>{item.isActive ? 'Disable' : 'Enable'}</ActionButton>
                <ActionButton tone="sky" onClick={() => toggle2FA(item)}>{item.require2FA ? 'Turn 2FA Off' : 'Turn 2FA On'}</ActionButton>
                <ActionButton tone="amber" onClick={() => onUpdate(item.id, { role: item.role === 'super_admin' ? 'moderator' : 'super_admin' })}>
                  {item.role === 'super_admin' ? 'Make Moderator' : 'Make Super Admin'}
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function SupportTicketsPanel({ tickets, onRespond }) {
  const [responses, setResponses] = useState({});

  async function submitResponse(ticketId, status) {
    const response = (responses[ticketId] || '').trim();
    if (!response) return;
    await onRespond(ticketId, response, status);
    setResponses((prev) => ({ ...prev, [ticketId]: '' }));
  }

  return (
    <Card title="Support Tickets" subtitle="Assist users with account recovery and identity verification cases.">
      <div className="space-y-4">
        {tickets.length === 0 && <p className="text-sm text-slate-500">No support tickets available.</p>}
        {tickets.map((ticket) => (
          <div key={ticket.id} className="rounded-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{ticket.subject || `Ticket ${ticket.id}`}</p>
              <StatusBadge label={ticket.status || 'open'} tone={ticket.status === 'resolved' ? 'emerald' : ticket.status === 'in_progress' ? 'amber' : 'sky'} />
            </div>
            <p className="text-sm text-slate-600">{ticket.description || 'No description provided'}</p>
            <p className="text-xs text-slate-400">User: {ticket.userId || 'unknown'} · Updated: {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'n/a'}</p>

            <textarea
              rows={3}
              value={responses[ticket.id] || ''}
              onChange={(e) => setResponses((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              placeholder="Write response"
            />
            <div className="flex gap-2">
              <ActionButton tone="amber" onClick={() => submitResponse(ticket.id, 'in_progress')}>Respond as In Progress</ActionButton>
              <ActionButton tone="emerald" onClick={() => submitResponse(ticket.id, 'resolved')}>Respond and Resolve</ActionButton>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SecurityCenterPanel({ overview, sessions, onPolicySave }) {
  const [rateLimitWindow, setRateLimitWindow] = useState('60');
  const [rateLimitMax, setRateLimitMax] = useState('120');
  const [bruteforceThreshold, setBruteforceThreshold] = useState('5');

  return (
    <section className="space-y-5">
      <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard label="Suspicious OTP" value={overview?.summary?.suspiciousOtpCount || 0} />
        <MetricCard label="Locked Admins" value={overview?.summary?.lockedAdminCount || 0} />
        <MetricCard label="Recent IP Bans" value={overview?.summary?.recentIpBans || 0} />
        <MetricCard label="Reports in Review" value={overview?.summary?.reportsNeedingReview || 0} />
        <MetricCard label="New Users / 24h" value={overview?.summary?.recentlyCreatedUsers || 0} />
      </div>

      <div className="grid xl:grid-cols-[1fr_1fr] gap-5">
        <Card title="Security Policies" subtitle="Manage 2FA and brute-force/rate-limit policies.">
          <div className="space-y-3">
            <ActionButton tone="sky" onClick={() => onPolicySave('security_2fa_policy', { requiredForAdmins: true })}>Enforce Admin 2FA</ActionButton>
            <div className="grid md:grid-cols-2 gap-3">
              <Input label="Rate limit window (sec)" value={rateLimitWindow} onChange={setRateLimitWindow} />
              <Input label="Rate limit max requests" value={rateLimitMax} onChange={setRateLimitMax} />
            </div>
            <ActionButton tone="amber" onClick={() => onPolicySave('security_rate_limits', { windowSeconds: Number(rateLimitWindow), maxRequests: Number(rateLimitMax) })}>Save Rate Limits</ActionButton>
            <Input label="Brute-force threshold" value={bruteforceThreshold} onChange={setBruteforceThreshold} />
            <ActionButton tone="rose" onClick={() => onPolicySave('security_bruteforce_threshold', { attempts: Number(bruteforceThreshold) })}>Save Bruteforce Threshold</ActionButton>
          </div>
        </Card>

        <Card title="Login IP Logs" subtitle="Recent admin session IP/user-agent trail.">
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            {sessions.map((session) => (
              <div key={session.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-medium">{session.admin?.username || 'admin'} · {session.ipAddress || 'Unknown IP'}</p>
                <p className="text-sm text-slate-500 mt-1">{session.userAgent || 'Unknown device'}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(session.createdAt).toLocaleString()} · Expires {new Date(session.expiresAt).toLocaleString()}</p>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-sm text-slate-500">No login IP logs found.</p>}
          </div>
        </Card>
      </div>

      <Card title="Bot/Spam Candidates" subtitle="Accounts with unusually high message velocity.">
        <div className="space-y-3">
          {(overview?.botCandidates || []).map((user) => (
            <div key={user.id} className="rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{user.name || 'Unnamed user'}</p>
                <p className="text-sm text-slate-500">{user.phone || 'No phone'} · messages in 24h: {user.recentMessageCount || 0}</p>
              </div>
              <StatusBadge label="Review" tone="amber" />
            </div>
          ))}
          {(overview?.botCandidates || []).length === 0 && <p className="text-sm text-slate-500">No bot/spam candidates identified.</p>}
        </div>
      </Card>
    </section>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 4 }) {
  return (
    <div>
      <label className="text-sm text-slate-600">{label}</label>
      <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1 w-full rounded-2xl border border-slate-300 px-4 py-3 resize-y" />
    </div>
  );
}

function UploadButton({ label, onFile }) {
  return (
    <label className="rounded-2xl border border-slate-300 px-4 py-3 cursor-pointer hover:bg-slate-50 transition">
      {label}
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onFile(file); e.target.value = ''; }} />
    </label>
  );
}
