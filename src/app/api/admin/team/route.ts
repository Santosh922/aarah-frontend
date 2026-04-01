import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    jwt.verify(token, process.env.JWT_SECRET!);

    const team = await prisma.admin.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' }
    });

    const formattedTeam = team.map(member => ({
        ...member,
        avatar: member.name ? member.name.charAt(0).toUpperCase() : 'A'
    }));

    return NextResponse.json(formattedTeam, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('aarah_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    jwt.verify(token, process.env.JWT_SECRET!);

    const { email, name, password } = await request.json();

    if (!email || !password || !name) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const existing = await prisma.admin.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.admin.create({
        data: {
            email: email.toLowerCase().trim(),
            name: name.trim(),
            passwordHash: hashedPassword
        },
        select: { id: true, name: true, email: true }
    });

    return NextResponse.json(newAdmin, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
