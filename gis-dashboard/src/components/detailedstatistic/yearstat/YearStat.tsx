// src/components/yearstat/YearStat.tsx
import React from 'react';
import './YearStat.css';

interface YearStatProps {
  year: number | string;
  count: number | string;
  index?: number;      // untuk skema warna (mod 4)
  width?: number;
  height?: number;
  onYearClick?: (year: number) => void; // NEW: Click handler
  isActive?: boolean; // NEW: Active state
}

export default function YearStat({
  year,
  count,
  index = 0,
  width = 120,
  height = 80,
  onYearClick,
  isActive = false
}: YearStatProps) {
  const vw = 120;
  const vh = 80;
  const midY = vh / 2;

  // Convert count and year to numbers for logic checks
  const countNum = typeof count === 'string' ? parseInt(count) || 0 : count;
  const yearNum = typeof year === 'string' ? parseInt(year) || 0 : year;
  
  const isClickable = countNum > 0;

  const schemes = [
    { top: '#f8b328', bottom: '#af8119', year: '#885c11', text: '#ffffff' },
    { top: '#e6365a', bottom: '#b51a37', year: '#ffffff', text: '#ffffff' },
    { top: '#008397', bottom: '#015669', year: '#ffffff', text: '#ffffff' },
    { top: '#0eaf97', bottom: '#017b68', year: '#ffffff', text: '#ffffff' },
  ];

  // Active state uses blue scheme
  const activeScheme = { top: '#3b82f6', bottom: '#1e40af', year: '#ffffff', text: '#ffffff' };
  
  // Disabled state uses gray scheme
  const disabledScheme = { top: '#e5e7eb', bottom: '#9ca3af', year: '#6b7280', text: '#9ca3af' };
  
  // Choose color scheme based on state
  let scheme;
  if (isActive) {
    scheme = activeScheme;
  } else if (!isClickable) {
    scheme = disabledScheme;
  } else {
    scheme = schemes[index % schemes.length];
  }

  const handleClick = () => {
    if (isClickable && onYearClick) {
      onYearClick(yearNum);
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${vw} ${vh}`}
      className={`year-stat ${isClickable ? 'clickable' : 'disabled'} ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      style={{
        cursor: isClickable ? 'pointer' : 'not-allowed',
        opacity: isClickable ? 1 : 0.6,
        filter: isActive ? 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3))' : 'none',
        transform: isActive ? 'scale(1.05)' : 'scale(1)',
        transition: 'all 0.2s ease-in-out'
      }}
      title={isClickable ? `Klik untuk melihat ${count} kejadian di tahun ${year}` : `Tidak ada kejadian di tahun ${year}`}
    >
      {/* Parallelogram atas, condong ke kanan */}
      <polygon
        points={`
          0,0
          ${vw - 35},0
          ${vw},${midY}
          35,${midY}
        `}
        fill={scheme.top}
        style={{
          transition: 'fill 0.2s ease'
        }}
      />

      {/* Parallelogram bawah */}
      <polygon
        points={`
          35,${midY}
          ${vw},${midY}
          ${vw - 35},${vh}
          0,${vh}
        `}
        fill={scheme.bottom}
        style={{
          transition: 'fill 0.2s ease'
        }}
      />

      {/* Year: turun dari 0.3→0.35 */}
      <text
        x="57%"
        y={vh * 0.45}
        textAnchor="middle"
        fill={scheme.year}
        fontSize={vw * 0.18}
        fontWeight="bold"
        style={{
          transition: 'fill 0.2s ease'
        }}
      >
        {year}
      </text>

      {/* Count: naik dari 0.65→0.75 */}
      <text
        x="60%"
        y={vh * 0.74}
        textAnchor="middle"
        fill={scheme.text}
        fontSize={vw * 0.16}
        fontWeight="650"
        style={{
          transition: 'fill 0.2s ease'
        }}
      >
        {count}
      </text>

      {/* Label "Kejadian": naik dari 0.85→0.95 */}
      <text
        x="40%"
        y={vh * 0.95}
        textAnchor="middle"
        fill={scheme.text}
        fontSize={vw * 0.14}
        fontWeight="630"
        style={{
          transition: 'fill 0.2s ease'
        }}
      >
        Kejadian
      </text>

      {/* Active indicator (optional ring/glow effect) */}
      {isActive && (
        <>
          {/* Outer glow ring */}
          <polygon
            points={`
              -2,-2
              ${vw - 33},-2
              ${vw + 2},${midY}
              37,${midY}
            `}
            fill="none"
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth="2"
            opacity="0.7"
          />
          <polygon
            points={`
              37,${midY}
              ${vw + 2},${midY}
              ${vw - 33},${vh + 2}
              -2,${vh + 2}
            `}
            fill="none"
            stroke="rgba(59, 130, 246, 0.5)"
            strokeWidth="2"
            opacity="0.7"
          />
          
          {/* Active badge/star */}
          <circle
            cx={vw - 10}
            cy={10}
            r={6}
            fill="#fbbf24"
            stroke="#ffffff"
            strokeWidth="1"
          />
          <text
            x={vw - 10}
            y={14}
            textAnchor="middle"
            fill="#ffffff"
            fontSize="8"
            fontWeight="bold"
          >
            ★
          </text>
        </>
      )}
    </svg>
  );
}