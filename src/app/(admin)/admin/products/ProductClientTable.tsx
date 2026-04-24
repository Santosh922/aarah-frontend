'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { API_URL } from '@/lib/api';
import {
    Search, X, ChevronLeft, ChevronRight, ChevronDown, RefreshCw,
    Plus, Edit3, Trash2, Archive, RotateCcw,
    Eye, Download, Upload, Package, FileText, Globe,
    Grid3X3, List, SlidersHorizontal, CheckCircle2, XCircle,
    Clock, Shield, ShieldCheck, Star, Minus,
    Lock, AlertCircle, ShoppingBag, Check, Zap
} from 'lucide-react';
import { PERMS } from '@/lib/permissions';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';
import type { AdminUser } from '@/types';

const ProductFormModal = dynamic(() => import('./ProductFormModal'), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/50">
            <div className="bg-[#111] p-8 rounded-2xl text-white">Loading editor…</div>
        </div>
    ),
});

type ProductStatus = 'Active' | 'Draft' | 'Archived';
type StockLevel = 'in_stock' | 'low_stock' | 'out_of_stock';
type ViewMode = 'grid' | 'list';

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
    featured: boolean;
    bestSeller: boolean;
    newArrival: boolean;
    createdAt: string; updatedAt: string; createdBy: string;
}

interface ProductClientTableProps {
    initialProducts: any[];
    initialCategories: any[];
    initialTotal?: number;
    initialStatusCounts?: Record<string, number>;
    currentUser: AdminUser | null;
}

const uid = () => Math.random().toString(36).slice(2, 10).toUpperCase();
/** Backend ProductSize enum values only (3XL / 4XL are skipped on save). */
const BACKEND_SIZES = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL']);

const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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

