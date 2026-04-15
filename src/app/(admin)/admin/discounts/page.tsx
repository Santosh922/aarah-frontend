'use client';

import { API_URL } from '@/lib/api';
import { authFetch } from '@/lib/integrationAdapters';
import { useAdminAuth } from '@/hooks/useAdminAuth';

import {
    useState, useEffect, useCallback, useRef
} from 'react';
import {
    Search, X, RefreshCw, Plus, Edit3, Trash2, Save,
    CheckCircle2, AlertCircle, LogOut, Ticket, Percent,
    IndianRupee, Truck, ShoppingBag, Check, ChevronDown,
    Copy, ToggleLeft, ToggleRight, Cloud, CloudOff, Package
} from 'lucide-react';

// ─── Constants & Types ────────────────────────────────────────────────────────

export type DiscountType = 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
export type MinRequirementType = 'none' | 'min_amount' | 'min_quantity';
export type DiscountStatus = 'Active' | 'Scheduled' | 'Expired' | 'Draft';

export interface Discount {
    id: string;
    code: string;
    type: DiscountType;
    value: number;
    buyQuantity?: number;
    minRequirementType: MinRequirementType;
    minRequirementValue: number;
    appliesTo: 'all' | 'specific_categories' | 'specific_products';
    selectedCategoryIds: string[];
    selectedProductIds: string[];
    usageLimit: number | null; // Overall total count
    oncePerCustomer: boolean;  // Per user limit
    usedCount: number;
    startDate: string; // ISO String
    endDate: string | null; // ISO String
    isActive: boolean;
    createdAt: string;
}

interface DbCategory { id: string; name: string; }
interface DbProduct { id: string; name: string; images?: { url: string; isPrimary?: boolean }[]; }

// ─── Bulletproof Date Helpers ─────────────────────────────────────────────────
// Formats ISO string perfectly for the <input type="datetime-local">
const formatLocalDatetime = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch { return ''; }
};

// Parses the HTML input string back into a standard UTC ISO string
const parseLocalDatetime = (localString: string) => {
    if (!localString) return null;
    try { return new Date(localString).toISOString(); }
    catch { return null; }
};

const BLANK_DISCOUNT: Partial<Discount> = {
    code: '', type: 'percentage', value: 0, buyQuantity: 1,
    minRequirementType: 'none', minRequirementValue: 0,
    appliesTo: 'all', selectedCategoryIds: [], selectedProductIds: [],
    usageLimit: null, oncePerCustomer: false, usedCount: 0,
    startDate: new Date().toISOString(),
    endDate: null, isActive: true
};

// ─── General Helpers ──────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (s: string) => {
    if (!s) return 'Forever';
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
};

const getComputedStatus = (d: Partial<Discount>): DiscountStatus => {
    if (!d.isActive) return 'Draft';
    const now = new Date().getTime();
    const start = new Date(d.startDate || 0).getTime();
    const end = d.endDate ? new Date(d.endDate).getTime() : Infinity;

    if (now < start) return 'Scheduled';
    if (now > end) return 'Expired';
    return 'Active';
};

// ─── Toast System ─────────────────────────────────────────────────────────────
interface ToastItem { id: string; type: 'success' | 'error' | 'info'; message: string }
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

// ─── Shared UI Components ─────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return <label className="text-white/40 text-[10px] uppercase tracking-widest font-semibold block mb-1.5">{children}{required && <span className="text-red-400 ml-0.5">*</span>}</label>;
}

