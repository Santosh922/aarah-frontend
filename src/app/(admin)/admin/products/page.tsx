import { redirect } from 'next/navigation';
import ProductClientTable from './ProductClientTable';
import type { AdminUser } from '@/types';

async function getAdminUser(): Promise<AdminUser | null> {
  return {
    id: '',
    name: 'Admin',
    email: '',
    avatar: 'A',
  };
}

export default async function AdminProductsPage() {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');

  return (
    <ProductClientTable
      initialProducts={[]}
      initialCategories={[]}
      initialTotal={0}
      initialStatusCounts={{ All: 0 }}
      currentUser={admin}
    />
  );
}
