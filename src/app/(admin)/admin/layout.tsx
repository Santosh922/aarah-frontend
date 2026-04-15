'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { token, currentUser, isHydrated } = useAuth();

  const isLoginPage = pathname === '/admin/login';

  if (!isLoginPage && isHydrated && (!token || currentUser?.role !== 'ADMIN')) {
    window.location.href = '/admin/login';
    return null;
  }

  if (!isLoginPage && !isHydrated) {
    return <div className="min-h-screen bg-[#333333]" />;
  }

  if (isLoginPage) {
    return <div className="min-h-screen bg-[#333333]">{children}</div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#FAFAFA] overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 h-full overflow-y-auto relative z-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-b from-gray-100 to-transparent z-10 pointer-events-none" />
        {children}
      </main>
    </div>
  );
}
