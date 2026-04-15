'use client';

import { API_URL } from '@/lib/api';
import { processImageFile } from '@/lib/uploadImage';
import { PERMS } from '@/lib/permissions';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';

import {
    useState, useEffect, useCallback, useRef,
    DragEvent as RDragEvent
} from 'react';
import {
    X, ChevronDown, RefreshCw,
    Plus, Edit3, Trash2, Archive, Copy, Save,
    Eye, Download, Upload, Package, FileText, Globe,
    Grid3X3, List, SlidersHorizontal, CheckCircle2, XCircle,
    Clock, Shield, ShieldCheck, Star, Minus,
    Lock, AlertCircle, ShoppingBag, Check, Zap
} from 'lucide-react';

type ProductStatus = 'Active' | 'Draft' | 'Archived';
type StockLevel = 'in_stock' | 'low_stock' | 'out_of_stock';

interface ProductImage { id: string; url: string; alt: string; isPrimary: boolean; order: number; }
interface Variant { id: string; sku: string; size: string; color: string; colorHex: string; stock: number; }
interface Category { id: string; name: string; }

interface Product {
    id: string; name: string; slug: string; description: string; shortDescription: string;
    sku: string; barcode: string; categoryId: string; tags: string[]; images: ProductImage[];
    mrp: number; price: number; costPrice: number; gstPercent: number; hsnCode: string;
    status: ProductStatus; variants: Variant[]; totalStock: number;
    fabric: string;
    seo: { title: string; description: string; keywords: string; slug: string };
    featured: boolean; createdAt: string; updatedAt: string; createdBy: string;
}

