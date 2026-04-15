'use client';

import { API_URL } from '@/lib/api';
import { authFetch } from '@/lib/integrationAdapters';
import { processImageFile } from '@/lib/uploadImage';
import { useAdminAuth } from '@/hooks/useAdminAuth';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Instagram, Plus, Trash2, Save, RefreshCw, X,
  CheckCircle2, AlertCircle, GripVertical, Globe, Upload, Image as ImageIcon
} from 'lucide-react';

interface Post {
  id: string;
  imageUrl: string;
  link?: string;
  caption?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

interface ToastItem { id: string; type: 'success' | 'error'; message: string }

function useToast() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const uid = () => Math.random().toString(36).slice(2, 8);
  const add = useCallback((type: ToastItem['type'], message: string) => {
    const id = uid();
    setItems(p => [...p.slice(-4), { id, type, message }]);
    setTimeout(() => setItems(p => p.filter(t => t.id !== id)), 3800);
  }, []);
  const remove = useCallback((id: string) => setItems(p => p.filter(t => t.id !== id)), []);
  return { items, toast: { success: (m: string) => add('success', m), error: (m: string) => add('error', m) }, remove };
}

const BLANK: Partial<Post> = { imageUrl: '', link: '', caption: '', sortOrder: 1, isActive: true };