type ToastType = 'success' | 'error' | 'info';
interface Toast { id: string; type: ToastType; message: string }

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
    return (
        <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
                    style={{
                        background: t.type === 'success' ? 'rgba(34,197,94,0.15)' : t.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                        border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.3)' : t.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)'}`,
                        color: t.type === 'success' ? '#4ade80' : t.type === 'error' ? '#f87171' : 'rgba(255,255,255,0.8)',
                        backdropFilter: 'blur(20px)', animation: 'fadeUp 250ms ease forwards', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}>
                    {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span className="text-[12px] font-medium">{t.message}</span>
                    <button onClick={() => onRemove(t.id)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}

function mapAdminProductToUi(p: any) {
    const cat = p?.category;
    const categoryId = cat?.id != null ? String(cat.id) : '';
    const status = String(p?.status ?? (p?.isActive ? 'Active' : 'Draft'));
    const variants = Array.isArray(p?.variants) ? p.variants : [];
    const totalStock = Number.isFinite(Number(p?.totalStock))
        ? Number(p.totalStock)
        : variants.reduce((sum: number, v: any) => sum + (Number(v?.stock) || 0), 0);
    return {
        id: String(p.id ?? ''),
        name: p.name ?? '',
        slug: p.slug ?? '',
        description: p.description ?? '',
        shortDescription: p.shortDescription ?? '',
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        categoryId,
        tags: typeof p.tags === 'string' ? p.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        images: Array.isArray(p.images) ? p.images.map((im: any, i: number) => ({
            id: String(im.id ?? i),
            url: im.imageUrl ?? im.url ?? '',
            alt: im.alt ?? '',
            isPrimary: Boolean(im.isPrimary),
            order: Number(im.displayOrder ?? im.order ?? i),
        })) : [],
        mrp: Number(p.mrp ?? 0),
        price: Number(p.price ?? 0),
        costPrice: Number(p.costPrice ?? 0),
        gstPercent: Number(p.gstPercent ?? 5),
        hsnCode: p.hsnCode ?? '',
        status: (status === 'Archived' ? 'Archived' : status === 'Active' ? 'Active' : 'Draft') as ProductStatus,
        variants: variants.map((v: any, idx: number) => ({
            id: String(v.id ?? idx),
            sku: v.sku ?? '',
            size: String(v.size ?? ''),
            color: v.color ?? '',
            colorHex: v.colorHex ?? '#6b7280',
            stock: Number(v.stock ?? 0),
        })) as Variant[],
        totalStock,
        fabric: p.fabric ?? '',
        seo: {
            title: p?.seo?.title ?? '',
            description: p?.seo?.description ?? '',
            keywords: p?.seo?.keywords ?? '',
            slug: p?.seo?.slug ?? p.slug ?? '',
        },
        featured: Boolean(p.featured ?? p.bestSeller ?? p.isBestSeller),
        bestSeller: Boolean(p.bestSeller ?? p.isBestSeller),
        newArrival: Boolean(p.newArrival ?? p.isNewArrival),
        createdAt: p.createdAt ?? new Date().toISOString(),
        updatedAt: p.updatedAt ?? new Date().toISOString(),
        createdBy: '',
    };
}

function applyProductListFilters(
    rows: Product[],
    search: string,
    filterStatus: string,
    filterCat: string,
    filterFabric: string,
    filterStock: string,
    sortBy: string,
): Product[] {
    let out = rows;
    const q = search.trim().toLowerCase();
    if (q) {
        out = out.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.sku && p.sku.toLowerCase().includes(q)) ||
            (p.tags || []).some((t: string) => t.toLowerCase().includes(q)),
        );
    }
    if (filterStatus !== 'All') out = out.filter(p => p.status === filterStatus);
    if (filterCat !== 'All') out = out.filter(p => p.categoryId === filterCat);
    if (filterFabric !== 'All') out = out.filter(p => p.fabric === filterFabric);
    if (filterStock !== 'All') {
        out = out.filter(p => {
            const lvl = getStockLevel(p.totalStock);
            return lvl === filterStock;
        });
    }
    const sorted = [...out];
    switch (sortBy) {
        case 'oldest':
            sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            break;
        case 'name_az':
            sorted.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price_hi':
            sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'price_lo':
            sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'stock_hi':
            sorted.sort((a, b) => (b.totalStock || 0) - (a.totalStock || 0));
            break;
        default:
            sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
}

function computeStatusCounts(rows: Product[]): Record<string, number> {
    const active = rows.filter(p => p.status === 'Active').length;
    const draft = rows.filter(p => p.status === 'Draft').length;
    const archived = rows.filter(p => p.status === 'Archived').length;
    return { All: rows.length, Active: active, Draft: draft, Archived: archived };
}

async function readErrorMessage(res: Response, body: unknown): Promise<string> {
    const b = body as Record<string, unknown>;
    if (typeof b?.message === 'string') return b.message;
    if (typeof b?.error === 'string') return b.error;
    if (Array.isArray(b?.errors) && b.errors.length) {
        const first = b.errors[0] as Record<string, unknown>;
        if (typeof first?.defaultMessage === 'string') return first.defaultMessage as string;
    }
    const fieldErrors = b?.errors;
    if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
        const firstKey = Object.keys(fieldErrors as object)[0];
        if (firstKey) {
            const val = (fieldErrors as Record<string, unknown>)[firstKey];
            if (Array.isArray(val) && val.length) return String(val[0]);
            if (typeof val === 'string') return val;
        }
    }
    return `Request failed (${res.status})`;
}

function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const add = useCallback((type: ToastType, message: string) => {
        const id = uid();
        setToasts(p => [...p, { id, type, message }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
    }, []);
    const remove = useCallback((id: string) => setToasts(p => p.filter(t => t.id !== id)), []);
    return { toasts, toast: { success: (m: string) => add('success', m), error: (m: string) => add('error', m), info: (m: string) => add('info', m) }, remove };
}

function BulkActionBar({ count, onStatus, onDelete, onClear }: { count: number; onStatus: (s: ProductStatus) => void; onDelete: () => void; onClear: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
    }, []);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{ background: '#1c1c1c', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 20px 60px rgba(0,0,0,0.8)', animation: 'fadeUp 200ms ease forwards' }}>
            <span className="text-white font-bold text-[13px]">{count}</span>
            <span className="text-white/40 text-[12px]">selected</span>
            <div className="w-px h-5 bg-white/10 mx-1" />
            <div ref={ref} className="relative">
                <button type="button" onClick={() => setOpen(s => !s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white transition-colors"
                    style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <Zap className="w-3.5 h-3.5" /> Set Status <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
                {open && (
                    <div className="absolute bottom-[120%] left-0 w-36 rounded-xl overflow-hidden shadow-2xl"
                        style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
                        {(['Active', 'Draft', 'Archived'] as ProductStatus[]).map(s => (
                            <button key={s} type="button" onClick={() => { onStatus(s); setOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-white/5 transition-colors text-left">
                                <span style={{ color: STATUS_CFG[s].color }}>{STATUS_CFG[s].icon}</span>
                                <span className="text-white/70 text-[11px]">{s}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button type="button" onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button type="button" onClick={onClear} className="text-white/30 hover:text-white/60 transition-colors ml-1">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

export default function ProductClientTable({ initialProducts, initialCategories, initialTotal, initialStatusCounts, currentUser }: ProductClientTableProps) {
    const { toasts, toast, remove: removeToast } = useToast();
    const [products, setProducts] = useState(initialProducts);
    const [categories, setCategories] = useState(initialCategories);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [total, setTotal] = useState(initialTotal ?? 0);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>(initialStatusCounts ?? {});

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('All');
    const [filterCat, setFilterCat] = useState('All');
    const [filterStock, setFilterStock] = useState<string>('All');
    const [filterFabric, setFilterFabric] = useState<string>('All');
    const [sortBy, setSortBy] = useState('newest');
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [showFilters, setShowFilters] = useState(false);
    const PAGE_SIZE = viewMode === 'grid' ? 12 : 15;

    const [drawer, setDrawer] = useState<{ product: any; mode: 'add' | 'edit' | 'view' } | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => setDebouncedSearch(search), 380);
        return () => clearTimeout(searchTimer.current);
    }, [search]);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await authFetch(`${API_URL}/api/admin/categories`);
            const payload = await safeJson<any>(res, {});
            const rawCategories = payload?.data ?? payload;
            console.log('Categories:', rawCategories);
            const categories = Array.isArray(rawCategories)
                ? rawCategories.map((cat: any) => ({
                      id: String(cat.id),
                      name: cat.name,
                  }))
                : [];
            setCategories(res.ok ? categories : []);
        } catch {
            toast.error('Failed to load categories.');
            setCategories([]);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- toast not listed to avoid render loops

    const fetchProducts = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/products`);
            const payload = await safeJson<any>(res, {});
            const rawProducts = unwrapApiResponse<any>(payload);
            const list = Array.isArray(rawProducts) ? rawProducts : [];
            if (!res.ok) {
                toast.error('Failed to load products.');
                setProducts([]);
                setTotal(0);
                setStatusCounts({ All: 0, Active: 0, Draft: 0, Archived: 0 });
                return;
            }
            const mapped: Product[] = list.map(mapAdminProductToUi);
            console.log('Mapped product:', mapped[0] ?? null);
            const filtered = applyProductListFilters(
                mapped,
                debouncedSearch,
                filterStatus,
                filterCat,
                filterFabric,
                filterStock,
                sortBy,
            );
            setStatusCounts(computeStatusCounts(mapped));
            setTotal(filtered.length);
            const start = (page - 1) * PAGE_SIZE;
            setProducts(filtered.slice(start, start + PAGE_SIZE));
        } catch {
            toast.error('Failed to load products.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filterStatus, filterCat, filterStock, filterFabric, sortBy, page, PAGE_SIZE]); // eslint-disable-line react-hooks/exhaustive-deps -- toast not listed to avoid render loops

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, filterStatus, filterCat, filterStock, filterFabric, sortBy]);

    const handleSave = async (data: any, id?: string) => {
        const catRaw = data.categoryId;
        const categoryIdNum =
            catRaw === '' || catRaw === undefined || catRaw === null ? NaN : Number(catRaw);
        if (!Number.isFinite(categoryIdNum) || categoryIdNum <= 0) {
            toast.error('Please select a category.');
            return;
        }

        const name = String(data.name || '').trim();
        if (!name) {
            toast.error('Product name is required.');
            return;
        }

        const payload = {
            ...data,
            bestSeller: Boolean(data.bestSeller),
            newArrival: Boolean(data.newArrival),
            name,
            categoryId: categoryIdNum,
            variants: Array.isArray(data.variants) ? data.variants : [],
            images: Array.isArray(data.images) ? data.images : [],
            tags: Array.isArray(data.tags) ? data.tags : [],
            seo: data.seo ?? { title: '', description: '', keywords: '', slug: '' },
            totalStock: (Array.isArray(data.variants) ? data.variants : []).reduce(
                (sum: number, v: any) => sum + (Number(v?.stock) || 0),
                0,
            ),
        };

        console.log('FINAL PRODUCT PAYLOAD:', payload);

        try {
            const res = await authFetch(id ? `${API_URL}/api/admin/products` : `${API_URL}/api/admin/products`, {
                method: id ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(id ? { id: Number(id), ...payload } : payload),
            });
            const body = await safeJson<any>(res, {});
            if (!res.ok) {
                throw new Error(await readErrorMessage(res, body));
            }
            toast.success(`Product ${id ? 'updated' : 'created'} successfully.`);
            setDrawer(null);
            fetchProducts(true);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to save product.');
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteConfirm(null);
        try {
            const res = await authFetch(`${API_URL}/api/admin/products/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
            toast.success('Product deleted.');
            fetchProducts(true);
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete product.');
        }
    };

    const handleBulkStatus = async (status: ProductStatus) => {
        try {
            await Promise.all(Array.from(selected).map(async id => {
                const res = await authFetch(`${API_URL}/api/admin/products`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: Number(id),
                        isActive: status === 'Active',
                    }),
                });
                if (!res.ok) throw new Error();
            }));
            toast.success(`${selected.size} products set to ${status}.`);
            setSelected(new Set());
            fetchProducts(true);
        } catch {
            toast.error('Bulk update failed.');
        }
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selected);
        const results = await Promise.allSettled(
            ids.map(id =>
                authFetch(`${API_URL}/api/admin/products/${id}`, { method: 'DELETE' })
                    .then(res => { if (!res.ok) throw new Error(id); return id; })
            )
        );
        const succeeded = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<string>).value);
        const failCount = results.filter(r => r.status === 'rejected').length;
        setSelected(new Set(ids.filter(id => !succeeded.includes(id))));
        if (failCount > 0) toast.error(`${failCount} product(s) could not be deleted.`);
        if (succeeded.length > 0) {
            toast.success(`${succeeded.length} product(s) deleted.`);
            fetchProducts(true);
        }
    };

    const handleExport = useCallback(() => {
        const csv = [
            'ID,Name,SKU,Category,Price,TotalStock,Status,CreatedAt',
            ...products.map(p => `"${p.id}","${p.name}","${p.sku}","${categories.find(c => c.id === p.categoryId)?.name || p.categoryId}",${p.price},${p.totalStock},"${p.status}","${fmtDate(p.createdAt)}"`)
        ].join('\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        a.download = `aarah-products-${Date.now()}.csv`;
        a.click();
        toast.success('Export ready.');
    }, [products, categories, toast]);

    const toggleOne = (id: string) => {
        if (!currentUser || !PERMS.bulkActions()) return;
        setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };
    const toggleAll = () => {
        if (!currentUser || !PERMS.bulkActions()) return;
        setSelected(s => s.size === products.length ? new Set() : new Set(products.map((p: any) => p.id)));
    };
    const stats = {
        total: statusCounts['All'] ?? total,
        active: statusCounts['Active'] ?? 0,
        draft: statusCounts['Draft'] ?? 0,
        archived: statusCounts['Archived'] ?? 0,
    };
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const activeFilters = [filterStatus !== 'All', filterCat !== 'All', filterStock !== 'All', filterFabric !== 'All'].filter(Boolean).length;
    const catName = (id: string) => categories.find((c: any) => c.id === id)?.name ?? '—';

    return (
        <div className="min-h-screen" style={{ background: '#0e0e0e', fontFamily: "'DM Sans', sans-serif", color: '#fff' }}>
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}} ::-webkit-scrollbar{width:0;height:0} select option{background:#1a1a1a} input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}`}</style>

            {/* Top Bar */}
            <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(14,14,14,0.97)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
                <div className="flex flex-col md:flex-row md:items-center gap-3 px-6 md:px-8 py-3">
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <ShoppingBag className="w-4 h-4 text-white/50" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-[16px] tracking-tight leading-none" style={{ fontFamily: "'Georgia', serif" }}>Product Catalogue</h1>
                            <p className="text-white/25 text-[10px] mt-0.5 tracking-widest uppercase">{stats.total} Products · {stats.active} Active</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-1 md:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, SKU, tag…"
                                className="w-full pl-10 pr-4 py-2 rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none border border-white/[0.08] focus:border-white/20 transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)' }} />
                            {search && (
                                <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <button type="button" onClick={() => setShowFilters(f => !f)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all"
                            style={{
                                background: activeFilters > 0 ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                                borderColor: activeFilters > 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                                color: activeFilters > 0 ? '#fff' : 'rgba(255,255,255,0.5)',
                            }}>
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            {activeFilters > 0 && (
                                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: '#fff', color: '#000' }}>{activeFilters}</span>
                            )}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 ml-auto shrink-0">
                        <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/[0.08]">
                            <button type="button" onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                                <List className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/30'}`}>
                                <Grid3X3 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <button type="button" onClick={() => fetchProducts(true)} disabled={refreshing}
                            className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>

                        {PERMS.exportProducts() && (
                            <button type="button" onClick={handleExport}
                                className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)' }} title="Export CSV">
                                <Download className="w-4 h-4" />
                            </button>
                        )}

                        {PERMS.createProduct() && (
                            <button type="button" onClick={() => setDrawer({ product: null, mode: 'add' })}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98]">
                                <Plus className="w-3.5 h-3.5" /> New Product
                            </button>
                        )}

                        {currentUser && (
                            <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold"
                                        style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                                        {currentUser.avatar}
                                    </div>
                                    <span className="text-white/60 text-[11px] font-medium hidden md:block">{currentUser.name.split(' ')[0]}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="px-6 md:px-8 py-3 border-t flex flex-wrap items-center gap-2.5" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
                        {[
                            { label: 'Status', value: filterStatus, onChange: setFilterStatus, options: [{ v: 'All', l: 'All Statuses' }, { v: 'Active', l: 'Active' }, { v: 'Draft', l: 'Draft' }, { v: 'Archived', l: 'Archived' }] },
                            { label: 'Category', value: filterCat, onChange: setFilterCat, options: [{ v: 'All', l: 'All Categories' }, ...categories.map((c: any) => ({ v: c.id, l: c.name }))] },
                            { label: 'Fabric', value: filterFabric, onChange: setFilterFabric, options: [{ v: 'All', l: 'All Fabrics' }, { v: 'Cotton', l: 'Cotton' }, { v: 'Mul Mul', l: 'Mul Mul' }, { v: 'Denim', l: 'Denim' }, { v: 'Hakoba', l: 'Hakoba' }, { v: 'Linen', l: 'Linen' }, { v: 'Georgette', l: 'Georgette' }] },
                            { label: 'Stock', value: filterStock, onChange: setFilterStock, options: [{ v: 'All', l: 'All Stock' }, { v: 'in_stock', l: 'In Stock' }, { v: 'low_stock', l: 'Low Stock' }, { v: 'out_of_stock', l: 'Out of Stock' }] },
                            { label: 'Sort', value: sortBy, onChange: setSortBy, options: [{ v: 'newest', l: 'Newest' }, { v: 'oldest', l: 'Oldest' }, { v: 'price_hi', l: 'Price ↓' }, { v: 'price_lo', l: 'Price ↑' }, { v: 'name_az', l: 'Name A–Z' }, { v: 'stock_hi', l: 'Stock ↓' }] },
                        ].map(f => (
                            <div key={f.label} className="relative">
                                <select value={f.value} onChange={e => f.onChange(e.target.value)}
                                    className="appearance-none pl-3 pr-7 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.08] cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    {f.options.map((o: any) => <option key={o.v} value={o.v}>{o.l}</option>)}
                                </select>
                                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
                            </div>
                        ))}
                        {activeFilters > 0 && (
                            <button type="button" onClick={() => { setFilterStatus('All'); setFilterCat('All'); setFilterStock('All'); setFilterFabric('All'); }}
                                className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
                                <X className="w-3 h-3" /> Clear filters
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Stats bar */}
            <div className="flex border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}>
                {[
                    { label: 'Total', val: stats.total, color: undefined },
                    { label: 'Active', val: stats.active, color: '#22c55e' },
                    { label: 'Draft', val: stats.draft, color: '#f59e0b' },
                    { label: 'Archived', val: stats.archived, color: '#6b7280' },
                ].map((s) => (
                    <div key={s.label} className="flex-1 min-w-[90px] px-5 py-3 border-r" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <p className="text-white/25 text-[9px] uppercase tracking-widest">{s.label}</p>
                        <p className="text-[22px] font-bold mt-0.5" style={{ color: s.color ?? '#fff', fontFamily: "'Georgia', serif" }}>{s.val}</p>
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 px-6 md:px-8 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(96,165,250,0.03)' }}>
                <Shield className="w-3 h-3 text-blue-400/50 shrink-0" />
                <p className="text-[10px] text-white/25">
                    Admin access: You have full access to create, edit, delete, publish/archive products and manage SEO.
                </p>
            </div>

            <div className="px-4 md:px-8 py-6">
                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-14 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 60}ms` }} />
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div className="py-28 flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <Package className="w-8 h-8 text-white/10" />
                        </div>
                        <p className="text-white/25 text-sm">No products found</p>
                        <button type="button" onClick={() => { setFilterStatus('All'); setFilterCat('All'); setFilterStock('All'); setSearch(''); }}
                            className="text-[11px] text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
                            Clear all filters
                        </button>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(20,20,20,0.9),rgba(16,16,16,0.95))' }}>
                        <table className="w-full text-left">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {PERMS.bulkActions() && (
                                        <th className="px-5 py-4 w-10">
                                            <button type="button" onClick={toggleAll}
                                                className="w-4 h-4 rounded flex items-center justify-center transition-all"
                                                style={{ background: selected.size === products.length && products.length > 0 ? '#fff' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
                                                {selected.size === products.length && products.length > 0 ? <Check className="w-2.5 h-2.5 text-black" /> : selected.size > 0 ? <Minus className="w-2.5 h-2.5 text-white/60" /> : null}
                                            </button>
                                        </th>
                                    )}
                                    {['Product', 'Category', 'Price', 'Stock', 'Status', 'Date', ''].map(h => (
                                        <th key={h} className="px-5 py-4 text-[9px] font-bold tracking-[0.18em] uppercase text-white/25 whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product: any, i: number) => {
                                    const primary = product.images?.find((im: any) => im.isPrimary) ?? product.images?.[0];
                                    const isSel = selected.has(product.id);
                                    const cat = catName(product.categoryId);
                                    return (
                                        <tr key={product.id} className="group cursor-pointer"
                                            style={{
                                                borderBottom: i < products.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                animation: `fadeUp 0.3s ease forwards ${i * 25}ms`,
                                                opacity: 0,
                                                background: isSel ? 'rgba(255,255,255,0.03)' : 'transparent',
                                                transition: 'background 0.1s',
                                            }}
                                            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                                            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                                            onClick={() => setDrawer({ product, mode: 'view' })}>
                                            {PERMS.bulkActions() && (
                                                <td className="px-5 py-3.5" onClick={e => { e.stopPropagation(); toggleOne(product.id); }}>
                                                    <div className="w-4 h-4 rounded flex items-center justify-center transition-all"
                                                        style={{ background: isSel ? '#fff' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                                        {isSel && <Check className="w-2.5 h-2.5 text-black" />}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                        {primary ? <img src={primary.url} alt={primary.alt} className="w-full h-full object-cover" /> : (
                                                            <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-white/15" /></div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-white/85 text-[12px] font-semibold truncate max-w-[200px]">{product.name}</p>
                                                            {product.featured && <Star className="w-3 h-3 text-amber-400 shrink-0" />}
                                                        </div>
                                                        <p className="text-white/25 text-[10px] mt-0.5 font-mono">{product.sku}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="px-2 py-1 rounded-md text-[10px] font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>{cat}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-white/80 text-[12px] font-semibold">{fmtMoney(product.price)}</p>
                                                {product.mrp > product.price && <p className="text-white/25 text-[10px] line-through mt-0.5">{fmtMoney(product.mrp)}</p>}
                                            </td>
                                            <td className="px-5 py-3.5"><StockBadge stock={product.totalStock} /></td>
                                            <td className="px-5 py-3.5"><StatusBadge status={product.status} /></td>
                                            <td className="px-5 py-3.5 text-white/30 text-[10px] whitespace-nowrap">{fmtDate(product.createdAt)}</td>
                                            <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setDrawer({ product, mode: 'view' })}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/6 transition-all" title="View">
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button type="button" onClick={() => setDrawer({ product, mode: 'edit' })}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/6 transition-all" title="Edit">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    {PERMS.deleteProduct() && (
                                                        <button type="button" onClick={() => setDeleteConfirm(product.id)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
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
                                <span className="text-white/30 text-[11px]">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                        return (
                                            <button key={p} type="button" onClick={() => setPage(p)}
                                                className="w-8 h-8 rounded-lg text-[11px] font-semibold transition-all"
                                                style={{ background: p === page ? 'rgba(255,255,255,0.1)' : 'transparent', color: p === page ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all">
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {PERMS.createProduct() && (
                            <button type="button" onClick={() => setDrawer({ product: null, mode: 'add' })}
                                className="rounded-2xl flex flex-col items-center justify-center gap-2 p-6 transition-all hover:bg-white/4 group"
                                style={{ border: '2px dashed rgba(255,255,255,0.08)', minHeight: '200px', aspectRatio: '3/4' }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <Plus className="w-5 h-5 text-white/30" />
                                </div>
                                <span className="text-white/25 text-[11px] font-medium">Add Product</span>
                            </button>
                        )}
                        {products.map((product: any, i: number) => {
                            const primary = product.images?.find((im: any) => im.isPrimary) ?? product.images?.[0];
                            const isSel = selected.has(product.id);
                            return (
                                <div key={product.id}
                                    className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                                    style={{
                                        animation: `fadeUp 0.3s ease forwards ${i * 30}ms`,
                                        opacity: 0,
                                        border: `1px solid ${isSel ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                        background: isSel ? 'rgba(255,255,255,0.04)' : 'rgba(18,18,18,0.9)',
                                    }}
                                    onClick={() => setDrawer({ product, mode: 'view' })}>
                                    <div className="relative overflow-hidden" style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.03)' }}>
                                        {primary ? (
                                            <img src={primary.url} alt={primary.alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-white/10" /></div>
                                        )}
                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            <StatusBadge status={product.status} />
                                            {product.featured && (
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold" style={{ background: 'rgba(0,0,0,0.75)', color: '#fbbf24' }}>
                                                    <Star className="w-2.5 h-2.5" /> FEATURED
                                                </span>
                                            )}
                                        </div>
                                        {PERMS.bulkActions() && (
                                            <div className="absolute top-2 right-2" onClick={e => { e.stopPropagation(); toggleOne(product.id); }}>
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                                    style={{ background: isSel ? '#fff' : 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.3)' }}>
                                                    {isSel && <Check className="w-3 h-3 text-black" />}
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 left-0 right-0 p-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
                                            onClick={e => e.stopPropagation()}>
                                            <button type="button" onClick={() => setDrawer({ product, mode: 'edit' })}
                                                className="flex-1 py-1.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                                style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}>
                                                <Edit3 className="w-3 h-3" /> Edit
                                            </button>
                                            {PERMS.deleteProduct() && (
                                                <button type="button" onClick={() => setDeleteConfirm(product.id)}
                                                    className="w-9 py-1.5 rounded-xl flex items-center justify-center transition-colors"
                                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-white/80 text-[12px] font-semibold leading-tight truncate">{product.name}</p>
                                        <p className="text-white/25 text-[9px] font-mono mt-0.5">{product.sku}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <div>
                                                <span className="text-white font-bold text-[13px]">{fmtMoney(product.price)}</span>
                                                {product.mrp > product.price && (
                                                    <span className="text-white/25 text-[10px] line-through ml-1.5">{fmtMoney(product.mrp)}</span>
                                                )}
                                            </div>
                                            <StockBadge stock={product.totalStock} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {selected.size > 0 && PERMS.bulkActions() && (
                <BulkActionBar count={selected.size} onStatus={handleBulkStatus} onDelete={handleBulkDelete} onClear={() => setSelected(new Set())} />
            )}

            {deleteConfirm && (
                <>
                    <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setDeleteConfirm(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[340px]"
                        style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
                            <Trash2 className="w-5 h-5 text-red-400" />
                        </div>
                        <p className="text-white font-bold text-[15px] mb-1">Delete this product?</p>
                        <p className="text-white/40 text-[12px] leading-relaxed">This action is permanent and cannot be undone. All product data and images will be removed.</p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white transition-colors"
                                style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                            <button type="button" onClick={() => handleDelete(deleteConfirm)}
                                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all active:scale-[0.98]"
                                style={{ background: 'rgba(220,38,38,0.75)' }}>Delete Product</button>
                        </div>
                    </div>
                </>
            )}

            {drawer && currentUser && (
                <ProductFormModal
                    key={`${drawer.product?.id ?? 'new'}-${drawer.mode}`}
                    product={drawer.product}
                    mode={drawer.mode}
                    categories={categories}
                    currentUserId={currentUser.id}
                    onClose={() => setDrawer(null)}
                    onSave={handleSave}
                />
            )}

            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
}
