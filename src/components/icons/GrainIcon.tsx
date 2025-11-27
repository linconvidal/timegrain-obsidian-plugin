interface GrainIconProps {
  size?: number;
  className?: string;
}

/**
 * Wheat grain icon for Timegrain brand identity
 * "Harvest your time, grain by grain"
 */
export function GrainIcon({ size = 16, className = '' }: GrainIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Wheat stalk */}
      <path d="M12 22V12" />

      {/* Grain kernels - left side */}
      <path d="M9 12c-1.5-1-2.5-3-2.5-5 2 0 4 1 5 2.5" />
      <path d="M7.5 9c-1.5-1-2.5-3-2.5-5 2 0 4 1 5 2.5" />
      <path d="M6 6c-1.5-1-2-2.5-2-4 1.5 0 3 0.5 4 2" />

      {/* Grain kernels - right side */}
      <path d="M15 12c1.5-1 2.5-3 2.5-5-2 0-4 1-5 2.5" />
      <path d="M16.5 9c1.5-1 2.5-3 2.5-5-2 0-4 1-5 2.5" />
      <path d="M18 6c1.5-1 2-2.5 2-4-1.5 0-3 0.5-4 2" />
    </svg>
  );
}

/**
 * Filled grain dot for visualizations
 */
export function GrainDot({ filled = false, progress = 0, active = false }: { filled?: boolean; progress?: number; active?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="20" height="20" className={`timegrain-grain-dot-svg ${filled ? 'filled' : ''} ${active ? 'active' : ''}`}>
      {/* Background circle */}
      <circle cx="10" cy="10" r="8" fill="var(--background-secondary)" stroke="var(--background-modifier-border)" strokeWidth="1.5" />

      {/* Filled portion */}
      {filled && (
        <circle cx="10" cy="10" r="7" fill="var(--interactive-accent)" />
      )}

      {/* Progress fill for current grain */}
      {!filled && progress > 0 && (
        <clipPath id="progress-clip">
          <rect x="0" y={20 - 20 * progress} width="20" height={20 * progress} />
        </clipPath>
      )}
      {!filled && progress > 0 && (
        <circle cx="10" cy="10" r="7" fill="var(--interactive-accent)" clipPath="url(#progress-clip)" />
      )}
    </svg>
  );
}

/**
 * Hourglass icon for time tracking
 */
export function HourglassIcon({ size = 16, className = '' }: GrainIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 22h14" />
      <path d="M5 2h14" />
      <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
      <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
    </svg>
  );
}
