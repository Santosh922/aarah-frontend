'use client';

import { can } from '@/lib/permissions';

import {
    useState, useEffect, useCallback, useRef
} from 'react';
import {
    Search, RefreshCw, X, Package, Printer, FileText,
    Truck, CheckCircle2, Clock, AlertTriangle, RotateCcw,
    Copy, MapPin, Phone, Mail,
    ChevronLeft, ChevronRight,
    Eye, Edit3, Save,
    Hourglass, Settings, Archive, Navigation, CheckCircle, XCircle,
    ShieldCheck, Shield, ChevronDown
} from 'lucide-react';

import { API_URL } from '@/lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
type OrderStatus =
    | 'Pending' | 'Confirmed' | 'Processing'
    | 'Fulfillment' | 'Packed' | 'Shipped'
    | 'Out for Delivery' | 'Delivered'
    | 'Cancelled' | 'Returned';

interface OrderItem { sku: string; name: string; qty: number; price: number; size?: string; color?: string }
interface ShipEvent { status: OrderStatus; timestamp: string; note?: string; location?: string }
interface Order {
    id: string; invoiceId: string;
    customer: { name: string; email: string; phone: string };
    address: { line1: string; line2?: string; city: string; state: string; pincode: string };
    items: OrderItem[]; subtotal: number; discount: number; shipping: number; tax: number; total: number;
    paymentMode: string; paymentId: string; status: OrderStatus;
    courierName?: string; trackingId?: string; weight: string;
    createdAt: string; updatedAt: string; timeline: ShipEvent[];
    labelPrinted: boolean;
    assigneeId?: string | null;
    assigneeName?: string | null;
}

