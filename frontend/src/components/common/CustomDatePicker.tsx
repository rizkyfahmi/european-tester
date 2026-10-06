'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ChevronLeftIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

const CalendarIcon = ({ className = 'w-3.5 h-3.5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const CloseIcon = ({ className = 'w-3 h-3' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD or empty ''
  onChange: (dateStr: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
}

const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const WEEKDAY_NAMES_INDO = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CustomDatePicker({
  value,
  onChange,
  placeholder = 'dd/mm/yyyy',
  allowClear = true,
  className = '',
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number; positionUp: boolean }>({
    top: 0,
    left: 0,
    positionUp: false,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Parse current selected date or fallback to today
  const getInitialViewDate = () => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [viewDate, setViewDate] = useState<Date>(getInitialViewDate);

  // Sync view date when value changes externally
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-').map(Number);
      setViewDate(new Date(y, m - 1, d));
    }
  }, [value]);

  // Calculate Popover Position relative to viewport (Portal aware)
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverHeight = 360; // Estimated popup height
    const popoverWidth = 310;  // Estimated popup width

    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    // Check if space below is insufficient
    const spaceBelow = windowHeight - rect.bottom;
    const positionUp = spaceBelow < popoverHeight && rect.top > popoverHeight;

    let top = positionUp ? rect.top - popoverHeight - 6 : rect.bottom + 6;
    let left = rect.left;

    // Adjust left boundary if overflowing right screen edge
    if (left + popoverWidth > windowWidth - 12) {
      left = Math.max(12, windowWidth - popoverWidth - 12);
    }

    setPopoverPos({ top, left, positionUp });
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Update position on scroll or resize when open
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0 - 11

  // Generate list of years for quick year selector (e.g., 2020 - 2035)
  const yearOptions = [];
  const startYear = Math.min(2020, currentYear - 5);
  const endYear = Math.max(2035, currentYear + 10);
  for (let y = startYear; y <= endYear; y++) {
    yearOptions.push(y);
  }

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleMonthChange = (newMonth: number) => {
    setViewDate(new Date(currentYear, newMonth, 1));
  };

  const handleYearChange = (newYear: number) => {
    setViewDate(new Date(newYear, currentMonth, 1));
  };

  // Generate days grid matrix for current month
  const getDaysGrid = () => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days: { dayNum: number; isCurrentMonth: boolean; dateStr: string }[] = [];

    // Previous month padding
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const mStr = String(prevMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, isCurrentMonth: false, dateStr: `${prevYear}-${mStr}-${dStr}` });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, isCurrentMonth: true, dateStr: `${currentYear}-${mStr}-${dStr}` });
    }

    // Next month padding to complete grid
    const remaining = 35 - days.length > 0 ? 35 - days.length : 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const mStr = String(nextMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      days.push({ dayNum: d, isCurrentMonth: false, dateStr: `${nextYear}-${mStr}-${dStr}` });
    }

    return days;
  };

  const daysGrid = getDaysGrid();

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    onChange(todayStr);
    setViewDate(today);
    setIsOpen(false);
  };

  // Format trigger label (e.g. 2026-10-04 -> 04/10/2026)
  const getFormattedLabel = () => {
    if (!value) return placeholder;
    const parts = value.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return value;
  };

  const todayDateStr = (() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();

  const popoverContent = isOpen && mounted ? (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${popoverPos.top}px`,
        left: `${popoverPos.left}px`,
        zIndex: 99999,
      }}
      className="w-72 sm:w-80 bg-[#241512] border border-[#FFE0B2]/30 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/80 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-[#FFF8EE]"
    >
      {/* Header: Month & Year Selectors + Arrow Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[#FFE0B2]/20 mb-3 gap-1">
        {/* Month & Year Selectors */}
        <div className="flex items-center space-x-1.5">
          <select
            value={currentMonth}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
            className="bg-[#1a0f0b] border border-[#FFE0B2]/30 text-[#FFE0B2] text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-[#FFE0B2] cursor-pointer"
          >
            {MONTH_NAMES_INDO.map((name, index) => (
              <option key={name} value={index} className="bg-[#1a0f0b] text-[#FFE0B2]">
                {name}
              </option>
            ))}
          </select>

          <select
            value={currentYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            className="bg-[#1a0f0b] border border-[#FFE0B2]/30 text-[#FFE0B2] text-xs font-bold rounded-lg px-2 py-1 focus:outline-none focus:border-[#FFE0B2] cursor-pointer"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} className="bg-[#1a0f0b] text-[#FFE0B2]">
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Prev & Next Arrows */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#3E2522] text-[#FFE0B2] hover:bg-[#FFE0B2]/20 transition active:scale-95 cursor-pointer border border-[#FFE0B2]/20"
            title="Bulan Sebelumnya"
          >
            <ChevronLeftIcon className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#3E2522] text-[#FFE0B2] hover:bg-[#FFE0B2]/20 transition active:scale-95 cursor-pointer border border-[#FFE0B2]/20"
            title="Bulan Berikutnya"
          >
            <ChevronRightIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekdays Header (Min Sen Sel Rab Kam Jum Sab) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
        {WEEKDAY_NAMES_INDO.map((day) => (
          <div key={day} className="text-[#FFE0B2]/70 font-bold text-[11px] py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {daysGrid.map((item, index) => {
          const isSelected = value === item.dateStr;
          const isToday = todayDateStr === item.dateStr;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectDate(item.dateStr)}
              disabled={!item.isCurrentMonth}
              className={`h-8 w-full rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center transition-all cursor-pointer ${
                !item.isCurrentMonth
                  ? 'text-[#FFE0B2]/20 pointer-events-none'
                  : isSelected
                  ? 'bg-gradient-to-r from-[#be123c] to-[#e11d48] text-white font-bold shadow-lg shadow-rose-900/50 scale-105 border border-rose-400/50'
                  : isToday
                  ? 'bg-[#3E2522] text-[#FFE0B2] font-bold border border-[#FFE0B2]'
                  : 'text-[#FFF8EE] hover:bg-[#FFE0B2]/15 hover:text-[#FFE0B2]'
              }`}
            >
              {item.dayNum}
            </button>
          );
        })}
      </div>

      {/* Footer Action Buttons */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#FFE0B2]/20 text-xs">
        <button
          type="button"
          onClick={handleClear}
          className="text-[#FFE0B2]/60 hover:text-[#FFE0B2] font-medium px-2 py-1 rounded-lg hover:bg-[#FFE0B2]/10 transition cursor-pointer"
        >
          Hapus Filter
        </button>
        <button
          type="button"
          onClick={handleToday}
          className="text-[#FFE0B2] font-bold px-2.5 py-1 rounded-lg bg-[#3E2522] border border-[#FFE0B2]/30 hover:bg-[#FFE0B2]/20 transition cursor-pointer"
        >
          Hari Ini
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center space-x-2 px-3.5 py-2 text-xs rounded-xl bg-[#1a0f0b]/80 border border-[#FFE0B2]/30 text-[#FFF8EE] hover:border-[#FFE0B2] transition-all cursor-pointer shadow-sm w-full justify-between"
      >
        <div className="flex items-center space-x-2">
          <CalendarIcon className="w-3.5 h-3.5 text-[#FFE0B2]" />
          <span>{getFormattedLabel()}</span>
        </div>
        {value && allowClear && (
          <span
            onClick={handleClear}
            className="p-0.5 hover:bg-[#FFE0B2]/20 rounded-full transition-colors text-[#FFE0B2]/70 hover:text-[#FFE0B2]"
            title="Hapus Tanggal"
          >
            <CloseIcon className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Render Popover into Portal (Body) */}
      {mounted && createPortal(popoverContent, document.body)}
    </div>
  );
}
