import type { CSSProperties, ReactNode, SVGProps } from 'react';

type MarkProps = SVGProps<SVGSVGElement> & { size?: number };

/** Standalone 1A mark — hexagon grid with today dot (24×24 viewBox). */
export function SylliBeeMark({ size = 32, className, ...props }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="SylliBee"
      className={className}
      {...props}
    >
      <path
        d="M12 2.4 20.5 7.2v9.6L12 21.6 3.5 16.8V7.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <g fill="currentColor">
        <circle cx="8.6" cy="10.3" r="1" />
        <circle cx="12" cy="10.3" r="1" />
        <circle cx="15.4" cy="10.3" r="1" />
        <circle cx="8.6" cy="14.1" r="1" />
        <circle cx="12" cy="14.1" r="1" />
      </g>
      <circle cx="15.4" cy="14.1" r="1.55" fill="#E8B45C" />
    </svg>
  );
}

/** Compact mark for ≤20px — hexagon + today dot only. */
export function SylliBeeMarkSmall({ size = 16, className, ...props }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={className}
      {...props}
    >
      <path
        d="M12 2.4 20.5 7.2v9.6L12 21.6 3.5 16.8V7.2z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="13.6" r="1.9" fill="#E8B45C" />
    </svg>
  );
}

interface SylliBeeLockupProps {
  chipSize?: number;
  markSize?: number;
  titleSize?: number;
  subtitle?: ReactNode;
  style?: CSSProperties;
  className?: string;
}

/** Chip + small mark + SylliBee wordmark. */
export function SylliBeeLockup({
  chipSize = 30,
  markSize = 17,
  titleSize = 16.5,
  subtitle,
  style,
  className,
}: SylliBeeLockupProps) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
        ...style,
      }}
    >
      <div
        style={{
          width: chipSize,
          height: chipSize,
          borderRadius: Math.round(chipSize * 0.333),
          color: '#FFFFFF',
          background: 'linear-gradient(150deg, #22252A, #3A3F47)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 6px 16px rgba(22,26,34,.08)',
        }}
      >
        <SylliBeeMarkSmall size={markSize} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: titleSize,
            fontWeight: 600,
            letterSpacing: '-.3px',
            color: '#22252A',
            lineHeight: 1.2,
          }}
        >
          SylliBee
        </div>
        {subtitle}
      </div>
    </div>
  );
}
