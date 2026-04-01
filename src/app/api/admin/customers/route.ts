import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('aarah_admin_token')?.value;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET!) as { id: string }; } 
  catch { return null; }
}

export async function GET(request: Request) {
  try {
    if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const filterStatus = searchParams.get('status');
    const filterTier = searchParams.get('tier');
    const filterTag = searchParams.get('tag');
    const sortBy = searchParams.get('sortBy') || 'newest';
    
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '15', 10));

    const whereClause: any = {};

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { customerId: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (filterStatus && filterStatus !== 'All') {
      whereClause.status = filterStatus;
    }

    if (filterTier && filterTier !== 'All') {
      whereClause.loyaltyTier = filterTier;
    }

    let orderByClause: any = { createdAt: 'desc' };
    switch (sortBy) {
      case 'oldest':    orderByClause = { createdAt: 'asc' }; break;
      case 'spend_hi':  orderByClause = { totalSpend: 'desc' }; break;
      case 'spend_lo': orderByClause = { totalSpend: 'asc' }; break;
      case 'orders_hi': orderByClause = { totalOrders: 'desc' }; break;
      case 'name_az':   orderByClause = { name: 'asc' }; break;
      case 'recent':    orderByClause = { updatedAt: 'desc' }; break;
    }

    const [total, customersRaw, allCustomersForStats] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        orderBy: orderByClause,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          orders: {
            select: { id: true, total: true, status: true }
          }
        }
      }),
      prisma.customer.findMany({
        select: { 
          createdAt: true, 
          status: true,
          loyaltyTier: true,
          updatedAt: true,
          orders: { select: { total: true, status: true } }
        }
      })
    ]);

    let totalRevenue = 0;
    let newThisMonth = 0;
    let activeCount = 0;
    let blockedCount = 0;
    let pendingCount = 0;
    const tierBreakdown: Record<string, number> = { Bronze: 0, Silver: 0, Gold: 0, Platinum: 0 };
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    allCustomersForStats.forEach(c => {
      if (c.status === 'Active') activeCount++;
      else if (c.status === 'Blocked') blockedCount++;
      else if (c.status === 'Pending') pendingCount++;

      const tier = (c.loyaltyTier || 'Bronze') as string;
      if (tier in tierBreakdown) tierBreakdown[tier]++;

      if (c.createdAt > oneMonthAgo) newThisMonth++;
      c.orders.forEach(o => {
        if (o.status === 'Delivered' || o.status === 'CONFIRMED' || o.status === 'Shipped') {
          totalRevenue += o.total;
        }
      });
    });

    const avgLTV = allCustomersForStats.length > 0 ? Math.round(totalRevenue / allCustomersForStats.length) : 0;

    const customers = customersRaw.map(c => {
        const nameParts = (c.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        const validOrders = c.orders.filter((o: any) => o.status !== 'CANCELLED' && o.status !== 'RETURNED');
        const totalSpend = validOrders.reduce((sum: number, o: any) => sum + o.total, 0);

        return {
            ...c,
            firstName,
            lastName,
            totalSpend,
            totalOrders: c.orders.length,
            cancelledOrders: c.orders.filter((o: any) => o.status === 'CANCELLED').length,
            avgOrderValue: validOrders.length > 0 ? Math.round(totalSpend / validOrders.length) : 0,
            avatar: firstName.charAt(0).toUpperCase() || '?',
            source: 'Organic',
            lastActiveAt: c.updatedAt,
        };
    });

    return NextResponse.json({
        customers,
        total,
        statusCounts: { Active: activeCount, Blocked: blockedCount, Pending: pendingCount },
        tierCounts: tierBreakdown,
        stats: { 
          total: allCustomersForStats.length, 
          active: activeCount, 
          blocked: blockedCount, 
          pending: pendingCount,
          newThisMonth, 
          totalRevenue, 
          avgLTV,
          tierBreakdown,
          topSpenders: []
        }
    });

  } catch (error) {
    console.error('[CUSTOMERS_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, firstName, lastName, ...updateData } = body;

    if (!id) return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });

    if (firstName !== undefined || lastName !== undefined) {
        const current = await prisma.customer.findUnique({ where: { id } });
        const currentNameParts = (current?.name || '').split(' ');
        const fName = firstName !== undefined ? firstName : currentNameParts[0];
        const lName = lastName !== undefined ? lastName : currentNameParts.slice(1).join(' ');
        updateData.name = `${fName} ${lName}`.trim();
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updatedCustomer, { status: 200 });
  } catch (error) {
    console.error('[CUSTOMER_UPDATE_ERROR]', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}
