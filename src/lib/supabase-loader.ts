export default function supabaseLoader({ src, width, quality }: any) {
  if (src.includes('supabase.co')) {
    const url = new URL(src);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', (quality || 75).toString());
    url.searchParams.set('resize', 'cover');
    return url.toString();
  }
  return src;
}
