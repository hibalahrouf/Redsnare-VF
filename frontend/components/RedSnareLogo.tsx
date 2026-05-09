'use client'

import React from 'react';

export function RedSnareLogo({ className, style, useCurrentColor = false }: { className?: string, style?: React.CSSProperties, useCurrentColor?: boolean }) {
  const brandRed = useCurrentColor ? "currentColor" : "#E8281E";
  const brandBlack = useCurrentColor ? "currentColor" : "#E8281E"; // Changed to Red for visibility on dark backgrounds

  return (
    <svg 
      className={className} 
      style={style} 
      viewBox="0 0 500 500" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* ─── Scorpion Circuit Legs ─── */}
      <g stroke={brandBlack} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M220 180L140 130L100 150L80 140" />
        <circle cx="80" cy="140" r="8" fill={brandRed} stroke="none" />
        
        <path d="M210 230L110 230L70 260L40 250" />
        <circle cx="40" cy="250" r="8" fill={brandRed} stroke="none" />
        
        <path d="M225 280L160 330L100 350L70 380" />
        <circle cx="70" cy="380" r="8" fill={brandRed} stroke="none" />

        <path d="M280 180L360 130L400 150L420 140" />
        <circle cx="420" cy="140" r="8" fill={brandRed} stroke="none" />
        
        <path d="M290 230L390 230L430 260L460 250" />
        <circle cx="460" cy="250" r="8" fill={brandRed} stroke="none" />
        
        <path d="M275 280L340 330L400 350L430 380" />
        <circle cx="430" cy="380" r="8" fill={brandRed} stroke="none" />
      </g>

      {/* ─── Shield ─── */}
      <path d="M244 380L165 270V160L244 100V380Z" fill={brandRed} />
      <path d="M256 380L335 270V160L256 100V380Z" fill={brandRed} />

      {/* ─── Horns ─── */}
      <path d="M220 115C220 115 210 65 240 55" stroke={brandRed} strokeWidth="12" strokeLinecap="round" />
      <path d="M280 115C280 115 290 65 260 55" stroke={brandRed} strokeWidth="12" strokeLinecap="round" />

      {/* ─── Hook ─── */}
      <path d="M250 170V230C250 230 290 245 290 280C290 310 270 330 250 330C230 330 210 310 210 280L210 265" stroke={brandBlack} strokeWidth="16" strokeLinecap="round" />
      <path d="M210 265L200 280M210 265L220 280" stroke={brandBlack} strokeWidth="16" strokeLinecap="round" />
    </svg>
  );
}