export default function AdminInstagramPage() {
  const { currentUser, isMounted, handleLogout } = useAdminAuth();
  const { items: toastItems, toast, remove } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editPost, setEditPost] = useState<Post | null>(null);
  const [form, setForm] = useState<Partial<Post>>(BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/api/admin/instagram`);
      const data = await res.json().catch(() => []);
      if (res.ok && Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]);
      }
    } catch { 
      setPosts([]);
      toast.error('Failed to load posts.');
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  if (!isMounted || !currentUser) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0e0e0e' }}>
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  const openAdd = () => { 
    setForm({ imageUrl: '', link: '', caption: '', sortOrder: 1, isActive: true });
    setEditPost(null); 
    setShowUrl(false);
    setUrlInput('');
    setLocalPreview(null);
    setShowForm(true); 
  };
  const openEdit = (p: Post) => { setForm({ ...p }); setEditPost(p); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditPost(null); setForm(BLANK); setShowUrl(false); setUrlInput(''); };

  const processFile = async (file: File) => {
    if (!file) return;
    
    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setUploading(true);

    try {
      const url = await processImageFile(file, 'instagram', (msg) => toast.error(msg));
      if (url) {
        setForm(f => ({ ...f, imageUrl: url }));
      } else {
        setLocalPreview(null);
      }
    } catch (error) {
      setLocalPreview(null);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl) { toast.error('Image is required.'); return; }
    setSaving(true);
    try {
      const method = editPost ? 'PATCH' : 'POST';
      const body = editPost ? { id: editPost.id, ...form } : form;
      const res = await authFetch(`${API_URL}/api/admin/instagram`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        toast.success(`Post ${editPost ? 'updated' : 'added'}.`);
        closeForm();
        fetchPosts(true);
      } else { toast.error('Failed to save post.'); }
    } catch { toast.error('Failed to save post.'); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await authFetch(`${API_URL}/api/admin/instagram/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Post deleted.'); setPosts(p => p.filter(x => x.id !== deleteTarget.id)); }
      else { toast.error('Failed to delete.'); }
    } catch { toast.error('Failed to delete.'); }
    setDeleteTarget(null);
  };

  const handleToggle = async (post: Post) => {
    const next = !post.isActive;
    setPosts(p => p.map(x => x.id === post.id ? { ...x, isActive: next } : x));
    try {
      await authFetch(`${API_URL}/api/admin/instagram`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: post.id, isActive: next }) });
      toast.success(next ? 'Post visible on storefront.' : 'Post hidden.');
    } catch { setPosts(p => p.map(x => x.id === post.id ? { ...x, isActive: !next } : x)); toast.error('Failed to update.'); }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0e0e0e', fontFamily: "'DM Sans', sans-serif", color: '#fff' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}} ::-webkit-scrollbar{width:0}`}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(14,14,14,0.97)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between px-6 md:px-8 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Instagram className="w-4 h-4 text-white/55" />
            </div>
            <div>
              <h1 className="text-white font-bold text-[16px] tracking-tight leading-none" style={{ fontFamily: "'Georgia', serif" }}>Instagram Feed</h1>
              <p className="text-white/25 text-[10px] mt-0.5 tracking-widest uppercase">{posts.length} Posts · Displayed on Storefront</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchPosts(true)} disabled={refreshing}
              className="p-2 rounded-xl border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={openAdd}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98]">
              <Plus className="w-3.5 h-3.5" /> Add Post
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)' }}>
          <Instagram className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-white/50 text-[11px] leading-relaxed">
            These posts are displayed in the <strong className="text-white/70">Social Feed</strong> section on the storefront homepage and About page. Upload images and link them to your Instagram posts. Only <strong className="text-white/70">Active</strong> posts are visible.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="py-28 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <Instagram className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-white/25 text-sm">No Instagram posts added yet</p>
            <button onClick={openAdd} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all">
              <Plus className="w-4 h-4" /> Add First Post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {posts.map((post, i) => (
              <div key={post.id} className="group relative rounded-xl overflow-hidden"
                style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.04)', animation: `fadeUp 0.3s ease forwards ${i * 30}ms`, opacity: 0, border: `1px solid ${post.isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}` }}>
                <img src={post.imageUrl} alt={post.caption || 'Instagram post'} className={`w-full h-full object-cover transition-all ${!post.isActive ? 'opacity-30 grayscale' : ''}`} />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2.5" style={{ background: 'rgba(0,0,0,0.7)' }}>
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => openEdit(post)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <Save className="w-3 h-3" />
                    </button>
                    <button onClick={() => setDeleteTarget(post)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex justify-between items-center">
                    {post.caption && <p className="text-white/60 text-[9px] truncate flex-1 mr-2">{post.caption}</p>}
                    <button onClick={() => handleToggle(post)}
                      className="text-[8px] font-bold px-2 py-1 rounded-md shrink-0"
                      style={{ background: post.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', color: post.isActive ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                      {post.isActive ? 'Active' : 'Hidden'}
                    </button>
                  </div>
                </div>
                {!post.isActive && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.4)' }}>HIDDEN</div>
                )}
                <div className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.4)' }}>#{post.sortOrder}</div>
              </div>
            ))}

            {/* Add card */}
            <button onClick={openAdd}
              className="rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:bg-white/4 group"
              style={{ border: '2px dashed rgba(255,255,255,0.08)', aspectRatio: '1' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <Plus className="w-5 h-5 text-white/30" />
              </div>
              <span className="text-white/25 text-[9px] font-medium">Add Post</span>
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Drawer */}
      {showForm && (
        <>
          <div className="fixed inset-0 z-[150]" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)' }} onClick={closeForm} />
          <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
            style={{ width: 'min(480px,100vw)', background: '#111', borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-40px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 260ms cubic-bezier(0.32,0.72,0,1) forwards' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-3">
                <button onClick={closeForm} className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/6 transition-all"><X className="w-4 h-4" /></button>
                <h2 className="text-white font-bold text-[15px]" style={{ fontFamily: "'Georgia', serif" }}>{editPost ? 'Edit Post' : 'Add Instagram Post'}</h2>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5" style={{ scrollbarWidth: 'none' }}>

              {/* Image */}
              <div>
                <label className="text-white/38 text-[9px] uppercase tracking-widest font-semibold block mb-2">Image *</label>
                {(localPreview || form.imageUrl) ? (
                  <div className="relative rounded-xl overflow-hidden group border border-white/[0.09]" style={{ aspectRatio: '1', background: 'rgba(255,255,255,0.04)' }}>
                    <img src={localPreview || form.imageUrl} alt="" className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-40 blur-sm' : 'opacity-100'}`} />
                    
                    {uploading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                            <span className="text-white text-[10px] font-bold tracking-widest uppercase">Uploading...</span>
                        </div>
                    )}

                    {!uploading && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.65)' }}>
                        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <Upload className="w-3.5 h-3.5" /> Replace
                        </button>
                        <button onClick={() => { setForm(f => ({ ...f, imageUrl: '' })); setLocalPreview(null); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-colors" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                          <X className="w-3.5 h-3.5" /> Remove
                        </button>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" hidden onClick={(e) => ((e.target as HTMLInputElement).value = '')} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                  </div>
                ) : (
                  <div 
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }} 
                    onDragEnter={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDragLeave={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={e => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        if (uploading) return;
                        const f = e.dataTransfer.files?.[0]; 
                        if (f) processFile(f); 
                    }}
                    onClick={() => !uploading && fileRef.current?.click()}
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-10 cursor-pointer transition-all hover:bg-white/[0.04]"
                    style={{ border: '2px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)', aspectRatio: '1' }}>
                    
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <ImageIcon className="w-5 h-5 text-white/35" />
                    </div>
                    <p className="text-white/40 text-[11px]">Drop image or click to upload</p>
                    <p className="text-white/20 text-[9px]">1:1 ratio recommended · Max 5MB</p>
                    <input ref={fileRef} type="file" accept="image/*" hidden onClick={(e) => ((e.target as HTMLInputElement).value = '')} onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />
                  </div>
                )}

                {/* URL input */}
                {!form.imageUrl && !uploading && (
                  showUrl ? (
                    <div className="flex gap-2 mt-2">
                      <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://…/image.jpg"
                        onKeyDown={e => { if (e.key === 'Enter' && urlInput.trim()) { setForm(f => ({ ...f, imageUrl: urlInput.trim() })); setUrlInput(''); setShowUrl(false); } }}
                        className="flex-1 px-3 py-2 rounded-xl text-[11px] text-white outline-none border border-white/[0.1] placeholder:text-white/20" style={{ background: 'rgba(255,255,255,0.06)' }} />
                      <button onClick={() => { if (urlInput.trim()) { setForm(f => ({ ...f, imageUrl: urlInput.trim() })); setUrlInput(''); setShowUrl(false); } }} className="px-3 py-2 rounded-xl text-[11px] font-bold text-black bg-white hover:bg-white/90">Add</button>
                      <button onClick={() => { setShowUrl(false); setUrlInput(''); }} className="px-3 py-2 rounded-xl text-[11px] text-white/35 hover:text-white transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setShowUrl(true)} className="flex items-center gap-1.5 mt-2 text-[10px] text-white/25 hover:text-white/50 transition-colors">
                      <Globe className="w-3.5 h-3.5" /> Add by URL
                    </button>
                  )
                )}
              </div>

              {/* Link */}
              <div>
                <label className="text-white/38 text-[9px] uppercase tracking-widest font-semibold block mb-2">Instagram Post Link</label>
                <input value={form.link || ''} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                  placeholder="https://www.instagram.com/p/..."
                  className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/18 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>

              {/* Caption */}
              <div>
                <label className="text-white/38 text-[9px] uppercase tracking-widest font-semibold block mb-2">Caption (optional)</label>
                <input value={form.caption || ''} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                  placeholder="Brief description..."
                  className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] placeholder:text-white/18 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }} />
              </div>

              {/* Sort Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/38 text-[9px] uppercase tracking-widest font-semibold block mb-2">Sort Order</label>
                  <input type="number" value={form.sortOrder || 1} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 1 }))} min={1}
                    className="w-full px-4 py-3 rounded-xl text-[12px] text-white outline-none border border-white/[0.09] transition-colors"
                    style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <div>
                  <label className="text-white/38 text-[9px] uppercase tracking-widest font-semibold block mb-2">Visibility</label>
                  <button onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className="w-full py-3 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-2"
                    style={{ background: form.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', color: form.isActive ? '#4ade80' : 'rgba(255,255,255,0.4)', border: `1px solid ${form.isActive ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                    {form.isActive ? '● Active' : '○ Hidden'}
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex items-center gap-3 shrink-0" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.01)' }}>
              <button onClick={closeForm} className="px-5 py-2.5 rounded-xl text-[12px] font-semibold text-white/40 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.imageUrl || uploading}
                className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {saving ? 'Saving…' : editPost ? 'Save Changes' : 'Add Post'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-[300]" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }} onClick={() => setDeleteTarget(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[400] p-6 rounded-2xl w-[340px]" style={{ background: '#161616', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(0,0,0,0.9)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}><Trash2 className="w-5 h-5 text-red-400" /></div>
            <p className="text-white font-bold text-[15px] mb-1">Remove this post?</p>
            <p className="text-white/40 text-[12px] leading-relaxed">This post will be removed from the storefront's Instagram feed section.</p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold text-white/50 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-[12px] font-bold text-white" style={{ background: 'rgba(220,38,38,0.75)' }}>Remove Post</button>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      <div className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 pointer-events-none">
        {toastItems.map(t => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl pointer-events-auto"
            style={{ background: t.type === 'success' ? 'rgba(34,197,94,0.13)' : 'rgba(239,68,68,0.13)', border: `1px solid ${t.type === 'success' ? 'rgba(34,197,94,0.28)' : 'rgba(239,68,68,0.28)'}`, color: t.type === 'success' ? '#4ade80' : '#f87171', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', animation: 'fadeUp 250ms ease forwards' }}>
            {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="text-[12px] font-medium">{t.message}</span>
            <button onClick={() => remove(t.id)} className="ml-1 opacity-50 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
