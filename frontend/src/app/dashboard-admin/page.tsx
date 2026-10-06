'use client';

import React from 'react';
import HeaderNavbar from '@/components/common/HeaderNavbar';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

export default function DashboardAdminPage() {
  return (
    <div className="w-full min-h-screen bg-[#0d0705] text-[#FFF8EE] relative overflow-x-hidden font-sans antialiased">
      {/* Background Gambar Fullscreen */}
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-100 pointer-events-none transition-opacity duration-500 z-0"
        style={{ backgroundImage: "url('/bg login3.jpeg')" }}
      />

      {/* Dark Overlay Glassmorphism */}
      <div className="fixed inset-0 w-full h-full bg-black/60 backdrop-blur-md pointer-events-none z-0" />

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <HeaderNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6">
          <DashboardOverview forcedRole="admin" />
        </main>
      </div>
    </div>
  );
}

