'use client';

import { API_URL } from '@/lib/api';
import { authFetch } from '@/lib/integrationAdapters';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { AdminUser } from '@/types';

type AuthUser = AdminUser;

import {
    useState, useEffect, useCallback, useRef, useMemo
} from 'react';
import {
    Search, X, ChevronDown, ChevronLeft, ChevronRight, RefreshCw,
    Edit3, Trash2, Save, Eye, Download, Shield, ShieldCheck, LogOut,
    Check, Minus, AlertCircle, CheckCircle2, Phone, Mail, MapPin,
    Copy, MoreHorizontal, Plus, Star, Lock, EyeOff,
    Activity, ShoppingBag, Tag, SlidersHorizontal, List, LayoutGrid,
    UserCheck, UserX, MessageSquare, Zap, Pin, PinOff,
    Users, AlertTriangle, Gem, Heart, Clock
} from 'lucide-react';

// ─── AARAH Types & Constants ─────────────────────────────────────────────────
type CustomerStatus = 'Active' | 'Blocked' | 'Pending';
type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
type ActivityType = 'order_placed' | 'order_delivered' | 'order_cancelled' | 'account_created' | 'profile_updated' | 'password_changed' | 'review_posted' | 'wishlist_added' | 'coupon_used' | 'note_added' | 'status_changed' | 'tier_changed';
type ViewMode = 'list' | 'grid';
type DrawerTab = 'overview' | 'orders' | 'activity' | 'notes';


interface CustomerNote { id: string; text: string; createdBy: string; createdByName: string; createdAt: string; isPinned: boolean; }
interface ActivityEvent { id: string; type: ActivityType; label: string; detail?: string; actor?: string; timestamp: string; }
interface CustomerOrder { id: string; date: string; total: number; status: string; items: { name: string; qty: number }[]; paymentMode: string; }
interface CustomerAddress { id: string; label: string; line1: string; line2?: string; city: string; state: string; pincode: string; isDefault: boolean; }

interface Customer {
    id: string; firstName: string; lastName: string; email: string; phone: string; altPhone?: string; gender?: string; dob?: string;
    avatar: string; status: CustomerStatus; loyaltyTier: LoyaltyTier; loyaltyPoints: number;
    totalSpend: number; totalOrders: number; cancelledOrders: number; avgOrderValue: number;
    source: string; lastActiveAt: string; createdAt: string; wishlistCount: number; reviewCount: number; couponUsageCount: number; referralCode?: string;
    tags: string[]; addresses: CustomerAddress[]; notes: CustomerNote[]; activity: ActivityEvent[]; orders: CustomerOrder[];
}

const LOYALTY_TIERS: Record<LoyaltyTier, { color: string; bg: string; border: string }> = {
    Bronze: { color: '#b45309', bg: 'rgba(180,83,9,0.1)', border: 'rgba(180,83,9,0.2)' },
    Silver: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' },
    Gold: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
    Platinum: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.2)' },
};

