import React from 'react';

interface AppIconProps {
  size?: number;
  className?: string;
}

const AppIcon: React.FC<AppIconProps> = ({ size = 1024, className }) => {
  const s = size / 300; // scale factor (designed at 300)
  const r = size * 0.22; // corner radius ~22%

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Background gradient */}
        <linearGradient id="bg-grad" x1="0" y1="0" x2={size} y2={size} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0924E" />
          <stop offset="100%" stopColor="#B84E18" />
        </linearGradient>

        {/* Shimmer overlay */}
        <linearGradient id="shimmer" x1="0" y1="0" x2={size * 0.7} y2={size * 0.7} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="white" stopOpacity="0.20" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>

        {/* Clip for rounded rect */}
        <clipPath id="rounded-clip">
          <rect width={size} height={size} rx={r} ry={r} />
        </clipPath>
      </defs>

      <g clipPath="url(#rounded-clip)">
        {/* Background */}
        <rect width={size} height={size} fill="url(#bg-grad)" />

        {/* Shimmer */}
        <rect width={size} height={size} fill="url(#shimmer)" />

        {/* Grid lines */}
        {Array.from({ length: 9 }, (_, i) => {
          const pos = (size / 10) * (i + 1);
          return (
            <React.Fragment key={`grid-${i}`}>
              <line x1={pos} y1={0} x2={pos} y2={size} stroke="white" strokeOpacity="0.06" strokeWidth={s * 0.8} />
              <line x1={0} y1={pos} x2={size} y2={pos} stroke="white" strokeOpacity="0.06" strokeWidth={s * 0.8} />
            </React.Fragment>
          );
        })}

        {/* === UPPER HALF: Concentric arcs === */}
        {(() => {
          const cx = size * 0.5;
          const cy = size * 0.3;
          const outerR = 52 * s;
          const midR = 36 * s;
          const innerR = 20 * s;
          const dotR = 6.5 * s;

          return (
            <g>
              {/* Outer arc — ~270° arc, open bottom-right */}
              <path
                d={describeArc(cx, cy, outerR, 135, 45)}
                stroke="white"
                strokeOpacity="0.38"
                strokeWidth={7 * s}
                strokeLinecap="round"
                fill="none"
              />
              {/* Middle arc — ~240° */}
              <path
                d={describeArc(cx, cy, midR, 150, 30)}
                stroke="white"
                strokeOpacity="0.55"
                strokeWidth={6 * s}
                strokeLinecap="round"
                fill="none"
              />
              {/* Inner ring — full circle */}
              <circle cx={cx} cy={cy} r={innerR} stroke="white" strokeOpacity="0.75" strokeWidth={5.5 * s} fill="none" />
              {/* Center dot */}
              <circle cx={cx} cy={cy} r={dotR} fill="white" />
            </g>
          );
        })()}

        {/* Divider line */}
        <line
          x1={size * 0.12}
          y1={size * 0.52}
          x2={size * 0.88}
          y2={size * 0.52}
          stroke="white"
          strokeOpacity="0.18"
          strokeWidth={1.2 * s}
        />

        {/* === LOWER HALF: Gantt bars === */}
        {(() => {
          const leftX = size * 0.12;
          const barH = 12 * s;
          const gap = 22 * s;
          const startY = size * 0.59;
          const dotR = 3.5 * s;
          const barRadius = 4 * s;
          const iconSize = 10 * s;

          const rows = [
            { width: 160 * s, opacity: 1 },
            { width: 110 * s, opacity: 0.85 },
            { width: 196 * s, opacity: 1 },
          ];

          return (
            <g>
              {rows.map((row, i) => {
                const y = startY + i * gap;
                const barX = leftX + 14 * s;
                const iconX = barX + row.width + 10 * s;
                const iconCY = y + barH / 2;

                return (
                  <g key={`bar-${i}`}>
                    {/* Task dot */}
                    <circle cx={leftX + 4 * s} cy={y + barH / 2} r={dotR} fill="white" fillOpacity="0.9" />

                    {/* Bar */}
                    <rect
                      x={barX}
                      y={y}
                      width={row.width}
                      height={barH}
                      rx={barRadius}
                      ry={barRadius}
                      fill="white"
                      fillOpacity={row.opacity}
                    />

                    {/* Status icons */}
                    {i === 0 && (
                      // Checkmark (done)
                      <g>
                        <circle cx={iconX + iconSize} cy={iconCY} r={iconSize} stroke="white" strokeWidth={1.8 * s} fill="none" strokeOpacity="0.85" />
                        <polyline
                          points={`${iconX + iconSize - 4 * s},${iconCY + 1 * s} ${iconX + iconSize - 1 * s},${iconCY + 4 * s} ${iconX + iconSize + 5 * s},${iconCY - 3 * s}`}
                          stroke="white"
                          strokeWidth={2 * s}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          opacity="0.85"
                        />
                      </g>
                    )}
                    {i === 1 && (
                      // In-progress dot
                      <g>
                        <circle cx={iconX + iconSize} cy={iconCY} r={iconSize} stroke="white" strokeWidth={1.8 * s} fill="none" strokeOpacity="0.75" />
                        <circle cx={iconX + iconSize} cy={iconCY} r={3.5 * s} fill="white" fillOpacity="0.75" />
                      </g>
                    )}
                    {i === 2 && (
                      // Arrow right (upcoming)
                      <g>
                        <circle cx={iconX + iconSize} cy={iconCY} r={iconSize} stroke="white" strokeWidth={1.8 * s} fill="none" strokeOpacity="0.85" />
                        <polyline
                          points={`${iconX + iconSize - 3 * s},${iconCY - 3.5 * s} ${iconX + iconSize + 3.5 * s},${iconCY} ${iconX + iconSize - 3 * s},${iconCY + 3.5 * s}`}
                          stroke="white"
                          strokeWidth={2 * s}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                          opacity="0.85"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* === BOTTOM: Progress bar === */}
        {(() => {
          const barY = size * 0.92;
          const barX = size * 0.12;
          const barW = size * 0.76;
          const barH = 5.5 * s;
          const fillW = barW * 0.67;
          const br = 3 * s;

          return (
            <g>
              <rect x={barX} y={barY} width={barW} height={barH} rx={br} ry={br} fill="white" fillOpacity="0.13" />
              <rect x={barX} y={barY} width={fillW} height={barH} rx={br} ry={br} fill="white" fillOpacity="0.65" />
            </g>
          );
        })()}
      </g>
    </svg>
  );
};

// Helper to describe an SVG arc path
function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;

  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);

  const diff = endAngle - startAngle;
  const sweep = diff < 0 ? 360 + diff : diff;
  const largeArc = sweep > 180 ? 1 : 0;

  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
}

export default AppIcon;
