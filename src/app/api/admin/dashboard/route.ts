import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';

const EXCLUDED_ORDER_STATUSES = ['CANCELLED', 'Cancelled', 'RETURNED', 'Returned'];

function calcTrend(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function buildChartData(
  orders: Array<{ createdAt: Date; total: number }>,
  range: string,
  startDate: Date,
  now: Date,
) {
  const buckets: Array<{ label: string; startMs: number; endMs: number; revenue: number; orders: number }> = [];

  if (range === 'today') {
    for (let hour = 0; hour < 24; hour += 4) {
      const start = new Date(startDate);
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 4, 0, 0, 0);

      buckets.push({
        label: start.toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true }),
        startMs: start.getTime(),
        endMs: end.getTime(),
        revenue: 0,
        orders: 0,
      });
    }
  } else if (range === '12m') {
    for (let i = 11; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      buckets.push({
        label: start.toLocaleDateString('en-IN', { month: 'short' }),
        startMs: start.getTime(),
        endMs: end.getTime(),
        revenue: 0,
        orders: 0,
      });
    }
  } else if (range === '90d') {
    for (let i = 12; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (i * 7 + 6));

      const end = new Date(start);
      end.setDate(end.getDate() + 7);

      buckets.push({
        label: start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        startMs: start.getTime(),
        endMs: end.getTime(),
        revenue: 0,
        orders: 0,
      });
    }
  } else {
    const days = range === '7d' ? 7 : 30;

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);

      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      buckets.push({
        label: start.toLocaleDateString('en-IN', days === 30 ? { day: 'numeric', month: 'short' } : { weekday: 'short' }),
        startMs: start.getTime(),
        endMs: end.getTime(),
        revenue: 0,
        orders: 0,
      });
    }
  }

  for (const order of orders) {
    const timestamp = new Date(order.createdAt).getTime();
    const bucket = buckets.find((entry) => timestamp >= entry.startMs && timestamp < entry.endMs);
    if (!bucket) continue;

    bucket.revenue += Number(order.total || 0);
    bucket.orders += 1;
  }

  return buckets.map(({ label, revenue, orders }) => ({
    label,
    revenue: Number(revenue.toFixed(2)),
    orders,
  }));
}

export async function GET(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';

    const now = new Date();
    const startDate = new Date(now);

    if (range === 'today') startDate.setHours(0, 0, 0, 0);
    else if (range === '7d') startDate.setDate(now.getDate() - 7);
    else if (range === '90d') startDate.setDate(now.getDate() - 90);
    else if (range === '12m') startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setDate(now.getDate() - 30);

    const duration = now.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - duration);

    const [currentOrders, previousOrders, totalCustomers, currentNewCustomers, previousNewCustomers] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate },
          status: { notIn: EXCLUDED_ORDER_STATUSES },
        },
        select: {
          id: true,
          total: true,
          createdAt: true,
          customerId: true,
          items: {
            select: {
              productId: true,
              quantity: true,
              price: true,
            },
          },
        },
      }),
      prisma.order.findMany({
        where: {
          createdAt: { gte: prevStartDate, lt: startDate },
          status: { notIn: EXCLUDED_ORDER_STATUSES },
        },
        select: {
          total: true,
          customerId: true,
        },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where: { createdAt: { gte: startDate } } }),
      prisma.customer.count({ where: { createdAt: { gte: prevStartDate, lt: startDate } } }),
    ]);

    const totalRevenue = currentOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const previousRevenue = previousOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalOrders = currentOrders.length;
    const previousOrdersCount = previousOrders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const previousAov = previousOrdersCount > 0 ? previousRevenue / previousOrdersCount : 0;

    const productStats = new Map<string, { sold: number; revenue: number }>();
    const customerOrderCounts = new Map<string, number>();

    for (const order of currentOrders) {
      if (order.customerId) {
        customerOrderCounts.set(order.customerId, (customerOrderCounts.get(order.customerId) || 0) + 1);
      }

      for (const item of order.items) {
        const productId = item.productId;
        if (!productId) continue;

        const sold = Number(item.quantity || 0);
        const revenue = Number(item.price || 0) * sold;
        const existing = productStats.get(productId) || { sold: 0, revenue: 0 };

        existing.sold += sold;
        existing.revenue += revenue;
        productStats.set(productId, existing);
      }
    }

    const productIds = Array.from(productStats.keys());
    const productsMeta = productIds.length
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            name: true,
            totalStock: true,
            images: {
              take: 1,
              orderBy: { isPrimary: 'desc' },
              select: { url: true },
            },
            category: {
              select: { name: true },
            },
          },
        })
      : [];

    const productMetaMap = new Map(productsMeta.map((product) => [product.id, product]));
    const categoryRevenueMap = new Map<string, number>();

    for (const [productId, stats] of productStats.entries()) {
      const categoryName = productMetaMap.get(productId)?.category?.name || 'Uncategorized';
      categoryRevenueMap.set(categoryName, (categoryRevenueMap.get(categoryName) || 0) + stats.revenue);
    }

    const topProducts = Array.from(productStats.entries())
      .map(([productId, stats]) => {
        const meta = productMetaMap.get(productId);
        return {
          id: productId,
          name: meta?.name || 'Unknown',
          imageUrl: meta?.images[0]?.url || '',
          sold: stats.sold,
          revenue: Number(stats.revenue.toFixed(2)),
          stock: meta?.totalStock || 0,
        };
      })
      .sort((a, b) => b.sold - a.sold || b.revenue - a.revenue)
      .slice(0, 5);

    const totalCategoryRevenue = Array.from(categoryRevenueMap.values()).reduce((sum, value) => sum + value, 0);
    const categorySales = Array.from(categoryRevenueMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, revenue]) => ({
        category,
        revenue: Number(revenue.toFixed(2)),
        percentage: totalCategoryRevenue > 0 ? Math.round((revenue / totalCategoryRevenue) * 100) : 0,
      }));

    const returningCustomersCount = Array.from(customerOrderCounts.values()).filter((count) => count > 1).length;
    const activeCustomersCount = customerOrderCounts.size;
    const returningPercentage = activeCustomersCount > 0
      ? Math.round((returningCustomersCount / activeCustomersCount) * 100)
      : 0;

    return NextResponse.json({
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueTrend: calcTrend(totalRevenue, previousRevenue),
      totalOrders,
      ordersTrend: calcTrend(totalOrders, previousOrdersCount),
      avgOrderValue: Number(avgOrderValue.toFixed(2)),
      aovTrend: calcTrend(avgOrderValue, previousAov),
      totalCustomers,
      customersTrend: calcTrend(currentNewCustomers, previousNewCustomers),
      chartData: buildChartData(
        currentOrders.map((order) => ({ createdAt: order.createdAt, total: Number(order.total || 0) })),
        range,
        startDate,
        now,
      ),
      topProducts,
      categorySales,
      customerSplit: {
        returning: returningPercentage,
        new: activeCustomersCount > 0 ? 100 - returningPercentage : 0,
      },
    });
  } catch (error) {
    console.error('[DASHBOARD_ERROR]', error);
    return NextResponse.json({ error: 'Analytics failed' }, { status: 500 });
  }
}
