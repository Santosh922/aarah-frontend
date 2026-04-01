import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret');
  const path = request.nextUrl.searchParams.get('path');

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
  }

  try {
    revalidatePath(path);
    return NextResponse.json({ revalidated: true, path });
  } catch (error) {
    console.error('[REVALIDATE_ERROR]', error);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
