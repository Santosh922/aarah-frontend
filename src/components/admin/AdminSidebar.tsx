'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ShoppingBag, FolderTree, Users, Package,
  Ticket, MessageSquare, BarChart3, Settings, Image as ImageIcon,
  LogOut, Instagram, ChevronLeft, ChevronRight, Shield, ShieldCheck,
  Bell, X, RefreshCw, AlertTriangle,
} from 'lucide-react';

import { API_URL } from '@/lib/api';

const NAV = [
  { label: 'Dashboard',  href: '/admin/dashboard',  icon: LayoutDashboard },
  { label: 'Products',   href: '/admin/products',   icon: ShoppingBag },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Orders',     href: '/admin/orders',     icon: Package },
  { label: 'Customers',  href: '/admin/customers',  icon: Users },
  { label: 'Banners',    href: '/admin/banners',    icon: ImageIcon },
  { label: 'Discounts',  href: '/admin/discounts',  icon: Ticket },
  { label: 'Reviews',    href: '/admin/reviews',    icon: MessageSquare },
  { label: 'Analytics',  href: '/admin/analytics',  icon: BarChart3 },
  { label: 'Instagram',  href: '/admin/instagram',  icon: Instagram },
  { label: 'Settings',   href: '/admin/settings',   icon: Settings },
];

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  read: boolean;
  referenceId?: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function typeColor(type: string) {
  if (type === 'REFUND_REQUIRED') return 'text-amber-400';
  if (type === 'ORDER_CANCELLED') return 'text-red-400';
  return 'text-blue-400';
}

function typeIcon(type: string) {
  if (type === 'REFUND_REQUIRED') return <RefreshCw className="w-3.5 h-3.5 text-amber-400" />;
  if (type === 'ORDER_CANCELLED') return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
  return <Bell className="w-3.5 h-3.5 text-blue-400" />;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [name, setName]         = useState('Admin');
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Notifications
  const [notifications, setNotifications]   = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [showBell, setShowBell]             = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/auth/admin/me`, { credentials: 'include' })
      .then(res => {
        if (res.status === 401) { router.push('/admin/login'); return null; }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setName(data.name || 'Admin');
      })
      .catch(() => router.push('/admin/login'));
  }, [router]);

  // ── Poll notifications every 30s ─────────────────────────────────────────
  const fetchNotifications = () => {
    fetch(`${API_URL}/api/admin/notifications?limit=15`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowBell(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = () => {
    fetch(`${API_URL}/api/admin/notifications/mark-read`, {
      method: 'POST', credentials: 'include',
    }).then(() => {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }).catch(() => {});
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch(`${API_URL}/api/auth/admin/logout`, { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('aarah_admin_session');
    router.push('/admin/login');
  };

  const visible = NAV;

  return (
    <aside
      className="relative flex flex-col h-screen border-r flex-shrink-0 transition-all duration-300"
      style={{ width: collapsed ? '64px' : '220px', background: '#0e0e0e', borderColor: 'rgba(255,255,255,0.07)' }}
    >
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-6 w-6 h-6 rounded-full flex items-center justify-center z-10 border"
        style={{ background: '#1a1a1a', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* Logo */}
      <div className="flex items-center px-4 py-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <img src="/assets/logo.png" alt="AARAH" className="w-6 h-6 object-contain"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
        {!collapsed && <span className="ml-3 font-serif text-white font-bold text-[15px] tracking-wider">AARAH</span>}

        {/* Notification bell — only shown when not collapsed */}
        {!collapsed && (
          <div ref={bellRef} className="ml-auto relative">
            <button
              onClick={() => { setShowBell(v => !v); if (!showBell) fetchNotifications(); }}
              className="relative w-8 h-8 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showBell && (
              <div
                className="absolute left-0 top-full mt-2 w-80 rounded-xl overflow-hidden z-[999] shadow-2xl border"
                style={{ background: '#141414', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                  <span className="text-white/70 text-[11px] font-semibold tracking-widest uppercase">Notifications</span>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[9px] text-white/30 hover:text-white/60 uppercase tracking-widest">
                        Mark all read
                      </button>
                    )}
                    <button onClick={() => setShowBell(false)} className="text-white/30 hover:text-white/60">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 flex flex-col items-center">
                      <Bell className="w-8 h-8 text-white/10 mb-3" />
                      <p className="text-white/25 text-[11px] uppercase tracking-widest">No notifications</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.referenceId) router.push(`/admin/orders?highlight=${n.referenceId}`);
                          setShowBell(false);
                        }}
                        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b transition-colors"
                        style={{
                          borderColor: 'rgba(255,255,255,0.04)',
                          background: n.read ? 'transparent' : 'rgba(255,255,255,0.03)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                        onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(255,255,255,0.03)')}
                      >
                        <div className="mt-0.5 flex-shrink-0">{typeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white/80 text-[11px] font-semibold leading-snug truncate">{n.title}</p>
                          <p className="text-white/35 text-[10px] leading-relaxed mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-white/20 text-[9px] mt-1 uppercase tracking-widest">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 flex-shrink-0" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2" style={{ scrollbarWidth: 'none' }}>
        {visible.map(item => {
          const Icon   = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} title={collapsed ? item.label : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 transition-all"
              style={{ background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.4)' }}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="font-sans text-[12px] font-semibold tracking-wide whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2 px-2 py-2 mb-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            {name[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-sans text-[11px] font-semibold text-white/70 truncate">{name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Shield className="w-2.5 h-2.5 text-white/30" /><span className="font-sans text-[9px] font-bold text-white/30">ADMIN</span>
              </div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} disabled={loggingOut} title={collapsed ? 'Sign Out' : undefined}
          className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all"
          style={{ color: 'rgba(239,68,68,0.7)' }}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="font-sans text-[12px] font-semibold">{loggingOut ? 'Signing out…' : 'Sign Out'}</span>}
        </button>
      </div>
    </aside>
  );
}
