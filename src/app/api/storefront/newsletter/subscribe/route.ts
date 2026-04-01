import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const existing = await prisma.newsletterSubscriber.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      return NextResponse.json({ message: 'Already subscribed' }, { status: 409 });
    }

    await prisma.newsletterSubscriber.create({
      data: { email: email.toLowerCase() }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Subscription failed' }, { status: 500 });
  }
}