const STATUS_CFG: Record<CustomerStatus, { color: string; bg: string }> = {
    Active: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    Blocked: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    Pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

const CUSTOMER_TAGS = ['VIP', 'Frequent Returner', 'Wholesale', 'Influencer', 'High Value', 'Needs Follow-up'];

// ─── Permissions ─────────────────────────────────────────────────────────────
const PERMS = {
    editBasicInfo: () => true,
    addNote: () => true,
    deleteNote: () => true,
    manageTags: () => true,
    viewOrders: () => true,
    viewActivity: () => true,
    copyContact: () => true,
    blockUnblock: () => true,
    deleteCustomer: () => true,
    changeTier: () => true,
    adjustPoints: () => true,
    bulkActions: () => true,
    export: () => true,
    viewSensitive: () => true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtRelative = (s: string) => {
    const diff = Date.now() - new Date(s).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    if (d < 365) return `${Math.floor(d / 30)}mo ago`;
    return `${Math.floor(d / 365)}y ago`;
};

const ORDER_STATUS_CFG: Record<string, { color: string; bg: string }> = {
    Pending: { color: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
    Confirmed: { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
    Processing: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    Shipped: { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    Delivered: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    Cancelled: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    Returned: { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
};

const ACTIVITY_ICONS: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
    order_placed: { icon: <ShoppingBag className="w-3.5 h-3.5" />, color: '#60a5fa' },
    order_delivered: { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#22c55e' },
    order_cancelled: { icon: <X className="w-3.5 h-3.5" />, color: '#ef4444' },
    account_created: { icon: <Users className="w-3.5 h-3.5" />, color: '#a855f7' },
    profile_updated: { icon: <Edit3 className="w-3.5 h-3.5" />, color: '#94a3b8' },
    password_changed: { icon: <Lock className="w-3.5 h-3.5" />, color: '#f59e0b' },
    review_posted: { icon: <Star className="w-3.5 h-3.5" />, color: '#fbbf24' },
    wishlist_added: { icon: <Heart className="w-3.5 h-3.5" />, color: '#f43f5e' },
    coupon_used: { icon: <Tag className="w-3.5 h-3.5" />, color: '#10b981' },
    note_added: { icon: <MessageSquare className="w-3.5 h-3.5" />, color: '#94a3b8' },
    status_changed: { icon: <AlertTriangle className="w-3.5 h-3.5" />, color: '#f97316' },
    tier_changed: { icon: <Gem className="w-3.5 h-3.5" />, color: '#a78bfa' },
};

// ─── Toast ───────────────────────────────────────────────────────────────────
interface ToastItem { id: string; type: 'success' | 'error' | 'info'; message: string }
function useToast() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const add = useCallback((type: ToastItem['type'], message: string) => {
        const id = uid();
        setItems(p => [...p, { id, type, message }]);
        setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3800);
    }, []);
    const remove = useCallback((id: string) => setItems(p => p.filter(t => t.id !== id)), []);
    return { items, toast: { success: (m: string) => add('success', m), error: (m: string) => add('error', m), info: (m: string) => add('info', m) }, remove };
}

function ToastContainer({ items, remove }: { items: ToastItem[]; remove: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
            {items.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
                    style={{ background: t.type === 'success' ? 'rgba(34,197,94,0.13)' : t.type === 'error' ? 'rgba(239,68,68,0.13)' : 'rgba(255,255,255,0.08)', border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.28)' : t.type === 'error' ? 'rgba(239,68,68,0.28)' : 'rgba(255,255,255,0.13)'}`, color: t.type === 'success' ? '#4ade80' : t.type === 'error' ? '#f87171' : 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeUp 250ms ease forwards' }}>
                    {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span className="text-[12px] font-medium">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="ml-1 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Small shared components
// ─────────────────────────────────────────────────────────────────────────────
function TierBadge({ tier, size = 'sm' }: { tier: LoyaltyTier; size?: 'sm' | 'md' }) {
    const cfg = LOYALTY_TIERS[tier];
    return (
        <span className={`inline-flex items-center gap-1 font-bold rounded-lg whitespace-nowrap ${size === 'md' ? 'text-[11px] px-3 py-1.5' : 'text-[9px] px-2 py-0.5'}`}
            style={{ background: cfg?.bg || '#333', color: cfg?.color || '#fff', border: `1px solid ${cfg?.border || '#444'}` }}>
            {tier}
        </span>
    );
}

function StatusBadge({ status, size = 'sm' }: { status: CustomerStatus; size?: 'sm' | 'md' }) {
    const cfg = STATUS_CFG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 font-semibold rounded-lg whitespace-nowrap ${size === 'md' ? 'text-[11px] px-3 py-1.5' : 'text-[10px] px-2.5 py-1'}`}
            style={{ background: cfg?.bg || '#333', color: cfg?.color || '#fff' }}>
            {status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : status === 'Blocked' ? <UserX className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {status}
        </span>
    );
}

function AvatarCircle({ initials, size = 40, tier }: { initials: string; size?: number; tier: LoyaltyTier }) {
    const cfg = LOYALTY_TIERS[tier];
    return (
        <div className="rounded-full flex items-center justify-center font-bold shrink-0 text-white"
            style={{ width: size, height: size, fontSize: size * 0.35, background: `${cfg?.color || '#fff'}22`, border: `2px solid ${cfg?.color || '#fff'}50`, color: cfg?.color || '#fff' }}>
            {initials}
        </div>
    );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">{label}</p>
            <p className="text-[22px] font-bold" style={{ fontFamily: "'Georgia',serif", color: color ?? '#fff' }}>{value}</p>
            {sub && <p className="text-white/28 text-[10px] mt-0.5">{sub}</p>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerDrawer
// ─────────────────────────────────────────────────────────────────────────────
function CustomerDrawer({ customer: initial, currentUser, onUpdate, onClose }: {
    customer: Customer; currentUser: AuthUser;
    onUpdate: (c: Customer) => void; onClose: () => void;
}) {
    const [customer, setCustomer] = useState<Customer>(initial);
    const [tab, setTab] = useState<DrawerTab>('overview');
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: initial.firstName, lastName: initial.lastName, phone: initial.phone, altPhone: initial.altPhone ?? '', gender: initial.gender ?? '', dob: initial.dob ?? '' });
    const [noteText, setNoteText] = useState('');
    const [addingNote, setAddingNote] = useState(false);
    const [copied, setCopied] = useState('');
    const [blockReason, setBlockReason] = useState('');
    const [showBlock, setShowBlock] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [showTagMenu, setShowTagMenu] = useState(false);

    const copy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopied(key); setTimeout(() => setCopied(''), 1600);
    };

    const saveEdit = async () => {
        setSaving(true);
        try {
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, ...editForm })
            });
            const updated = { ...customer, ...editForm };
            setCustomer(updated);
            onUpdate(updated);
            setEditing(false);
        } catch { }
        setSaving(false);
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setSaving(true);
        try {
            const newNote = { id: uid(), text: noteText.trim(), createdBy: currentUser.id, createdByName: currentUser.name, createdAt: new Date().toISOString(), isPinned: false };
            const newNotes = [newNote, ...(customer.notes || [])];

            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, notes: newNotes })
            });

            const updated = { ...customer, notes: newNotes };
            setCustomer(updated);
            onUpdate(updated);
            setNoteText('');
            setAddingNote(false);
        } catch { }
        setSaving(false);
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            const newNotes = customer.notes.filter(n => n.id !== noteId);
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, notes: newNotes })
            });
            const updated = { ...customer, notes: newNotes };
            setCustomer(updated); onUpdate(updated);
        } catch { }
    };

    const handlePinNote = async (noteId: string, pinned: boolean) => {
        try {
            const newNotes = customer.notes.map(n => n.id === noteId ? { ...n, isPinned: pinned } : n);
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, notes: newNotes })
            });
            const updated = { ...customer, notes: newNotes };
            setCustomer(updated); onUpdate(updated);
        } catch { }
    };

    const handleBlock = async () => {
        try {
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, status: 'Blocked', blockReason })
            });
            const updated = { ...customer, status: 'Blocked' as CustomerStatus };
            setCustomer(updated); onUpdate(updated);
            setShowBlock(false); setBlockReason('');
        } catch { }
    };

    const handleUnblock = async () => {
        try {
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, status: 'Active' })
            });
            const updated = { ...customer, status: 'Active' as CustomerStatus };
            setCustomer(updated); onUpdate(updated);
        } catch { }
    };

    const handleTierChange = async (tier: LoyaltyTier) => {
        try {
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, loyaltyTier: tier })
            });
            const updated = { ...customer, loyaltyTier: tier };
            setCustomer(updated); onUpdate(updated);
        } catch { }
    };

    const handleAddTag = async (tag: string) => {
        if (customer.tags?.includes(tag)) return;
        try {
            const newTags = [...(customer.tags || []), tag];
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, tags: newTags })
            });
            const updated = { ...customer, tags: newTags };
            setCustomer(updated); onUpdate(updated);
            setShowTagMenu(false);
        } catch { }
    };

    const handleRemoveTag = async (tag: string) => {
        try {
            const newTags = customer.tags.filter(t => t !== tag);
            await authFetch(`${API_URL}/api/admin/customers`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customer.id, tags: newTags })
            });
            const updated = { ...customer, tags: newTags };
            setCustomer(updated); onUpdate(updated);
        } catch { }
    };

    const sortedNotes = useMemo(() => [...(customer.notes || [])].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt.localeCompare(a.createdAt)), [customer.notes]);

    const TABS: { id: DrawerTab; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'orders', label: 'Orders', count: customer.totalOrders },
        { id: 'activity', label: 'Activity', count: customer.activity?.length || 0 },
        { id: 'notes', label: 'Notes', count: customer.notes?.length || 0 },
    ];

    return (
        <>
            <div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
            <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
                style={{ width: 'min(680px,100vw)', background: '#111', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-40px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 260ms cubic-bezier(0.32,0.72,0,1) forwards' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
                        <AvatarCircle initials={customer.avatar} size={40} tier={customer.loyaltyTier} />
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-white font-bold text-[16px]" style={{ fontFamily: "'Georgia',serif" }}>{customer.firstName} {customer.lastName}</h2>
                                {customer.status === 'Blocked' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                            </div>
                            <p className="text-white/30 text-[10px] font-mono">{customer.id} · Joined {fmtDate(customer.createdAt)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <TierBadge tier={customer.loyaltyTier} size="md" />
                        <StatusBadge status={customer.status} size="md" />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-3 border-b shrink-0 overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', scrollbarWidth: 'none' }}>
                    {TABS.map(t => (
                        <button key={t.id} type="button" onClick={() => setTab(t.id)}
                            className="flex items-center gap-1.5 pb-3 px-1 mr-6 text-[11px] font-semibold whitespace-nowrap transition-all border-b-2 shrink-0"
                            style={{ color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.3)', borderColor: tab === t.id ? '#fff' : 'transparent' }}>
                            {t.label}
                            {t.count != null && t.count > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>{t.count}</span>}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ scrollbarWidth: 'none' }}>

                    {/* ── OVERVIEW ── */}
                    {tab === 'overview' && (
                        <>
                            {/* Spend stats */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatCard label="Total Spend" value={fmtMoney(customer.totalSpend)} color={LOYALTY_TIERS[customer.loyaltyTier]?.color} />
                                <StatCard label="Orders" value={customer.totalOrders} sub={`${customer.cancelledOrders} cancelled`} />
                                <StatCard label="Loyalty Points" value={customer.loyaltyPoints?.toLocaleString('en-IN') || 0} sub={customer.loyaltyTier} />
                            </div>

                            {/* Contact info */}
                            <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center justify-between">
                                    <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold">Contact</p>
                                    {!editing && (
                                        <button type="button" onClick={() => setEditing(true)}
                                            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                                            <Edit3 className="w-3 h-3" /> Edit
                                        </button>
                                    )}
                                </div>
                                {editing ? (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            {[['First Name', 'firstName'], ['Last Name', 'lastName']].map(([lbl, key]) => (
                                                <div key={key}>
                                                    <label className="text-white/30 text-[9px] uppercase tracking-wider block mb-1">{lbl}</label>
                                                    <input value={(editForm as Record<string, string>)[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                                                        className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/20"
                                                        style={{ background: 'rgba(255,255,255,0.06)' }} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-white/30 text-[9px] uppercase tracking-wider block mb-1">Phone</label>
                                                <input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
                                                    className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none border border-white/[0.09]"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            </div>
                                            <div>
                                                <label className="text-white/30 text-[9px] uppercase tracking-wider block mb-1">Alt Phone</label>
                                                <input value={editForm.altPhone} onChange={e => setEditForm(p => ({ ...p, altPhone: e.target.value }))}
                                                    className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none border border-white/[0.09]"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-white/30 text-[9px] uppercase tracking-wider block mb-1">Gender</label>
                                                <select value={editForm.gender} onChange={e => setEditForm(p => ({ ...p, gender: e.target.value }))}
                                                    className="w-full appearance-none px-3 py-2 rounded-xl text-[12px] text-white outline-none border border-white/[0.09]"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                    <option value="">—</option>
                                                    {['Female', 'Male', 'Other', 'Prefer not to say'].map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-white/30 text-[9px] uppercase tracking-wider block mb-1">Date of Birth</label>
                                                <input type="date" value={editForm.dob} onChange={e => setEditForm(p => ({ ...p, dob: e.target.value }))}
                                                    className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none border border-white/[0.09]"
                                                    style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button type="button" onClick={() => setEditing(false)} className="px-4 py-2 rounded-xl text-[11px] font-semibold text-white/40 hover:text-white transition-colors">Cancel</button>
                                            <button type="button" onClick={saveEdit} disabled={saving}
                                                className="flex-1 py-2 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-60">
                                                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {saving ? 'Saving…' : 'Save'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {[
                                            { icon: <Mail className="w-3.5 h-3.5" />, label: 'Email', val: customer.email, key: 'email' },
                                            { icon: <Phone className="w-3.5 h-3.5" />, label: 'Phone', val: customer.phone, key: 'phone' },
                                            ...(customer.altPhone ? [{ icon: <Phone className="w-3.5 h-3.5" />, label: 'Alt Phone', val: customer.altPhone, key: 'altphone' }] : []),
                                        ].map(row => (
                                            <div key={row.key} className="flex items-center gap-3">
                                                <span className="text-white/30 shrink-0">{row.icon}</span>
                                                <span className="text-white/65 text-[12px] flex-1">{row.val}</span>
                                                <button type="button" onClick={() => copy(row.val, row.key)} className="text-white/20 hover:text-white/55 transition-colors shrink-0">
                                                    {copied === row.key ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        ))}
                                        {(customer.gender || customer.dob) && (
                                            <div className="flex items-center gap-3 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                {customer.gender && <span className="text-white/40 text-[11px]">{customer.gender}</span>}
                                                {customer.dob && <span className="text-white/40 text-[11px]">{fmtDate(customer.dob)}</span>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Address */}
                            {(customer.addresses && customer.addresses.length > 0) && (
                                <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold mb-3">Address</p>
                                    {customer.addresses.map(addr => (
                                        <div key={addr.id} className="flex gap-3 mb-3 last:mb-0">
                                            <MapPin className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-white/55 text-[11px] font-medium">{addr.label}</span>
                                                    {addr.isDefault && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Default</span>}
                                                </div>
                                                <p className="text-white/40 text-[11px] leading-relaxed">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}, {addr.state} — <span className="font-mono font-semibold text-white/60">{addr.pincode}</span></p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Account meta */}
                            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold mb-3">Account Details</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Source', val: customer.source },
                                        { label: 'Last Active', val: fmtRelative(customer.lastActiveAt) },
                                        { label: 'Wishlist', val: `${customer.wishlistCount} items` },
                                        { label: 'Reviews', val: `${customer.reviewCount} posted` },
                                        { label: 'Coupons Used', val: customer.couponUsageCount },
                                        ...(customer.referralCode ? [{ label: 'Referral Code', val: customer.referralCode }] : []),
                                    ].map(r => (
                                        <div key={r.label}>
                                            <p className="text-white/25 text-[9px] uppercase tracking-wider">{r.label}</p>
                                            <p className="text-white/60 text-[12px] font-medium mt-0.5">{r.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold">Tags</p>
                                    <div className="relative">
                                        <button type="button" onClick={() => setShowTagMenu(s => !s)}
                                            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                                            <Plus className="w-3 h-3" /> Add Tag
                                        </button>
                                        {showTagMenu && (
                                            <div className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-50 min-w-[170px]"
                                                style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
                                                {CUSTOMER_TAGS.filter(t => !(customer.tags || []).includes(t)).map(tag => (
                                                    <button key={tag} type="button" onClick={() => handleAddTag(tag)}
                                                        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/55 hover:text-white text-[11px]">
                                                        <Tag className="w-3 h-3" /> {tag}
                                                    </button>
                                                ))}
                                                {CUSTOMER_TAGS.filter(t => !(customer.tags || []).includes(t)).length === 0 && <p className="text-white/25 text-[11px] px-4 py-3">All tags applied</p>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(customer.tags || []).length > 0 ? (customer.tags || []).map(tag => (
                                        <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-semibold group/tag"
                                            style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
                                            {tag}
                                            <button type="button" onClick={() => handleRemoveTag(tag)} className="opacity-0 group-hover/tag:opacity-100 transition-opacity hover:text-red-400">
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </span>
                                    )) : <p className="text-white/20 text-[11px]">No tags assigned</p>}
                                </div>
                            </div>

                            {/* Tier management */}
                            {PERMS.changeTier() && (
                                <div className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <p className="text-white/30 text-[9px] uppercase tracking-widest font-semibold mb-3">Loyalty Tier</p>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['Bronze', 'Silver', 'Gold', 'Platinum'] as LoyaltyTier[]).map(t => {
                                            const cfg = LOYALTY_TIERS[t]; const sel = customer.loyaltyTier === t;
                                            return (
                                                <button key={t} type="button" onClick={() => handleTierChange(t)}
                                                    className="py-2.5 rounded-xl text-[10px] font-bold transition-all"
                                                    style={{ background: sel ? cfg.bg : 'rgba(255,255,255,0.04)', color: sel ? cfg.color : 'rgba(255,255,255,0.3)', border: `1px solid ${sel ? cfg.border : 'rgba(255,255,255,0.07)'}`, transform: sel ? 'scale(1.03)' : 'scale(1)' }}>
                                                    {t}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="text-white/20 text-[9px] mt-2">Points: {customer.loyaltyPoints?.toLocaleString('en-IN') || 0} · Min spend thresholds: Bronze ₹0 · Silver ₹5k · Gold ₹20k · Platinum ₹50k</p>
                                </div>
                            )}

                            {/* Block/Unblock */}
                            {PERMS.blockUnblock() && (
                                <div>
                                    {customer.status === 'Blocked' ? (
                                        <button type="button" onClick={handleUnblock}
                                            className="w-full py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                            style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.25)' }}>
                                            <UserCheck className="w-4 h-4" /> Unblock Customer
                                        </button>
                                    ) : showBlock ? (
                                        <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                                            <p className="text-red-400/80 text-[12px] font-semibold">Block this customer?</p>
                                            <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="Reason (optional)"
                                                className="w-full px-3 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.09] placeholder:text-white/20"
                                                style={{ background: 'rgba(255,255,255,0.06)' }} />
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setShowBlock(false)} className="flex-1 py-2 rounded-xl text-[11px] font-semibold text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                                                <button type="button" onClick={handleBlock} className="flex-1 py-2 rounded-xl text-[12px] font-bold text-white transition-all" style={{ background: 'rgba(220,38,38,0.72)' }}>Confirm Block</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button type="button" onClick={() => setShowBlock(true)}
                                            className="w-full py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                            style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <UserX className="w-4 h-4" /> Block Customer
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* ── ORDERS ── */}
                    {tab === 'orders' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3 mb-5">
                                <StatCard label="Orders" value={customer.totalOrders} />
                                <StatCard label="Delivered" value={(customer.orders || []).filter(o => o.status === 'Delivered').length} color="#22c55e" />
                                <StatCard label="Cancelled" value={customer.cancelledOrders} color="#ef4444" />
                            </div>
                            {(!customer.orders || customer.orders.length === 0) ? (
                                <div className="py-16 flex flex-col items-center gap-3">
                                    <ShoppingBag className="w-8 h-8 text-white/10" />
                                    <p className="text-white/25 text-[12px]">No orders yet</p>
                                </div>
                            ) : customer.orders.map(order => {
                                const cfg = ORDER_STATUS_CFG[order.status] ?? ORDER_STATUS_CFG.Pending;
                                return (
                                    <div key={order.id} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-white/70 font-mono text-[11px] font-semibold">{order.id}</span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{order.status}</span>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold text-[13px]">{fmtMoney(order.total)}</p>
                                                <p className="text-white/28 text-[10px]">{fmtDate(order.date)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-white/40 text-[11px] truncate">{order.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</p>
                                            <span className="text-white/30 text-[10px] ml-3 shrink-0">{order.paymentMode}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── ACTIVITY ── */}
                    {tab === 'activity' && (
                        <div className="space-y-1">
                            {(!customer.activity || customer.activity.length === 0) ? (
                                <div className="py-16 flex flex-col items-center gap-3">
                                    <Activity className="w-8 h-8 text-white/10" />
                                    <p className="text-white/25 text-[12px]">No recent activity</p>
                                </div>
                            ) : customer.activity.map((event, i) => {
                                const ai = ACTIVITY_ICONS[event.type] ?? { icon: <Activity className="w-3.5 h-3.5" />, color: '#94a3b8' };
                                const isLast = i === customer.activity.length - 1;
                                return (
                                    <div key={event.id} className="flex gap-3">
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ background: `${ai.color}15`, color: ai.color }}>{ai.icon}</div>
                                            {!isLast && <div className="w-px flex-1 my-1" style={{ background: 'rgba(255,255,255,0.06)', minHeight: '16px' }} />}
                                        </div>
                                        <div className="pb-4 flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-white/65 text-[12px] font-medium">{event.label}</p>
                                                <p className="text-white/25 text-[10px] shrink-0">{fmtRelative(event.timestamp)}</p>
                                            </div>
                                            {event.detail && <p className="text-white/35 text-[11px] mt-0.5">{event.detail}</p>}
                                            {event.actor && <p className="text-white/22 text-[10px] mt-0.5">by {event.actor}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ── NOTES ── */}
                    {tab === 'notes' && (
                        <div className="space-y-3">
                            {/* Add note */}
                            {!addingNote ? (
                                <button type="button" onClick={() => setAddingNote(true)}
                                    className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-[11px] font-medium text-white/40 hover:text-white/70 hover:bg-white/4 transition-all"
                                    style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <MessageSquare className="w-4 h-4" /> Add internal note…
                                </button>
                            ) : (
                                <div className="p-4 rounded-2xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} autoFocus
                                        placeholder="Write an internal note about this customer…"
                                        className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/20 resize-none"
                                        style={{ background: 'rgba(255,255,255,0.05)' }} />
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => { setAddingNote(false); setNoteText(''); }} className="px-4 py-2 rounded-xl text-[11px] font-semibold text-white/38 hover:text-white transition-colors">Cancel</button>
                                        <button type="button" onClick={handleAddNote} disabled={!noteText.trim() || saving}
                                            className="flex-1 py-2 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} {saving ? 'Saving…' : 'Save Note'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {sortedNotes.length === 0 ? (
                                <div className="py-14 flex flex-col items-center gap-3">
                                    <MessageSquare className="w-7 h-7 text-white/10" />
                                    <p className="text-white/22 text-[12px]">No notes yet</p>
                                </div>
                            ) : sortedNotes.map(note => (
                                <div key={note.id} className="p-4 rounded-2xl group/note" style={{ background: note.isPinned ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.03)', border: `1px solid ${note.isPinned ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.06)'}` }}>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            {note.isPinned && <Pin className="w-3 h-3 text-amber-400" />}
                                            <span className="text-white/45 text-[10px] font-medium">{note.createdByName}</span>
                                            <span className="text-white/20 text-[10px]">{fmtRelative(note.createdAt)}</span>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => handlePinNote(note.id, !note.isPinned)}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg text-white/25 hover:text-amber-400 hover:bg-amber-400/10 transition-all" title={note.isPinned ? 'Unpin' : 'Pin'}>
                                                {note.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                            </button>
                                            <button type="button" onClick={() => handleDeleteNote(note.id)}
                                                className="w-6 h-6 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-white/60 text-[12px] leading-relaxed">{note.text}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer — close / quick actions */}
                <div className="px-6 py-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
                    <button type="button" onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors">
                        Close
                    </button>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => copy(customer.email, 'footer-email')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/50 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Mail className="w-3.5 h-3.5" />
                            {copied === 'footer-email' ? 'Copied!' : 'Copy Email'}
                        </button>
                        <button type="button" onClick={() => copy(customer.phone, 'footer-phone')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/50 hover:text-white transition-all"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Phone className="w-3.5 h-3.5" />
                            {copied === 'footer-phone' ? 'Copied!' : 'Copy Phone'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

function CustomerCard({ customer, isSelected, onSelect, onClick, onDelete }: {
    customer: Customer; isSelected: boolean;
    onSelect: () => void; onClick: () => void; onDelete: () => void;
}) {
    return (
        <div className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-150 hover:-translate-y-0.5"
            style={{ border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`, background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(18,18,18,0.9)', animation: 'fadeUp 0.28s ease forwards' }}
            onClick={onClick}>
            {/* Top colour strip by tier */}
            <div className="h-1" style={{ background: LOYALTY_TIERS[customer.loyaltyTier]?.color || '#fff', opacity: 0.6 }} />
            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {PERMS.bulkActions() && (
                            <div onClick={e => { e.stopPropagation(); onSelect(); }}
                                className="w-4 h-4 rounded flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shrink-0 absolute top-4 left-4"
                                style={{ background: isSelected ? '#fff' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                            </div>
                        )}
                        <AvatarCircle initials={customer.avatar} size={40} tier={customer.loyaltyTier} />
                        <div>
                            <p className="text-white/85 text-[13px] font-semibold leading-tight">{customer.firstName} {customer.lastName}</p>
                            <p className="text-white/28 text-[10px] font-mono">{customer.id}</p>
                        </div>
                    </div>
                    <StatusBadge status={customer.status} />
                </div>
                <p className="text-white/40 text-[11px] truncate mb-3">{customer.email}</p>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {[
                        { label: 'Spend', val: fmtMoney(customer.totalSpend) },
                        { label: 'Orders', val: customer.totalOrders },
                        { label: 'Points', val: customer.loyaltyPoints?.toLocaleString() || 0 },
                    ].map(s => (
                        <div key={s.label} className="text-center">
                            <p className="text-white/70 text-[11px] font-bold">{s.val}</p>
                            <p className="text-white/25 text-[9px]">{s.label}</p>
                        </div>
                    ))}
                </div>
                {/* Tags + tier */}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-1 flex-wrap">
                        {(customer.tags || []).slice(0, 2).map(t => (
                            <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>{t}</span>
                        ))}
                        {(customer.tags || []).length > 2 && <span className="text-[8px] text-white/25">+{(customer.tags || []).length - 2}</span>}
                    </div>
                    <TierBadge tier={customer.loyaltyTier} />
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// BulkActionBar
// ─────────────────────────────────────────────────────────────────────────────
function BulkActionBar({ count, onStatus, onTag, onDelete, onClear }: {
    count: number;
    onStatus: (s: CustomerStatus) => void;
    onTag: (t: string) => void;
    onDelete: () => void;
    onClear: () => void;
}) {
    const [openStatus, setOpenStatus] = useState(false);
    const [openTag, setOpenTag] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpenStatus(false); setOpenTag(false); } };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div ref={ref} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', animation: 'fadeUp 200ms ease forwards' }}>
            <span className="text-white font-bold text-[13px]">{count}</span>
            <span className="text-white/40 text-[12px]">selected</span>
            <div className="w-px h-5 bg-white/10 mx-1" />
            {/* Status */}
            <div className="relative">
                <button type="button" onClick={() => { setOpenStatus(s => !s); setOpenTag(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/65 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <Zap className="w-3.5 h-3.5" /> Set Status <ChevronDown className={`w-3 h-3 transition-transform ${openStatus ? 'rotate-180' : ''}`} />
                </button>
                {openStatus && (
                    <div className="absolute bottom-[120%] mb-2 left-0 rounded-xl overflow-hidden min-w-[160px]"
                        style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 40px rgba(0,0,0,0.7)' }}>
                        {(['Active', 'Blocked', 'Pending'] as CustomerStatus[]).map(s => {
                            const cfg = STATUS_CFG[s];
                            return <button key={s} type="button" onClick={() => { onStatus(s); setOpenStatus(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/65 hover:text-white text-[11px]">
                                <span style={{ color: cfg.color }}>{s === 'Active' ? '●' : s === 'Blocked' ? '⊘' : '◉'}</span> {s}
                            </button>;
                        })}
                    </div>
                )}
            </div>
            {/* Tag */}
            <div className="relative">
                <button type="button" onClick={() => { setOpenTag(s => !s); setOpenStatus(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/65 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <Tag className="w-3.5 h-3.5" /> Add Tag <ChevronDown className={`w-3 h-3 transition-transform ${openTag ? 'rotate-180' : ''}`} />
                </button>
                {openTag && (
                    <div className="absolute bottom-[120%] mb-2 left-0 rounded-xl overflow-hidden min-w-[170px] max-h-60 overflow-y-auto"
                        style={{ background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 10px 40px rgba(0,0,0,0.7)' }}>
                        {CUSTOMER_TAGS.map(t => (
                            <button key={t} type="button" onClick={() => { onTag(t); setOpenTag(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/60 hover:text-white text-[11px]">
                                <Tag className="w-3 h-3" /> {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button type="button" onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
                style={{ background: 'rgba(239,68,68,0.13)', color: '#f87171' }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button type="button" onClick={onClear} className="text-white/28 hover:text-white/60 transition-colors ml-1">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCustomersPage() {
    const { items: toastItems, toast, remove: removeToast } = useToast();

    const { currentUser, isMounted, handleLogout } = useAdminAuth();

    if (!isMounted || !currentUser) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0e' }}>
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
    );

    return <CustomersView currentUser={currentUser} onLogout={handleLogout} toast={toast} toastItems={toastItems} removeToast={removeToast} />;
}

function CustomersView({ currentUser, onLogout, toast, toastItems, removeToast }: {
    currentUser: AuthUser; onLogout: () => void;
    toast: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
    toastItems: ToastItem[]; removeToast: (id: string) => void;
}) {
    // Data
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [total, setTotal] = useState(0);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [tierCounts, setTierCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState<{ total: number; active: number; blocked: number; pending: number; newThisMonth: number; totalRevenue: number; avgLTV: number; tierBreakdown: Record<string, number>; topSpenders: { id: string; name: string; spend: number; tier: LoyaltyTier }[] } | null>(null);

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterTier, setFilterTier] = useState('All');
    const [filterTag, setFilterTag] = useState('All');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [showFilters, setShowFilters] = useState(false);
    const PAGE_SIZE = viewMode === 'grid' ? 12 : 15;

    // UI state
    const [drawer, setDrawer] = useState<Customer | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

    // Debounced search
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [debSearch, setDebSearch] = useState('');
    useEffect(() => { clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => setDebSearch(search), 360); }, [search]);

    // 🔥 API Replaced: Fetch Data (Silent catch prevents flickering toast loops)
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const qs = new URLSearchParams({ search: debSearch, status: filterStatus, tier: filterTier, tag: filterTag, sortBy, page: String(page), pageSize: String(PAGE_SIZE) });
            const res = await authFetch(`${API_URL}/api/admin/customers?${qs}`);

            if (res.ok) {
                const json = await res.json();
                setCustomers(json.customers || []);
                setTotal(json.total || 0);
                setStatusCounts(json.statusCounts || {});
                setTierCounts(json.tierCounts || {});
                setStats(json.stats || null);
            }
        } catch (error) {
            console.error("Silent API error:", error);
        }
        finally { setLoading(false); setRefreshing(false); }
    }, [debSearch, filterStatus, filterTier, filterTag, sortBy, page, PAGE_SIZE]);

    useEffect(() => { fetchData(); }, [fetchData]);
    useEffect(() => { setPage(1); }, [debSearch, filterStatus, filterTier, filterTag, sortBy]);

    // 🔥 API Replaced: Handlers
    const handleDelete = useCallback(async (c: Customer) => {
        try {
            await authFetch(`${API_URL}/api/admin/customers/${c.id}`, { method: 'DELETE' });

            setCustomers(prev => prev.filter(cust => cust.id !== c.id));
            toast.success(`${c.firstName} ${c.lastName} deleted.`);
            setDeleteTarget(null);
            if (drawer?.id === c.id) setDrawer(null);
        } catch { toast.error('Delete failed.'); }
    }, [drawer, toast]);

    const handleBulkStatus = useCallback(async (status: CustomerStatus) => {
        try {
            await Promise.all(Array.from(selected).map(id =>
                authFetch(`${API_URL}/api/admin/customers`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
            ));

            toast.success(`${selected.size} customers set to ${status}.`);
            setSelected(new Set());
            fetchData(true);
        } catch { toast.error('Bulk update failed.'); }
    }, [selected, fetchData, toast]);

    const handleBulkTag = useCallback(async (tag: string) => {
        try {
            await Promise.all(Array.from(selected).map(id => {
                const existing = customers.find(c => c.id === id);
                const newTags = Array.from(new Set([...(existing?.tags || []), tag]));
                return authFetch(`${API_URL}/api/admin/customers`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tags: newTags }) });
            }));
            toast.success(`Tag "${tag}" added to ${selected.size} customers.`);
            setSelected(new Set());
            fetchData(true);
        } catch { toast.error('Bulk tag failed.'); }
    }, [selected, customers, fetchData, toast]);

    const handleBulkDelete = useCallback(async () => {
        const ids = Array.from(selected);
        const results = await Promise.allSettled(
            ids.map(id =>
                authFetch(`${API_URL}/api/admin/customers/${id}`, { method: 'DELETE' }).then(res => { if (!res.ok) throw new Error(id); return id; })
            )
        );
        const succeeded = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value);
        const failCount  = results.filter(r => r.status === 'rejected').length;

        if (succeeded.length > 0) {
            setCustomers(prev => prev.filter(c => !succeeded.includes(c.id)));
            setSelected(new Set(ids.filter(id => !succeeded.includes(id))));
        }
        if (failCount > 0) toast.error(`${failCount} customer${failCount > 1 ? 's' : ''} could not be deleted.`);
        if (succeeded.length > 0) toast.success(`${succeeded.length} customer${succeeded.length > 1 ? 's' : ''} deleted.`);
    }, [selected, toast]);

    const handleExport = useCallback(() => {
        const csv = ['ID,Name,Email,Phone,Status,Tier,Orders,Total Spend,LTV,Joined',
            ...customers.map(c => `${c.id},"${c.firstName} ${c.lastName}",${c.email},${c.phone},${c.status},${c.loyaltyTier},${c.totalOrders},${c.totalSpend},${c.avgOrderValue},${fmtDate(c.createdAt)}`)
        ].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `aarah-customers-${Date.now()}.csv`; a.click();
        toast.success('Export ready.');
    }, [customers, toast]);

    const handleUpdate = useCallback((updated: Customer) => {
        setCustomers(p => p.map(c => c.id === updated.id ? updated : c));
        if (drawer?.id === updated.id) setDrawer(updated);
    }, [drawer]);

    const toggleOne = (id: string) => { if (!PERMS.bulkActions()) return; setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    const toggleAll = () => { if (!PERMS.bulkActions()) return; setSelected(s => s.size === customers.length ? new Set() : new Set(customers.map(c => c.id))); };

    const totalPages = Math.ceil(total / PAGE_SIZE);
    const activeFilters = [filterStatus !== 'All', filterTier !== 'All', filterTag !== 'All'].filter(Boolean).length;

    return (
        <div className="min-h-screen" style={{ background: '#0e0e0e', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}::-webkit-scrollbar{width:0;height:0}select option{background:#1a1a1a}`}</style>

            {/* ── Top bar ── */}
            <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(14,14,14,0.97)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
                <div className="flex flex-col md:flex-row md:items-center gap-3 px-6 md:px-8 py-3">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Users className="w-4 h-4 text-white/55" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-[16px] tracking-tight leading-none" style={{ fontFamily: "'Georgia',serif" }}>Customer Manager</h1>
                            <p className="text-white/25 text-[10px] mt-0.5 tracking-widest uppercase">{total.toLocaleString()} Customers · {(statusCounts['Active'] ?? 0).toLocaleString()} Active</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 md:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, email, phone, ID…"
                                className="w-full pl-10 pr-4 py-2 rounded-xl text-[11px] text-white placeholder:text-white/18 outline-none border border-white/[0.08] focus:border-white/20 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)' }} />
                            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"><X className="w-3.5 h-3.5" /></button>}
                        </div>
                        <button type="button" onClick={() => setShowFilters(f => !f)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all"
                            style={{ background: activeFilters > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', borderColor: activeFilters > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)', color: activeFilters > 0 ? '#fff' : 'rgba(255,255,255,0.5)' }}>
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {activeFilters > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-white text-black">{activeFilters}</span>}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto shrink-0">
                        <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/[0.08]">
                            <button type="button" onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30'}`}><List className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/30'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                        </div>
                        <button type="button" onClick={() => fetchData(true)} disabled={refreshing}
                            className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                        {PERMS.export() && (
                            <button type="button" onClick={handleExport}
                                className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)' }} title="Export CSV">
                                <Download className="w-4 h-4" />
                            </button>
                        )}
                        {/* User + logout */}
                        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                                    {currentUser.avatar}
                                </div>
                                <span className="text-white/55 text-[11px] font-medium hidden md:block">{currentUser.name.split(' ')[0]}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.38)' }}><Shield className="w-2.5 h-2.5 inline mr-0.5" />ADMIN</span>
                            </div>
                            <button type="button" onClick={onLogout}
                                className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5 transition-all"
                                style={{ background: 'rgba(255,255,255,0.03)' }} title="Logout">
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter row */}
                {showFilters && (
                    <div className="px-6 md:px-8 py-3 border-t flex flex-wrap items-center gap-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                        {[
                            { val: filterStatus, set: setFilterStatus, opts: [{ v: 'All', l: 'All Statuses' }, { v: 'Active', l: 'Active' }, { v: 'Blocked', l: 'Blocked' }, { v: 'Pending', l: 'Pending' }] },
                            { val: filterTier, set: setFilterTier, opts: [{ v: 'All', l: 'All Tiers' }, { v: 'Bronze', l: 'Bronze' }, { v: 'Silver', l: 'Silver' }, { v: 'Gold', l: 'Gold' }, { v: 'Platinum', l: 'Platinum' }] },
                            { val: filterTag, set: setFilterTag, opts: [{ v: 'All', l: 'All Tags' }, ...CUSTOMER_TAGS.map(t => ({ v: t, l: t }))] },
                            { val: sortBy, set: setSortBy, opts: [{ v: 'newest', l: 'Newest' }, { v: 'oldest', l: 'Oldest' }, { v: 'spend_hi', l: 'Spend ↓' }, { v: 'spend_lo', l: 'Spend ↑' }, { v: 'orders_hi', l: 'Most Orders' }, { v: 'name_az', l: 'Name A–Z' }, { v: 'recent', l: 'Recently Active' }] },
                        ].map((f, i) => (
                            <div key={i} className="relative">
                                <select value={f.val} onChange={e => f.set(e.target.value)} className="appearance-none pl-3 pr-7 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.08] cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                            </div>
                        ))}
                        {activeFilters > 0 && <button type="button" onClick={() => { setFilterStatus('All'); setFilterTier('All'); setFilterTag('All'); }} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"><X className="w-3 h-3" /> Clear</button>}
                    </div>
                )}
            </div>

            {/* ── Stats strip ── */}
            <div className="flex border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}>
                {[
                    { label: 'Total', val: stats?.total ?? '—', color: undefined },
                    { label: 'Active', val: stats?.active ?? '—', color: '#22c55e' },
                    { label: 'Blocked', val: stats?.blocked ?? '—', color: '#ef4444' },
                    { label: 'New This Month', val: stats?.newThisMonth ?? '—', color: '#60a5fa' },
                    { label: 'Total Revenue', val: stats ? fmtMoney(stats.totalRevenue) : '—', color: '#fbbf24' },
                    { label: 'Avg. LTV', val: stats ? fmtMoney(stats.avgLTV) : '—', color: 'rgba(255,255,255,0.6)' },
                    { label: 'Platinum', val: stats?.tierBreakdown?.Platinum ?? '—', color: LOYALTY_TIERS.Platinum.color },
                    { label: 'Gold', val: stats?.tierBreakdown?.Gold ?? '—', color: LOYALTY_TIERS.Gold.color },
                ].map(s => (
                    <div key={s.label} className="flex-1 min-w-[100px] px-4 py-3 border-r shrink-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-white/22 text-[9px] uppercase tracking-widest">{s.label}</p>
                        <p className="text-[20px] font-bold mt-0.5" style={{ fontFamily: "'Georgia',serif", color: s.color ?? '#fff' }}>{s.val}</p>
                    </div>
                ))}
            </div>

            {/* ── Role notice ── */}
            <div className="flex items-center gap-2 px-6 md:px-8 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(96,165,250,0.03)' }}>
                <Shield className="w-3 h-3 text-blue-400/50 shrink-0" />
                <p className="text-[10px] text-white/25">Admin access: You have full access to view, edit, block/unblock, delete, manage tiers, bulk actions, and export.</p>
            </div>

            {/* ── Tier quick filter tabs ── */}
            <div className="flex gap-1 px-6 md:px-8 py-2.5 border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.05)', scrollbarWidth: 'none' }}>
                {[{ v: 'All', l: `All (${statusCounts['All'] ?? 0})` }, ...(['Bronze', 'Silver', 'Gold', 'Platinum'] as LoyaltyTier[]).map(t => ({ v: t, l: `${t} (${tierCounts[t] ?? 0})` }))].map(opt => {
                    const cfg = opt.v === 'All' ? null : LOYALTY_TIERS[opt.v as LoyaltyTier];
                    const active = filterTier === opt.v;
                    return (
                        <button key={opt.v} type="button" onClick={() => setFilterTier(opt.v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-semibold whitespace-nowrap transition-all shrink-0"
                            style={{ background: active ? (cfg ? cfg.bg : 'rgba(255,255,255,0.1)') : 'transparent', color: active ? (cfg ? cfg.color : '#fff') : 'rgba(255,255,255,0.3)', border: `1px solid ${active ? (cfg ? cfg.border : 'rgba(255,255,255,0.2)') : 'transparent'}` }}>
                            {opt.l}
                        </button>
                    );
                })}
            </div>

            {/* ── Content ── */}
            <div className="px-4 md:px-8 py-6">
                {loading ? (
                    <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 55}ms` }} />)}</div>
                ) : customers.length === 0 ? (
                    <div className="py-28 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}><Users className="w-8 h-8 text-white/10" /></div>
                        <p className="text-white/25 text-sm">No customers found</p>
                        <button type="button" onClick={() => { setSearch(''); setFilterStatus('All'); setFilterTier('All'); setFilterTag('All'); }} className="text-[11px] text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">Clear all filters</button>
                    </div>
                ) : viewMode === 'list' ? (
                    // ── LIST ──────────────────────────────────────────────────────────────────
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(20,20,20,0.9),rgba(16,16,16,0.95))' }}>
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {PERMS.bulkActions() && (
                                        <th className="px-5 py-4 w-10">
                                            <button type="button" onClick={toggleAll}
                                                className="w-4 h-4 rounded flex items-center justify-center transition-all"
                                                style={{ background: selected.size === customers.length && customers.length > 0 ? '#fff' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                                {selected.size === customers.length && customers.length > 0 ? <Check className="w-2.5 h-2.5 text-black" /> : selected.size > 0 ? <Minus className="w-2.5 h-2.5 text-white/60" /> : null}
                                            </button>
                                        </th>
                                    )}
                                    {['Customer', 'Contact', 'Status', 'Tier', 'Spend', 'Orders', 'Last Active', ''].map(h => (
                                        <th key={h} className="px-5 py-4 text-[9px] font-bold tracking-[0.18em] uppercase text-white/25 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map((c, i) => {
                                    const isSel = selected.has(c.id);
                                    return (
                                        <tr key={c.id} className="group cursor-pointer"
                                            style={{ borderBottom: i < customers.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', animation: `fadeUp 0.28s ease forwards ${i * 22}ms`, opacity: 0, background: isSel ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background 0.1s' }}
                                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => setDrawer(c)}>
                        {PERMS.bulkActions() && (
                                                <td className="px-5 py-3.5" onClick={e => { e.stopPropagation(); toggleOne(c.id); }}>
                                                    <div className="w-4 h-4 rounded flex items-center justify-center transition-all" style={{ background: isSel ? '#fff' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                                        {isSel && <Check className="w-2.5 h-2.5 text-black" />}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <AvatarCircle initials={c.avatar} size={34} tier={c.loyaltyTier} />
                                                    <div className="min-w-0">
                                                        <p className="text-white/85 text-[12px] font-semibold truncate max-w-[150px]">{c.firstName} {c.lastName}</p>
                                                        <p className="text-white/25 text-[10px] font-mono">{c.id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-white/50 text-[11px] truncate max-w-[180px]">{c.email}</p>
                                                <p className="text-white/28 text-[10px] mt-0.5">{c.phone}</p>
                                            </td>
                                            <td className="px-5 py-3.5"><StatusBadge status={c.status} /></td>
                                            <td className="px-5 py-3.5"><TierBadge tier={c.loyaltyTier} /></td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-white/75 text-[12px] font-semibold">{fmtMoney(c.totalSpend)}</p>
                                                <p className="text-white/25 text-[10px]">avg {fmtMoney(c.avgOrderValue)}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-white/55 text-[12px] font-semibold">{c.totalOrders}</td>
                                            <td className="px-5 py-3.5 text-white/30 text-[10px] whitespace-nowrap">{fmtRelative(c.lastActiveAt)}</td>
                                            <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setDrawer(c)}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/6 transition-all"><Eye className="w-3.5 h-3.5" /></button>
                                                    {PERMS.deleteCustomer() && (
                                                        <button type="button" onClick={() => setDeleteTarget(c)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <span className="text-white/28 text-[11px]">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total.toLocaleString()}</span>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i; return <button key={p} type="button" onClick={() => setPage(p)} className="w-8 h-8 rounded-lg text-[11px] font-semibold transition-all" style={{ background: p === page ? 'rgba(255,255,255,0.1)' : 'transparent', color: p === page ? '#fff' : 'rgba(255,255,255,0.3)' }}>{p}</button>; })}
                                    <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"><ChevronRight className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // ── GRID ──────────────────────────────────────────────────────────────────
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {customers.map((c, i) => (
                                <div key={c.id} style={{ animation: `fadeUp 0.28s ease forwards ${i * 25}ms`, opacity: 0 }}>
                                    <CustomerCard customer={c} isSelected={selected.has(c.id)}
                                        onSelect={() => toggleOne(c.id)} onClick={() => setDrawer(c)} onDelete={() => setDeleteTarget(c)} />
                                </div>
                            ))}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-1 mt-8">
                                <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronLeft className="w-4 h-4" /></button>
                                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => { const p = Math.max(1, Math.min(page - 3, totalPages - 6)) + i; return <button key={p} type="button" onClick={() => setPage(p)} className="w-8 h-8 rounded-lg text-[11px] font-semibold transition-all" style={{ background: p === page ? 'rgba(255,255,255,0.1)' : 'transparent', color: p === page ? '#fff' : 'rgba(255,255,255,0.3)' }}>{p}</button>; })}
                                <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Bulk bar ── */}
            {selected.size > 0 && PERMS.bulkActions() && (
                <BulkActionBar count={selected.size} onStatus={handleBulkStatus} onTag={handleBulkTag} onDelete={handleBulkDelete} onClear={() => setSelected(new Set())} />
            )}

            {/* ── Delete confirm ── */}
            {deleteTarget && (
                <>
                    <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setDeleteTarget(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[360px]" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}><Trash2 className="w-5 h-5 text-red-400" /></div>
                        <p className="text-white font-bold text-[15px] mb-1">Delete {deleteTarget.firstName} {deleteTarget.lastName}?</p>
                        <p className="text-white/38 text-[12px] leading-relaxed">This will permanently remove the customer account and all associated data. This cannot be undone.</p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                            <button type="button" onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.98]" style={{ background: 'rgba(220,38,38,0.72)' }}>Delete</button>
                        </div>
                    </div>
                </>
            )}

            {/* ── Drawer ── */}
            {drawer && (
                <CustomerDrawer
                    key={drawer.id}
                    customer={drawer}
                    currentUser={currentUser}
                    onUpdate={handleUpdate}
                    onClose={() => setDrawer(null)}
                />
            )}

            <ToastContainer items={toastItems} remove={removeToast} />
        </div>
    );
}