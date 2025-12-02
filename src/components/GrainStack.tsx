interface GrainStackProps {
  completedGrains: number;
  goalGrains: number;
  currentProgress: number; // 0-1 for current grain progress
  isActive: boolean;
}

/**
 * Hourglass visualization
 * Sand flows from top to bottom as time passes
 */
export function GrainStack({ completedGrains, goalGrains, currentProgress, isActive }: GrainStackProps) {
  const currentGrainContribution = isActive ? currentProgress : 0;
  const totalProgress = (completedGrains + currentGrainContribution) / goalGrains;
  const fillPercent = Math.min(totalProgress, 1);
  const isOverflow = completedGrains >= goalGrains;

  // Hourglass dimensions
  const width = 56;
  const height = 80;
  const centerX = width / 2;
  const centerY = height / 2;

  // Bulb dimensions
  const bulbWidth = 40;
  const bulbHeight = 32;
  const neckWidth = 6;
  const neckHeight = 8;

  // Sand levels
  const topSandPercent = 1 - fillPercent;
  const bottomSandPercent = fillPercent;

  const maxSandHeight = bulbHeight - 4;
  const topSandHeight = topSandPercent * maxSandHeight;
  const bottomSandHeight = bottomSandPercent * maxSandHeight;

  // Hourglass outline path
  const hourglassPath = `
    M ${centerX - bulbWidth/2} 4
    Q ${centerX - bulbWidth/2 - 4} ${bulbHeight/2 + 4}, ${centerX - neckWidth/2} ${centerY - neckHeight/2}
    L ${centerX - neckWidth/2} ${centerY + neckHeight/2}
    Q ${centerX - bulbWidth/2 - 4} ${height - bulbHeight/2 - 4}, ${centerX - bulbWidth/2} ${height - 4}
    L ${centerX + bulbWidth/2} ${height - 4}
    Q ${centerX + bulbWidth/2 + 4} ${height - bulbHeight/2 - 4}, ${centerX + neckWidth/2} ${centerY + neckHeight/2}
    L ${centerX + neckWidth/2} ${centerY - neckHeight/2}
    Q ${centerX + bulbWidth/2 + 4} ${bulbHeight/2 + 4}, ${centerX + bulbWidth/2} 4
    Z
  `;

  // Top sand cone shape (funnel pointing down)
  const topConeY = centerY - neckHeight/2 - topSandHeight;
  const topConeWidth = Math.min(18, 6 + topSandPercent * 14);
  const topConePath = topSandPercent > 0.05 ? `
    M ${centerX - topConeWidth} ${topConeY}
    Q ${centerX - topConeWidth * 0.3} ${topConeY + 6}, ${centerX} ${centerY - neckHeight/2 + 1}
    Q ${centerX + topConeWidth * 0.3} ${topConeY + 6}, ${centerX + topConeWidth} ${topConeY}
    Z
  ` : '';

  // Bottom sand pile shape (mound)
  const bottomPileY = height - 6 - bottomSandHeight;
  const bottomPileWidth = Math.min(18, 4 + bottomSandPercent * 16);
  const bottomPilePath = bottomSandPercent > 0.05 ? `
    M ${centerX - bottomPileWidth} ${bottomPileY + 3}
    Q ${centerX} ${bottomPileY - 4}, ${centerX + bottomPileWidth} ${bottomPileY + 3}
  ` : '';

  // Calculated stats for tooltip
  const percentComplete = Math.round(fillPercent * 100);
  const remaining = goalGrains - completedGrains;

  return (
    <div className="timegrain-grain-stack">
      {/* Hover tooltip */}
      <div className="timegrain-hourglass-tooltip">
        <div className="timegrain-tooltip-stat">
          <span className="timegrain-tooltip-value">{completedGrains}</span>
          <span className="timegrain-tooltip-label">/ {goalGrains} grains</span>
        </div>
        <div className="timegrain-tooltip-progress">
          <div
            className="timegrain-tooltip-progress-fill"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
        <div className="timegrain-tooltip-detail">
          {remaining > 0
            ? `${remaining} more to reach your goal`
            : 'Daily goal reached!'
          }
        </div>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={`timegrain-hourglass ${isActive ? 'timegrain-hourglass-active' : ''} ${isOverflow ? 'timegrain-hourglass-overflow' : ''}`}
        role="progressbar"
        aria-valuenow={completedGrains}
        aria-valuemax={goalGrains}
        aria-label={`${completedGrains} of ${goalGrains} grains`}
      >
        <defs>
          {/* Rich sand gradient */}
          <linearGradient id="sand-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f7e5a0" />
            <stop offset="40%" stopColor="#e8c46c" />
            <stop offset="100%" stopColor="#c49a3d" />
          </linearGradient>

          {/* Lighter sand for highlights */}
          <linearGradient id="sand-highlight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#faf0c8" />
            <stop offset="100%" stopColor="#e8c46c" />
          </linearGradient>

          {/* Shimmer gradient */}
          <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* Glass reflection gradient */}
          <linearGradient id="glass-shine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--background-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--background-primary)" stopOpacity="0" />
          </linearGradient>

          {/* Clip paths */}
          <clipPath id="top-bulb-clip">
            <path d={`
              M ${centerX - bulbWidth/2 + 2} 6
              Q ${centerX - bulbWidth/2 - 2} ${bulbHeight/2 + 4}, ${centerX - neckWidth/2 + 1} ${centerY - neckHeight/2}
              L ${centerX + neckWidth/2 - 1} ${centerY - neckHeight/2}
              Q ${centerX + bulbWidth/2 + 2} ${bulbHeight/2 + 4}, ${centerX + bulbWidth/2 - 2} 6
              Z
            `} />
          </clipPath>

          <clipPath id="bottom-bulb-clip">
            <path d={`
              M ${centerX - neckWidth/2 + 1} ${centerY + neckHeight/2}
              Q ${centerX - bulbWidth/2 - 2} ${height - bulbHeight/2 - 4}, ${centerX - bulbWidth/2 + 2} ${height - 6}
              L ${centerX + bulbWidth/2 - 2} ${height - 6}
              Q ${centerX + bulbWidth/2 + 2} ${height - bulbHeight/2 - 4}, ${centerX + neckWidth/2 - 1} ${centerY + neckHeight/2}
              Z
            `} />
          </clipPath>
        </defs>

        {/* Glass outline */}
        <path
          d={hourglassPath}
          fill="none"
          stroke="var(--background-modifier-border)"
          strokeWidth="1.5"
          className="timegrain-glass-outline"
        />

        {/* Glass left reflection */}
        <path
          d={`M ${centerX - bulbWidth/2 + 4} 7
              Q ${centerX - bulbWidth/2} ${bulbHeight/2 + 2}, ${centerX - neckWidth/2 + 1} ${centerY - neckHeight/2 - 2}`}
          fill="none"
          stroke="url(#glass-shine)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={`M ${centerX - neckWidth/2 + 1} ${centerY + neckHeight/2 + 2}
              Q ${centerX - bulbWidth/2} ${height - bulbHeight/2 - 2}, ${centerX - bulbWidth/2 + 4} ${height - 7}`}
          fill="none"
          stroke="url(#glass-shine)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Top bulb sand */}
        {topSandPercent > 0.02 && (
          <g clipPath="url(#top-bulb-clip)">
            {/* Main sand body */}
            <rect
              x={centerX - bulbWidth/2}
              y={topConeY}
              width={bulbWidth}
              height={topSandHeight + 8}
              fill="url(#sand-gradient)"
              className="timegrain-sand-top"
            />
            {/* Cone funnel shape */}
            {topConePath && (
              <path d={topConePath} fill="url(#sand-highlight)" className="timegrain-cone" />
            )}
            {/* Shimmer overlay */}
            <rect
              x={centerX - bulbWidth/2}
              y={topConeY}
              width={bulbWidth}
              height={topSandHeight + 8}
              fill="url(#shimmer)"
              className="timegrain-shimmer"
            />
          </g>
        )}

        {/* Bottom bulb sand */}
        {bottomSandPercent > 0.02 && (
          <g clipPath="url(#bottom-bulb-clip)">
            {/* Main sand body */}
            <rect
              x={centerX - bulbWidth/2}
              y={bottomPileY}
              width={bulbWidth}
              height={bottomSandHeight + 8}
              fill="url(#sand-gradient)"
              className="timegrain-sand-bottom"
            />
            {/* Pile mound shape */}
            {bottomPilePath && (
              <path d={bottomPilePath} fill="url(#sand-highlight)" strokeWidth="0" className="timegrain-pile" />
            )}
            {/* Shimmer overlay */}
            <rect
              x={centerX - bulbWidth/2}
              y={bottomPileY}
              width={bulbWidth}
              height={bottomSandHeight + 8}
              fill="url(#shimmer)"
              className="timegrain-shimmer"
            />
            {/* Scattered surface grains */}
            {bottomSandPercent > 0.1 && (
              <>
                <circle cx={centerX - 6} cy={bottomPileY + 2} r="1.2" fill="#d4a855" className="timegrain-surface-grain" />
                <circle cx={centerX + 4} cy={bottomPileY + 1} r="1" fill="#c49a3d" className="timegrain-surface-grain" />
                <circle cx={centerX + 8} cy={bottomPileY + 3} r="0.8" fill="#e8c46c" className="timegrain-surface-grain" />
                <circle cx={centerX - 3} cy={bottomPileY} r="1.1" fill="#f7e5a0" className="timegrain-surface-grain" />
              </>
            )}
          </g>
        )}

        {/* Sand stream when active */}
        {isActive && topSandPercent > 0.05 && (
          <g className="timegrain-sand-stream">
            {/* Continuous stream */}
            <line
              x1={centerX}
              y1={centerY - neckHeight/2 + 1}
              x2={centerX}
              y2={centerY + neckHeight/2 + 6}
              stroke="#e8c46c"
              strokeWidth="2"
              strokeLinecap="round"
              className="timegrain-stream-line"
            />
            {/* Particle cascade */}
            <circle cx={centerX} cy={centerY - 4} r="1.5" fill="#f7e5a0" className="timegrain-particle-1" />
            <circle cx={centerX - 0.5} cy={centerY} r="1.2" fill="#e8c46c" className="timegrain-particle-2" />
            <circle cx={centerX + 0.5} cy={centerY + 4} r="1.4" fill="#d4a855" className="timegrain-particle-3" />
            <circle cx={centerX} cy={centerY + 8} r="1" fill="#c49a3d" className="timegrain-particle-4" />
            <circle cx={centerX - 0.3} cy={centerY + 12} r="1.3" fill="#e8c46c" className="timegrain-particle-5" />
          </g>
        )}

        {/* Idle sparkles on sand */}
        {!isActive && bottomSandPercent > 0.2 && (
          <g className="timegrain-sparkles">
            <circle cx={centerX - 5} cy={bottomPileY + 4} r="0.8" fill="#fff" className="timegrain-sparkle-1" />
            <circle cx={centerX + 7} cy={bottomPileY + 6} r="0.6" fill="#fff" className="timegrain-sparkle-2" />
          </g>
        )}
      </svg>
    </div>
  );
}
