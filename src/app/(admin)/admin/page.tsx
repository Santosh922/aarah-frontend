import { redirect } from 'next/navigation';

// /admin just redirects straight to the dashboard
export default function AdminRootPage() {
  redirect('/admin/dashboard');
}
