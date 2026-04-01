import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAdminAccess } from '@/lib/server-auth';
import DOMPurify from 'isomorphic-dompurify';

function sanitizeHTML(str: unknown): string {
  if (typeof str !== 'string') return '';
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('[CATEGORY_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const body = await req.json();

    const { name, slug, description, shortDescription, status, visibility } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const finalSlug = sanitizeHTML(slug) || sanitizeHTML(name).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const category = await prisma.category.create({
      data: {
        name: sanitizeHTML(name),
        slug: finalSlug,
        description: sanitizeHTML(description) || sanitizeHTML(shortDescription) || '',
        status: status || visibility || 'Active',
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('[CATEGORY_CREATE_ERROR]', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A category with this name or slug already exists' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
