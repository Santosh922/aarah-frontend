import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkAdminAccess } from '@/lib/server-auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_BUCKETS = ['products', 'banners', 'instagram', 'categories'];
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const auth = await checkAdminAccess();
    if (!auth.authorized) return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const requestedBucket = (formData.get('bucket') as string) || 'products';

    if (!ALLOWED_BUCKETS.includes(requestedBucket)) {
      return NextResponse.json({ error: 'Invalid storage bucket destination.' }, { status: 400 });
    }

    const bucket = requestedBucket;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB limit` }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, WEBP, and GIF are allowed.' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    const filePath = fileName;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl }, { status: 200 });

  } catch (error: any) {
    console.error('[SUPABASE_UPLOAD_ERROR]', error);
    return NextResponse.json({ error: 'Cloud upload failed' }, { status: 500 });
  }
}
