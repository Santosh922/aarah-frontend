'use client';

import { API_URL } from '@/lib/api';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';
import { processImageFile } from '@/lib/uploadImage';
import { useAdminAuth } from '@/hooks/useAdminAuth';

import {
    useState, useEffect, useCallback, useRef
} from 'react';
import {
    Search, X, RefreshCw, Plus, Edit3, Trash2, Save,
    Image as ImageIcon, CheckCircle2, AlertCircle, LogOut,
    Shield, ShieldCheck, Upload, Globe, Check, Link2, Monitor, LayoutTemplate, Star, ChevronDown, Play
} from 'lucide-react';

// ─── Constants & Types ────────────────────────────────────────────────────────

export type BannerPosition =
    | 'hero_main'
    | 'new_arrivals'
    | 'best_sellers'
    | 'mama_story'
    | 'journey_banner'
    | 'promo_bento'
    | 'feature_blocks'
    | 'footer_promo'
    | 'about_section'
    | 'contact_section'
    | 'story_video';

export interface Banner {
    id: string;
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    imageUrl: string;
    videoUrl?: string;
    position: BannerPosition;
    isActive: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

const POSITIONS: Record<BannerPosition, string> = {
    hero_main: 'Main Hero Carousel (Home)',
    new_arrivals: 'New Arrivals Section',
    best_sellers: 'Best Sellers Section',
    mama_story: 'Mama Story (Dual Feature)',
    journey_banner: 'Journey Banner (Mid Page)',
    promo_bento: 'Promo Bento (3-Grid)',
    feature_blocks: 'Feature Blocks (3-Col)',
    footer_promo: 'Footer Promotion',
    about_section: 'About Section (Image Only)',
    contact_section: 'Contact Section (Image Only)',
    story_video: 'Story Section Video'
};

const IMAGE_ONLY_POSITIONS: BannerPosition[] = ['about_section', 'contact_section'];
const VIDEO_ONLY_POSITIONS: BannerPosition[] = ['story_video', 'mama_story'];

const BLANK_BANNER: Partial<Banner> = {
    title: '', subtitle: '', buttonText: 'Shop Now', buttonLink: '/shop',
    imageUrl: '', videoUrl: '', position: 'hero_main', isActive: true, sortOrder: 1
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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
    return <label className="text-white/38 text-[9px] uppercase tracking-widest font-semibold block mb-1.5">{children}{required && <span className="text-red-400 ml-0.5">*</span>}</label>;
}

function TextInput({ value, onChange, placeholder, disabled, type = 'text', prefix }: any) {
    return (
        <div className="relative">
            {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 text-[12px] pointer-events-none select-none">{prefix}</span>}
            <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
                className={`w-full ${prefix ? 'pl-8' : 'px-4'} pr-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/18 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                style={{ background: 'rgba(255,255,255,0.05)' }} />
        </div>
    );
}

function Toggle({ value, onChange, disabled }: any) {
    return (
        <button type="button" onClick={() => !disabled && onChange(!value)} disabled={disabled}
            className="rounded-full transition-all relative shrink-0 flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: value ? '#22c55e' : 'rgba(255,255,255,0.1)', width: '42px', height: '24px' }}>
            <span className="absolute w-[18px] h-[18px] rounded-full bg-white transition-all shadow-sm" style={{ left: value ? 'calc(100% - 21px)' : '3px' }} />
        </button>
    );
}

// ─── Single Image Upload ──────────────────────────────────────────────────────
function SingleImageDrop({ imageUrl, onChange, disabled, label }: any) {
    const [dropping, setDropping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [showUrl, setShowUrl] = useState(false);
    const [urlVal, setUrlVal] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        if (!file) return;
        
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);
        setUploading(true);

        try {
            const url = await processImageFile(file, 'banners', (err) => {
                alert(`Upload Error: ${err}`);
            });
            
            if (url) {
                onChange(url);
            } else {
                setLocalPreview(null);
            }
        } catch (error) {
            console.error("Upload failed", error);
            setLocalPreview(null);
            alert("Upload failed. Please check your network or Supabase bucket.");
        } finally {
            setUploading(false);
        }
    };

    const displayImage = localPreview || imageUrl;

    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {displayImage ? (
                <div className="relative rounded-xl overflow-hidden group border border-white/[0.09]" style={{ aspectRatio: '21/9', background: 'rgba(255,255,255,0.04)' }}>
                    <img src={displayImage} alt="Banner Preview" className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-40 blur-sm' : 'opacity-100'}`} />
                    
                    {uploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Uploading to Cloud...</span>
                        </div>
                    )}

                    {!disabled && !uploading && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.65)' }}>
                            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <Upload className="w-3.5 h-3.5" /> Replace
                            </button>
                            <button type="button" onClick={() => { onChange(''); setLocalPreview(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                <X className="w-3.5 h-3.5" /> Remove
                            </button>
                        </div>
                    )}
                    <input 
                      ref={fileRef} 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      onClick={(e) => ((e.target as HTMLInputElement).value = '')}
                      onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} 
                    />
                </div>
            ) : (
                <div 
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropping(true); }} 
                    onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDropping(true); }}
                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDropping(false); }} 
                    onDrop={e => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setDropping(false); 
                        if (disabled || uploading) return;
                        const f = e.dataTransfer.files?.[0]; 
                        if (f) processFile(f); 
                    }} 
                    onClick={() => !disabled && !uploading && fileRef.current?.click()}
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-10 transition-all duration-200"
                    style={{ border: `2px dashed ${dropping ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`, background: dropping ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', cursor: disabled || uploading ? 'default' : 'pointer', aspectRatio: '21/9' }}>
                    
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <ImageIcon className="w-5 h-5 text-white/35" />
                    </div>
                    <p className="text-white/40 text-[11px]">{disabled ? 'No image' : `Drop banner image or click to upload`}</p>
                    <p className="text-white/20 text-[9px]">Recommended: 1920x800px (WEBP or JPG)</p>
                    <input 
                      ref={fileRef} 
                      type="file" 
                      accept="image/*" 
                      hidden 
                      onClick={(e) => ((e.target as HTMLInputElement).value = '')}
                      onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} 
                    />
                </div>
            )}
            
            {!disabled && !imageUrl && !uploading && (
                showUrl ? (
                    <div className="flex gap-2 mt-2">
                        <input value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="https://…/banner.jpg" onKeyDown={e => { if (e.key === 'Enter' && urlVal.trim()) { onChange(urlVal.trim()); setUrlVal(''); setShowUrl(false); } }}
                            className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.1] placeholder:text-white/20" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <button type="button" onClick={() => { if (urlVal.trim()) { onChange(urlVal.trim()); setUrlVal(''); setShowUrl(false); } }} className="px-3 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all">Add</button>
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

// ─── Single Video Upload ─────────────────────────────────────────────────────
function SingleVideoDrop({ videoUrl, onChange, disabled, label }: any) {
    const [dropping, setDropping] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [showUrl, setShowUrl] = useState(false);
    const [urlVal, setUrlVal] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        if (!file) return;
        
        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);
        setUploading(true);

        try {
            const url = await processImageFile(file, 'videos', (err) => {
                alert(`Upload Error: ${err}`);
            });
            
            if (url) {
                onChange(url);
            } else {
                setLocalPreview(null);
            }
        } catch (error) {
            console.error("Upload failed", error);
            setLocalPreview(null);
            alert("Upload failed. Please check your network or Supabase bucket.");
        } finally {
            setUploading(false);
        }
    };

    const displayVideo = localPreview || videoUrl;

    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {displayVideo ? (
                <div className="relative rounded-xl overflow-hidden group border border-white/[0.09]" style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.04)' }}>
                    <video src={displayVideo} className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-40 blur-sm' : 'opacity-100'}`} controls />
                    
                    {uploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Uploading to Cloud...</span>
                        </div>
                    )}

                    {!disabled && !uploading && (
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.65)' }}>
                            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                <Upload className="w-3.5 h-3.5" /> Replace
                            </button>
                            <button type="button" onClick={() => { onChange(''); setLocalPreview(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                                <X className="w-3.5 h-3.5" /> Remove
                            </button>
                        </div>
                    )}
                    <input 
                      ref={fileRef} 
                      type="file" 
                      accept="video/*" 
                      hidden 
                      onClick={(e) => ((e.target as HTMLInputElement).value = '')}
                      onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} 
                    />
                </div>
            ) : (
                <div 
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDropping(true); }} 
                    onDragEnter={e => { e.preventDefault(); e.stopPropagation(); setDropping(true); }}
                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); setDropping(false); }} 
                    onDrop={e => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setDropping(false); 
                        if (disabled || uploading) return;
                        const f = e.dataTransfer.files?.[0]; 
                        if (f) processFile(f); 
                    }} 
                    onClick={() => !disabled && !uploading && fileRef.current?.click()}
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-10 transition-all duration-200"
                    style={{ border: `2px dashed ${dropping ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.1)'}`, background: dropping ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)', cursor: disabled || uploading ? 'default' : 'pointer', aspectRatio: '16/9' }}>
                    
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <Play className="w-5 h-5 text-white/35" />
                    </div>
                    <p className="text-white/40 text-[11px]">{disabled ? 'No video' : `Drop video file or click to upload`}</p>
                    <p className="text-white/20 text-[9px]">Supported: MP4, WebM, MOV</p>
                    <input 
                      ref={fileRef} 
                      type="file" 
                      accept="video/*" 
                      hidden 
                      onClick={(e) => ((e.target as HTMLInputElement).value = '')}
                      onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} 
                    />
                </div>
            )}
            
            {!disabled && !videoUrl && !uploading && (
                showUrl ? (
                    <div className="flex gap-2 mt-2">
                        <input value={urlVal} onChange={e => setUrlVal(e.target.value)} placeholder="https://…/video.mp4" onKeyDown={e => { if (e.key === 'Enter' && urlVal.trim()) { onChange(urlVal.trim()); setUrlVal(''); setShowUrl(false); } }}
                            className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.1] placeholder:text-white/20" style={{ background: 'rgba(255,255,255,0.06)' }} />
                        <button type="button" onClick={() => { if (urlVal.trim()) { onChange(urlVal.trim()); setUrlVal(''); setShowUrl(false); } }} className="px-3 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all">Add</button>
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

// ─── Banner Drawer ────────────────────────────────────────────────────────────
function BannerDrawer({ banner, onSave, onClose }: { banner: Banner | null, onSave: (b: Partial<Banner>) => Promise<void>, onClose: () => void }) {
    const isNew = !banner;
    const [form, setForm] = useState<Partial<Banner>>(banner || BLANK_BANNER);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        await onSave(form);
        setSaving(false);
    };

    return (
        <>
            <div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }} onClick={onClose} />
            <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
                style={{ width: 'min(560px,100vw)', background: '#111', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-40px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 260ms cubic-bezier(0.32,0.72,0,1) forwards' }}>

                <div className="flex items-center justify-between px-6 py-5 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
                        <div>
                            <h2 className="text-white font-bold text-[16px]" style={{ fontFamily: "'Georgia',serif" }}>{isNew ? 'Create Banner' : 'Edit Banner'}</h2>
                            {!isNew && <p className="text-white/30 text-[10px] font-mono mt-0.5">{banner.id}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6" style={{ scrollbarWidth: 'none' }}>
                    {VIDEO_ONLY_POSITIONS.includes(form.position as BannerPosition) ? (
                        <SingleVideoDrop videoUrl={form.videoUrl} onChange={(v: string) => setForm({ ...form, videoUrl: v })} label="Story Video (Required)" />
                    ) : (
                        <SingleImageDrop imageUrl={form.imageUrl} onChange={(v: string) => setForm({ ...form, imageUrl: v })} label="Banner Image (Desktop & Mobile safe)" />
                    )}

                    <div className="space-y-4">
                        <p className="text-white/45 text-[11px] font-bold uppercase tracking-widest border-b border-white/[0.05] pb-2">Content & Display</p>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Position</FieldLabel>
                                <div className="relative">
                                    <select value={form.position} onChange={e => setForm({ ...form, position: e.target.value as BannerPosition })} className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] cursor-pointer" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                        {Object.entries(POSITIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <FieldLabel>Sort Order</FieldLabel>
                                <TextInput type="number" value={String(form.sortOrder || 1)} onChange={(v: any) => setForm({ ...form, sortOrder: Number(v) })} placeholder="1" />
                            </div>
                        </div>

                        <div>
                            <FieldLabel>Main Title</FieldLabel>
                            <TextInput value={form.title || ''} onChange={(v: any) => setForm({ ...form, title: v })} placeholder="e.g. Summer Maternity Sale" disabled={IMAGE_ONLY_POSITIONS.includes(form.position as BannerPosition)} />
                        </div>
                        <div>
                            <FieldLabel>Subtitle / Description</FieldLabel>
                            <textarea value={form.subtitle || ''} onChange={e => setForm({ ...form, subtitle: e.target.value })} rows={2} placeholder="Optional subheading text..." disabled={IMAGE_ONLY_POSITIONS.includes(form.position as BannerPosition)}
                                className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/18 resize-none disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'rgba(255,255,255,0.05)' }} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <FieldLabel>Button Text</FieldLabel>
                                <TextInput value={form.buttonText || ''} onChange={(v: any) => setForm({ ...form, buttonText: v })} placeholder="Shop Now" />
                            </div>
                            <div>
                                <FieldLabel>Button Link (URL)</FieldLabel>
                                <TextInput value={form.buttonLink || ''} onChange={(v: any) => setForm({ ...form, buttonLink: v })} placeholder="/collections/summer" />
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl mt-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div>
                                <p className="text-white/80 text-[13px] font-medium">Visibility Status</p>
                                <p className="text-white/30 text-[10px] mt-0.5">Toggle to hide or show on storefront</p>
                            </div>
                            <Toggle value={form.isActive ?? true} onChange={(v: boolean) => setForm({ ...form, isActive: v })} />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t flex items-center justify-between shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving || (VIDEO_ONLY_POSITIONS.includes(form.position as BannerPosition) ? !form.videoUrl : !form.imageUrl)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98] disabled:opacity-50">
                        {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {saving ? 'Saving...' : isNew ? 'Create Banner' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </>
    );
}