interface ProductFormModalProps {
    product: Product | null;
    mode: 'add' | 'edit' | 'view';
    categories: Category[];
    currentUserId: string;
    onSave: (data: Partial<Product>, id?: string) => Promise<void>;
    onClose: () => void;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL'];
const FABRIC_LIST = ['Cotton', 'Mul Mul', 'Denim', 'Hakoba', 'Linen', 'Georgette'];
const PRESET_COLORS = [
    { name: 'Crimson Red', hex: '#dc2626' }, { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Emerald Green', hex: '#059669' }, { name: 'Blush Pink', hex: '#f472b6' },
    { name: 'Mustard Yellow', hex: '#fbbf24' }, { name: 'Midnight Black', hex: '#171717' },
    { name: 'Pure White', hex: '#f5f5f5' }
];
const GST_OPTIONS = [0, 5, 12, 18, 28];

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const getStockLevel = (stock: number): StockLevel => stock === 0 ? 'out_of_stock' : stock <= 5 ? 'low_stock' : 'in_stock';

const STATUS_CFG: Record<ProductStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    Active: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: <CheckCircle2 className="w-3 h-3" /> },
    Draft: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <Clock className="w-3 h-3" /> },
    Archived: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: <Archive className="w-3 h-3" /> },
};
const STOCK_CFG: Record<StockLevel, { label: string; color: string; bg: string }> = {
    in_stock: { label: 'In Stock', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    low_stock: { label: 'Low Stock', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    out_of_stock: { label: 'Out of Stock', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

type DrawerTab = 'general' | 'media' | 'pricing' | 'inventory' | 'seo';

const DRAWER_TABS: { id: DrawerTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'media', label: 'Media' },
    { id: 'pricing', label: 'Pricing' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'seo', label: 'SEO' },
];

const createBlankProduct = (categories: Category[]): Partial<Product> => ({
    name: '', slug: '', description: '', shortDescription: '', sku: '', barcode: '',
    categoryId: categories[0]?.id || '', tags: [], images: [],
    mrp: 0, price: 0, costPrice: 0, gstPercent: 5, hsnCode: '',
    status: 'Draft', variants: [], totalStock: 0,
    fabric: '',
    seo: { title: '', description: '', keywords: '', slug: '' },
    featured: false,
});

function FieldLabel({ children, locked }: { children: React.ReactNode; locked?: boolean }) {
    return (
        <label className="flex items-center gap-1.5 text-white/40 text-[9px] uppercase tracking-widest font-semibold mb-1.5">
            {children}
            {locked && <Lock className="w-2.5 h-2.5 text-white/20" />}
        </label>
    );
}

function Input({ value, onChange, placeholder, disabled, error, type = 'text', prefix, className = '' }: any) {
    return (
        <div>
            <div className="relative">
                {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-[13px] font-semibold select-none pointer-events-none">{prefix}</span>}
                <input type={type} value={value} onChange={e => onChange(e.target.value)}
                    placeholder={placeholder} disabled={disabled}
                    className={`w-full ${prefix ? 'pl-8' : 'px-4'} pr-4 py-3 rounded-xl text-[12px] text-white outline-none border placeholder:text-white/20 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: error ? '#ef4444' : 'rgba(255,255,255,0.09)' }} />
            </div>
            {error && <p className="text-red-400 text-[10px] mt-1">{error}</p>}
        </div>
    );
}

function StatusBadge({ status, size = 'sm' }: { status: ProductStatus; size?: 'sm' | 'md' }) {
    const cfg = STATUS_CFG[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap ${size === 'md' ? 'text-[11px] px-3 py-1.5' : 'text-[10px] px-2.5 py-1'}`}
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {status}
        </span>
    );
}

function StockBadge({ stock }: { stock: number }) {
    const lvl = getStockLevel(stock);
    const cfg = STOCK_CFG[lvl];
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>
            {stock} · {cfg.label}
        </span>
    );
}

function ImageDropzone({ images, onChange, disabled = false, maxImages = 8 }: any) {
    const safeImages = Array.isArray(images) ? images : [];

    const [dropping, setDropping] = useState(false);
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [overIdx, setOverIdx] = useState<number | null>(null);
    const [urlInput, setUrlInput] = useState('');
    const [showUrl, setShowUrl] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const processFiles = async (files: File[]) => {
        const allowed = Array.from(files)
            .filter(f => f.type.startsWith('image/'))
            .slice(0, maxImages - safeImages.length);

        setUploading(true);
        const newImages = (await Promise.all(
            allowed.map(async file => {
                const url = await processImageFile(file, 'product');
                if (!url) return null;
                return {
                    id: Math.random().toString(36).slice(2, 10),
                    url,
                    alt: file.name.replace(/\.[^/.]+$/, ''),
                };
            })
        )).filter(Boolean) as any[];

        const combined = [...safeImages, ...newImages];
        const hasPrimary = combined.some(im => im.isPrimary);
        const final = combined.map((im, i) => ({
            ...im,
            isPrimary: hasPrimary ? im.isPrimary : i === 0,
            order: i
        }));

        onChange(final);
        setUploading(false);
    };

    const handleDrop = (e: RDragEvent) => {
        e.preventDefault(); setDropping(false);
        processFiles(Array.from(e.dataTransfer.files));
    };

    const handleImgDrop = (e: RDragEvent, toIdx: number) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setOverIdx(null); return; }
        const next = [...safeImages];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(toIdx, 0, moved);
        onChange(next.map((im, i) => ({ ...im, isPrimary: i === 0, order: i })));
        setDragIdx(null); setOverIdx(null);
    };

    const remove = (id: string) => {
        const next = safeImages.filter((im: any) => im.id !== id);
        onChange(next.map((im: any, i: number) => ({ ...im, isPrimary: i === 0, order: i })));
    };

    const setPrimary = (id: string) => onChange(safeImages.map((im: any) => ({ ...im, isPrimary: im.id === id })));

    const addUrl = () => {
        if (!urlInput.trim()) return;
        onChange([...safeImages, { id: uid(), url: urlInput.trim(), alt: 'Product image', isPrimary: safeImages.length === 0, order: safeImages.length }]);
        setUrlInput(''); setShowUrl(false);
    };

    const canAdd = safeImages.length < maxImages && !disabled;

    return (
        <div className="space-y-3">
            {canAdd && (
                <div onDragOver={e => { e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
                    className="relative rounded-xl cursor-pointer flex flex-col items-center justify-center gap-2.5 py-9 transition-all duration-200"
                    style={{ border: `2px dashed ${dropping ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.1)'}`, background: dropping ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)' }}>
                    {uploading ? (
                        <RefreshCw className="w-5 h-5 text-white/40 animate-spin" />
                    ) : (
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <Upload className="w-5 h-5 text-white/40" />
                        </div>
                    )}
                    <div className="text-center">
                        <p className="text-white/55 text-[12px] font-medium">{uploading ? 'Uploading…' : 'Drop images or click to upload'}</p>
                        <p className="text-white/25 text-[10px] mt-0.5">PNG · JPG · WEBP · Max 5 MB · {safeImages.length}/{maxImages}</p>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => processFiles(Array.from(e.target.files ?? []))} />
                </div>
            )}

            {safeImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                    {safeImages.map((img: any, idx: number) => (
                        <div key={img.id} draggable={!disabled} onDragStart={() => setDragIdx(idx)} onDragOver={e => { e.preventDefault(); setOverIdx(idx); }} onDrop={e => handleImgDrop(e, idx)} onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                            className="relative rounded-xl overflow-hidden group transition-all duration-150"
                            style={{ aspectRatio: '4/5', background: 'rgba(255,255,255,0.04)', cursor: disabled ? 'default' : 'grab', opacity: dragIdx === idx ? 0.4 : 1, outline: overIdx === idx && dragIdx !== idx ? '2px solid rgba(255,255,255,0.4)' : 'none' }}>
                            <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                            {img.isPrimary && (
                                <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold" style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24' }}>
                                    <Star className="w-2.5 h-2.5" /> PRIMARY
                                </div>
                            )}
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.5)' }}>{idx + 1}</div>
                            {!disabled && (
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }}>
                                    <div className="flex gap-1">
                                        {!img.isPrimary && (
                                            <button onClick={e => { e.stopPropagation(); setPrimary(img.id); }} className="flex-1 py-1 rounded-md text-[8px] font-bold transition-colors" style={{ background: 'rgba(251,191,36,0.25)', color: '#fbbf24' }}>Set Primary</button>
                                        )}
                                        <button onClick={e => { e.stopPropagation(); remove(img.id); }} className="w-7 py-1 rounded-md flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.25)', color: '#f87171' }}><X className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {canAdd && (
                showUrl ? (
                    <div className="flex gap-2">
                        <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://…/image.jpg" onKeyDown={e => e.key === 'Enter' && addUrl()}
                            className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.1] placeholder:text-white/20" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <button onClick={addUrl} className="px-3 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all">Add</button>
                        <button onClick={() => { setShowUrl(false); setUrlInput(''); }} className="px-3 py-2 rounded-xl text-[11px] text-white/40 hover:text-white transition-colors">Cancel</button>
                    </div>
                ) : (
                    <button onClick={() => setShowUrl(true)} className="flex items-center gap-1.5 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                        <Globe className="w-3.5 h-3.5" /> Add by URL
                    </button>
                )
            )}
        </div>
    );
}

function VariantMatrix({ variants, onChange, disabled }: any) {
    const canManageMatrix = PERMS.editVariantMatrix() && !disabled;

    const [selSizes, setSelSizes] = useState<string[]>(() => {
        const unique: Record<string, boolean> = {};
        (variants || []).forEach((v: any) => { if (v.size) unique[v.size] = true; });
        return Object.keys(unique);
    });

    const [selColors, setSelColors] = useState<{ name: string; hex: string }[]>(() => {
        const unique: Record<string, { name: string; hex: string }> = {};
        (variants || []).forEach((v: any) => {
            if (v.color) unique[v.color] = { name: v.color, hex: v.colorHex };
        });
        return Object.values(unique);
    });
    const [showCustom, setShowCustom] = useState(false);
    const [customColor, setCustomColor] = useState({ name: '', hex: '#ffffff' });

    const rebuild = useCallback((sizes: string[], colors: { name: string; hex: string }[]) => {
        onChange(sizes.flatMap(size => colors.map(col => {
            const ex = variants.find((v: any) => v.size === size && v.color === col.name);
            return ex ?? { id: uid(), size, color: col.name, colorHex: col.hex, stock: 0, sku: `SKU-${uid()}` };
        })));
    }, [variants, onChange]);

    const toggleSize = (size: string) => {
        if (!canManageMatrix) return;
        const next = selSizes.includes(size) ? selSizes.filter(s => s !== size) : [...selSizes, size];
        setSelSizes(next); rebuild(next, selColors);
    };

    const toggleColor = (col: { name: string; hex: string }) => {
        if (!canManageMatrix) return;
        const next = selColors.find(c => c.name === col.name) ? selColors.filter(c => c.name !== col.name) : [...selColors, col];
        setSelColors(next); rebuild(selSizes, next);
    };

    const addCustom = () => {
        if (!customColor.name.trim()) return;
        const col = { name: customColor.name.trim(), hex: customColor.hex };
        const next = [...selColors, col];
        setSelColors(next); rebuild(selSizes, next);
        setCustomColor({ name: '', hex: '#ffffff' }); setShowCustom(false);
    };

    const updateStock = (id: string, v: number) => onChange(variants.map((vt: any) => vt.id === id ? { ...vt, stock: Math.max(0, v) } : vt));
    const updateSku = (id: string, sku: string) => onChange(variants.map((vt: any) => vt.id === id ? { ...vt, sku } : vt));
    const total = variants.reduce((s: number, v: any) => s + v.stock, 0);

    return (
        <div className="space-y-5">
            <div>
                <div className="flex items-center justify-between mb-2">
                    <FieldLabel locked={!canManageMatrix}>Sizes</FieldLabel>
                    {!canManageMatrix && <span className="text-white/20 text-[9px]"></span>}
                </div>
                <div className="flex flex-wrap gap-2">
                    {SIZES.map(size => {
                        const active = selSizes.includes(size);
                        return (
                            <button key={size} onClick={() => toggleSize(size)} disabled={!canManageMatrix}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                                style={{ background: active ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.04)', color: active ? '#fff' : 'rgba(255,255,255,0.3)', border: `1px solid ${active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`, cursor: !canManageMatrix ? 'not-allowed' : 'pointer' }}>
                                {size}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <FieldLabel locked={!canManageMatrix}>Colours</FieldLabel>
                <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(col => {
                        const active = selColors.find(c => c.name === col.name);
                        return (
                            <button key={col.name} onClick={() => toggleColor(col)} disabled={!canManageMatrix} title={col.name}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                                style={{ background: active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.07)'}`, color: active ? '#fff' : 'rgba(255,255,255,0.3)', cursor: !canManageMatrix ? 'not-allowed' : 'pointer' }}>
                                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: col.hex, boxShadow: col.hex === '#f5f5f5' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : 'none' }} />
                                {col.name}
                            </button>
                        );
                    })}
                    {selColors.filter(c => !PRESET_COLORS.find(p => p.name === c.name)).map(col => (
                        <button key={col.name} onClick={() => toggleColor(col)} disabled={!canManageMatrix}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-all"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.22)', color: '#fff' }}>
                            <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: col.hex }} />
                            {col.name}
                        </button>
                    ))}
                    {canManageMatrix && (
                        showCustom ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <input type="color" value={customColor.hex} onChange={e => setCustomColor(p => ({ ...p, hex: e.target.value }))} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent" />
                                <input value={customColor.name} onChange={e => setCustomColor(p => ({ ...p, name: e.target.value }))} placeholder="Name" onKeyDown={e => e.key === 'Enter' && addCustom()} className="w-20 bg-transparent text-white text-[11px] outline-none placeholder:text-white/20" />
                                <button onClick={addCustom} className="text-green-400 hover:text-green-300 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => setShowCustom(false)} className="text-white/30 hover:text-white/60 transition-colors"><X className="w-3.5 h-3.5" /></button>
                            </div>
                        ) : (
                            <button onClick={() => setShowCustom(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] text-white/30 hover:text-white/60 transition-colors" style={{ border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Plus className="w-3 h-3" /> Custom
                            </button>
                        )
                    )}
                </div>
            </div>

            {variants.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-white/40 text-[9px] font-semibold uppercase tracking-widest">Stock Matrix</p>
                        <span className="text-white/30 text-[10px]">Total: <span className="text-white font-bold">{total}</span></span>
                    </div>
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    {['Size', 'Colour', 'SKU', 'Stock'].map(h => <th key={h} className="px-3 py-2.5 text-[9px] font-bold tracking-widest uppercase text-white/25">{h}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((v: any, i: number) => (
                                    <tr key={v.id} style={{ borderBottom: i < variants.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                                        <td className="px-3 py-2.5 text-white/60 text-[11px] font-medium">{v.size}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: v.colorHex }} />
                                                <span className="text-white/60 text-[11px]">{v.color}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {!disabled ? (
                                                <input value={v.sku} onChange={e => updateSku(v.id, e.target.value)} disabled={!PERMS.editVariantMatrix()}
                                                    className="w-28 bg-transparent text-white/45 text-[10px] font-mono outline-none border-b border-white/[0.07] focus:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" />
                                            ) : <span className="text-white/30 text-[10px] font-mono">{v.sku}</span>}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            {!disabled ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button onClick={() => updateStock(v.id, v.stock - 1)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"><Minus className="w-3 h-3" /></button>
                                                    <input type="number" value={v.stock} onChange={e => updateStock(v.id, parseInt(e.target.value) || 0)}
                                                        className="w-12 text-center py-1 rounded-lg text-[12px] font-semibold text-white outline-none border border-white/[0.08] focus:border-white/20"
                                                        style={{ background: 'rgba(255,255,255,0.06)' }} />
                                                    <button onClick={() => updateStock(v.id, v.stock + 1)} className="w-6 h-6 rounded-md flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-all"><Plus className="w-3 h-3" /></button>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: STOCK_CFG[getStockLevel(v.stock)].bg, color: STOCK_CFG[getStockLevel(v.stock)].color }}>
                                                        {STOCK_CFG[getStockLevel(v.stock)].label}
                                                    </span>
                                                </div>
                                            ) : <StockBadge stock={v.stock} />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ProductFormModal({ product, mode, categories, currentUserId, onSave, onClose }: ProductFormModalProps) {
    const isView = mode === 'view';
    const isEdit = mode === 'edit';
    const isAdd = mode === 'add';
    const canEdit = isEdit || isAdd;

    const [tab, setTab] = useState<DrawerTab>('general');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [tagInput, setTagInput] = useState('');

    const [form, setForm] = useState<Partial<Product>>(() => product ? { ...product } : { ...createBlankProduct(categories), createdBy: currentUserId });

    useEffect(() => {
        setForm(product ? { ...product } : { ...createBlankProduct(categories), createdBy: currentUserId });
        setTab('general');
        setErrors({});
    }, [product?.id, mode, currentUserId]);

    /** When categories load after open, default category for new product only (avoid wiping edit loads). */
    useEffect(() => {
        if (product != null || mode !== 'add') return;
        setForm(prev => {
            if (prev.categoryId) return prev;
            const first = categories[0]?.id;
            return first ? { ...prev, categoryId: first } : prev;
        });
    }, [categories, product, mode]);

    const set = useCallback((key: string, val: unknown) => {
        setForm(prev => {
            const keys = key.split('.');
            if (keys.length === 1) return { ...prev, [key]: val };
            return { ...prev, [keys[0]]: { ...(prev as Record<string, unknown>)[keys[0]] as object, [keys[1]]: val } };
        });
    }, []);

    useEffect(() => {
        if (!product?.id || mode === 'add') return;
        let cancelled = false;
        (async () => {
            try {
                const [pr, vr] = await Promise.all([
                    authFetch(`${API_URL}/api/admin/products/${product.id}`),
                    authFetch(`${API_URL}/api/admin/products/${product.id}/variants`),
                ]);
                if (!pr.ok || !vr.ok) return;
                const prodPayload = await safeJson<any>(pr, {});
                const variantsPayload = await safeJson<any>(vr, {});
                const prod = unwrapApiResponse<any>(prodPayload);
                const variantsRaw = unwrapApiResponse<any>(variantsPayload);
                if (cancelled || !prod) return;
                const arr = Array.isArray(variantsRaw) ? variantsRaw : [];
                const vRows = arr.map((v: any) => {
                    const colorName = v.color ?? '';
                    const hex = PRESET_COLORS.find(p => p.name === colorName)?.hex ?? '#6b7280';
                    return {
                        id: String(v.id),
                        sku: '',
                        size: String(v.size ?? ''),
                        color: colorName,
                        colorHex: hex,
                        stock: Number(v.stock) || 0,
                    };
                });
                const prices = arr.map((v: any) => Number(v.variantPrice)).filter((n: number) => Number.isFinite(n) && n > 0);
                const minP = prices.length ? Math.min(...prices) : 0;
                const catId = prod.category?.id != null ? String(prod.category.id) : '';
                setForm(prev => {
                    const prevSeo = prev.seo ?? { title: '', description: '', keywords: '', slug: '' };
                    return {
                        ...prev,
                        name: prod.name ?? prev.name,
                        slug: prod.slug ?? prev.slug,
                        description: prod.description ?? prev.description,
                        fabric: prod.fabric ?? prev.fabric,
                        categoryId: catId || prev.categoryId || '',
                        featured: Boolean(prod.bestSeller ?? prod.isBestSeller),
                        status: prod.isActive === true ? 'Active' : 'Draft',
                        price: minP > 0 ? minP : prev.price,
                        variants: vRows.length ? vRows : prev.variants,
                        totalStock: vRows.reduce((s: number, v: { stock: number }) => s + v.stock, 0),
                        seo: {
                            title: prevSeo.title,
                            description: prevSeo.description,
                            keywords: prevSeo.keywords,
                            slug: prod.slug ?? prevSeo.slug,
                        },
                    };
                });
            } catch (err) {
                console.error('[admin] failed to load product detail', err);
            }
        })();
        return () => { cancelled = true; };
    }, [product?.id, mode]);

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.name?.trim()) e.name = 'Product name is required';
        const cat = form.categoryId;
        if (cat === undefined || cat === null || String(cat).trim() === '') {
            e.categoryId = 'Category is required';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) { setTab('general'); return; }
        setSaving(true);
        try {
            const payload = {
                ...form,
                totalStock: (form.variants ?? []).reduce((s: number, v: any) => s + v.stock, 0),
                updatedAt: new Date().toISOString(),
            };
            await onSave(payload, product?.id);
        } finally {
            setSaving(false);
        }
    };

    const addTag = (t: string) => {
        const tag = t.trim().toLowerCase();
        if (!tag || (form.tags ?? []).includes(tag)) return;
        set('tags', [...(form.tags ?? []), tag]);
        setTagInput('');
    };

    const removeTag = (tag: string) => set('tags', (form.tags ?? []).filter((t: string) => t !== tag));

    const discountPct = form.mrp && form.price && form.mrp > form.price ? Math.round((1 - form.price / form.mrp) * 100) : 0;
    const margin = form.costPrice && form.price && form.price > 0 ? Math.round(((form.price - form.costPrice) / form.price) * 100) : null;
    const tabsVisible = DRAWER_TABS;

    return (
        <>
            <div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
            <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
                style={{ width: 'min(680px,100vw)', background: '#111', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-40px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 260ms cubic-bezier(0.32,0.72,0,1) forwards' }}>

                <style>{`
                    @keyframes slideInRight {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                    ::-webkit-scrollbar { width: 0; height: 0; }
                    input[type=number]::-webkit-inner-spin-button,
                    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                `}</style>

                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
                        <div>
                            <h2 className="text-white font-bold text-[15px]" style={{ fontFamily: "'Georgia', serif" }}>
                                {isAdd ? 'New Product' : isEdit ? 'Edit Product' : 'Product Details'}
                            </h2>
                            {product && <p className="text-white/25 text-[10px] mt-0.5 font-mono">{product.id} · Updated {fmtDate(product.updatedAt)}</p>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {form.featured && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}><Star className="w-2.5 h-2.5" /> FEATURED</span>}
                        {form.status && <StatusBadge status={form.status as ProductStatus} size="md" />}
                    </div>
                </div>

                <div className="flex px-6 pt-3 border-b shrink-0 overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.07)', scrollbarWidth: 'none' }}>
                    {tabsVisible.map(t => (
                        <button key={t.id} type="button" onClick={() => setTab(t.id)}
                            className="flex items-center gap-1.5 pb-3 px-1 mr-6 text-[11px] font-semibold whitespace-nowrap transition-all border-b-2 shrink-0"
                            style={{ color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.3)', borderColor: tab === t.id ? '#fff' : 'transparent' }}>
                            {t.label}
                            {t.id === 'general' && (errors.name || errors.categoryId) && <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-0.5" />}
                            {t.id === 'pricing' && errors.price && <span className="w-1.5 h-1.5 rounded-full bg-red-400 ml-0.5" />}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4" style={{ scrollbarWidth: 'none' }}>
                    {tab === 'general' && (
                        <>
                            <div>
                                <FieldLabel>Product Name *</FieldLabel>
                                <Input value={form.name ?? ''} disabled={!canEdit} error={errors.name} placeholder="e.g. Anarkali Embroidered Kurta"
                                    onChange={(v: string) => { set('name', v); if (isAdd) { set('slug', slugify(v)); set('seo.slug', slugify(v)); set('seo.title', v + ' | AARAH'); } }} />
                            </div>
                            <div>
                                <FieldLabel>Short Description</FieldLabel>
                                <Input value={form.shortDescription ?? ''} disabled={!canEdit} placeholder="One-line tagline for listings" onChange={(v: string) => set('shortDescription', v)} />
                            </div>
                            <div>
                                <FieldLabel>Full Description</FieldLabel>
                                <textarea value={form.description ?? ''} disabled={!canEdit} rows={4} onChange={e => set('description', e.target.value)} placeholder="Detailed product description…"
                                    className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/20 resize-none disabled:opacity-50"
                                    style={{ background: 'rgba(255,255,255,0.05)' }} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel>SKU *</FieldLabel>
                                    <Input value={form.sku ?? ''} disabled={!canEdit} error={errors.sku} placeholder="AEK-001" onChange={(v: string) => set('sku', v.toUpperCase())} prefix="#" />
                                </div>
                                <div>
                                    <FieldLabel>Barcode / EAN</FieldLabel>
                                    <Input value={form.barcode ?? ''} disabled={!canEdit} placeholder="8901234567890" onChange={(v: string) => set('barcode', v)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <FieldLabel locked={!PERMS.manageCategories()}>Category</FieldLabel>
                                    <div className="relative">
                                        <select value={form.categoryId ?? ''} disabled={!canEdit || !PERMS.manageCategories()} onChange={e => set('categoryId', e.target.value)}
                                            className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] disabled:opacity-50 disabled:cursor-not-allowed"
                                            style={{ background: 'rgba(255,255,255,0.05)', borderColor: errors.categoryId ? '#ef4444' : undefined }}>
                                            {categories.length === 0 && <option value="">Loading categories…</option>}
                                            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                                    </div>
                                    {errors.categoryId && <p className="text-red-400 text-[10px] mt-1">{errors.categoryId}</p>}
                                    {!PERMS.manageCategories() && canEdit && <p className="text-white/20 text-[9px] mt-1 flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> </p>}
                                </div>
                                <div>
                                    <FieldLabel locked={!PERMS.publishProduct()}>Status</FieldLabel>
                                    {canEdit && PERMS.publishProduct() ? (
                                        <div className="relative">
                                            <select value={form.status ?? 'Draft'} onChange={e => set('status', e.target.value as ProductStatus)}
                                                className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09]"
                                                style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <option value="Draft">Draft</option><option value="Active">Active</option>
                                                {PERMS.archiveProduct() && <option value="Archived">Archived</option>}
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                                        </div>
                                    ) : (
                                        <div className="px-4 py-3 rounded-xl flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                            <StatusBadge status={(form.status as ProductStatus) ?? 'Draft'} />
                                            {canEdit && <p className="text-white/20 text-[9px] flex items-center gap-1"><Lock className="w-2.5 h-2.5" /> </p>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Tags</FieldLabel>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {(form.tags ?? []).map((tag: string) => (
                                        <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                                            {tag}
                                            {canEdit && <button type="button" onClick={() => removeTag(tag)} className="hover:text-white transition-colors ml-0.5"><X className="w-2.5 h-2.5" /></button>}
                                        </span>
                                    ))}
                                </div>
                                {canEdit && (
                                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }} placeholder="Type and press Enter to add"
                                        className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/20" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                )}
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div><p className="text-white/70 text-[12px] font-semibold">Featured Product</p><p className="text-white/30 text-[10px] mt-0.5">Shown on homepage and featured sections</p></div>
                                {canEdit && PERMS.featureProduct() ? (
                                    <button type="button" onClick={() => set('featured', !form.featured)} className="w-11 h-6 rounded-full transition-all relative shrink-0" style={{ background: form.featured ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
                                        <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: form.featured ? 'calc(100% - 20px)' : '4px' }} />
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-2"><span className="text-white/30 text-[12px] font-semibold">{form.featured ? 'Yes' : 'No'}</span>{canEdit && <span className="text-white/20 text-[9px] flex items-center gap-1"></span>}</div>
                                )}
                            </div>
                        </>
                    )}

                    {tab === 'media' && (
                        <>
                            <div className="flex items-center justify-between">
                                <div><p className="text-white/70 text-[13px] font-semibold">Product Images</p><p className="text-white/30 text-[10px] mt-0.5">Drag thumbnails to reorder · First image is primary</p></div>
                                {(form.images?.length ?? 0) > 0 && <span className="text-white/30 text-[10px]">{form.images?.length}/8</span>}
                            </div>
                            <ImageDropzone images={form.images ?? []} onChange={(imgs: any) => set('images', imgs)} disabled={!canEdit} maxImages={8} />
                        </>
                    )}

                    {tab === 'pricing' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div><FieldLabel>MRP</FieldLabel><Input type="number" value={form.mrp ?? 0} disabled={!canEdit} placeholder="0" prefix="₹" onChange={(v: string) => set('mrp', parseFloat(v) || 0)} /></div>
                                <div><FieldLabel>Selling Price *</FieldLabel><Input type="number" value={form.price ?? 0} disabled={!canEdit} error={errors.price} placeholder="0" prefix="₹" onChange={(v: string) => set('price', parseFloat(v) || 0)} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><FieldLabel>Cost Price</FieldLabel><Input type="number" value={form.costPrice ?? 0} disabled={!canEdit} placeholder="0" prefix="₹" onChange={(v: string) => set('costPrice', parseFloat(v) || 0)} /></div>
                                <div>
                                    <FieldLabel>GST Rate</FieldLabel>
                                    <div className="relative">
                                        <select value={form.gstPercent ?? 5} disabled={!canEdit} onChange={e => set('gstPercent', parseInt(e.target.value))} className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            {GST_OPTIONS.map(g => <option key={g} value={g}>{g}%</option>)}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                                    </div>
                                </div>
                            </div>
                            <div><FieldLabel>HSN Code</FieldLabel><Input value={form.hsnCode ?? ''} disabled={!canEdit} placeholder="e.g. 6211" onChange={(v: string) => set('hsnCode', v)} /></div>
                            {(form.price ?? 0) > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Discount', val: discountPct > 0 ? `${discountPct}% off` : '—', color: discountPct > 0 ? '#4ade80' : undefined },
                                        { label: 'Margin', val: margin !== null ? `${margin}%` : '—', color: margin && margin > 30 ? '#4ade80' : margin && margin < 0 ? '#f87171' : undefined },
                                        { label: 'GST Amount', val: fmtMoney(Math.round((form.price ?? 0) * (form.gstPercent ?? 0) / 100)) },
                                    ].map(row => (
                                        <div key={row.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <p className="text-white/30 text-[9px] uppercase tracking-wider">{row.label}</p>
                                            <p className="text-[15px] font-bold mt-1" style={{ color: row.color ?? 'rgba(255,255,255,0.8)' }}>{row.val}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {tab === 'inventory' && (
                        <>
                            <div>
                                <FieldLabel>Fabric</FieldLabel>
                                <div className="flex flex-wrap gap-2">
                                    {FABRIC_LIST.map(f => {
                                        const active = form.fabric === f;
                                        return (
                                            <button key={f} type="button" onClick={() => canEdit && set('fabric', f)}
                                                className="px-4 py-2.5 rounded-xl text-[11px] font-semibold transition-all border cursor-pointer"
                                                style={{
                                                    background: active ? 'rgba(255,255,255,0.13)' : 'rgba(255,255,255,0.04)',
                                                    color: active ? '#fff' : 'rgba(255,255,255,0.3)',
                                                    borderColor: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)',
                                                    cursor: canEdit ? 'pointer' : 'not-allowed',
                                                    opacity: canEdit ? 1 : 0.5,
                                                }}>
                                                {f}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-white/70 text-[13px] font-semibold mb-1">Variants &amp; Stock</p>
                                <p className="text-white/30 text-[10px] mb-4">{'Select sizes and colours to build the variant matrix.'}</p>
                                <VariantMatrix
                                    key={(form.variants ?? []).map((v: Variant) => v.id).join('-') || 'empty'}
                                    variants={form.variants ?? []}
                                    onChange={(v: any) => set('variants', v)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </>
                    )}

                    {tab === 'seo' && (
                        <>
                            {!PERMS.editSEO() ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-4 rounded-xl" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' }}>
                                        <Lock className="w-4 h-4 text-amber-400/60 shrink-0" /><p className="text-amber-400/60 text-[11px]">SEO settings are available.</p>
                                    </div>
                                    {[{ label: 'URL Slug', val: form.seo?.slug || '—' }, { label: 'Meta Title', val: form.seo?.title || '—' }, { label: 'Meta Description', val: form.seo?.description || '—' }, { label: 'Keywords', val: form.seo?.keywords || '—' }].map(row => (
                                        <div key={row.label}><FieldLabel>{row.label}</FieldLabel><p className="text-white/40 text-[12px] px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>{row.val}</p></div>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <FieldLabel>URL Slug</FieldLabel>
                                        <div className="flex items-center rounded-xl overflow-hidden border border-white/[0.09]" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <span className="px-3 py-3 text-white/25 text-[11px] border-r border-white/[0.09] whitespace-nowrap">aarah.com/products/</span>
                                            <input value={form.seo?.slug ?? ''} disabled={!canEdit} onChange={e => set('seo.slug', slugify(e.target.value))} className="flex-1 px-3 py-3 bg-transparent text-[12px] text-white outline-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <FieldLabel>Meta Title</FieldLabel>
                                        <Input value={form.seo?.title ?? ''} disabled={!canEdit} placeholder="Page title for search engines" onChange={(v: string) => set('seo.title', v)} />
                                        <p className="text-white/20 text-[9px] mt-1">{(form.seo?.title ?? '').length}/60 chars</p>
                                    </div>
                                    <div>
                                        <FieldLabel>Meta Description</FieldLabel>
                                        <textarea value={form.seo?.description ?? ''} disabled={!canEdit} rows={3} onChange={e => set('seo.description', e.target.value)} placeholder="Brief description for search results"
                                            className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/20 resize-none disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.05)' }} />
                                        <p className="text-white/20 text-[9px] mt-1">{(form.seo?.description ?? '').length}/160 chars</p>
                                    </div>
                                    <div><FieldLabel>Keywords</FieldLabel><Input value={form.seo?.keywords ?? ''} disabled={!canEdit} placeholder="comma, separated, keywords" onChange={(v: string) => set('seo.keywords', v)} /></div>
                                    <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-white/25 text-[9px] uppercase tracking-wider mb-3">Search Preview</p>
                                        <p className="text-blue-400 text-[13px] font-medium">{form.seo?.title || form.name || 'Product Title'}</p>
                                        <p className="text-green-400/70 text-[10px] mt-0.5">aarah.com/products/{form.seo?.slug || form.slug || 'product-slug'}</p>
                                        <p className="text-white/35 text-[11px] leading-relaxed mt-1">{form.seo?.description || 'Meta description will appear here…'}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="px-6 py-4 border-t flex items-center gap-3 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
                    {isView ? (
                        <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>Close</button>
                    ) : (
                        <>
                            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors">Cancel</button>
                            <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70">
                                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                {saving ? 'Saving…' : isAdd ? 'Create Product' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
