'use client';

import React from 'react';
import HeaderNavbar from '@/components/common/HeaderNavbar';
import DashboardOverview from '@/components/dashboard/DashboardOverview';

export default function DashboardTesterPage() {
  return (
    <div className="w-full min-h-screen bg-[#0d0705] text-[#FFF8EE] relative overflow-x-hidden font-sans antialiased">
      {/* Background Gambar Fullscreen (GPU Accelerated, Smooth Scroll) */}
      <div className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transform-gpu [transform:translateZ(0)] will-change-transform">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat opacity-100 transition-opacity duration-500 blur-md scale-105"
          style={{ backgroundImage: "url('/bg login3.jpeg')" }}
        />
        <div className="absolute inset-0 w-full h-full bg-black/60" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <HeaderNavbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-6 sm:space-y-8">
          <DashboardOverview forcedRole="tester" />
        </main>
      </div>
    </div>
  );
}

