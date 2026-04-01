'use client';

import { API_URL } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import type { AdminUser } from '@/types';

type AuthUser = AdminUser;

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    User, Store, Users, Save, CheckCircle2, AlertCircle, X,
    RefreshCw, LogOut, Plus, Trash2, Shield
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

// ─── Toast System ─────────────────────────────────────────────────────────────
interface ToastItem { id: string; type: 'success' | 'error'; message: string }
function useToast() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const uidRef = useRef(0);
    const add = useCallback((type: ToastItem['type'], message: string) => {
        const id = String(++uidRef.current);
        setItems(p => [...p.slice(-4), { id, type, message }]);
        setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3800);
    }, []);
    const remove = useCallback((id: string) => setItems(p => p.filter(t => t.id !== id)), []);
    return { items, toast: { success: (m: string) => add('success', m), error: (m: string) => add('error', m) }, remove };
}

function ToastContainer({ items, remove }: { items: ToastItem[]; remove: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
            {items.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
                    style={{ background: t.type === 'success' ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)', border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}`, color: t.type === 'success' ? '#4ade80' : '#f87171', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeUp 250ms ease forwards' }}>
                    {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span className="text-[12px] font-medium">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="ml-1 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
                </div>
            ))}
        </div>
    );
}

// ─── UI Components ────────────────────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
    return <label className="text-white/40 text-[10px] uppercase tracking-widest font-semibold block mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder, disabled, type = 'text' }: any) {
    return (
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
            className={`w-full px-4 py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] transition-colors focus:border-white/20 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
            style={{ background: 'rgba(255,255,255,0.04)' }} />
    );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

// 1. Profile Settings (Available to ALL)
function ProfileSection({ currentUser, toast }: { currentUser: AuthUser, toast: any }) {
    const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '' });
    const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/admin/profile?id=${currentUser.id}`, { credentials: 'include' })
            .then(res => {
                if (res.status === 401) { window.location.href = '/admin/login'; return null; }
                if (!res.ok) throw new Error('Failed to load profile');
                return res.json();
            })
            .then(data => { if (data) { setForm(data); } setLoading(false); })
            .catch(() => setLoading(false));
    }, [currentUser.id]);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/profile`, {
        credentials: 'include', method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentUser.id, ...form }) });
            if (res.ok) toast.success('Profile updated.'); else throw new Error();
        } catch { toast.error('Failed to update profile.'); }
        setSaving(false);
    };

    const handleSavePassword = async () => {
        if (!pwForm.currentPassword || pwForm.newPassword.length < 8) { toast.error('New password must be at least 8 chars.'); return; }
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/profile/password`, {
        credentials: 'include', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: currentUser.id, ...pwForm }) });
            if (res.ok) { toast.success('Password changed.'); setPwForm({ currentPassword: '', newPassword: '' }); } else throw new Error();
        } catch { toast.error('Failed to change password. Check current password.'); }
        setSaving(false);
    };

    if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl" />;

    return (
        <div className="space-y-8">
            <div className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                <h3 className="text-white font-semibold text-[15px] mb-5">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><FieldLabel>First Name</FieldLabel><TextInput value={form.firstName} onChange={(v: string) => setForm({ ...form, firstName: v })} /></div>
                    <div><FieldLabel>Last Name</FieldLabel><TextInput value={form.lastName} onChange={(v: string) => setForm({ ...form, lastName: v })} /></div>
                    <div><FieldLabel>Email (Read Only)</FieldLabel><TextInput value={form.email} disabled /></div>
                    <div><FieldLabel>Phone Number</FieldLabel><TextInput value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} /></div>
                </div>
                <button onClick={handleSaveProfile} disabled={saving} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 transition-all">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Profile
                </button>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                <h3 className="text-white font-semibold text-[15px] mb-5">Change Password</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div><FieldLabel>Current Password</FieldLabel><TextInput type="password" value={pwForm.currentPassword} onChange={(v: string) => setPwForm({ ...pwForm, currentPassword: v })} /></div>
                    <div><FieldLabel>New Password</FieldLabel><TextInput type="password" value={pwForm.newPassword} onChange={(v: string) => setPwForm({ ...pwForm, newPassword: v })} /></div>
                </div>
                <button onClick={handleSavePassword} disabled={saving || !pwForm.currentPassword || !pwForm.newPassword} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 transition-all">
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Update Password
                </button>
            </div>
        </div>
    );
}

