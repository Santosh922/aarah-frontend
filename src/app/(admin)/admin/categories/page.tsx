'use client';

import { API_URL } from '@/lib/api';
import { authFetch, extractList } from '@/lib/integrationAdapters';
import { processImageFile } from '@/lib/uploadImage';
import { useAdminAuth } from '@/hooks/useAdminAuth';

import {
    useState, useEffect, useCallback, useRef, useMemo,
    DragEvent as RDragEvent
} from 'react';
import {
    Search, X, ChevronDown, ChevronRight, RefreshCw, Plus, Edit3,
    Trash2, Save, Eye, Download, Upload, Globe,
    Lock, Shield, ShieldCheck, LogOut, Check, Minus,
    AlertCircle, CheckCircle2, EyeOff, GripVertical,
    LayoutGrid, List, FolderOpen, FolderTree, Star,
    Tag, Shirt, Package, Heart, Gem, Layers, Flame, Crown,
    Flower2, Leaf, Sun, Moon, Zap, Award, Scissors,
    ShoppingBag, Ribbon, Sparkles, ImageIcon,
    MoreHorizontal, Merge, SlidersHorizontal
} from 'lucide-react';

// ─── AARAH Constants & Types ─────────────────────────────────────────────────
type CategoryStatus = 'Active' | 'Inactive';
type ViewMode = 'tree' | 'grid' | 'list';
type DrawerMode = 'add' | 'edit' | 'view';
type DrawerTab = 'general' | 'media' | 'seo' | 'products';

interface Category {
    id: string; name: string; slug: string; description: string; shortDescription: string;
    parentId: string | null; color: string; iconKey: string;
    image: string | { id: string; url: string; alt: string } | null;
    bannerImage: string | { id: string; url: string; alt: string } | null;
    status: CategoryStatus; featured: boolean; sortOrder: number; productCount: number;
    seo: { title: string; description: string; keywords: string };
    createdAt: string; updatedAt: string; createdBy: string;
}

const ACCENT_COLORS = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#3b82f6', '#0ea5e9',
    '#06b6d4', '#14b8a6', '#0d9488', '#10b981', '#22c55e', '#84cc16', '#eab308',
    '#f59e0b', '#f97316', '#ef4444', '#64748b'
];

const CATEGORY_ICONS: Record<string, string> = {
    tag: 'tag', shirt: 'shirt', package: 'package', star: 'star', heart: 'heart',
    gem: 'gem', ribbon: 'ribbon', sparkles: 'sparkles', flame: 'flame', crown: 'crown',
    flower: 'flower', leaf: 'leaf', sun: 'sun', moon: 'moon', zap: 'zap',
    layers: 'layers', award: 'award', scissors: 'scissors', shopping_bag: 'shopping_bag'
};

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
    tag: Tag, shirt: Shirt, package: Package, star: Star, heart: Heart,
    gem: Gem, ribbon: Ribbon, sparkles: Sparkles, flame: Flame, crown: Crown,
    flower: Flower2, leaf: Leaf, sun: Sun, moon: Moon, zap: Zap,
    layers: Layers, award: Award, scissors: Scissors, shopping_bag: ShoppingBag,
};

function CatIcon({ iconKey, className = 'w-4 h-4' }: { iconKey: string; className?: string }) {
    const Comp = ICON_COMPONENTS[iconKey] ?? Package;
    return <Comp className={className} />;
}

const STATUS_CFG: Record<CategoryStatus, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
    Active: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', label: 'Active', icon: <CheckCircle2 className="w-3 h-3" /> },
    Inactive: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', label: 'Inactive', icon: <EyeOff className="w-3 h-3" /> },
};

const BLANK_CAT: Partial<Category> = {
    name: '', slug: '', description: '', shortDescription: '',
    parentId: null, color: ACCENT_COLORS[0], iconKey: 'tag',
    image: null, bannerImage: null,
    status: 'Active', featured: false, sortOrder: 99, productCount: 0,
    seo: { title: '', description: '', keywords: '' },
};

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const normalizeMedia = (raw: any, fallbackAlt: string) => {
    if (!raw) return null;
    if (typeof raw === 'string') {
        const url = raw.trim();
        return url ? { id: url, url, alt: fallbackAlt } : null;
    }
    const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
    if (!url) return null;
    return {
        id: String(raw?.id ?? url),
        url,
        alt: String(raw?.alt ?? fallbackAlt),
    };
};

// ─── Permissions ─────────────────────────────────────────────────────────────
const PERMS = {
    createRoot: () => true,
    createSub: () => true,
    delete: () => true,
    bulkActions: () => true,
    editSEO: () => true,
    editSlug: () => true,
    changeParent: () => true,
    toggleStatus: () => true,
    featureToggle: () => true,
    merge: () => true,
    export: () => true,
    reorder: () => true,
    editBasic: () => true,
};

// ─── Toast System ────────────────────────────────────────────────────────────
interface ToastItem { id: string; type: 'success' | 'error' | 'info'; message: string }

function ToastContainer({ items, remove }: { items: ToastItem[]; remove: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
            {items.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
                    style={{
                        background: t.type === 'success' ? 'rgba(34,197,94,0.13)' : t.type === 'error' ? 'rgba(239,68,68,0.13)' : 'rgba(255,255,255,0.08)',
                        border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.28)' : t.type === 'error' ? 'rgba(239,68,68,0.28)' : 'rgba(255,255,255,0.13)'}`,
                        color: t.type === 'success' ? '#4ade80' : t.type === 'error' ? '#f87171' : 'rgba(255,255,255,0.75)',
                        backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        animation: 'fadeUp 250ms ease forwards',
                    }}>
                    {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span className="text-[12px] font-medium">{t.message}</span>
                    <button onClick={() => remove(t.id)} className="ml-1 opacity-50 hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                </div>
            ))}
        </div>
    );
}

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

// ─── Shared field components ─────────────────────────────────────────────────
function FieldLabel({ children, locked }: { children: React.ReactNode; locked?: boolean }) {
    return (
        <label className="flex items-center gap-1.5 text-white/38 text-[9px] uppercase tracking-widest font-semibold mb-1.5">
            {children}
            {locked && <Lock className="w-2.5 h-2.5 text-white/20" />}
        </label>
    );
}

