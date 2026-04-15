'use client';

import { API_URL } from '@/lib/api';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { authFetch, safeJson, unwrapApiResponse } from '@/lib/integrationAdapters';

import {
    useState, useEffect, useCallback, useRef
} from 'react';
import {
    BarChart3, Download, RefreshCw, LogOut,
    ArrowUpRight, ArrowDownRight, CreditCard, CheckCircle2,
    AlertCircle, X, ShoppingBag, Users, DollarSign, Package
} from 'lucide-react';

// ─── Constants & Types ────────────────────────────────────────────────────────

export type DateRange = 'today' | '7d' | '30d' | '90d' | '12m';

export interface ChartDataPoint { label: string; revenue: number; orders: number; }
export interface TopProduct { id: string; name: string; imageUrl: string; sold: number; revenue: number; stock: number; }
export interface CategorySales { category: string; percentage: number; revenue: number; }

export interface AnalyticsData {
    totalRevenue: number; revenueTrend: number;
    totalOrders: number; ordersTrend: number;
    avgOrderValue: number; aovTrend: number;
    totalCustomers: number; customersTrend: number;
    chartData: ChartDataPoint[];
    topProducts: TopProduct[];
    categorySales: CategorySales[];
    customerSplit: { new: number; returning: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const fmtMoney = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtNum = (n: number) => n.toLocaleString('en-IN');

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

// ─── UI Components ────────────────────────────────────────────────────────────
function TrendBadge({ trend }: { trend: number }) {
    const isUp = trend >= 0;
    return (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${isUp ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
            {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
        </span>
    );
}

function StatCard({ title, value, trend, icon: Icon }: { title: string, value: string | number, trend: number, icon: any }) {
    return (
        <div className="p-5 rounded-2xl relative overflow-hidden group" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110" />
            <div className="flex items-start justify-between relative z-10">
                <div>
                    <p className="text-white/40 text-[11px] uppercase tracking-widest font-semibold mb-1.5">{title}</p>
                    <p className="text-white font-bold text-[24px]" style={{ fontFamily: "'Georgia',serif" }}>{value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Icon className="w-5 h-5 text-white/50" />
                </div>
            </div>
            <div className="mt-4 flex items-center gap-2 relative z-10">
                <TrendBadge trend={trend} />
                <span className="text-white/30 text-[10px]">vs previous period</span>
            </div>
        </div>
    );
}

// ─── Main Page Export ─────────────────────────────────────────────────────────
export default function AdminAnalyticsPage() {
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
            <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} ::-webkit-scrollbar{width:0;height:0} select option{background:#1a1a1a}`}</style>

            {/* Topbar */}
            <div className="sticky top-0 z-40 border-b" style={{ background: 'rgba(14,14,14,0.97)', borderColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between px-6 md:px-8 py-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <BarChart3 className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                            <h1 className="text-white font-bold text-[18px]" style={{ fontFamily: "'Georgia',serif" }}>Analytics & Reports</h1>
                            <p className="text-white/30 text-[11px] mt-0.5 tracking-widest uppercase">Store Performance</p>
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

            <AnalyticsView toast={toast} currentUser={currentUser} />
            <ToastContainer items={toastItems} remove={removeToast} />
        </div>
    );
}

function AnalyticsView({ toast, currentUser }: { toast: any, currentUser: import('@/types').AdminUser }) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [dateRange, setDateRange] = useState<DateRange>('30d');

    const fetchAnalytics = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const res = await authFetch(`${API_URL}/api/admin/dashboard?range=${dateRange}`);
            if (res.ok) {
                const payload = await safeJson<any>(res, {});
                const data = unwrapApiResponse<any>(payload);
                setData(data);
            } else {
                setData(null);
            }
        } catch {
            toast.error('Failed to load analytics data.');
            setData(null);
        }
        finally { setLoading(false); setRefreshing(false); }
    }, [dateRange, toast]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const handleExport = async () => {
        setExporting(true);
        try {
            // Backend contract may not expose /export for every deployment.
            // Handle unavailable endpoint gracefully.
            const res = await authFetch(`${API_URL}/api/admin/dashboard/export?range=${dateRange}`, { method: 'POST' });
            if (!res.ok) { toast.error('Export failed.'); return; }

            // Trigger file download from the response blob
            const blob = await res.blob();
            const contentDisposition = res.headers.get('Content-Disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') ?? `analytics-${dateRange}.csv`
                : `aarah-analytics-${dateRange}-${Date.now()}.csv`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Report downloaded.');
        } catch { toast.error('Export failed.'); }
        finally { setExporting(false); }
    };

    const maxRevenue = data?.chartData?.length ? Math.max(...data.chartData.map(d => d.revenue)) : 1;

    return (
        <div className="px-5 md:px-10 py-8 max-w-7xl w-full mx-auto flex-1 flex flex-col gap-6">

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                    {[
                        { id: 'today', label: 'Today' },
                        { id: '7d', label: 'Last 7 Days' },
                        { id: '30d', label: 'Last 30 Days' },
                        { id: '90d', label: 'Last 90 Days' },
                        { id: '12m', label: 'Last 12 Months' },
                    ].map(dr => (
                        <button key={dr.id} onClick={() => setDateRange(dr.id as DateRange)}
                            className="px-4 py-2 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all"
                            style={{
                                background: dateRange === dr.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.02)',
                                color: dateRange === dr.id ? '#fff' : 'rgba(255,255,255,0.4)',
                                border: `1px solid ${dateRange === dr.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)'}`
                            }}>
                            {dr.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => fetchAnalytics(true)} disabled={refreshing} className="h-9 w-9 rounded-xl flex items-center justify-center border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/5 transition-all" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <button type="button" onClick={handleExport} disabled={exporting || loading || !data} className="h-9 px-4 flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] text-[11px] font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {exporting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} Export
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}</div>
                    <div className="h-80 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
                </div>
            ) : !data ? (
                <div className="py-24 flex flex-col items-center justify-center text-center border border-white/[0.05] rounded-3xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <BarChart3 className="w-10 h-10 text-white/10 mb-4" />
                    <p className="text-white/80 text-[15px] font-semibold">No Data Available</p>
                    <p className="text-white/40 text-[12px] mt-1 max-w-sm">There is no analytics data available for the selected date range.</p>
                </div>
            ) : (
                <div className="space-y-6" style={{ animation: 'fadeUp 0.4s ease forwards' }}>

                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Total Revenue" value={fmtMoney(data.totalRevenue)} trend={data.revenueTrend} icon={DollarSign} />
                        <StatCard title="Total Orders" value={fmtNum(data.totalOrders)} trend={data.ordersTrend} icon={ShoppingBag} />
                        <StatCard title="Avg Order Value" value={fmtMoney(data.avgOrderValue)} trend={data.aovTrend} icon={CreditCard} />
                        <StatCard title="Total Customers" value={fmtNum(data.totalCustomers)} trend={data.customersTrend} icon={Users} />
                    </div>

                    {/* Main Chart Area */}
                    <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-white font-semibold text-[14px]">Revenue Overview</h3>
                                <p className="text-white/40 text-[11px] mt-1">Daily revenue breakdown for the selected period.</p>
                            </div>
                        </div>

                        {/* Pure CSS Dynamic Bar Chart */}
                        <div className="h-64 flex items-end gap-2 sm:gap-4 relative pt-6 border-b border-white/[0.05]">
                            {data.chartData.map((d, i) => {
                                const heightPercent = Math.max((d.revenue / maxRevenue) * 100, 2);
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1c1c1c] border border-white/10 px-3 py-2 rounded-lg shadow-xl pointer-events-none z-10 w-max text-center">
                                            <p className="text-white/50 text-[10px] font-medium mb-1">{d.label}</p>
                                            <p className="text-white font-bold text-[12px]">{fmtMoney(d.revenue)}</p>
                                            <p className="text-white/40 text-[10px] mt-0.5">{d.orders} orders</p>
                                        </div>
                                        <div className="w-full bg-blue-500/20 hover:bg-blue-400/40 rounded-t-sm transition-all duration-500 relative overflow-hidden"
                                            style={{ height: `${heightPercent}%`, maxWidth: '40px' }}>
                                            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400" />
                                        </div>
                                        <span className="text-white/30 text-[9px] mt-3 truncate w-full text-center hidden sm:block">{d.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Split: Top Products & Categories */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Top Products */}
                        <div className="lg:col-span-2 p-6 rounded-2xl border flex flex-col" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-white font-semibold text-[14px]">Top Selling Products</h3>
                            </div>
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/[0.05]">
                                            <th className="pb-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Product</th>
                                            <th className="pb-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider text-right">Sold</th>
                                            <th className="pb-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.topProducts.map((p) => (
                                            <tr key={p.id} className="group border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-12 rounded-lg bg-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                                                            {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-white/20" />}
                                                        </div>
                                                        <div>
                                                            <p className="text-white/80 text-[12px] font-semibold truncate max-w-[200px]">{p.name}</p>
                                                            <p className={`text-[10px] mt-0.5 ${p.stock < 10 ? 'text-amber-400' : 'text-white/30'}`}>{p.stock} in stock</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3 text-right">
                                                    <span className="text-white/90 text-[12px] font-medium bg-white/5 px-2 py-1 rounded-md">{fmtNum(p.sold)}</span>
                                                </td>
                                                <td className="py-3 text-right text-white/90 text-[12px] font-semibold">{fmtMoney(p.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Right Column: Categories & Customers */}
                        <div className="space-y-6">

                            {/* Categories */}
                            <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <h3 className="text-white font-semibold text-[14px] mb-5">Sales by Category</h3>
                                {data.categorySales.length === 0 ? (
                                    <p className="text-white/35 text-[11px]">No category sales found for the selected date range.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {data.categorySales.map(c => (
                                            <div key={c.category}>
                                                <div className="flex items-center justify-between text-[11px] mb-1.5 gap-3">
                                                    <div>
                                                        <span className="text-white/70 font-medium block">{c.category}</span>
                                                        <span className="text-white/35 text-[10px]">{fmtMoney(c.revenue)}</span>
                                                    </div>
                                                    <span className="text-white/90 font-bold">{c.percentage}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${c.percentage}%` }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Customer Split */}
                            <div className="p-6 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                                <h3 className="text-white font-semibold text-[14px] mb-5">Customer Split</h3>
                                <div className="flex items-center justify-center gap-8">
                                    <div className="text-center">
                                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-1">New</p>
                                        <p className="text-white font-bold text-[20px]">{data.customerSplit.new}%</p>
                                    </div>
                                    <div className="w-px h-10 bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold mb-1">Returning</p>
                                        <p className="text-blue-400 font-bold text-[20px]">{data.customerSplit.returning}%</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-white/[0.05] rounded-full mt-5 overflow-hidden flex">
                                    <div className="h-full bg-white/20" style={{ width: `${data.customerSplit.new}%` }} />
                                    <div className="h-full bg-blue-400" style={{ width: `${data.customerSplit.returning}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}