function TextInput({ value, onChange, placeholder, disabled, type = 'text', prefix, suffix }: any) {
    return (
        <div className="relative">
            {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-[12px] pointer-events-none select-none">{prefix}</span>}
            <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                className={`w-full ${prefix ? 'pl-8' : 'px-4'} ${suffix ? 'pr-10' : 'pr-4'} py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/20 transition-colors focus:border-white/20 ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ background: 'rgba(255,255,255,0.04)' }} />
            {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 text-[12px] pointer-events-none">{suffix}</span>}
        </div>
    );
}

function Toggle({ value, onChange, disabled }: any) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!value)} disabled={disabled}
            className="rounded-full transition-all relative shrink-0 flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: value ? '#22c55e' : 'rgba(255,255,255,0.1)', width: '38px', height: '22px' }}>
            <span className="absolute w-[16px] h-[16px] rounded-full bg-white transition-all shadow-sm" style={{ left: value ? 'calc(100% - 19px)' : '3px' }} />
        </button>
    );
}

// ─── Discount Drawer ────────────────────────────────────────────────────────────
function DiscountDrawer({ discount, dbCategories, dbProducts, onSave, onClose }: {
    discount: Discount | null,
    dbCategories: DbCategory[],
    dbProducts: DbProduct[],
    onSave: (d: Partial<Discount>) => Promise<void>,
    onClose: () => void
}) {
    const isNew = !discount;
    const [form, setForm] = useState<Partial<Discount>>(discount || BLANK_DISCOUNT);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    // 🔥 Fix 1: Properly wired toggle functions for Checkboxes
    const toggleCategory = (id: string) => {
        const current = form.selectedCategoryIds || [];
        setForm({ ...form, selectedCategoryIds: current.includes(id) ? current.filter(c => c !== id) : [...current, id] });
    };

    const toggleProduct = (id: string) => {
        const current = form.selectedProductIds || [];
        setForm({ ...form, selectedProductIds: current.includes(id) ? current.filter(p => p !== id) : [...current, id] });
    };

    return (
        <>
            <div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
            <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
                style={{ width: 'min(580px,100vw)', background: '#111', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-40px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 260ms cubic-bezier(0.32,0.72,0,1) forwards' }}>

                <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
                        <div>
                            <h2 className="text-white font-bold text-[16px]" style={{ fontFamily: "'Georgia',serif" }}>{isNew ? 'Create Discount' : 'Edit Discount'}</h2>
                            {!isNew && <p className="text-white/30 text-[10px] font-mono mt-0.5">{form.code}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7" style={{ scrollbarWidth: 'none' }}>

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <FieldLabel required>Discount Code</FieldLabel>
                            <button type="button" onClick={() => setForm({ ...form, code: generateCode() })} className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold transition-colors">Generate random</button>
                        </div>
                        <TextInput value={form.code} onChange={(v: string) => setForm({ ...form, code: v.toUpperCase().replace(/\s/g, '') })} placeholder="e.g. SUMMER50" />
                        <p className="text-white/30 text-[10px]">Customers will enter this code at checkout.</p>
                    </div>

                    {/* Discount Type & Value */}
                    <div className="space-y-4 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <FieldLabel>Discount Type</FieldLabel>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { id: 'percentage', label: 'Percentage', icon: <Percent className="w-4 h-4" /> },
                                { id: 'fixed_amount', label: 'Fixed Amount', icon: <IndianRupee className="w-4 h-4" /> },
                                { id: 'buy_x_get_y', label: 'Buy X Get Y', icon: <ShoppingBag className="w-4 h-4" /> },
                                { id: 'free_shipping', label: 'Free Shipping', icon: <Truck className="w-4 h-4" /> },
                            ].map(t => (
                                <button key={t.id} type="button" onClick={() => setForm({ ...form, type: t.id as DiscountType, value: 0 })}
                                    className="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all border"
                                    style={{
                                        background: form.type === t.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                        borderColor: form.type === t.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                                        color: form.type === t.id ? '#fff' : 'rgba(255,255,255,0.5)'
                                    }}>
                                    {t.icon} <span className="text-[12px] font-semibold">{t.label}</span>
                                </button>
                            ))}
                        </div>

                        {form.type === 'percentage' && (
                            <div className="pt-2">
                                <FieldLabel required>Discount Value (%)</FieldLabel>
                                <TextInput type="number" value={form.value} onChange={(v: string) => setForm({ ...form, value: Number(v) })} placeholder="10" suffix="%" />
                            </div>
                        )}
                        {form.type === 'fixed_amount' && (
                            <div className="pt-2">
                                <FieldLabel required>Discount Value (₹)</FieldLabel>
                                <TextInput type="number" value={form.value} onChange={(v: string) => setForm({ ...form, value: Number(v) })} placeholder="500" prefix="₹" />
                            </div>
                        )}
                        {form.type === 'buy_x_get_y' && (
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div>
                                    <FieldLabel required>Customer Buys (Qty)</FieldLabel>
                                    <TextInput type="number" value={form.buyQuantity} onChange={(v: string) => setForm({ ...form, buyQuantity: Number(v) })} placeholder="2" />
                                </div>
                                <div>
                                    <FieldLabel required>Customer Gets (Qty Free)</FieldLabel>
                                    <TextInput type="number" value={form.value} onChange={(v: string) => setForm({ ...form, value: Number(v) })} placeholder="1" />
                                </div>
                            </div>
                        )}

                        {/* Applies To Selection */}
                        <div className="pt-4 mt-2 border-t border-white/[0.05]">
                            <FieldLabel>Applies To</FieldLabel>
                            <div className="relative">
                                <select value={form.appliesTo} onChange={e => setForm({ ...form, appliesTo: e.target.value as any })}
                                    className="w-full appearance-none px-4 py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <option value="all">All Products</option>
                                    <option value="specific_categories">Specific Categories</option>
                                    <option value="specific_products">Specific Products</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                            </div>

                            {/* Dynamic Checklist: Categories */}
                            {form.appliesTo === 'specific_categories' && (
                                <div className="mt-3 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                                    <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold mb-3">Select Categories</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                        {dbCategories.length === 0 ? (
                                            <p className="text-white/30 text-[11px] py-2">No categories found in database.</p>
                                        ) : dbCategories.map(c => {
                                            const isSelected = (form.selectedCategoryIds || []).includes(c.id);
                                            return (
                                                <div key={c.id} onClick={() => toggleCategory(c.id)} className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <span className="text-white/70 text-[12px] group-hover:text-white transition-colors">{c.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Dynamic Checklist: Products */}
                            {form.appliesTo === 'specific_products' && (
                                <div className="mt-3 p-4 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                                    <p className="text-white/40 text-[9px] uppercase tracking-widest font-semibold mb-3">Select Products</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
                                        {dbProducts.length === 0 ? (
                                            <p className="text-white/30 text-[11px] py-2">No products found in database.</p>
                                        ) : dbProducts.map(p => {
                                            const isSelected = (form.selectedProductIds || []).includes(p.id);
                                            const imgUrl = p.images?.find(i => i.isPrimary)?.url || p.images?.[0]?.url;
                                            return (
                                                <div key={p.id} onClick={() => toggleProduct(p.id)} className="flex items-center gap-3 cursor-pointer group p-1.5 rounded-lg hover:bg-white/[0.03] transition-colors">
                                                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-white/20 group-hover:border-white/40'}`}>
                                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                                    </div>
                                                    <div className="w-8 h-8 rounded bg-white/5 overflow-hidden shrink-0 flex items-center justify-center border border-white/5">
                                                        {imgUrl ? <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-white/20" />}
                                                    </div>
                                                    <span className="text-white/70 text-[12px] group-hover:text-white transition-colors truncate">{p.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Minimum Requirements */}
                    <div className="space-y-4">
                        <FieldLabel>Minimum Requirements</FieldLabel>
                        <div className="flex flex-col gap-2">
                            {[
                                { id: 'none', label: 'None' },
                                { id: 'min_amount', label: 'Minimum purchase amount (₹)' },
                                { id: 'min_quantity', label: 'Minimum quantity of items' },
                            ].map(req => (
                                <label key={req.id} onClick={() => setForm({ ...form, minRequirementType: req.id as MinRequirementType })}
                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border hover:bg-white/[0.02]"
                                    style={{ background: form.minRequirementType === req.id ? 'rgba(255,255,255,0.04)' : 'transparent', borderColor: form.minRequirementType === req.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)' }}>
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${form.minRequirementType === req.id ? 'border-blue-400' : 'border-white/20'}`}>
                                        {form.minRequirementType === req.id && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                                    </div>
                                    <span className="text-[12px] text-white/80">{req.label}</span>
                                </label>
                            ))}
                        </div>
                        {form.minRequirementType === 'min_amount' && (
                            <TextInput type="number" value={form.minRequirementValue} onChange={(v: string) => setForm({ ...form, minRequirementValue: Number(v) })} placeholder="2500" prefix="₹" />
                        )}
                        {form.minRequirementType === 'min_quantity' && (
                            <TextInput type="number" value={form.minRequirementValue} onChange={(v: string) => setForm({ ...form, minRequirementValue: Number(v) })} placeholder="3" />
                        )}
                    </div>

                    {/* 🔥 Fix 2: Bulletproof Date Handling */}
                    <div className="space-y-4 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel required>Start Date & Time</FieldLabel>
                                <input type="datetime-local" value={formatLocalDatetime(form.startDate)}
                                    onChange={e => setForm({ ...form, startDate: parseLocalDatetime(e.target.value) || new Date().toISOString() })}
                                    className="w-full px-4 py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] transition-colors focus:border-white/20"
                                    style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }} />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <FieldLabel>End Date & Time</FieldLabel>
                                    <button type="button" onClick={() => setForm({ ...form, endDate: form.endDate ? null : new Date(Date.now() + 86400000).toISOString() })} className="text-[9px] text-white/40 hover:text-white transition-colors">
                                        {form.endDate ? 'Remove end date' : 'Set end date'}
                                    </button>
                                </div>
                                {form.endDate ? (
                                    <input type="datetime-local" value={formatLocalDatetime(form.endDate)}
                                        onChange={e => setForm({ ...form, endDate: parseLocalDatetime(e.target.value) })}
                                        className="w-full px-4 py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] transition-colors focus:border-white/20"
                                        style={{ background: 'rgba(255,255,255,0.04)', colorScheme: 'dark' }} />
                                ) : (
                                    <div className="w-full px-4 py-2.5 rounded-xl text-[12px] text-white/30 border border-white/[0.05] flex items-center" style={{ background: 'rgba(255,255,255,0.02)' }}>No end date</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 🔥 Fix 3: Total Count & User Count Limits */}
                    <div className="space-y-4">
                        <FieldLabel>Usage Limits</FieldLabel>
                        <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div>
                                <FieldLabel>Total Coupon Count</FieldLabel>
                                <TextInput type="number" value={form.usageLimit === null ? '' : form.usageLimit} onChange={(v: string) => setForm({ ...form, usageLimit: v ? Number(v) : null })} placeholder="Unlimited" />
                                <p className="text-white/30 text-[9px] mt-1.5">Max times this code can be used overall.</p>
                            </div>
                            <div>
                                <FieldLabel>User Limit</FieldLabel>
                                <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.09]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <span className="text-white/70 text-[12px] pl-2">{form.oncePerCustomer ? '1 per customer' : 'Unlimited / user'}</span>
                                    <Toggle value={form.oncePerCustomer ?? false} onChange={(v: boolean) => setForm({ ...form, oncePerCustomer: v })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div>
                        <FieldLabel>Status</FieldLabel>
                        <div className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.09]" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <span className="text-white/70 text-[12px] pl-2">{form.isActive ? 'Active' : 'Draft'}</span>
                            <Toggle value={form.isActive ?? true} onChange={(v: boolean) => setForm({ ...form, isActive: v })} />
                        </div>
                    </div>

                </div>

                <div className="px-6 py-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving || !form.code}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50">
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? 'Saving...' : isNew ? 'Create Discount' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Main Page Export ─────────────────────────────────────────────────────────
export default function AdminDiscountsPage() {
    const { items: toastItems, toast, remove: removeToast } = useToast();

    const { currentUser, isMounted, handleLogout } = useAdminAuth();

    if (!isMounted || !currentUser) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0e' }}>
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#0e0e0e', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}} ::-webkit-scrollbar{width:0;height:0} select option{background:#1a1a1a}`}</style>

            {/* Topbar */}
            <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(14,14,14,0.97)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between px-6 md:px-8 py-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Ticket className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-[18px]" style={{ fontFamily: "'Georgia',serif" }}>Discounts & Offers</h1>
                            <p className="text-white/30 text-[11px] mt-0.5 tracking-widest uppercase">Coupon Management</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:flex items-center gap-2 p-2 rounded-xl mr-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>{currentUser.avatar}</div>
                            <button onClick={handleLogout} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Logout"><LogOut className="w-3.5 h-3.5" /></button>
                        </div>
                    </div>
                </div>
            </div>

            <DiscountsView toast={toast} />
            <ToastContainer items={toastItems} remove={removeToast} />
        </div>
    );
}

function DiscountsView({ toast }: { toast: any }) {
    const [discounts, setDiscounts] = useState<Discount[]>([]);

    // DB Data for the Drawer
    const [dbCategories, setDbCategories] = useState<DbCategory[]>([]);
    const [dbProducts, setDbProducts] = useState<DbProduct[]>([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [drawer, setDrawer] = useState<'closed' | 'new' | Discount>('closed');
    const [deleteTarget, setDeleteTarget] = useState<Discount | null>(null);
    const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

    // Filters
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // Fetch initial discounts & populate dropdown data
    const fetchDiscounts = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            // Load Discounts
            const resD = await authFetch(`${API_URL}/api/admin/discounts`);
            if (resD.ok) {
                const data = await resD.json();
                setDiscounts(data || []);
            }

            // Pre-load Categories and Products for the drawer
            const resC = await authFetch(`${API_URL}/api/admin/categories`);
            if (resC.ok) {
                const cData = await resC.json();
                setDbCategories(cData.data || cData || []);
            }

            const resP = await authFetch(`${API_URL}/api/admin/products`);
            if (resP.ok) {
                const pData = await resP.json();
                setDbProducts(pData.products || pData.data || pData || []);
            }
            setSyncStatus('synced');
        } catch {
            toast.error('Failed to load data. Working in offline mode.');
            setSyncStatus('error');
        }
        finally { setLoading(false); setRefreshing(false); }
    }, [toast]);

    useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

    // Optimistic Save with Sync Status Indicator
    const handleSave = async (data: Partial<Discount>) => {
        const isNew = !data.id;
        const savedDiscount = { ...data, id: data.id || `DISC-${uid()}` } as Discount;

        // Update UI instantly
        if (isNew) setDiscounts(p => [savedDiscount, ...p]);
        else setDiscounts(p => p.map(d => d.id === savedDiscount.id ? savedDiscount : d));

        setDrawer('closed');
        setSyncStatus('syncing');

        try {
            const url = isNew ? `${API_URL}/api/admin/discounts` : `${API_URL}/api/admin/discounts/${savedDiscount.id}`;
            const res = await authFetch(url, {
                method: isNew ? 'POST' : 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(savedDiscount)
            });
            if (res.ok) {
                setSyncStatus('synced');
                toast.success(`Discount ${isNew ? 'created' : 'updated'} successfully.`);
            } else { throw new Error(); }
        } catch {
            setSyncStatus('error');
            toast.error('Cloud sync failed. Will retry later.');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        const targetId = deleteTarget.id;

        setDiscounts(p => p.filter(d => d.id !== targetId));
        setDeleteTarget(null);
        setSyncStatus('syncing');

        try {
            const res = await authFetch(`${API_URL}/api/admin/discounts`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: targetId })
            });
            if (res.ok) {
                setSyncStatus('synced');
                toast.success('Discount deleted.');
            } else { throw new Error(); }
        } catch {
            setSyncStatus('error');
            toast.error('Failed to delete from cloud.');
        }
    };

    const handleToggleActive = async (discount: Discount) => {
        const nextState = !discount.isActive;
        setDiscounts(p => p.map(d => d.id === discount.id ? { ...d, isActive: nextState } : d));
        setSyncStatus('syncing');

        try {
            const res = await authFetch(`${API_URL}/api/admin/discounts`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: discount.id, isActive: nextState })
            });
            if (res.ok) {
                setSyncStatus('synced');
                toast.success(`Discount ${nextState ? 'activated' : 'deactivated'}.`);
            } else { throw new Error(); }
        } catch {
            setDiscounts(p => p.map(d => d.id === discount.id ? { ...d, isActive: !nextState } : d));
            setSyncStatus('error');
            toast.error('Failed to update status.');
        }
    };

    const renderDiscountSummary = (d: Discount) => {
        let text = '';
        if (d.type === 'percentage') text = `${d.value}% off`;
        else if (d.type === 'fixed_amount') text = `${fmtMoney(d.value)} off`;
        else if (d.type === 'buy_x_get_y') text = `Buy ${d.buyQuantity}, Get ${d.value} Free`;
        else if (d.type === 'free_shipping') text = `Free Shipping`;

        let cond = '';
        if (d.minRequirementType === 'min_amount') cond = `over ${fmtMoney(d.minRequirementValue)}`;
        else if (d.minRequirementType === 'min_quantity') cond = `on ${d.minRequirementValue}+ items`;

        let applies = '';
        if (d.appliesTo === 'specific_categories') applies = ` • ${d.selectedCategoryIds?.length || 0} Categories`;
        else if (d.appliesTo === 'specific_products') applies = ` • ${d.selectedProductIds?.length || 0} Products`;

        return (
            <div>
                <p className="text-white/80 text-[12px] font-bold">{text}</p>
                {(cond || applies) && <p className="text-white/40 text-[10px] mt-0.5">{cond}{applies}</p>}
            </div>
        );
    };

    const getStatusBadge = (d: Discount) => {
        const status = getComputedStatus(d);
        const config: Record<DiscountStatus, { bg: string, color: string, border: string }> = {
            Active: { bg: 'rgba(34,197,94,0.1)', color: '#4ade80', border: 'rgba(34,197,94,0.2)' },
            Draft: { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: 'rgba(255,255,255,0.1)' },
            Scheduled: { bg: 'rgba(56,189,248,0.1)', color: '#38bdf8', border: 'rgba(56,189,248,0.2)' },
            Expired: { bg: 'rgba(239,68,68,0.1)', color: '#f87171', border: 'rgba(239,68,68,0.2)' }
        };
        const c = config[status];
        return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{status}</span>;
    };

    const filteredDiscounts = discounts.filter(d => {
        if (search && !d.code.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterStatus !== 'All' && getComputedStatus(d) !== filterStatus) return false;
        return true;
    });

    return (
        <div className="px-5 md:px-10 py-8 max-w-7xl w-full mx-auto flex-1 flex flex-col">

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search code..."
                            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] transition-colors focus:border-white/20"
                            style={{ background: 'rgba(255,255,255,0.04)' }} />
                    </div>
                    <div className="relative">
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="appearance-none pl-4 pr-8 py-2.5 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Scheduled">Scheduled</option>
                            <option value="Draft">Draft</option>
                            <option value="Expired">Expired</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Cloud Sync Indicator */}
                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.05]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {syncStatus === 'syncing' ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                            : syncStatus === 'error' ? <CloudOff className="w-3.5 h-3.5 text-red-400" />
                                : <Cloud className="w-3.5 h-3.5 text-green-400" />}
                        <span className="text-[10px] text-white/40 font-medium">
                            {syncStatus === 'syncing' ? 'Saving...' : syncStatus === 'error' ? 'Offline' : 'Synced'}
                        </span>
                    </div>

                    <button type="button" onClick={() => fetchDiscounts(true)} disabled={refreshing} className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button" onClick={() => setDrawer('new')} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98]">
                        <Plus className="w-4 h-4" /> Create Discount
                    </button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
            ) : filteredDiscounts.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center border border-white/[0.05] rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}><Ticket className="w-8 h-8 text-white/20" /></div>
                    <p className="text-white/80 text-[15px] font-semibold">No Discounts Found</p>
                    <p className="text-white/40 text-[12px] mt-1 max-w-xs">Create percentage, fixed amount, or Buy X Get Y discounts to boost sales.</p>
                    <button type="button" onClick={() => setDrawer('new')} className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all border border-white/[0.1] hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Plus className="w-4 h-4" /> Create Discount
                    </button>
                </div>
            ) : (
                <div className="rounded-2xl border overflow-hidden flex-1" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(20,20,20,0.9),rgba(16,16,16,0.95))' }}>
                    <table className="w-full text-left">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['Code', 'Details', 'Status', 'Usage', 'Duration', ''].map(h => (
                                    <th key={h} className="px-5 py-4 text-[9px] font-bold tracking-[0.18em] uppercase text-white/25 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDiscounts.map((d, i) => (
                                <tr key={d.id} className="group transition-all duration-150"
                                    style={{ borderBottom: i < filteredDiscounts.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', animation: `fadeUp 0.3s ease forwards ${i * 20}ms`, opacity: 0 }}>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white/90 font-mono text-[13px] font-bold tracking-wide">{d.code}</span>
                                            <button type="button" onClick={() => { navigator.clipboard.writeText(d.code); toast.success('Code copied'); }} className="text-white/20 hover:text-white/60 opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4">{renderDiscountSummary(d)}</td>
                                    <td className="px-5 py-4">{getStatusBadge(d)}</td>
                                    <td className="px-5 py-4">
                                        <p className="text-white/60 text-[12px] font-medium">{d.usedCount} used</p>
                                        {d.usageLimit && <p className="text-white/30 text-[10px] mt-0.5">out of {d.usageLimit}</p>}
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-white/50 text-[11px] whitespace-nowrap">{fmtDate(d.startDate)}</p>
                                        {d.endDate && <p className="text-white/30 text-[10px] mt-0.5 whitespace-nowrap">to {fmtDate(d.endDate)}</p>}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => handleToggleActive(d)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all" title={d.isActive ? 'Deactivate' : 'Activate'}>
                                                {d.isActive ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
                                            </button>
                                            <button type="button" onClick={() => setDrawer(d)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all" title="Edit">
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button type="button" onClick={() => setDeleteTarget(d)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modals & Drawers */}
            {drawer !== 'closed' && (
                <DiscountDrawer
                    discount={drawer === 'new' ? null : drawer}
                    dbCategories={dbCategories}
                    dbProducts={dbProducts}
                    onSave={handleSave}
                    onClose={() => setDrawer('closed')}
                />
            )}

            {deleteTarget && (
                <>
                    <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setDeleteTarget(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[340px]" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}><Trash2 className="w-5 h-5 text-red-400" /></div>
                        <p className="text-white font-bold text-[15px] mb-1">Delete Discount?</p>
                        <p className="text-white/40 text-[12px] leading-relaxed">This code will be permanently removed. Customers will no longer be able to use it.</p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                            <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all active:scale-[0.98]" style={{ background: 'rgba(220,38,38,0.75)' }}>Delete</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}