function TextInput({ value, onChange, placeholder, disabled, error, prefix }: any) {
    return (
        <div>
            <div className="relative">
                {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-[12px] font-semibold pointer-events-none select-none">{prefix}</span>}
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                    className={`w-full ${prefix ? 'pl-8' : 'px-4'} pr-4 py-3 rounded-xl text-[12px] text-white outline-none border placeholder:text-white/18 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.09)' }} />
            </div>
            {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
        </div>
    );
}

// ─── SingleImageDrop ─────────────────────────────────────────────────────────
function SingleImageDrop({ image, onChange, disabled, label }: any) {
    const [dropping, setDropping] = useState(false);
    const [showUrl, setShowUrl] = useState(false);
    const [urlVal, setUrlVal] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        const url = await processImageFile(file, 'category');
        if (url) onChange({ id: url, url, alt: label });
    };

    const onDrop = (e: RDragEvent) => {
        e.preventDefault(); setDropping(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {image ? (
                <div className="relative rounded-xl overflow-hidden group" style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}>
                    <img src={image.url} alt={image.alt} className="w-full h-full object-cover" />
                    {!disabled && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
                            style={{ background: 'rgba(0,0,0,0.65)' }}>
                            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <Upload className="w-3.5 h-3.5" /> Replace
                            </button>
                            <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                <X className="w-3.5 h-3.5" /> Remove
                            </button>
                        </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                </div>
            ) : (
                <div onDragOver={e => { e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={onDrop} onClick={() => !disabled && fileRef.current?.click()}
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-7 transition-all duration-200"
                    style={{ border: `2px dashed ${dropping ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`, background: dropping ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', cursor: disabled ? 'default' : 'pointer' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <ImageIcon className="w-5 h-5 text-white/35" />
                    </div>
                    <p className="text-white/40 text-[11px]">{disabled ? 'No image' : `Drop or click to upload ${label.toLowerCase()}`}</p>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                </div>
            )}
            {!disabled && !image && (
                showUrl ? (
                    <div className="flex gap-2 mt-2">
                        <input value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="https://…/image.jpg"
                            onKeyDown={e => { if (e.key === 'Enter' && urlVal.trim()) { onChange({ id: uid(), url: urlVal.trim(), alt: label }); setUrlVal(''); setShowUrl(false); } }}
                            className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.1] placeholder:text-white/20" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <button type="button" onClick={() => { if (urlVal.trim()) { onChange({ id: uid(), url: urlVal.trim(), alt: label }); setUrlVal(''); setShowUrl(false); } }} className="px-3 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all">Add</button>
                        <button type="button" onClick={() => setShowUrl(false)} className="px-3 py-2 rounded-xl text-[11px] text-white/35 hover:text-white transition-colors">Cancel</button>
                    </div>
                ) : (
                    <button type="button" onClick={() => setShowUrl(true)} className="flex items-center gap-1.5 mt-2 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                        <Globe className="w-3.5 h-3.5" /> Add by URL
                    </button>
                )
            )}
        </div>
    );
}

// ─── CategoryDrawer ──────────────────────────────────────────────────────────
function CategoryDrawer({ category, mode, allCategories, currentUserId, defaultParentId, onSave, onClose }: any) {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isAdd = mode === 'add';
    const canEdit = isEdit || isAdd;

    const [tab, setTab] = useState<DrawerTab>('general');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [slugChecking, setSlugChecking] = useState(false);
    const [slugOk, setSlugOk] = useState<boolean | null>(null);

    // Dynamic products fetching state
    const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    const [form, setForm] = useState<Partial<Category>>(() =>
        category ? { ...category } : { ...BLANK_CAT, parentId: defaultParentId ?? null, createdBy: currentUserId }
    );

    useEffect(() => {
        setForm(category ? { ...category } : { ...BLANK_CAT, parentId: defaultParentId ?? null, createdBy: currentUserId });
        setTab('general'); setErrors({}); setSlugOk(null);
    }, [category?.id, mode, currentUserId, defaultParentId]);

    // 🔥 DYNAMIC PRODUCT FETCHING: Retrieves real products assigned to this category from API
    useEffect(() => {
        if (tab === 'products' && category?.id) {
            setLoadingProducts(true);
            authFetch(`${API_URL}/api/admin/products?categoryId=${category.id}&pageSize=50`)
                .then(res => res.json())
                .then(data => {
                    const list =
                        Array.isArray(data) ? data :
                        Array.isArray(data?.data) ? data.data :
                        Array.isArray(data?.products) ? data.products :
                        [];
                    setCategoryProducts(list);
                })
                .catch(() => console.error('Failed to fetch products'))
                .finally(() => setLoadingProducts(false));
        }
    }, [tab, category?.id]);

    const set = useCallback((key: string, val: unknown) => {
        setForm(p => {
            const keys = key.split('.');
            if (keys.length === 1) return { ...p, [key]: val };
            return { ...p, [keys[0]]: { ...(p as Record<string, unknown>)[keys[0]] as object, [keys[1]]: val } };
        });
    }, []);

    const checkSlug = useCallback(async (slug: string) => {
        if (!slug) { setSlugOk(null); return; }
        setSlugChecking(true);
        // Checking against dynamic categories list
        const isTaken = allCategories.some((c: Category) => c.slug === slug && c.id !== category?.id);
        setSlugOk(!isTaken);
        setSlugChecking(false);
    }, [allCategories, category?.id]);

    const slugTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const handleSlugChange = (v: string) => {
        const s = slugify(v);
        set('slug', s);
        clearTimeout(slugTimer.current);
        slugTimer.current = setTimeout(() => checkSlug(s), 600);
    };

    const validate = () => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = 'Category name is required';
        if (!form.slug?.trim()) e.slug = 'Slug is required';
        if (slugOk === false) e.slug = 'This slug is already taken';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) { setTab('general'); return; }
        setSaving(true);
        try { await onSave(form, category?.id); }
        finally { setSaving(false); }
    };

    const parentOptions = allCategories.filter((c: Category) => c.id !== category?.id && c.parentId === null);
    const parentName = form.parentId ? allCategories.find((c: Category) => c.id === form.parentId)?.name : null;

    const TABS: { id: DrawerTab; label: string }[] = [
        { id: 'general', label: 'General' },
        { id: 'media', label: 'Media' },
        { id: 'seo', label: 'SEO' },
        { id: 'products', label: 'Products' },
    ];
    const visibleTabs = TABS;

    return (
        <>
            <div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
            <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
                style={{ width: 'min(660px,100vw)', background: '#111', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-40px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 260ms cubic-bezier(0.32,0.72,0,1) forwards' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/6 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all" style={{ background: `${form.color ?? ACCENT_COLORS[0]}20`, border: `1px solid ${form.color ?? ACCENT_COLORS[0]}40`, color: form.color ?? ACCENT_COLORS[0] }}>
                            <CatIcon iconKey={form.iconKey ?? 'tag'} className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-[15px]" style={{ fontFamily: "'Georgia',serif" }}>
                                {isAdd ? 'New Category' : isEdit ? 'Edit Category' : category?.name}
                            </h2>
                            {parentName && <p className="text-white/30 text-[10px] mt-0.5">Sub-category of {parentName}</p>}
                            {category && !parentName && <p className="text-white/25 text-[10px] mt-0.5 font-mono">{category.id}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {form.featured && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}><Star className="w-2.5 h-2.5" /> FEATURED</span>}
                        {form.status && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ background: STATUS_CFG[form.status as CategoryStatus].bg, color: STATUS_CFG[form.status as CategoryStatus].color }}>
                                {STATUS_CFG[form.status as CategoryStatus].icon} {form.status}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-6 pt-3 border-b shrink-0 overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', scrollbarWidth: 'none' }}>
                    {visibleTabs.map(t => (
                        <button key={t.id} type="button" onClick={() => setTab(t.id)}
                            className="flex items-center gap-1.5 pb-3 px-1 mr-6 text-[11px] font-semibold whitespace-nowrap transition-all border-b-2 shrink-0"
                            style={{ color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.3)', borderColor: tab === t.id ? '#fff' : 'transparent' }}>
                            {t.label}
                            {t.id === 'general' && errors.name && <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-0.5" />}
                        </button>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
                    {tab === 'general' && (
                        <>
                            <div>
                                <FieldLabel>Category Name *</FieldLabel>
                                <TextInput value={form.name ?? ''} disabled={!canEdit} error={errors.name} placeholder="e.g. Maternity Kurtis"
                                    onChange={(v: string) => { set('name', v); if (isAdd) { const s = slugify(v); set('slug', s); set('seo.title', v + ' | AARAH'); checkSlug(s); } }} />
                            </div>

                            <div>
                                <FieldLabel locked={false}>URL Slug</FieldLabel>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 text-[11px] pointer-events-none select-none">/</span>
                                    <input value={form.slug ?? ''} disabled={!canEdit || false} onChange={e => handleSlugChange(e.target.value)}
                                        className="w-full pl-7 pr-10 py-3 rounded-xl text-[12px] text-white font-mono outline-none border placeholder:text-white/18 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.slug ? '#ef4444' : 'rgba(255,255,255,0.09)' }} />
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                        {slugChecking && <RefreshCw className="w-3.5 h-3.5 text-white/30 animate-spin" />}
                                        {!slugChecking && slugOk === true && <Check className="w-3.5 h-3.5 text-green-400" />}
                                        {!slugChecking && slugOk === false && <X className="w-3.5 h-3.5 text-red-400" />}
                                    </div>
                                </div>
                                {errors.slug && <p className="text-red-400 text-[10px] mt-1">{errors.slug}</p>}
                                {false && canEdit && <p className="text-white/20 text-[9px] mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> </p>}
                            </div>

                            <div>
                                <FieldLabel>Short Description</FieldLabel>
                                <TextInput value={form.shortDescription ?? ''} disabled={!canEdit} placeholder="One-line tagline for cards and listings" onChange={(v: string) => set('shortDescription', v)} />
                            </div>

                            <div>
                                <FieldLabel>Full Description</FieldLabel>
                                <textarea value={form.description ?? ''} disabled={!canEdit} rows={3}
                                    onChange={e => set('description', e.target.value)} placeholder="Detailed category description…"
                                    className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/18 resize-none disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{ background: 'rgba(255,255,255,0.05)' }} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel locked={!PERMS.changeParent()}>Parent Category</FieldLabel>
                                    {canEdit && PERMS.changeParent() ? (
                                        <div className="relative">
                                            <select value={form.parentId ?? ''} onChange={e => set('parentId', e.target.value || null)}
                                                className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09]"
                                                style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <option value="">— Root category —</option>
                                                {parentOptions.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className="px-4 py-3 rounded-xl text-[12px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)' }}>
                                            {form.parentId ? (allCategories.find((c: Category) => c.id === form.parentId)?.name ?? '—') : 'Root Category'}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <FieldLabel locked={!PERMS.toggleStatus()}>Visibility</FieldLabel>
                                    {canEdit && PERMS.toggleStatus() ? (
                                        <div className="flex gap-2">
                                            {(['Active', 'Inactive'] as CategoryStatus[]).map(s => {
                                                const cfg = STATUS_CFG[s]; const sel = form.status === s;
                                                return (
                                                    <button key={s} type="button" onClick={() => set('status', s)}
                                                        className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[11px] font-semibold transition-all"
                                                        style={{ background: sel ? cfg.bg : 'rgba(255,255,255,0.03)', color: sel ? cfg.color : 'rgba(255,255,255,0.3)', border: `1px solid ${sel ? cfg.border : 'rgba(255,255,255,0.07)'}` }}>
                                                        {cfg.icon} {s}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="px-4 py-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <span style={{ color: STATUS_CFG[form.status as CategoryStatus ?? 'Active'].color }}>{STATUS_CFG[form.status as CategoryStatus ?? 'Active'].icon}</span>
                                            <span className="text-white/55 text-[12px]">{form.status}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Accent Colour</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {ACCENT_COLORS.map(c => (
                                        <button key={c} type="button" disabled={!canEdit} onClick={() => set('color', c)}
                                            className="w-8 h-8 rounded-xl transition-all"
                                            style={{ background: c, opacity: !canEdit ? 0.4 : 1, outline: form.color === c ? `3px solid ${c}` : 'none', outlineOffset: '2px', transform: form.color === c ? 'scale(1.15)' : 'scale(1)' }} />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Category Icon</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(CATEGORY_ICONS).slice(0, 15).map(([key]) => {
                                        const sel = form.iconKey === key;
                                        return (
                                            <button key={key} type="button" disabled={!canEdit} onClick={() => set('iconKey', key)}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                                                style={{ background: sel ? `${form.color ?? ACCENT_COLORS[0]}20` : 'rgba(255,255,255,0.04)', border: `1px solid ${sel ? (form.color ?? ACCENT_COLORS[0]) + '50' : 'rgba(255,255,255,0.07)'}`, color: sel ? (form.color ?? ACCENT_COLORS[0]) : 'rgba(255,255,255,0.3)', cursor: !canEdit ? 'not-allowed' : 'pointer' }}>
                                                <CatIcon iconKey={key} className="w-4 h-4" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div>
                                    <p className="text-white/70 text-[12px] font-semibold">Featured Category</p>
                                    <p className="text-white/28 text-[10px] mt-0.5">Shown in homepage featured sections</p>
                                </div>
                                {canEdit && PERMS.featureToggle() ? (
                                    <button type="button" onClick={() => set('featured', !form.featured)}
                                        className="w-11 h-6 rounded-full transition-all relative shrink-0"
                                        style={{ background: form.featured ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
                                        <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.featured ? 'calc(100% - 20px)' : '4px' }} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="text-white/30 text-[12px]">{form.featured ? 'Yes' : 'No'}</span>
                                        {canEdit && <span className="text-white/18 text-[9px] flex items-center gap-1"></span>}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'media' && (
                        <div className="space-y-6">
                            <SingleImageDrop image={form.image ?? null} onChange={(img: any) => set('image', img)} disabled={!canEdit} label="Category Image (thumbnail)" />
                            <SingleImageDrop image={form.bannerImage ?? null} onChange={(img: any) => set('bannerImage', img)} disabled={!canEdit} label="Banner Image (1600 × 400px recommended)" />
                            {!isView && (
                                <div className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="text-white/28 text-[10px] leading-relaxed">
                                        Thumbnail: 600×400 px · Banner: 1600×400 px · JPG, PNG, or WEBP · Max 5 MB each.
                                        Images are resized automatically on upload.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {tab === 'seo' && (
                        <>
                            {!PERMS.editSEO() ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.14)' }}>
                                        <Lock className="w-4 h-4 text-amber-400/55 shrink-0" />
                                        <p className="text-amber-400/55 text-[11px]">SEO settings are available.</p>
                                    </div>
                                    {[{ label: 'Meta Title', val: form.seo?.title }, { label: 'Meta Description', val: form.seo?.description }, { label: 'Keywords', val: form.seo?.keywords }].map(r => (
                                        <div key={r.label}>
                                            <FieldLabel>{r.label}</FieldLabel>
                                            <p className="px-4 py-3 rounded-xl text-[12px] text-white/38" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{r.val || '—'}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <FieldLabel>Meta Title</FieldLabel>
                                        <TextInput value={form.seo?.title ?? ''} disabled={!canEdit} placeholder="Title for search engines" onChange={(v: string) => set('seo.title', v)} />
                                        <p className="text-white/20 text-[9px] mt-1">{(form.seo?.title ?? '').length}/60 chars</p>
                                    </div>
                                    <div>
                                        <FieldLabel>Meta Description</FieldLabel>
                                        <textarea value={form.seo?.description ?? ''} disabled={!canEdit} rows={3}
                                            onChange={e => set('seo.description', e.target.value)} placeholder="Brief description for search results (160 chars)"
                                            className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/18 resize-none disabled:opacity-40"
                                            style={{ background: 'rgba(255,255,255,0.05)' }} />
                                        <p className="text-white/20 text-[9px] mt-1">{(form.seo?.description ?? '').length}/160 chars</p>
                                    </div>
                                    <div>
                                        <FieldLabel>Keywords</FieldLabel>
                                        <TextInput value={form.seo?.keywords ?? ''} disabled={!canEdit} placeholder="comma, separated, keywords" onChange={(v: string) => set('seo.keywords', v)} />
                                    </div>
                                    {/* Preview */}
                                    <div className="p-4 rounded-xl space-y-1.5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-white/25 text-[9px] uppercase tracking-wider mb-3">Search Preview</p>
                                        <p className="text-blue-400 text-[13px] font-medium leading-tight">{form.seo?.title || form.name || 'Category Title'}</p>
                                        <p className="text-green-400/65 text-[10px]">aarah.com/collections/{form.slug || 'category-slug'}</p>
                                        <p className="text-white/35 text-[11px] leading-relaxed">{form.seo?.description || 'Meta description will appear here…'}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'products' && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-white/50 text-[12px] font-medium">{form.productCount ?? 0} products assigned</p>
                            </div>
                            {loadingProducts ? (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <RefreshCw className="w-5 h-5 text-white/20 animate-spin mb-2" />
                                    <p className="text-white/30 text-[11px]">Loading products...</p>
                                </div>
                            ) : categoryProducts.length > 0 ? (
                                <div className="space-y-2">
                                    {categoryProducts.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <div className="w-9 h-11 rounded-lg shrink-0 flex items-center justify-center" style={{ background: `${form.color ?? ACCENT_COLORS[0]}15` }}>
                                                <Package className="w-4 h-4" style={{ color: form.color ?? ACCENT_COLORS[0] }} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white/70 text-[11px] font-medium truncate">{p.name}</p>
                                                <p className="text-white/25 text-[10px] font-mono">{p.sku}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-white/55 text-[11px] font-semibold">₹{p.price?.toLocaleString('en-IN')}</span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                                                    style={{ background: p.status === 'Active' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: p.status === 'Active' ? '#22c55e' : '#f59e0b' }}>
                                                    {p.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                    {(form.productCount ?? 0) > categoryProducts.length && (
                                        <p className="text-white/20 text-[10px] text-center pt-2">+{(form.productCount ?? 0) - categoryProducts.length} more products…</p>
                                    )}
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                        <Package className="w-6 h-6 text-white/12" />
                                    </div>
                                    <p className="text-white/25 text-[12px]">No products assigned yet</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t flex items-center gap-3 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
                    {isView ? (
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/45 hover:text-white transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            Close
                        </button>
                    ) : (
                        <>
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/38 hover:text-white transition-colors">Cancel</button>
                            <button type="button" onClick={handleSave} disabled={saving}
                                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-65">
                                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                {saving ? 'Saving…' : isAdd ? 'Create Category' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Merge Dialog ────────────────────────────────────────────────────────────
function MergeDialog({ source, allCategories, onMerge, onClose }: any) {
    const [target, setTarget] = useState('');
    const options = allCategories.filter((c: Category) => c.id !== source.id);

    return (
        <>
            <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={onClose} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[400px]"
                style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(99,102,241,0.12)' }}>
                    <Merge className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-white font-bold text-[15px] mb-1">Merge Category</p>
                <p className="text-white/40 text-[12px] leading-relaxed mb-5">
                    All products from <span className="text-white/70 font-semibold">"{source.name}"</span> will be moved to the target category, then this category will be deleted. This cannot be undone.
                </p>
                <div className="mb-5">
                    <label className="text-white/35 text-[9px] uppercase tracking-widest font-semibold block mb-2">Merge Into</label>
                    <div className="relative">
                        <select value={target} onChange={e => setTarget(e.target.value)}
                            className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.1]"
                            style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <option value="">— Select target category —</option>
                            {options.map((c: Category) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/45 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                    <button type="button" disabled={!target} onClick={() => target && onMerge(target)}
                        className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                        style={{ background: 'rgba(99,102,241,0.7)' }}>
                        Merge &amp; Delete Source
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── CategoryCard ────────────────────────────────────────────────────────────
function CategoryCard({ cat, depth = 0, isSelected, onSelect, onView, onEdit, onAddSub, onDelete, onMerge, dragHandleProps, isDragging, isDropTarget }: any) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    const cfg = STATUS_CFG[cat.status as CategoryStatus];
    const imageUrl = typeof cat.image === 'string' ? cat.image : cat.image?.url;

    return (
        <div className={`group relative rounded-2xl transition-all duration-150 ${isDragging ? 'opacity-40 scale-[0.98]' : ''} ${isDropTarget ? 'ring-2' : ''}`}
            style={{ border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : isDropTarget ? cat.color : 'rgba(255,255,255,0.07)'}`, background: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(18,18,18,0.9)', boxShadow: isDropTarget ? `0 0 0 2px ${cat.color}40` : 'none' }}>

            <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full" style={{ background: cat.color }} />

            <div className="p-4 pl-5">
                <div className="flex items-start gap-3">
                    {PERMS.reorder() && (
                        <div className="mt-0.5 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-white/25 hover:text-white/50" {...dragHandleProps}>
                            <GripVertical className="w-4 h-4" />
                        </div>
                    )}

                    {PERMS.bulkActions() && (
                        <button type="button" onClick={onSelect}
                            className="w-4 h-4 rounded flex items-center justify-center mt-0.5 shrink-0 transition-all opacity-0 group-hover:opacity-100"
                            style={{ background: isSelected ? '#fff' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                        </button>
                    )}

                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all overflow-hidden"
                        style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}30`, color: cat.color }}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                        ) : (
                            <CatIcon iconKey={cat.iconKey} className="w-5 h-5" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/85 text-[13px] font-semibold truncate">{cat.name}</span>
                            {cat.featured && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: cfg?.bg, color: cfg?.color }}>{cfg?.icon} {cat.status}</span>
                        </div>
                        <p className="text-white/28 text-[10px] font-mono mt-0.5">/{cat.slug}</p>
                        {cat.shortDescription && <p className="text-white/38 text-[11px] mt-1.5 line-clamp-1">{cat.shortDescription}</p>}
                    </div>

                    <div ref={menuRef} className="relative shrink-0">
                        <button type="button" onClick={() => setMenuOpen(s => !s)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/6 transition-all">
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuOpen && (
                            <div className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden min-w-[170px] z-50 animate-in fade-in zoom-in-95 duration-200"
                                style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
                                <button type="button" onClick={() => { onView(); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/60 hover:text-white text-[11px]">
                                    <Eye className="w-3.5 h-3.5" /> View details
                                </button>
                                <button type="button" onClick={() => { onEdit(); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/60 hover:text-white text-[11px]">
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                                {cat.parentId === null && (
                                    <button type="button" onClick={() => { onAddSub(); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/60 hover:text-white text-[11px]">
                                        <Plus className="w-3.5 h-3.5" /> Add sub-category
                                    </button>
                                )}
                                {PERMS.merge() && (
                                    <button type="button" onClick={() => { onMerge(); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/5 transition-colors text-left text-white/60 hover:text-white text-[11px]">
                                        <Merge className="w-3.5 h-3.5" /> Merge into…
                                    </button>
                                )}
                                {PERMS.delete() && (
                                    <>
                                        <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                        <button type="button" onClick={() => { onDelete(); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-400/8 transition-colors text-left text-red-400/70 hover:text-red-400 text-[11px]">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: cat.color }} />
                        <span className="text-white/50 text-[11px]"><span className="font-semibold text-white/70">{cat.productCount}</span> products</span>
                    </div>
                    {cat.image && <span className="text-white/25 text-[10px]">Has image</span>}
                    {cat.bannerImage && <span className="text-white/25 text-[10px]">Has banner</span>}
                    <span className="text-white/20 text-[10px] ml-auto">{fmtDate(cat.updatedAt)}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Main Page Wrapper ───────────────────────────────────────────────────────
export default function AdminCategoriesPage() {
    const { items: toastItems, toast, remove: removeToast } = useToast();

    const { currentUser, isMounted, handleLogout } = useAdminAuth();

    if (!isMounted || !currentUser) return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0e' }}>
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
    );

    return <CategoriesView currentUser={currentUser} onLogout={handleLogout} toast={toast} toastItems={toastItems} removeToast={removeToast} />;
}

// ─── CategoriesView (The Main UI logic) ──────────────────────────────────────
function CategoriesView({ currentUser, onLogout, toast, toastItems, removeToast }: any) {

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [sortBy, setSortBy] = useState('sortOrder');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('tree');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const [drawer, setDrawer] = useState<{ category: Category | null; mode: DrawerMode; defaultParentId?: string | null } | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
    const [mergeTarget, setMergeTarget] = useState<Category | null>(null);

    const [dragId, setDragId] = useState<string | null>(null);
    const [dropId, setDropId] = useState<string | null>(null);
    const fetchErrorToastShownRef = useRef(false);
    const hasLoadedOnceRef = useRef(false);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(search), 360);
    }, [search]);

    // FETCH FROM REAL API
    const fetchCats = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const qs = new URLSearchParams();
            if (debouncedSearch.trim()) qs.set('search', debouncedSearch.trim());
            if (filterStatus !== 'All') qs.set('status', filterStatus);
            qs.set('sort', sortBy);
            const res = await authFetch(`${API_URL}/api/admin/categories?${qs}`);

            if (!res.ok) throw new Error('Failed to fetch');

            const data = await res.json();
            // eslint-disable-next-line no-console
            console.log('RAW ADMIN CATEGORY RESPONSE:', data);

            const statusToUi = (raw: unknown, activeFlag: unknown): CategoryStatus => {
                const val = String(raw ?? '').trim().toUpperCase();
                if (val === 'ACTIVE') return 'Active';
                if (typeof activeFlag === 'boolean') return activeFlag ? 'Active' : 'Inactive';
                return 'Inactive';
            };

            let list: Category[] = extractList<any>(data).map((c: any) => ({
                id: String(c?.id ?? ''),
                name: String(c?.name ?? ''),
                slug: String(c?.slug ?? ''),
                description: String(c?.description ?? ''),
                shortDescription: String(c?.shortDescription ?? ''),
                parentId: c?.parentId != null ? String(c.parentId) : (c?.parent?.id != null ? String(c.parent.id) : null),
                color: String(c?.color ?? ACCENT_COLORS[0]),
                iconKey: String(c?.iconKey ?? 'tag'),
                image: normalizeMedia(c?.image, 'Category Image'),
                bannerImage: normalizeMedia(c?.bannerImage, 'Banner Image'),
                status: statusToUi(c?.status, c?.active),
                featured: Boolean(c?.featured ?? false),
                sortOrder: Number(c?.sortOrder ?? 0),
                productCount: Number(c?.productCount ?? 0),
                seo: {
                    title: String(c?.seo?.title ?? ''),
                    description: String(c?.seo?.description ?? ''),
                    keywords: String(c?.seo?.keywords ?? ''),
                },
                createdAt: String(c?.createdAt ?? new Date(0).toISOString()),
                updatedAt: String(c?.updatedAt ?? new Date(0).toISOString()),
                createdBy: String(c?.createdBy ?? ''),
            })).filter((c: Category) => c.id && c.name && c.slug);
            // eslint-disable-next-line no-console
            console.log('PARSED ADMIN CATEGORIES:', list);

            // Client-side filtering/sorting fallback in case backend doesn't handle it yet
            if (debouncedSearch.trim()) {
                const q = debouncedSearch.toLowerCase();
                list = list.filter((c: Category) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
            }
            if (filterStatus !== 'All') list = list.filter((c: Category) => c.status === filterStatus);

            switch (sortBy) {
                case 'sortOrder': list.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder); break;
                case 'name_az': list.sort((a: Category, b: Category) => a.name.localeCompare(b.name)); break;
                case 'newest': list.sort((a: Category, b: Category) => b.createdAt.localeCompare(a.createdAt)); break;
                case 'products': list.sort((a: Category, b: Category) => b.productCount - a.productCount); break;
            }

            setCategories(list);

            const sc: Record<string, number> = { All: list.length };
            for (const c of list) sc[c.status] = (sc[c.status] ?? 0) + 1;
            setStatusCounts(sc);
            fetchErrorToastShownRef.current = false;

        } catch {
            if (!fetchErrorToastShownRef.current) {
                fetchErrorToastShownRef.current = true;
                toast.error('Failed to load categories.');
            }
        }
        finally { setLoading(false); setRefreshing(false); }
    }, [debouncedSearch, filterStatus, sortBy]);

    useEffect(() => {
        fetchCats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!hasLoadedOnceRef.current) {
            hasLoadedOnceRef.current = true;
            return;
        }
        fetchCats();
    }, [debouncedSearch, filterStatus, sortBy, fetchCats]);

    useEffect(() => {
        if (categories.length > 0 && expandedIds.size === 0) {
            setExpandedIds(new Set(categories.filter(c => c.parentId === null).map(c => c.id)));
        }
    }, [categories]);

    const roots = useMemo(() => categories.filter(c => c.parentId === null), [categories]);
    const childrenOf = (id: string) => categories.filter(c => c.parentId === id);

    const stats = useMemo(() => ({
        total: statusCounts['All'] ?? 0,
        active: statusCounts['Active'] ?? 0,
        hidden: statusCounts['Hidden'] ?? 0,
        featured: categories.filter(c => c.featured).length,
        withProducts: categories.filter(c => c.productCount > 0).length,
        totalProducts: categories.reduce((s, c) => s + (c.productCount || 0), 0),
    }), [categories, statusCounts]);

    // API WRAPPERS
    const handleSave = useCallback(async (data: Partial<Category>, id?: string) => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/categories`, {
                method: id ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(id ? { ...data, id } : data)
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
            toast.success(`Category ${id ? 'updated' : 'created'}.`);
            setDrawer(null); fetchCats(true);
        } catch (err: any) { toast.error(err.message || 'Failed to save category.'); }
    }, [fetchCats, toast]);

    const handleDelete = useCallback(async (cat: Category) => {
        const children = categories.filter(c => c.parentId === cat.id);
        if (children.length > 0) {
            toast.error(`Cannot delete — ${children.length} sub-categories exist. Remove them first.`); setDeleteTarget(null); return;
        }
        try {
            const res = await authFetch(`${API_URL}/api/admin/categories/${cat.id}`, { method: 'DELETE' });

            if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
            setCategories(prev => prev.filter(c => c.id !== cat.id));
            toast.success(`"${cat.name}" deleted.`);
            setDeleteTarget(null);
        } catch (err: any) {
            toast.error(err.message || 'Delete failed.'); setDeleteTarget(null);
        }
    }, [categories, toast]);

    const handleMerge = useCallback(async (targetId: string) => {
        if (!mergeTarget) return;
        try {
            const res = await authFetch(`${API_URL}/api/admin/categories/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sourceId: mergeTarget.id, targetId })
            });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to merge');
            toast.success(`"${mergeTarget.name}" merged successfully.`);
            setMergeTarget(null); fetchCats(true);
        } catch (err: any) { toast.error(err.message || 'Merge failed.'); }
    }, [mergeTarget, fetchCats, toast]);

    const handleBulkStatus = useCallback(async (status: CategoryStatus) => {
        try {
            await Promise.all(Array.from(selected).map(async id => {
                const res = await authFetch(`${API_URL}/api/admin/categories`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status })
                });
                if (!res.ok) throw new Error();
            }));
            toast.success(`${selected.size} categories set to ${status}.`);
            setSelected(new Set()); fetchCats(true);
        } catch { toast.error('Bulk update failed.'); }
    }, [selected, fetchCats, toast]);

    const handleBulkDelete = useCallback(async () => {
        const ids = Array.from(selected);
        const results = await Promise.allSettled(
            ids.map(id =>
                authFetch(`${API_URL}/api/admin/categories/${id}`, { method: 'DELETE' }).then(res => { if (!res.ok) throw new Error(id); return id; })
            )
        );
        const succeeded = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value);
        const failCount  = results.filter(r => r.status === 'rejected').length;

        if (succeeded.length > 0) {
            setCategories(prev => prev.filter(c => !succeeded.includes(c.id)));
            setSelected(new Set(ids.filter(id => !succeeded.includes(id))));
        }
        if (failCount > 0) toast.error(`${failCount} categor${failCount > 1 ? 'ies' : 'y'} could not be deleted.`);
        if (succeeded.length > 0) toast.success(`${succeeded.length} ${succeeded.length > 1 ? 'categories' : 'category'} deleted.`);
    }, [selected, toast]);

    const handleExport = useCallback(() => {
        const csv = ['ID,Name,Slug,Parent,Status,Featured,Products,Created',
            ...categories.map(c => `${c.id},"${c.name}",${c.slug},"${c.parentId ? (categories.find(p => p.id === c.parentId)?.name ?? '') : ''}",${c.status},${c.featured},${c.productCount},${fmtDate(c.createdAt)}`)
        ].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `aarah-categories-${Date.now()}.csv`; a.click();
        toast.success('Export ready.');
    }, [categories, toast]);

    const handleReorder = useCallback(async (fromId: string, toId: string) => {
        if (fromId === toId) return;
        const from = categories.find(c => c.id === fromId);
        const to = categories.find(c => c.id === toId);
        if (!from || !to || from.parentId !== to.parentId) return;

        const siblings = categories.filter(c => c.parentId === from.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
        const fromIdx = siblings.findIndex(c => c.id === fromId);
        const toIdx = siblings.findIndex(c => c.id === toId);
        const reordered = [...siblings];
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        const updates = reordered.map((c, i) => ({ id: c.id, sortOrder: i + 1, parentId: c.parentId }));
        try {
            const res = await authFetch(`${API_URL}/api/admin/categories/reorder`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (!res.ok) throw new Error();
            fetchCats(true);
        } catch { toast.error('Reorder failed.'); }
    }, [categories, fetchCats, toast]);

    const toggleSelect = (id: string) => {
        if (!PERMS.bulkActions()) return;
        setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleAll = () => {
        if (!PERMS.bulkActions()) return;
        setSelected(s => s.size === categories.length ? new Set() : new Set(categories.map(c => c.id)));
    };
    const toggleExpand = (id: string) =>
        setExpandedIds(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    const activeFilters = [filterStatus !== 'All'].filter(Boolean).length;

    // Drag handlers
    const onDragStart = (id: string) => setDragId(id);
    const onDragOver = (e: React.DragEvent, id: string) => { e.preventDefault(); setDropId(id); };
    const onDrop = async (e: React.DragEvent, toId: string) => {
        e.preventDefault();
        if (dragId && dragId !== toId) await handleReorder(dragId, toId);
        setDragId(null); setDropId(null);
    };
    const onDragEnd = () => { setDragId(null); setDropId(null); };

    // Recursive Tree Node Renderer
    const renderTreeNode = (cat: Category, depth = 0) => {
        const children = childrenOf(cat.id);
        const expanded = expandedIds.has(cat.id);
        const hasKids = children.length > 0;

        return (
            <div key={cat.id}>
                <div className={`${depth > 0 ? 'ml-7 pl-4 border-l border-white/[0.05]' : ''}`}
                    draggable={PERMS.reorder()} onDragStart={() => onDragStart(cat.id)} onDragOver={e => onDragOver(e, cat.id)} onDrop={e => onDrop(e, cat.id)} onDragEnd={onDragEnd}>
                    <div className="flex items-start gap-2 mb-2">
                        {depth === 0 && (
                            <button type="button" onClick={() => toggleExpand(cat.id)}
                                className="w-7 h-7 mt-3.5 flex items-center justify-center rounded-lg text-white/25 hover:text-white/60 hover:bg-white/5 transition-all shrink-0">
                                {hasKids ? (expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="w-1 h-1 rounded-full bg-white/15" />}
                            </button>
                        )}
                        <div className={`flex-1 ${depth > 0 ? '' : 'mr-2'}`}>
                            <CategoryCard
                                cat={cat} depth={depth}
                                isSelected={selected.has(cat.id)}
                                onSelect={() => toggleSelect(cat.id)}
                                onView={() => setDrawer({ category: cat, mode: 'view' })}
                                onEdit={() => setDrawer({ category: cat, mode: 'edit' })}
                                onAddSub={() => setDrawer({ category: null, mode: 'add', defaultParentId: cat.id })}
                                onDelete={() => setDeleteTarget(cat)}
                                onMerge={() => setMergeTarget(cat)}
                                isDragging={dragId === cat.id}
                                isDropTarget={dropId === cat.id && dragId !== cat.id}
                            />
                        </div>
                    </div>
                    {expanded && hasKids && (
                        <div className="ml-9 space-y-2 mb-3">
                            {children.map(child => renderTreeNode(child, depth + 1))}
                            {PERMS.createSub() && (
                                <button type="button" onClick={() => setDrawer({ category: null, mode: 'add', defaultParentId: cat.id })}
                                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] text-white/28 hover:text-white/55 hover:bg-white/4 transition-all"
                                    style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                                    <Plus className="w-3.5 h-3.5" /> Add sub-category under {cat.name}
                                </button>
                            )}
                        </div>
                    )}
                    {expanded && !hasKids && PERMS.createSub() && depth === 0 && (
                        <div className="ml-9 mb-3">
                            <button type="button" onClick={() => setDrawer({ category: null, mode: 'add', defaultParentId: cat.id })}
                                className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] text-white/28 hover:text-white/55 hover:bg-white/4 transition-all"
                                style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                                <Plus className="w-3.5 h-3.5" /> Add sub-category
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen" style={{ background: '#0e0e0e', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}} ::-webkit-scrollbar{width:0;height:0} select option{background:#1a1a1a}`}</style>

            <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(14,14,14,0.97)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
                <div className="flex flex-col md:flex-row md:items-center gap-3 px-6 md:px-8 py-3">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <FolderTree className="w-4 h-4 text-white/55" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-[16px] tracking-tight leading-none" style={{ fontFamily: "'Georgia',serif" }}>Category Manager</h1>
                            <p className="text-white/25 text-[10px] mt-0.5 tracking-widest uppercase">{stats.total} Categories · {stats.totalProducts} Products</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 md:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search categories…"
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
                            {[['tree', FolderTree], ['grid', LayoutGrid], ['list', List]].map(([v, IconComponent]) => {
                                const Icon = IconComponent as React.ElementType;
                                return (
                                    <button key={v as string} type="button" onClick={() => setViewMode(v as ViewMode)}
                                        className={`p-2 rounded-lg transition-all ${viewMode === v ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </button>
                                );
                            })}
                        </div>

                        <button type="button" onClick={() => fetchCats(true)} disabled={refreshing}
                            className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>

                        {PERMS.export() && (
                            <button type="button" onClick={handleExport} className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all" style={{ background: 'rgba(255,255,255,0.04)' }} title="Export CSV">
                                <Download className="w-4 h-4" />
                            </button>
                        )}

                        {PERMS.createRoot() && (
                            <button type="button" onClick={() => setDrawer({ category: null, mode: 'add', defaultParentId: null })}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98]">
                                <Plus className="w-3.5 h-3.5" /> New Category
                            </button>
                        )}

                        <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                                    style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                                    {currentUser.avatar}
                                </div>
                                <span className="text-white/55 text-[11px] font-medium hidden md:block">{currentUser.name.split(' ')[0]}</span>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.38)' }}><Shield className="w-2.5 h-2.5 inline mr-0.5" />ADMIN</span>
                            </div>
                            <button type="button" onClick={onLogout} className="p-2 rounded-xl border border-white/[0.08] text-white/30 hover:text-red-400 hover:border-red-400/20 hover:bg-red-400/5 transition-all" style={{ background: 'rgba(255,255,255,0.03)' }} title="Logout">
                                <LogOut className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {showFilters && (
                    <div className="px-6 md:px-8 py-3 border-t flex flex-wrap items-center gap-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                        {[
                            { val: filterStatus, set: setFilterStatus, opts: [{ v: 'All', l: 'All Statuses' }, { v: 'Active', l: 'Active' }, { v: 'Hidden', l: 'Hidden' }] },
                            { val: sortBy, set: setSortBy, opts: [{ v: 'sortOrder', l: 'Sort Order' }, { v: 'name_az', l: 'Name A–Z' }, { v: 'newest', l: 'Newest' }, { v: 'products', l: 'Product Count' }] },
                        ].map((f, i) => (
                            <div key={i} className="relative">
                                <select value={f.val} onChange={e => f.set(e.target.value)} className="appearance-none pl-3 pr-7 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.08] cursor-pointer" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    {f.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                            </div>
                        ))}
                        {activeFilters > 0 && <button type="button" onClick={() => setFilterStatus('All')} className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"><X className="w-3 h-3" /> Clear</button>}
                    </div>
                )}
            </div>

            <div className="flex border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}>
                {[
                    { label: 'Total', val: stats.total, color: undefined },
                    { label: 'Active', val: stats.active, color: '#22c55e' },
                    { label: 'Hidden', val: stats.hidden, color: '#6b7280' },
                    { label: 'Featured', val: stats.featured, color: '#fbbf24' },
                    { label: 'Total Products', val: stats.totalProducts, color: 'rgba(255,255,255,0.5)' },
                ].map(s => (
                    <div key={s.label} className="flex-1 min-w-[100px] px-5 py-3 border-r" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-white/25 text-[9px] uppercase tracking-widest">{s.label}</p>
                        <p className="text-[22px] font-bold mt-0.5" style={{ color: s.color ?? '#fff', fontFamily: "'Georgia',serif" }}>{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 px-6 md:px-8 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(96,165,250,0.03)' }}>
                <Shield className="w-3 h-3 text-blue-400/50 shrink-0" />
                <p className="text-[10px] text-white/25">
                    Admin access: you can edit categories, add sub-categories, reorder, create root categories, run bulk actions, edit SEO, and merge.
                </p>
            </div>

            <div className="px-4 md:px-8 py-6">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 60}ms` }} />)}
                    </div>
                ) : categories.length === 0 ? (
                    <div className="py-28 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <FolderOpen className="w-8 h-8 text-white/10" />
                        </div>
                        <p className="text-white/25 text-sm">No categories found</p>
                        {PERMS.createRoot() && (
                            <button type="button" onClick={() => setDrawer({ category: null, mode: 'add', defaultParentId: null })}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all">
                                <Plus className="w-4 h-4" /> Create First Category
                            </button>
                        )}
                    </div>
                ) : viewMode === 'tree' ? (
                    <div className="space-y-3 max-w-4xl">
                        <div className="flex items-center gap-3 mb-4">
                            <button type="button" onClick={() => setExpandedIds(new Set(roots.map(c => c.id)))} className="text-[10px] text-white/28 hover:text-white/55 transition-colors">Expand all</button>
                            <span className="text-white/15">·</span>
                            <button type="button" onClick={() => setExpandedIds(new Set())} className="text-[10px] text-white/28 hover:text-white/55 transition-colors">Collapse all</button>
                            {PERMS.bulkActions() && categories.length > 0 && (
                                <>
                                    <span className="text-white/15">·</span>
                                    <button type="button" onClick={toggleAll} className="text-[10px] text-white/28 hover:text-white/55 transition-colors">
                                        {selected.size === categories.length ? 'Deselect all' : 'Select all'}
                                    </button>
                                </>
                            )}
                        </div>
                        {roots.map(cat => renderTreeNode(cat))}
                    </div>
                ) : viewMode === 'grid' ? (
                    <div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
                            {PERMS.createRoot() && (
                                <button type="button" onClick={() => setDrawer({ category: null, mode: 'add', defaultParentId: null })}
                                    className="rounded-2xl flex flex-col items-center justify-center gap-2 p-8 transition-all hover:bg-white/4 group"
                                    style={{ border: '2px dashed rgba(255,255,255,0.08)', minHeight: '180px' }}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <Plus className="w-5 h-5 text-white/30" />
                                    </div>
                                    <span className="text-white/25 text-[11px] font-medium">New Root Category</span>
                                </button>
                            )}
                            {categories.map((cat, i) => (
                                <div key={cat.id} style={{ animation: `fadeUp 0.28s ease forwards ${i * 25}ms`, opacity: 0 }}
                                    draggable={PERMS.reorder()} onDragStart={() => onDragStart(cat.id)} onDragOver={e => onDragOver(e, cat.id)} onDrop={e => onDrop(e, cat.id)} onDragEnd={onDragEnd}>
                                    <CategoryCard
                                        cat={cat}
                                        isSelected={selected.has(cat.id)} onSelect={() => toggleSelect(cat.id)}
                                        onView={() => setDrawer({ category: cat, mode: 'view' })} onEdit={() => setDrawer({ category: cat, mode: 'edit' })}
                                        onAddSub={() => setDrawer({ category: null, mode: 'add', defaultParentId: cat.id })}
                                        onDelete={() => setDeleteTarget(cat)} onMerge={() => setMergeTarget(cat)}
                                        isDragging={dragId === cat.id} isDropTarget={dropId === cat.id && dragId !== cat.id}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl border overflow-hidden max-w-6xl" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(20,20,20,0.9),rgba(16,16,16,0.95))' }}>
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {PERMS.bulkActions() && (
                                        <th className="px-5 py-4 w-10">
                                            <button type="button" onClick={toggleAll} className="w-4 h-4 rounded flex items-center justify-center transition-all" style={{ background: selected.size === categories.length && categories.length > 0 ? '#fff' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                                {selected.size === categories.length && categories.length > 0 ? <Check className="w-2.5 h-2.5 text-black" /> : selected.size > 0 ? <Minus className="w-2.5 h-2.5 text-white/60" /> : null}
                                            </button>
                                        </th>
                                    )}
                                    {['Category', 'Parent', 'Products', 'Status', 'Updated', ''].map(h => <th key={h} className="px-5 py-4 text-[9px] font-bold tracking-[0.18em] uppercase text-white/25 whitespace-nowrap">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((cat, i) => {
                                    const parent = cat.parentId ? categories.find(c => c.id === cat.parentId) : null;
                                    const isSel = selected.has(cat.id);
                                    const cfg = STATUS_CFG[cat.status];
                                    return (
                                        <tr key={cat.id} className="group cursor-pointer"
                                            style={{ borderBottom: i < categories.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', animation: `fadeUp 0.28s ease forwards ${i * 22}ms`, opacity: 0, background: isSel ? 'rgba(255,255,255,0.03)' : 'transparent', transition: 'background 0.1s' }}
                                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }} onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => setDrawer({ category: cat, mode: 'view' })}>
                                            {PERMS.bulkActions() && (
                                                <td className="px-5 py-3.5" onClick={e => { e.stopPropagation(); toggleSelect(cat.id); }}>
                                                    <div className="w-4 h-4 rounded flex items-center justify-center transition-all" style={{ background: isSel ? '#fff' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                                        {isSel && <Check className="w-2.5 h-2.5 text-black" />}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}18`, color: cat.color }}><CatIcon iconKey={cat.iconKey} className="w-4 h-4" /></div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-white/80 text-[12px] font-semibold truncate max-w-[180px]">{cat.name}</span>
                                                            {cat.featured && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                                                        </div>
                                                        <span className="text-white/25 text-[10px] font-mono">/{cat.slug}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {parent ? (
                                                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: parent.color }} /><span className="text-white/45 text-[11px]">{parent.name}</span></div>
                                                ) : <span className="text-white/25 text-[10px] px-2 py-0.5 rounded-md" style={{ background: 'rgba(255,255,255,0.05)' }}>Root</span>}
                                            </td>
                                            <td className="px-5 py-3.5"><span className="text-white/55 text-[12px] font-semibold">{cat.productCount}</span></td>
                                            <td className="px-5 py-3.5"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.icon} {cat.status}</span></td>
                                            <td className="px-5 py-3.5 text-white/28 text-[10px]">{fmtDate(cat.updatedAt)}</td>
                                            <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setDrawer({ category: cat, mode: 'edit' })} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/6 transition-all"><Edit3 className="w-3.5 h-3.5" /></button>
                                                    {PERMS.delete() && <button type="button" onClick={() => setDeleteTarget(cat)} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {selected.size > 0 && PERMS.bulkActions() && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl"
                    style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.14)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', animation: 'fadeUp 200ms ease forwards' }}>
                    <span className="text-white font-bold text-[13px]">{selected.size}</span>
                    <span className="text-white/40 text-[12px]">selected</span>
                    <div className="w-px h-5 bg-white/10 mx-1" />
                    <button type="button" onClick={() => handleBulkStatus('Active')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors" style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}><CheckCircle2 className="w-3.5 h-3.5" /> Set Active</button>
                    <button type="button" onClick={() => handleBulkStatus('Inactive')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/55 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.07)' }}><EyeOff className="w-3.5 h-3.5" /> Hide</button>
                    <button type="button" onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors" style={{ background: 'rgba(239,68,68,0.13)', color: '#f87171' }}><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                    <button type="button" onClick={() => setSelected(new Set())} className="text-white/30 hover:text-white/60 transition-colors ml-1"><X className="w-4 h-4" /></button>
                </div>
            )}

            {deleteTarget && (
                <>
                    <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setDeleteTarget(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[360px]" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}><Trash2 className="w-5 h-5 text-red-400" /></div>
                        <p className="text-white font-bold text-[15px] mb-1">Delete "{deleteTarget.name}"?</p>
                        <p className="text-white/38 text-[12px] leading-relaxed">
                            This will permanently remove the category.
                            {categories.filter(c => c.parentId === deleteTarget.id).length > 0 && <span className="text-amber-400/80"> This category has sub-categories — they must be removed first.</span>}
                            {deleteTarget.productCount > 0 && <span className="text-amber-400/80"> {deleteTarget.productCount} products are assigned to this category.</span>}
                        </p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                            <button type="button" onClick={() => handleDelete(deleteTarget)} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white active:scale-[0.98]" style={{ background: 'rgba(220,38,38,0.72)' }}>Delete</button>
                        </div>
                    </div>
                </>
            )}

            {mergeTarget && <MergeDialog source={mergeTarget} allCategories={categories} onMerge={handleMerge} onClose={() => setMergeTarget(null)} />}

            {drawer && (
                <CategoryDrawer
                    key={`${drawer.category?.id ?? 'new'}-${drawer.mode}`}
                    category={drawer.category} mode={drawer.mode}
                    allCategories={categories} currentUserId={currentUser.id}
                    defaultParentId={drawer.defaultParentId}
                    onSave={handleSave} onClose={() => setDrawer(null)}
                />
            )}

            <ToastContainer items={toastItems} remove={removeToast} />
        </div>
    );
}