// ─── Main Page Export ─────────────────────────────────────────────────────────
export default function AdminBannersPage() {
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
                            <LayoutTemplate className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-[18px]" style={{ fontFamily: "'Georgia',serif" }}>Banner Management</h1>
                            <p className="text-white/30 text-[11px] mt-0.5 tracking-widest uppercase">Storefront Marketing</p>
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

            <BannersView toast={toast} />
            <ToastContainer items={toastItems} remove={removeToast} />
        </div>
    );
}

// ─── Story Video Selector ───────────────────────────────────────────────────
function StoryVideoSelector({ banners, onSelectionChange }: { banners: Banner[], onSelectionChange: (videoId: string | null) => void }) {
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        authFetch(`${API_URL}/api/storefront/settings`)
            .then(res => safeJson<any>(res, {}))
            .then(settings => {
                const data = unwrapApiResponse<any>(settings);
                setSelectedVideoId(data?.selectedStoryVideoId || null);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleChange = (videoId: string | null) => {
        setSelectedVideoId(videoId);
        onSelectionChange(videoId);
    };

    if (loading) return <div className="animate-pulse h-20 bg-white/5 rounded-xl" />;

    return (
        <div className="space-y-4">
            <div className="relative">
                <select 
                    value={selectedVideoId || ''} 
                    onChange={e => handleChange(e.target.value || null)} 
                    className="w-full appearance-none px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] cursor-pointer" 
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <option value="">No video selected</option>
                    {banners.map(banner => (
                        <option key={banner.id} value={banner.id}>
                            {banner.title || `Video ${banner.id.slice(-6)}`}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            </div>
            
            {selectedVideoId && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {banners.filter(b => b.id === selectedVideoId).map(banner => (
                        <div key={banner.id} className="rounded-xl overflow-hidden border border-white/[0.09]" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <div className="relative bg-black" style={{ aspectRatio: '16/9' }}>
                                <video src={banner.videoUrl} className="w-full h-full object-cover" controls />
                            </div>
                            <div className="p-3">
                                <p className="text-white/80 text-[12px] font-medium">{banner.title || 'Untitled Video'}</p>
                                <p className="text-white/40 text-[10px] mt-1">Selected for story section</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function BannersView({ toast }: { toast: any }) {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [drawer, setDrawer] = useState<'closed' | 'new' | Banner>('closed');
    const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

    const toastRef = useRef(toast);
    toastRef.current = toast;

    const fetchBanners = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/banners`);
            if (res.ok) {
                const payload = await res.json();
                const list = unwrapApiResponse<Banner[]>(payload);
                if (!Array.isArray(list)) {
                    console.warn('Unexpected banner response:', payload);
                    setBanners([]);
                    return;
                }
                const sorted = [...list].sort((a: Banner, b: Banner) => {
                    if (a.position === b.position) return a.sortOrder - b.sortOrder;
                    return a.position.localeCompare(b.position);
                });
                setBanners(sorted);
            }
        } catch { toastRef.current.error('Failed to load banners.'); }
        finally { setLoading(false); setRefreshing(false); }
    }, []);

    useEffect(() => { fetchBanners(); }, [fetchBanners]);

    const handleSave = async (data: Partial<Banner>) => {
        try {
            const method = data.id ? 'PATCH' : 'POST';
            const url = data.id ? `${API_URL}/api/admin/banners/${data.id}` : `${API_URL}/api/admin/banners`;
            const res = await authFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                toast.success(`Banner ${data.id ? 'updated' : 'created'}.`);
                setDrawer('closed');
                fetchBanners(true);
            } else { toast.error('Failed to save banner.'); }
        } catch { toast.error('Failed to save banner.'); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await authFetch(`${API_URL}/api/admin/banners/${deleteTarget.id}`, { method: 'DELETE' });
            if (res.ok) {
                setBanners(p => p.filter(b => b.id !== deleteTarget.id));
                toast.success('Banner deleted.');
            } else { toast.error('Failed to delete.'); }
        } catch { toast.error('Failed to delete.'); }
        setDeleteTarget(null);
    };

    const handleToggleActive = async (banner: Banner) => {
        const nextState = !banner.isActive;
        // Optimistic UI
        setBanners(p => p.map(b => b.id === banner.id ? { ...b, isActive: nextState } : b));
        try {
            await authFetch(`${API_URL}/api/admin/banners`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: banner.id, isActive: nextState })
            });
            toast.success(`Banner ${nextState ? 'published' : 'hidden'}.`);
        } catch {
            // Revert on fail
            setBanners(p => p.map(b => b.id === banner.id ? { ...b, isActive: !nextState } : b));
            toast.error('Failed to update status.');
        }
    };

    // Group banners by position for structured display
    const groupedBanners = banners.reduce((acc, banner) => {
        if (!acc[banner.position]) acc[banner.position] = [];
        acc[banner.position].push(banner);
        return acc;
    }, {} as Record<BannerPosition, Banner[]>);

    return (
        <div className="px-5 md:px-10 py-8 max-w-7xl w-full mx-auto flex-1">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-white text-[20px] font-bold" style={{ fontFamily: "'Georgia',serif" }}>Storefront Banners</h2>
                    <p className="text-white/40 text-[12px] mt-1">Manage the visual banners displayed across your website.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => fetchBanners(true)} disabled={refreshing}
                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button" onClick={() => setDrawer('new')}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98]">
                        <Plus className="w-4 h-4" /> Add Banner
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}</div>
            ) : banners.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center border border-white/[0.05] rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.04)' }}><ImageIcon className="w-8 h-8 text-white/20" /></div>
                    <p className="text-white/80 text-[15px] font-semibold">No Banners Found</p>
                    <p className="text-white/40 text-[12px] mt-1 max-w-xs">Your storefront doesn't have any banners configured yet. Add one to highlight your collections.</p>
                    <button type="button" onClick={() => setDrawer('new')} className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all border border-white/[0.1] hover:bg-white/5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <Plus className="w-4 h-4" /> Create First Banner
                    </button>
                </div>
            ) : (
                <div className="space-y-12">
                    {Object.entries(POSITIONS).map(([posKey, posLabel]) => {
                        const posBanners = groupedBanners[posKey as BannerPosition] || [];
                        if (posBanners.length === 0) return null;

                        return (
                            <div key={posKey}>
                                <div className="flex items-center gap-3 mb-4 pb-2 border-b border-white/[0.05]">
                                    <h3 className="text-white/60 text-[11px] font-bold uppercase tracking-widest">{posLabel}</h3>
                                    <span className="text-white/20 text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>{posBanners.length}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {posBanners.map(banner => (
                                        <div key={banner.id} className="group rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
                                            style={{ border: `1px solid ${banner.isActive ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`, background: 'rgba(20,20,20,0.8)' }}>

                                            {/* Image/Video Area */}
                                            <div className="relative overflow-hidden bg-black flex items-center justify-center" style={{ aspectRatio: VIDEO_ONLY_POSITIONS.includes(banner.position) ? '16/9' : '21/9' }}>
                                                {VIDEO_ONLY_POSITIONS.includes(banner.position) ? (
                                                    banner.videoUrl ? (
                                                        <video src={banner.videoUrl} className={`w-full h-full object-cover ${!banner.isActive ? 'opacity-40' : ''}`} controls />
                                                    ) : (
                                                        <Play className="w-8 h-8 text-white/10" />
                                                    )
                                                ) : (
                                                    banner.imageUrl ? (
                                                        <img src={banner.imageUrl} alt={banner.title} className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${!banner.isActive ? 'opacity-40 grayscale' : ''}`} />
                                                    ) : (
                                                        <ImageIcon className="w-8 h-8 text-white/10" />
                                                    )
                                                )}

                                                {/* Overlay Gradient for Text Readability */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />

                                                {/* Status Badge */}
                                                <div className="absolute top-3 left-3">
                                                    {banner.isActive ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold bg-green-400/10 text-green-400 border border-green-400/20 backdrop-blur-md">
                                                            <CheckCircle2 className="w-3 h-3" /> Published
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold bg-white/10 text-white/50 border border-white/10 backdrop-blur-md">
                                                            <AlertCircle className="w-3 h-3" /> Hidden
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Text Overlay */}
                                                <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
                                                    {banner.title && <h4 className="text-white font-bold text-[16px] leading-tight mb-1" style={{ fontFamily: "'Georgia',serif" }}>{banner.title}</h4>}
                                                    {banner.subtitle && <p className="text-white/70 text-[11px] line-clamp-1">{banner.subtitle}</p>}
                                                </div>
                                            </div>

                                            {/* Controls Area */}
                                            <div className="p-4 flex items-center justify-between border-t border-white/[0.05]">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white/40 text-[10px]">Order:</span>
                                                        <span className="text-white/80 font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded">{banner.sortOrder}</span>
                                                    </div>
                                                    {banner.buttonLink && (
                                                        <a href={banner.buttonLink} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400/70 hover:text-blue-400 text-[10px] transition-colors" title="Test Link">
                                                            <Link2 className="w-3 h-3" /> Link
                                                        </a>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <button type="button" onClick={() => handleToggleActive(banner)}
                                                        className="h-8 px-3 flex items-center justify-center rounded-lg text-[10px] font-semibold transition-all"
                                                        style={{ background: banner.isActive ? 'rgba(255,255,255,0.05)' : 'rgba(34,197,94,0.1)', color: banner.isActive ? 'rgba(255,255,255,0.5)' : '#4ade80' }}>
                                                        {banner.isActive ? 'Hide' : 'Publish'}
                                                    </button>
                                                    <button type="button" onClick={() => setDrawer(banner)} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all" title="Edit">
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button type="button" onClick={() => setDeleteTarget(banner)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Story Video Selector */}
            <div className="mt-12 p-6 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
                <h3 className="text-white font-semibold text-[15px] mb-5">Story Section Video</h3>
                <p className="text-white/40 text-[12px] mb-5">Select which uploaded video to display in the story section of your homepage.</p>
                <StoryVideoSelector banners={banners.filter(b => b.position === 'story_video')} onSelectionChange={(videoId) => {
                    // This will be handled by updating store settings
                    authFetch(`${API_URL}/api/storefront/settings`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ selectedStoryVideoId: videoId })
                    }).then(res => {
                        if (res.ok) toast.success('Story video updated.');
                        else toast.error('Failed to update story video.');
                    }).catch(() => toast.error('Failed to update story video.'));
                }} />
            </div>

            {/* Modals & Drawers */}
            {drawer !== 'closed' && (
                <BannerDrawer
                    banner={drawer === 'new' ? null : drawer}
                    onSave={handleSave}
                    onClose={() => setDrawer('closed')}
                />
            )}

            {deleteTarget && (
                <>
                    <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setDeleteTarget(null)} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[340px]" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}><Trash2 className="w-5 h-5 text-red-400" /></div>
                        <p className="text-white font-bold text-[15px] mb-1">Delete Banner?</p>
                        <p className="text-white/40 text-[12px] leading-relaxed">This banner will be permanently removed from the storefront. This cannot be undone.</p>
                        <div className="flex gap-3 mt-5">
                            <button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
                            <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all active:scale-[0.98]" style={{ background: 'rgba(220,38,38,0.75)' }}>Delete Banner</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}