// ✅ FIXED: `can` is now imported from '@/lib/permissions' above

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_PIPELINE: OrderStatus[] = [
    'Pending', 'Confirmed', 'Processing', 'Fulfillment', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'
];
const STATUS_CFG: Record<OrderStatus, { color: string; bg: string; label: string; icon: React.ReactNode }> = {
    'Pending': { color: '#a855f7', bg: 'rgba(168,85,247,0.12)', label: 'Pending', icon: <Hourglass className="w-3 h-3" /> },
    'Confirmed': { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', label: 'Confirmed', icon: <CheckCircle className="w-3 h-3" /> },
    'Processing': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Processing', icon: <Settings className="w-3 h-3" /> },
    'Fulfillment': { color: '#22d3ee', bg: 'rgba(34,211,238,0.12)', label: 'Fulfillment', icon: <Package className="w-3 h-3" /> },
    'Packed': { color: '#818cf8', bg: 'rgba(129,140,248,0.12)', label: 'Packed', icon: <Archive className="w-3 h-3" /> },
    'Shipped': { color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', label: 'Shipped', icon: <Truck className="w-3 h-3" /> },
    'Out for Delivery': { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Out for Delivery', icon: <Navigation className="w-3 h-3" /> },
    'Delivered': { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: 'Delivered', icon: <CheckCircle2 className="w-3 h-3" /> },
    'Cancelled': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Cancelled', icon: <XCircle className="w-3 h-3" /> },
    'Returned': { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)', label: 'Returned', icon: <RotateCcw className="w-3 h-3" /> },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (s: string) => new Date(s).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const getCustomerName = (o: any) => o.customerName || o.user?.name || o.customer?.name || o.shippingAddress?.name || o.shippingAddress?.firstName || 'UNKNOWN';
const getCustomerPhone = (o: any) => o.customerPhone || o.user?.phone || o.customer?.phone || o.shippingAddress?.phone || 'N/A';
const getCustomerEmail = (o: any) => o.customerEmail || o.user?.email || o.customer?.email || o.shippingAddress?.email || 'N/A';
const getAddressLine1 = (o: any) => o.addressLine1 || o.address?.line1 || o.shippingAddress?.line1 || o.shippingAddress?.address1 || '';
const getAddressLine2 = (o: any) => o.addressLine2 || o.address?.line2 || o.shippingAddress?.line2 || o.shippingAddress?.address2 || '';
const getCity = (o: any) => o.addressCity || o.address?.city || o.shippingAddress?.city || '';
const getState = (o: any) => o.addressState || o.address?.state || o.shippingAddress?.state || '';
const getPincode = (o: any) => o.addressPin || o.address?.pincode || o.shippingAddress?.pincode || o.shippingAddress?.zipCode || o.shippingAddress?.zip || '';

// ─── Print helpers (unchanged) ────────────────────────────────────────────────
function printLabel(order: Order) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Label – ${order.id}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Courier New',monospace;background:#fff;}
@page{size:100mm 150mm;margin:0;}
.label{width:100mm;height:150mm;border:2px solid #000;padding:0;display:flex;flex-direction:column;overflow:hidden;}
.header{background:#000;color:#fff;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;}
.brand{font-size:18px;font-weight:900;letter-spacing:3px;}.badge{background:#fff;color:#000;font-size:7px;font-weight:700;padding:3px 8px;border-radius:2px;}
.section{padding:8px 12px;border-bottom:1.5px solid #000;}.to-section{padding:10px 12px;border-bottom:1.5px solid #000;flex:1;}
.to-name{font-size:15px;font-weight:900;margin-bottom:4px;}.to-addr{font-size:9px;line-height:1.6;color:#222;}
.pincode{font-size:22px;font-weight:900;letter-spacing:4px;margin-top:6px;}
.barcode-row{padding:8px 12px;display:flex;flex-direction:column;align-items:center;gap:4px;border-bottom:1.5px solid #000;}
.bars{display:flex;align-items:flex-end;height:36px;}.bar{background:#000;display:inline-block;}
.footer{padding:6px 12px;display:flex;justify-content:space-between;align-items:center;}
</style></head><body><div class="label">
<div class="header"><div><div class="brand">AARAH</div><div style="font-size:8px;letter-spacing:2px;opacity:0.7">PREMIUM FASHION</div></div>
<div><div class="badge">${order.paymentMode === 'COD' ? 'COD' : 'PREPAID'}</div><div style="font-size:8px;opacity:0.7;margin-top:4px;text-align:right">${order.weight || ''}</div></div></div>
<div class="section"><div style="font-size:7px;letter-spacing:1.5px;color:#666;margin-bottom:3px">FROM</div>
<div style="font-size:11px;font-weight:700">AARAH FASHION</div><div style="font-size:9px;color:#333">123 Fashion District, Mumbai – 400001</div></div>
<div class="to-section"><div style="font-size:7px;letter-spacing:1.5px;color:#666;margin-bottom:3px">SHIP TO</div>
<div class="to-name">${getCustomerName(order).toUpperCase()}</div>
<div class="to-addr">${getAddressLine1(order)}${getAddressLine2(order) ? ', ' + getAddressLine2(order) : ''}<br>${getCity(order)}, ${getState(order)}<br>T: ${getCustomerPhone(order)}</div>
<div class="pincode">${getPincode(order)}</div></div>
<div class="barcode-row"><div class="bars">${order.id.replace(/\W/g, '').split('').flatMap(c => { const code = c.charCodeAt(0); return [`<div class="bar" style="width:${(code % 3) + 1}px;height:${28 + ((code % 5) * 2)}px;margin-right:1px;"></div>`, `<div class="bar" style="width:${((code >> 2) % 3) + 1}px;height:${20 + ((code % 7) * 1.5)}px;margin-right:2px;"></div>`]; }).join('')}</div>
<div style="font-size:8px;letter-spacing:2px;font-family:monospace">${order.id} | ${order.invoiceId}</div></div>
<div class="footer"><div><div style="font-size:10px;font-weight:700">${order.id}</div><div style="font-size:7px;color:#666">Value: ${fmtMoney(order.total)}</div></div>
<div style="font-size:7px;color:#666;text-align:right">${fmtDate(order.createdAt)}<br>aarah.com</div></div>
</div><script>window.onload=()=>{window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=420,height=620'); win?.document.write(html); win?.document.close();
}

function printInvoice(order: Order) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Invoice – ${order.invoiceId}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Georgia',serif;background:#fff;color:#111;padding:40px;max-width:800px;margin:auto;}
@page{size:A4;margin:20mm;}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:24px;border-bottom:2px solid #000;}
.brand{font-size:28px;font-weight:900;letter-spacing:4px;}
table{width:100%;border-collapse:collapse;margin-bottom:24px;}
thead th{font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:#999;padding:10px 8px;border-bottom:1.5px solid #000;text-align:left;}
tbody td{padding:10px 8px;font-size:11px;border-bottom:1px solid #eee;}.text-right{text-align:right;}
.totals{margin-left:auto;width:280px;}.total-row{display:flex;justify-content:space-between;font-size:11px;padding:4px 0;color:#555;}
.total-final{display:flex;justify-content:space-between;font-size:15px;font-weight:700;padding:10px 0;border-top:2px solid #000;margin-top:6px;}
</style></head><body>
<div class="header"><div><div class="brand">AARAH</div><div style="font-size:9px;letter-spacing:3px;color:#666">PREMIUM FASHION</div></div>
<div style="text-align:right"><div style="font-size:22px;font-weight:700">TAX INVOICE</div><div style="font-size:10px;color:#666;margin-top:4px">${order.invoiceId}</div>
<div style="font-size:10px;color:#666;margin-top:8px">Date: ${fmtDate(order.createdAt)}</div><div style="font-size:10px;color:#666">Order: ${order.id}</div></div></div>
<table><thead><tr><th>#</th><th>Item</th><th>SKU</th><th>Size</th><th class="text-right">Qty</th><th class="text-right">Price</th><th class="text-right">Total</th></tr></thead>
<tbody>${order.items.map((item, i) => `<tr><td style="color:#999">${i + 1}</td><td style="font-weight:600">${item.name}</td><td style="font-family:monospace;color:#888;font-size:10px">${item.sku}</td><td>${item.size ?? '—'}</td><td class="text-right">${item.qty}</td><td class="text-right">${fmtMoney(item.price)}</td><td class="text-right;font-weight:600">${fmtMoney(item.price * item.qty)}</td></tr>`).join('')}</tbody></table>
<div class="totals"><div class="total-row"><span>Subtotal</span><span>${fmtMoney(order.subtotal)}</span></div>
${order.discount ? `<div class="total-row"><span>Discount</span><span style="color:#22c55e">– ${fmtMoney(order.discount)}</span></div>` : ''}
<div class="total-row"><span>Shipping</span><span>${order.shipping === 0 ? 'FREE' : fmtMoney(order.shipping)}</span></div>
<div class="total-row"><span>GST (5%)</span><span>${fmtMoney(order.tax)}</span></div>
<div class="total-final"><span>TOTAL</span><span>${fmtMoney(order.total)}</span></div></div>
<script>window.onload=()=>{window.print();}</script></body></html>`;
    const win = window.open('', '_blank', 'width=900,height=700'); win?.document.write(html); win?.document.close();
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }: { status: OrderStatus; size?: 'xs' | 'sm' | 'md' }) {
    const cfg = STATUS_CFG[status];
    const sz = size === 'xs' ? 'text-[9px] px-2 py-0.5' : size === 'md' ? 'text-[11px] px-3 py-1.5' : 'text-[10px] px-2.5 py-1';
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap ${sz}`}
            style={{ background: cfg.bg, color: cfg.color }}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

// ─── Shipment Timeline ─────────────────────────────────────────────────────────
function ShipmentTimeline({ order }: { order: Order }) {
    const isTerminal = order.status === 'Cancelled' || order.status === 'Returned';
    const pipeline = isTerminal ? [...STATUS_PIPELINE, order.status] : STATUS_PIPELINE;
    const currentIdx = pipeline.indexOf(order.status);

    return (
        <div className="relative">
            {pipeline.map((status, idx) => {
                const done = idx <= currentIdx;
                const current = idx === currentIdx;
                const event = order.timeline.find(e => e.status === status);
                const cfg = STATUS_CFG[status];
                const isLast = idx === pipeline.length - 1;
                return (
                    <div key={status} className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                                style={{
                                    background: done ? cfg.color : 'rgba(255,255,255,0.06)',
                                    color: done ? '#fff' : 'rgba(255,255,255,0.2)',
                                    boxShadow: current ? `0 0 0 4px ${cfg.color}25, 0 0 16px ${cfg.color}40` : 'none',
                                    border: current ? `2px solid ${cfg.color}` : '2px solid transparent'
                                }}>
                                {done ? (current ? cfg.icon : <CheckCircle className="w-4 h-4" />) : <span className="text-white/20 text-xs">{idx + 1}</span>}
                            </div>
                            {!isLast && <div className="w-0.5 flex-1 my-1 min-h-[24px]"
                                style={{ background: done && idx < currentIdx ? cfg.color : 'rgba(255,255,255,0.07)' }} />}
                        </div>
                        <div className="pb-5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-semibold"
                                    style={{ color: done ? cfg.color : 'rgba(255,255,255,0.25)' }}>
                                    {STATUS_CFG[status].label}
                                </span>
                                {current && <span className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                                    style={{ background: `${cfg.color}20`, color: cfg.color }}>CURRENT</span>}
                            </div>
                            {event ? (
                                <div className="mt-0.5 space-y-0.5">
                                    <p className="text-white/30 text-[10px]">{fmtDate(event.timestamp)} · {fmtTime(event.timestamp)}</p>
                                    {event.note && <p className="text-white/40 text-[11px]">{event.note}</p>}
                                    {event.location && <p className="text-white/25 text-[10px]">Loc: {event.location}</p>}
                                </div>
                            ) : <p className="text-white/15 text-[10px] mt-0.5">Awaiting this stage…</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Order Detail Drawer ───────────────────────────────────────────────────────
function OrderDrawer({
    order, onClose, onStatusChange, onLabelPrint, currentUser
}: {
    order: Order;
    onClose: () => void;
    onStatusChange: (id: string, status: OrderStatus, extra?: { trackingId?: string; courierName?: string }) => void;
    onLabelPrint: (id: string) => void;
    currentUser: { id: string; name: string };
}) {
    const [activeTab, setActiveTab] = useState<'timeline' | 'items' | 'customer'>('timeline');
    const [editStatus, setEditStatus] = useState(false);
    const [selStatus, setSelStatus] = useState<OrderStatus>(order.status);
    const [trackingId, setTrackingId] = useState(order.trackingId ?? '');
    const [courierName, setCourierName] = useState(order.courierName ?? '');
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const pickerAnchorRef = useRef<HTMLDivElement>(null);

    const copyText = (txt: string, key: string) => {
        navigator.clipboard.writeText(txt);
        setCopied(key); setTimeout(() => setCopied(''), 1500);
    };

    const handleSave = async () => {
        setSaving(true);
        await onStatusChange(order.id, selStatus, { trackingId: trackingId || undefined, courierName: courierName || undefined });
        setSaving(false); setEditStatus(false);
    };

    const canUpdateStatus = can.updateStatus();
    const canPrint = can.printLabel();
    const showQuickActions = canUpdateStatus || canPrint;

    const COURIERS = ['ST-courier', 'Delhivery', 'Shiprocket', 'BlueDart', 'DTDC', 'Ekart', 'Xpressbees'];

    return (
        <>
            <div className="fixed inset-0 z-[150]"
                style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
            <div className="fixed top-0 right-0 bottom-0 z-[200] flex flex-col overflow-hidden"
                style={{
                    width: 'min(560px,100vw)', background: 'linear-gradient(180deg,#141414 0%,#111 100%)',
                    borderLeft: '1px solid rgba(255,255,255,0.07)', boxShadow: '-32px 0 64px rgba(0,0,0,0.6)',
                    animation: 'slideInRight 280ms cubic-bezier(0.32,0.72,0,1) forwards'
                }}>

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b shrink-0"
                    style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3">
                        <button onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
                            <X className="w-4 h-4" />
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold text-[15px] font-mono">{order.id}</span>
                                <button onClick={() => copyText(order.id, 'id')} className="text-white/20 hover:text-white/60 transition-colors">
                                    <Copy className="w-3 h-3" />
                                </button>
                                {copied === 'id' && <span className="text-green-400 text-[10px]">Copied!</span>}
                            </div>
                            <p className="text-white/30 text-[10px] mt-0.5">{fmtDate(order.createdAt)} · {fmtTime(order.createdAt)}</p>
                        </div>
                    </div>
                    <StatusBadge status={order.status} size="md" />
                </div>

                {/* Quick Actions */}
                {showQuickActions && (
                    <div className="px-6 py-3 flex gap-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        {canPrint && (
                            <>
                                <button onClick={() => { printLabel(order); onLabelPrint(order.id); }}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all active:scale-95"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <Printer className="w-3.5 h-3.5" /> Print Label
                                    {order.labelPrinted && <span className="text-green-400 text-[9px]">Done</span>}
                                </button>
                                <button onClick={() => printInvoice(order)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold text-white/70 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all active:scale-95"
                                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                                    <FileText className="w-3.5 h-3.5" /> Invoice
                                </button>
                            </>
                        )}
                        {canUpdateStatus && (
                            <button onClick={() => setEditStatus(e => !e)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all active:scale-95 ml-auto"
                                style={{
                                    background: editStatus ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                                    borderColor: editStatus ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)',
                                    color: editStatus ? '#fff' : 'rgba(255,255,255,0.7)'
                                }}>
                                <Edit3 className="w-3.5 h-3.5" /> Update Status
                            </button>
                        )}
                    </div>
                )}

                {/* Status Editor */}
                {editStatus && canUpdateStatus && (
                    <div className="px-6 py-4 border-b shrink-0 space-y-3"
                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <p className="text-white/40 text-[10px] font-semibold tracking-widest uppercase">Update Status</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(Object.keys(STATUS_CFG) as OrderStatus[]).map(s => {
                                const cfg = STATUS_CFG[s]; const sel = selStatus === s;
                                return (
                                    <button key={s} onClick={() => setSelStatus(s)}
                                        className="px-2 py-2 rounded-xl text-[10px] font-semibold transition-all text-left flex items-center gap-2"
                                        style={{
                                            background: sel ? cfg.bg : 'rgba(255,255,255,0.04)',
                                            color: sel ? cfg.color : 'rgba(255,255,255,0.35)',
                                            border: `1px solid ${sel ? cfg.color + '50' : 'rgba(255,255,255,0.06)'}`
                                        }}>
                                        {cfg.icon} {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                        {['Shipped', 'Out for Delivery', 'Delivered'].includes(selStatus) && (
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                    <p className="text-white/30 text-[9px] mb-1 uppercase tracking-wider">Courier</p>
                                    <select value={courierName} onChange={e => setCourierName(e.target.value)}
                                        className="w-full rounded-xl px-3 py-2 text-[11px] text-white outline-none border border-white/[0.08] appearance-none"
                                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <option value="">Select…</option>
                                        {COURIERS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <p className="text-white/30 text-[9px] mb-1 uppercase tracking-wider">Tracking ID</p>
                                    <input value={trackingId} onChange={e => setTrackingId(e.target.value)}
                                        placeholder="TRK12345…"
                                        className="w-full rounded-xl px-3 py-2 text-[11px] text-white outline-none border border-white/[0.08] placeholder:text-white/20"
                                        style={{ background: 'rgba(255,255,255,0.06)' }} />
                                </div>
                            </div>
                        )}
                        <button onClick={handleSave} disabled={saving}
                            className="w-full py-2.5 rounded-xl text-[12px] font-bold text-black bg-white hover:bg-white/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex px-6 pt-4 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {(['timeline', 'items', 'customer'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className="pb-3 px-1 mr-6 text-[11px] font-semibold capitalize transition-all border-b-2"
                            style={{
                                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.3)',
                                borderColor: activeTab === tab ? '#fff' : 'transparent'
                            }}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="flex-1 overflow-y-auto px-6 py-5" style={{ scrollbarWidth: 'none' }}>
                    {activeTab === 'timeline' && (
                        <div>
                            {order.trackingId && (
                                <div className="mb-5 p-4 rounded-xl flex items-center justify-between gap-3"
                                    style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
                                    <div>
                                        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Tracking ID</p>
                                        <p className="text-[13px] font-mono font-bold text-white">{order.trackingId}</p>
                                        {order.courierName && <p className="text-[10px] text-white/40 mt-0.5">via {order.courierName}</p>}
                                    </div>
                                    <button onClick={() => copyText(order.trackingId!, 'track')} className="text-white/30 hover:text-white/70 transition-colors">
                                        {copied === 'track' ? <span className="text-green-400 text-[10px]">Done</span> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            )}
                            <ShipmentTimeline order={order} />
                        </div>
                    )}
                    {activeTab === 'items' && (
                        <div className="space-y-3">
                            {order.items.map((item, i) => (
                                <div key={i} className="flex gap-4 p-4 rounded-xl"
                                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                        style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <Package className="w-5 h-5 text-white/30" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-[12px] font-semibold truncate">{item.name}</p>
                                        <p className="text-white/30 text-[10px] mt-0.5 font-mono">{item.sku} · Size: {item.size ?? '—'}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-white/40 text-[11px]">× {item.qty}</span>
                                            <span className="text-white font-semibold text-[12px]">{fmtMoney(item.price * item.qty)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="p-4 rounded-xl space-y-2 mt-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex justify-between text-[11px]"><span className="text-white/30">Subtotal</span><span className="text-white/70">{fmtMoney(order.subtotal)}</span></div>
                                {order.discount > 0 && <div className="flex justify-between text-[11px]"><span className="text-white/30">Discount</span><span className="text-green-400">– {fmtMoney(order.discount)}</span></div>}
                                <div className="flex justify-between text-[11px]"><span className="text-white/30">Shipping</span><span className="text-white/70">{order.shipping === 0 ? 'Free' : fmtMoney(order.shipping)}</span></div>
                                <div className="flex justify-between text-[11px]"><span className="text-white/30">GST (5%)</span><span className="text-white/70">{fmtMoney(order.tax)}</span></div>
                                <div className="flex justify-between text-[13px] font-bold pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}><span className="text-white/60">Total</span><span className="text-white">{fmtMoney(order.total)}</span></div>
                            </div>
                        </div>
                    )}
                    {activeTab === 'customer' && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold">Customer</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px]"
                                        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                                        {getCustomerName(order)[0] || '?'}
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-[13px]">{getCustomerName(order)}</p>
                                        <p className="text-white/30 text-[10px]">{order.invoiceId}</p>
                                    </div>
                                </div>
                                {[
                                    { icon: <Phone className="w-3.5 h-3.5" />, val: getCustomerPhone(order), key: 'phone' },
                                    { icon: <Mail className="w-3.5 h-3.5" />, val: getCustomerEmail(order), key: 'email' },
                                ].map(row => (
                                    <div key={row.key} className="flex items-center gap-3">
                                        <span className="text-white/30">{row.icon}</span>
                                        <span className="text-white/60 text-[11px] flex-1">{row.val}</span>
                                        <button onClick={() => copyText(row.val, row.key)} className="text-white/20 hover:text-white/50 transition-colors">
                                            {copied === row.key ? <span className="text-green-400 text-[9px]">Done</span> : <Copy className="w-3 h-3" />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-white/25 text-[9px] uppercase tracking-wider font-semibold mb-3">Delivery Address</p>
                                <div className="flex gap-3">
                                    <MapPin className="w-3.5 h-3.5 text-white/30 mt-0.5 shrink-0" />
                                    <p className="text-white/60 text-[11px] leading-relaxed">
                                        {getAddressLine1(order) || 'No Address'}{getAddressLine2(order) ? ', ' + getAddressLine2(order) : ''}<br />
                                        {getCity(order)}{getState(order) ? `, ${getState(order)}` : ''}<br />
                                        <span className="font-mono font-bold text-white/80">{getPincode(order)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminOrdersPage() {
    const [view, setView] = useState('all');

    // ─── AUTHENTICATION AUTO-SELECT ───
    const [currentUser, setCurrentUser] = useState<{ id: string; name: string }>({
        id: '', name: ''
    });

    useEffect(() => {
        fetch(`${API_URL}/api/auth/admin/me`, { credentials: 'include' })
            .then(res => {
                if (res.status === 401) { window.location.href = '/admin/login'; return null; }
                return res.json();
            })
            .then(data => {
                if (!data) return;
                setCurrentUser({ id: data.id, name: data.name });
                setView('all');
            })
            .catch(() => { window.location.href = '/admin/login'; });
    }, []);


    const [orders, setOrders] = useState<Order[]>([]);
    const [total, setTotal] = useState(0);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selected, setSelected] = useState<Order | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('All');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 15;

    const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => setDebouncedSearch(search), 350);
    }, [search]);

    const fetchOrders = useCallback(async (isRefresh = false) => {
        // Only fetch if we have an ID loaded
        if (!currentUser.id) return;

        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const qs = new URLSearchParams({
                search: debouncedSearch, status, page: String(page), pageSize: String(PAGE_SIZE),
                viewType: view, assigneeId: currentUser.id,
                dateRange: debouncedSearch ? 'all' : 'last_month'
            });
            const res = await fetch(`${API_URL}/api/admin/orders?${qs}`, { credentials: 'include', cache: 'no-store' });
            const data = await res.json();
            setOrders(data.orders ?? []);
            setTotal(data.total ?? 0);
            setStatusCounts(data.statusCounts ?? {});
        } finally { setLoading(false); setRefreshing(false); }
    }, [debouncedSearch, status, page, view, currentUser.id]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);
    useEffect(() => { setPage(1); }, [debouncedSearch, status, view]);

    const patchOrder = async (body: object) => {
        const b = body as any;
        const orderId = b.id;
        const headers = { 'Content-Type': 'application/json' };
        const opts = { method: 'PATCH', credentials: 'include' as RequestCredentials, headers };

        if (b.action === 'CLAIM' || b.action === 'ASSIGN' || b.action === 'UNASSIGN') {
            await fetch(`${API_URL}/api/admin/orders/${orderId}/assign`, {
                ...opts, body: JSON.stringify({ assigneeId: b.assigneeId, assigneeName: b.assigneeName }),
            });
        } else if (b.labelPrinted) {
            await fetch(`${API_URL}/api/admin/orders/${orderId}/tracking`, {
                ...opts, body: JSON.stringify({ labelPrinted: 'true' }),
            });
        } else if (b.status) {
            const { id, ...rest } = b;
            await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
                ...opts, body: JSON.stringify(rest),
            });
        } else if (b.courierName !== undefined || b.awbNumber !== undefined || b.trackingId !== undefined) {
            const { id, ...rest } = b;
            await fetch(`${API_URL}/api/admin/orders/${orderId}/tracking`, {
                ...opts, body: JSON.stringify(rest),
            });
        }
        fetchOrders(true);
    };

    const handleStatusChange = async (id: string, newStatus: OrderStatus, extra?: { trackingId?: string; courierName?: string }) => {
        await patchOrder({ id, status: newStatus, ...extra });
        if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: newStatus, ...extra } : prev);
    };

    const handleLabelPrint = async (id: string) => {
        await patchOrder({ id, labelPrinted: true });
        setOrders(prev => prev.map(o => o.id === id ? { ...o, labelPrinted: true } : o));
    };



    const totalPages = Math.ceil(total / PAGE_SIZE);

    // Prevent rendering until currentUser is set to prevent API errors
    if (!currentUser.id) return null;

    return (
        <div className="min-h-screen" style={{ background: '#0e0e0e', fontFamily: "'DM Sans',sans-serif", color: '#fff' }}>
            <style jsx global>{`
        @keyframes fadeUp      { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight{ from{transform:translateX(100%)} to{transform:translateX(0)} }
        ::-webkit-scrollbar   { width:0;height:0 }
        select option          { background:#1a1a1a }
      `}</style>

            {/* ── Top bar ── */}
            <div className="sticky top-0 z-50 flex flex-col md:flex-row md:items-center justify-between px-6 md:px-8 py-3 md:h-16 border-b gap-3"
                style={{ background: 'rgba(14,14,14,0.95)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
                <div>
                    <h1 className="text-white font-bold text-[17px] tracking-tight leading-none" style={{ fontFamily: "'Georgia',serif" }}>Fulfillment Center</h1>
                    <p className="text-white/25 text-[10px] mt-1 tracking-widest uppercase">
                        {view === 'all' ? 'All Orders' : 'Orders'} · {total.toLocaleString()} Orders
                    </p>
                </div>

                {/* Logged in User Profile */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                            {currentUser.name ? currentUser.name[0] : ''}
                        </div>
                        <span className="text-white/60 text-[11px] font-medium">{currentUser.name}</span>
                    </div>
                </div>

                {/* View switcher + search */}
                <div className="flex items-center gap-3 flex-1 md:max-w-md">
                    <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 shrink-0">
                        <button onClick={() => setView('all')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${view === 'all' ? 'bg-white text-black' : 'text-white/40'}`}>
                            ALL ORDERS
                        </button>
                    </div>
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…"
                            className="w-full pl-10 pr-4 py-2 rounded-xl text-[11px] text-white placeholder:text-white/20 outline-none border border-white/[0.08] focus:border-white/20 transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)' }} />
                        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-3.5 h-3.5" /></button>}
                    </div>
                    <button onClick={() => fetchOrders(true)} disabled={refreshing}
                        className="p-2 rounded-xl border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/5 transition-all shrink-0"
                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Status tabs ── */}
            <div className="flex gap-1 px-6 md:px-8 py-3 border-b overflow-x-auto" style={{ borderColor: 'rgba(255,255,255,0.06)', scrollbarWidth: 'none' }}>
                {['All', ...STATUS_PIPELINE, 'Cancelled', 'Returned'].map(s => {
                    const cfg = s !== 'All' ? STATUS_CFG[s as OrderStatus] : null;
                    const count = statusCounts[s] ?? 0;
                    const active = status === s;
                    return (
                        <button key={s} onClick={() => setStatus(s)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all shrink-0"
                            style={{
                                background: active ? (cfg ? cfg.bg : 'rgba(255,255,255,0.1)') : 'transparent',
                                color: active ? (cfg ? cfg.color : '#fff') : 'rgba(255,255,255,0.3)',
                                border: `1px solid ${active ? (cfg ? cfg.color + '40' : 'rgba(255,255,255,0.2)') : 'transparent'}`
                            }}>
                            {cfg && cfg.icon} {s}
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
                                style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* ── Table ── */}
            <div className="px-4 md:px-8 py-6">
                <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'linear-gradient(180deg,rgba(20,20,20,0.9),rgba(16,16,16,0.95))' }}>
                    {loading ? (
                        <div className="p-8 space-y-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-12 rounded-xl animate-pulse"
                                    style={{ background: 'rgba(255,255,255,0.04)', animationDelay: `${i * 60}ms` }} />
                            ))}
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="py-20 flex flex-col items-center gap-3">
                            <Package className="w-10 h-10 text-white/10" />
                            <p className="text-white/30 text-sm">No orders found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        {['Order ID', 'Customer', 'Items', 'Status', 'Date', ''].map(h => (
                                            <th key={h} className="px-5 py-4 text-[9px] font-bold tracking-[0.18em] uppercase text-white/25 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, i) => {
                                        return (
                                            <tr key={order.id} className="group cursor-pointer transition-colors duration-100"
                                                style={{
                                                    borderBottom: i < orders.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                                                    animation: `fadeUp 0.35s ease forwards ${i * 30}ms`, opacity: 0
                                                }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                onClick={() => setSelected(order)}>

                                                <td className="px-5 py-3.5">
                                                    <span className="text-white/70 text-[11px] font-mono font-semibold">{order.id}</span>
                                                    {order.status === 'Cancelled' && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[8px] font-bold rounded uppercase tracking-wider animate-pulse"><AlertTriangle className="w-2 h-2 mr-1" /> Refund Action Req</span>
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-5 py-3.5">
                                                    <div>
                                                        <p className="text-white/85 text-[12px] font-medium">{getCustomerName(order)}</p>
                                                        <p className="text-white/25 text-[10px] mt-0.5">{getCustomerPhone(order)}</p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3.5">
                                                    <div>
                                                        <p className="text-white/60 text-[11px] truncate max-w-[160px]">
                                                            {order.items[0]?.name}{order.items.length > 1 ? ` +${order.items.length - 1}` : ''}
                                                        </p>
                                                        <p className="text-white/25 text-[10px] mt-0.5">
                                                            {order.items.reduce((s, i) => s + i.qty, 0)} pcs · {fmtMoney(order.total)}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3.5"><StatusBadge status={order.status} /></td>

                                                <td className="px-5 py-3.5">
                                                    <div>
                                                        <p className="text-white/40 text-[11px]">{fmtDate(order.createdAt)}</p>
                                                        <p className="text-white/20 text-[10px] mt-0.5">{fmtTime(order.createdAt)}</p>
                                                    </div>
                                                </td>

                                                <td className="px-5 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                        {/* View icon always */}
                                                        <button onClick={() => setSelected(order)}
                                                            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && totalPages > 1 && (
                        <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            <span className="text-white/30 text-[11px]">{((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</span>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                                    return (
                                        <button key={p} onClick={() => setPage(p)}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all"
                                            style={{ background: p === page ? 'rgba(255,255,255,0.1)' : 'transparent', color: p === page ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                                            {p}
                                        </button>
                                    );
                                })}
                                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selected && (
                <OrderDrawer
                    order={selected}
                    onClose={() => setSelected(null)}
                    onStatusChange={handleStatusChange}
                    onLabelPrint={handleLabelPrint}
                    currentUser={currentUser}
                />
            )}
        </div>
    );
}