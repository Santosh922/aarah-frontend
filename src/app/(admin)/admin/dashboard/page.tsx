'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  PieChart, Pie, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, RefreshCw,
  ShoppingBag, Users, IndianRupee, Package,
  Clock, RotateCcw, ArrowRight,
  AlertTriangle, CheckCircle2, Truck, Hourglass, UserCheck,
} from 'lucide-react';

import { API_URL } from '@/lib/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
interface KPIItem { value: number; prev: number; prefix: string; suffix: string }

function pct(val: number, prev: number) {
  if (!prev) return 0;
  return +(((val - prev) / prev) * 100).toFixed(1);
}

function fmt(n: number, prefix = '', suffix = '') {
  const s = n >= 100000
    ? `${(n / 100000).toFixed(2)}L`
    : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  return `${prefix}${s}${suffix}`;
}

const STATUS_META: Record<string, { color: string; icon: React.ReactNode }> = {
  Delivered:     { color: '#22c55e', icon: <CheckCircle2 className="w-3 h-3" /> },
  Processing:    { color: '#f59e0b', icon: <Hourglass className="w-3 h-3" /> },
  Shipped:       { color: '#3b82f6', icon: <Truck className="w-3 h-3" /> },
  Pending:       { color: '#a855f7', icon: <Clock className="w-3 h-3" /> },
  Cancelled:     { color: '#ef4444', icon: <AlertTriangle className="w-3 h-3" /> },
  OutForDelivery:{ color: '#fb923c', icon: <Truck className="w-3 h-3" /> },
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`rounded-xl animate-pulse ${className}`} style={{ background: 'rgba(255,255,255,0.05)' }} />;
}