// 2. Store Settings
function StoreSection({ toast }: { toast: any }) {
    const [form, setForm] = useState({ 
        storeName: '', 
        supportEmail: '', 
        phone: '', 
        address: '', 
        currency: 'INR'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/api/storefront/settings`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => { 
                setForm({
                    storeName: data.storeName || '',
                    supportEmail: data.email || '',
                    phone: data.phone || '',
                    address: data.address || '',
                    currency: data.currency || 'INR'
                }); 
                setLoading(false); 
            })
            .catch(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = {
                storeName: form.storeName,
                currency: form.currency,
                email: form.supportEmail,
                phone: form.phone,
                address: form.address
            };
            const res = await fetch(`${API_URL}/api/storefront/settings`, {
        credentials: 'include', method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (res.ok) toast.success('Store details updated.'); else throw new Error();
        } catch { toast.error('Failed to update store.'); }
        setSaving(false);
    };

    if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl" />;

    return (
        <div className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
            <h3 className="text-white font-semibold text-[15px] mb-5">Store Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><FieldLabel>Store Name</FieldLabel><TextInput value={form.storeName} onChange={(v: string) => setForm({ ...form, storeName: v })} /></div>
                <div><FieldLabel>Currency</FieldLabel><TextInput value={form.currency} onChange={(v: string) => setForm({ ...form, currency: v })} /></div>
                <div><FieldLabel>Support Email</FieldLabel><TextInput type="email" value={form.supportEmail} onChange={(v: string) => setForm({ ...form, supportEmail: v })} /></div>
                <div><FieldLabel>Support Phone</FieldLabel><TextInput value={form.phone} onChange={(v: string) => setForm({ ...form, phone: v })} /></div>
                <div className="md:col-span-2"><FieldLabel>Physical Address</FieldLabel><TextInput value={form.address} onChange={(v: string) => setForm({ ...form, address: v })} /></div>
            </div>
            <button onClick={handleSave} disabled={saving} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 transition-all">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Store Settings
            </button>
        </div>
    );
}

// 3. Team Settings
function TeamSection({ toast, currentUser }: { toast: any, currentUser: AuthUser }) {
    const [team, setTeam] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteForm, setInviteForm] = useState({ email: '', name: '', password: '' });
    const [inviting, setInviting] = useState(false);

    const fetchTeam = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/team`, { credentials: 'include' });
            if (res.ok) setTeam(await res.json());
        } catch { /* Silent fail */ }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTeam(); }, [fetchTeam]);

    const handleInvite = async () => {
        if (!inviteForm.email || !inviteForm.password) { toast.error('Email and password required.'); return; }
        setInviting(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/team`, {
        credentials: 'include', method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inviteForm) });
            if (res.ok) {
                toast.success('Team member added.');
                setInviteForm({ email: '', name: '', password: '' });
                fetchTeam();
            } else throw new Error();
        } catch { toast.error('Failed to add team member.'); }
        setInviting(false);
    };

    const handleDelete = async (id: string) => {
        if (id === currentUser.id) { toast.error("You cannot delete yourself."); return; }
        try {
            const res = await fetch(`${API_URL}/api/admin/team/${id}`, {
        credentials: 'include', method: 'DELETE' });
            if (res.ok) { toast.success('Member removed.'); fetchTeam(); } else throw new Error();
        } catch { toast.error('Failed to remove member.'); }
    };

    if (loading) return <div className="animate-pulse h-64 bg-white/5 rounded-2xl" />;

    return (
        <div className="space-y-6">
            {/* Invite Form */}
            <div className="p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                <h3 className="text-white font-semibold text-[15px] mb-5">Add Team Member</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><FieldLabel>Name</FieldLabel><TextInput value={inviteForm.name} onChange={(v: string) => setInviteForm({ ...inviteForm, name: v })} placeholder="John Doe" /></div>
                    <div><FieldLabel>Email</FieldLabel><TextInput type="email" value={inviteForm.email} onChange={(v: string) => setInviteForm({ ...inviteForm, email: v })} placeholder="john@aarah.com" /></div>
                    <div><FieldLabel>Initial Password</FieldLabel><TextInput type="password" value={inviteForm.password} onChange={(v: string) => setInviteForm({ ...inviteForm, password: v })} placeholder="Min 8 chars" /></div>
                </div>
                <button onClick={handleInvite} disabled={inviting || !inviteForm.email} className="mt-5 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 disabled:opacity-50 transition-all">
                    {inviting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add Member
                </button>
            </div>

            {/* Team List */}
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/[0.05]">
                            <th className="px-5 py-4 text-[10px] uppercase text-white/40 font-semibold tracking-wider">Name</th>
                            <th className="px-5 py-4 text-[10px] uppercase text-white/40 font-semibold tracking-wider">Email</th>
                            <th className="px-5 py-4 text-[10px] uppercase text-white/40 font-semibold tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {team.map((member, i) => (
                            <tr key={member.id} className={i !== team.length - 1 ? "border-b border-white/[0.02]" : ""}>
                                <td className="px-5 py-4 text-[12px] text-white font-medium">{member.name} {member.id === currentUser.id && <span className="ml-2 text-[9px] text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">You</span>}</td>
                                <td className="px-5 py-4 text-[12px] text-white/60">{member.email}</td>
                                <td className="px-5 py-4 text-right">
                                    <button onClick={() => handleDelete(member.id)} disabled={member.id === currentUser.id} className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
    const { items: toastItems, toast, remove: removeToast } = useToast();
    const { currentUser, isMounted, handleLogout } = useAdminAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'store' | 'team'>('profile');

    if (!isMounted || !currentUser) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0e' }}>
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#0e0e0e', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>

            {/* Header */}
            <div className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#0e0e0e]/90 backdrop-blur-md px-6 md:px-10 py-5 flex items-center justify-between">
                <div>
                    <h1 className="text-white font-bold text-[20px]" style={{ fontFamily: "'Georgia',serif" }}>System Settings</h1>
                    <p className="text-white/40 text-[12px] mt-0.5">Manage your account and preferences</p>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold text-white/50 border border-white/[0.1] hover:text-white hover:bg-white/5 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
            </div>

            {/* Layout */}
            <div className="flex-1 flex flex-col md:flex-row max-w-6xl mx-auto w-full px-5 md:px-10 py-8 gap-8">

                {/* Navigation Sidebar */}
                <nav className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible no-scrollbar">
                    <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors ${activeTab === 'profile' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                        <User className="w-4 h-4" /> Personal Profile
                    </button>
                    <button onClick={() => setActiveTab('store')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors ${activeTab === 'store' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                        <Store className="w-4 h-4" /> Store Config
                    </button>
                    <button onClick={() => setActiveTab('team')} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors ${activeTab === 'team' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}>
                        <Users className="w-4 h-4" /> Team Access
                    </button>
                </nav>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {activeTab === 'profile' && <ProfileSection currentUser={currentUser} toast={toast} />}
                    {activeTab === 'store' && <StoreSection toast={toast} />}
                    {activeTab === 'team' && <TeamSection toast={toast} currentUser={currentUser} />}
                </div>
            </div>

            <ToastContainer items={toastItems} remove={removeToast} />
        </div>
    );
}