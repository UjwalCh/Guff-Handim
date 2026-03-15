import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getInitials } from '../../utils/helpers';
import api from '../../utils/api';
import { usePublicSiteConfig } from '../../hooks/usePublicSiteConfig';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { data } = usePublicSiteConfig();
  const totalUnread = useChatStore(s =>
    Object.values(s.unreadCounts).reduce((a, b) => a + b, 0)
  );

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch {}
    logout();
  }

  const navItem = (to, icon, label, badge) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 py-3 px-4 relative transition ${
          isActive ? 'text-wa-green border-r-2 border-wa-green bg-wa-hover' : 'text-wa-icon hover:text-wa-text'
        }`
      }
      title={label}
    >
      <span className="text-xl relative">
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );

  return (
    <div className="flex flex-col h-full bg-wa-panel border-r border-wa-border w-16">
      {/* App icon */}
      <div className="flex items-center justify-center py-4">
        <img src={data.branding.logoUrl || '/icon.svg'} alt={data.branding.appName} className="w-10 h-10 rounded-2xl object-cover shadow-lg" />
      </div>

      <nav className="flex flex-col flex-1">
        {navItem('/chats',    '💬', 'Chats', totalUnread)}
        {navItem('/status',   '⏱', 'Status', 0)}
        {navItem('/settings', '⚙️', 'Settings', 0)}
      </nav>

      {/* User avatar + logout */}
      <div className="flex flex-col items-center gap-2 py-4 border-t border-wa-border">
        <div className="w-9 h-9 rounded-full bg-wa-hover flex items-center justify-center overflow-hidden">
          {user?.avatar
            ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            : <span className="text-wa-text text-sm font-semibold">{getInitials(user?.name)}</span>
          }
        </div>
        <button
          onClick={handleLogout}
          className="text-red-400 hover:text-red-500 transition text-xs"
          title="Logout"
        >
          ⏻
        </button>
      </div>
    </div>
  );
}