function KPICard({ label, icon, item, delay = 0 }: { label: string; icon: React.ReactNode; item: KPIItem; delay?: number }) {
  const change     = pct(item.value, item.prev);
  const up         = change >= 0;
  const lowerBetter = label === 'Return Rate' || label === 'Pending Orders';
  const positive   = lowerBetter ? !up : up;

  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] p-5 flex flex-col gap-4 group hover:border-white/[0.15] transition-all duration-300"
      style={{ background: 'linear-gradient(145deg, rgba(24,24,24,0.9) 0%, rgba(18,18,18,0.95) 100%)', animationDelay: `${delay}ms`, animation: 'fadeUp 0.5s ease forwards', opacity: 0 }}>
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-[10px] font-semibold tracking-[0.18em] uppercase">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 group-hover:text-white/60 transition-colors duration-300"
          style={{ background: 'rgba(255,255,255,0.05)' }}>{icon}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-white font-bold leading-none" style={{ fontFamily: "'Georgia', serif", fontSize: 28 }}>
          {fmt(item.value, item.prefix, item.suffix)}
        </span>
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold mb-0.5"
          style={{ background: positive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', color: positive ? '#22c55e' : '#ef4444' }}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="h-px w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div className="h-px rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, (item.value / (item.prev * 1.5 || 1)) * 100)}%`, background: positive ? '#22c55e' : '#ef4444', opacity: 0.7 }} />
      </div>
      <span className="text-white/20 text-[10px]">vs {fmt(item.prev, item.prefix, item.suffix)} last period</span>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-white text-[15px] font-semibold tracking-tight" style={{ fontFamily: "'Georgia', serif" }}>{title}</h2>
      {sub && <p className="text-white/30 text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

const kpiConfig = [
  { key: 'totalRevenue',    label: 'Total Revenue',    icon: <IndianRupee className="w-4 h-4" /> },
  { key: 'totalOrders',     label: 'Total Orders',     icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'totalCustomers',  label: 'Customers',        icon: <Users className="w-4 h-4" /> },
  { key: 'productsSold',    label: 'Products Sold',    icon: <Package className="w-4 h-4" /> },
  { key: 'avgOrderValue',   label: 'Avg. Order Value', icon: <IndianRupee className="w-4 h-4" /> },
  { key: 'activeAssociates',label: 'Active Associates',icon: <UserCheck className="w-4 h-4" /> },
  { key: 'pendingOrders',   label: 'Pending Orders',   icon: <Clock className="w-4 h-4" /> },
  { key: 'returnRate',      label: 'Return Rate',      icon: <RotateCcw className="w-4 h-4" /> },
];

export default function AdminDashboard() {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [revenueView, setRevenueView] = useState<'revenue' | 'orders'>('revenue');
  const [time, setTime]           = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/dashboard`, {
        credentials: 'include',
      });

      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to load dashboard (${res.status})`);
      }

      const json = await res.json();
      
      const mappedData = {
        ...json,
        orderStatus: json.orderStatusBreakdown?.map((item: any) => ({
          name: item.status,
          value: item.count,
          color: STATUS_META[item.status]?.color || '#ffffff'
        })),
        recentOrders: json.recentOrders?.map((order: any) => ({
          id: order.invoiceId || order.id,
          customer: order.customer?.name || 'Unknown',
          associate: 'Unassigned',
          sku: 'Various',
          items: '-', 
          amount: order.total,
          status: order.status,
          date: new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        })),
        topProducts: json.topProducts?.map((p: any) => ({
          ...p,
          stock: p.stock ?? 99 
        }))
      };

      setData(mappedData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-xl border border-white/10 px-3 py-2 text-xs"
        style={{ background: 'rgba(18,18,18,0.97)', backdropFilter: 'blur(8px)' }}>
        <p className="text-white/40 mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color || '#fff' }}>
            {p.name}: <strong>{revenueView === 'revenue' ? '₹' : ''}{p.value?.toLocaleString('en-IN')}</strong>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white" style={{ background: '#0e0e0e', fontFamily: "'DM Sans', sans-serif" }}>
      <style jsx global>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 h-16 border-b"
        style={{ background: 'rgba(14,14,14,0.92)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)' }}>
        <div>
          <h1 className="text-white text-[18px] font-bold tracking-tight leading-none" style={{ fontFamily: "'Georgia', serif" }}>AARAH Admin</h1>
          <p className="text-white/25 text-[10px] mt-0.5 tracking-widest uppercase">Overview · Today</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/40 text-[11px] font-mono tracking-wide">{time}</span>
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-medium text-white/60 hover:text-white border border-white/[0.08] hover:border-white/20 transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-8 space-y-10 max-w-[1600px] mx-auto">

        {/* KPI Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white/90 text-[13px] font-semibold tracking-[0.12em] uppercase">Key Metrics</h2>
          </div>
          {error && (
            <div className="mb-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-amber-400 text-[13px] font-bold tracking-wide uppercase mb-1">Dashboard Error</h3>
                <p className="text-amber-300/80 text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiConfig.map(({ key, label, icon }, i) =>
                data?.kpis?.[key] ? (
                  <KPICard key={key} label={label} icon={icon} item={data.kpis[key]} delay={i * 60} />
                ) : null
              )}
            </div>
          )}
        </section>

        {/* Revenue Chart + Order Doughnut */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl border border-white/[0.07] p-6"
            style={{ background: 'linear-gradient(145deg, rgba(20,20,20,0.9), rgba(16,16,16,0.95))' }}>
            <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
              <SectionHeader title="Revenue & Orders" sub="Last 7 days performance" />
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {(['revenue', 'orders'] as const).map(v => (
                  <button key={v} onClick={() => setRevenueView(v)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-all duration-200"
                    style={{ background: revenueView === v ? 'rgba(255,255,255,0.1)' : 'transparent', color: revenueView === v ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {loading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data?.revenueChart ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} tickLine={false} axisLine={false}
                    tickFormatter={v => revenueView === 'revenue' ? `₹${(v / 1000).toFixed(0)}k` : String(v)} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey={revenueView} stroke="#ffffff" strokeWidth={1.5}
                    fill="url(#grad)" strokeOpacity={0.7} dot={false}
                    activeDot={{ r: 4, fill: '#fff', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-white/[0.07] p-6 flex flex-col"
            style={{ background: 'linear-gradient(145deg, rgba(20,20,20,0.9), rgba(16,16,16,0.95))' }}>
            <SectionHeader title="Order Status" sub="Current fulfillment pipeline" />
            {loading ? <Skeleton className="flex-1" /> : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={data?.orderStatus ?? []} cx="50%" cy="50%" innerRadius={48} outerRadius={70} paddingAngle={3} dataKey="value" strokeWidth={0}>
                      {data?.orderStatus?.map((s: any, i: number) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'rgba(18,18,18,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {data?.orderStatus?.map((s: any) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        <span className="text-white/50 text-[11px]">{s.name}</span>
                      </div>
                      <span className="text-white/80 text-[11px] font-semibold">{s.value?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Recent Orders */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <SectionHeader title="Recent Orders & Assignments" sub="Latest transactions with associate tracking" />
            <a href="/admin/orders" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 transition-colors">
              View all <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="rounded-2xl border border-white/[0.07] overflow-hidden"
            style={{ background: 'linear-gradient(145deg, rgba(20,20,20,0.9), rgba(16,16,16,0.95))' }}>
            {loading ? (
              <div className="p-6 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Order', 'Customer', 'Associate', 'SKU', 'Items', 'Amount', 'Status', 'Date'].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[9px] font-bold tracking-[0.18em] uppercase text-white/25">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recentOrders?.map((o: any, i: number) => {
                      const meta = STATUS_META[o.status] ?? { color: '#888', icon: null };
                      return (
                        <tr key={o.id ?? i} className="hover:bg-white/[0.025] transition-colors cursor-pointer"
                          style={{ borderBottom: i < (data.recentOrders.length - 1) ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                          <td className="px-5 py-3.5"><span className="text-white/70 text-[11px] font-mono">{o.id}</span></td>
                          <td className="px-5 py-3.5"><span className="text-white/80 text-[12px] font-medium">{o.customer}</span></td>
                          <td className="px-5 py-3.5"><span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">{o.associate}</span></td>
                          <td className="px-5 py-3.5"><span className="text-white/35 text-[10px] font-mono">{o.sku}</span></td>
                          <td className="px-5 py-3.5"><span className="text-white/40 text-[11px]">{o.items}</span></td>
                          <td className="px-5 py-3.5"><span className="text-white text-[12px] font-semibold">₹{o.amount?.toLocaleString('en-IN')}</span></td>
                          <td className="px-5 py-3.5">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                              style={{ background: `${meta.color}18`, color: meta.color }}>
                              {meta.icon} {o.status}
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><span className="text-white/30 text-[10px]">{o.date}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Top Products */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <SectionHeader title="Top Selling Inventory" sub="By units sold this period" />
            <a href="/admin/products" className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/70 transition-colors">
              All products <ArrowRight className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) :
              data?.topProducts?.map((p: any, i: number) => {
                const maxSold = data.topProducts[0]?.sold ?? 1;
                const barPct  = (p.sold / maxSold) * 100;
                const lowStock = p.stock < 20;
                return (
                  <div key={p.name} className="rounded-2xl border border-white/[0.07] p-5 flex flex-col gap-3 hover:border-white/[0.14] transition-all cursor-pointer"
                    style={{ background: 'linear-gradient(145deg, rgba(22,22,22,0.9), rgba(16,16,16,0.95))' }}>
                    <div className="flex items-center justify-between">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: i === 0 ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)', color: i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>#{i + 1}</span>
                      {lowStock && <span className="flex items-center gap-1 text-amber-400 text-[9px] font-semibold" style={{ background: 'rgba(251,191,36,0.1)', padding: '2px 6px', borderRadius: 6 }}><AlertTriangle className="w-2.5 h-2.5" /> Low</span>}
                    </div>
                    <p className="text-white/80 text-[11px] font-medium leading-tight line-clamp-2">{p.name}</p>
                    <div className="h-1 w-full rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-1 rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%`, background: i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.5)' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-[10px]">{p.sold} sold</span>
                      <span className="text-white/60 text-[10px] font-medium">₹{((p.revenue || 0) / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/20 text-[9px]"><Package className="w-2.5 h-2.5" />{p.stock} in stock</div>
                  </div>
                );
              })}
          </div>
        </section>

        <div className="h-6" />
      </div>
    </div>
  );
}
