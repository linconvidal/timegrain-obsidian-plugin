interface GrainStackProps {
  completedGrains: number;
  goalGrains: number;
  currentProgress: number; // 0-1 for current grain progress
  isActive: boolean;
}

/**
 * Grain visualization component
 * Shows progress toward daily goal as filled grain dots
 * "Harvest your time, grain by grain"
 */
export function GrainStack({ completedGrains, goalGrains, currentProgress, isActive }: GrainStackProps) {
  const grains: ('completed' | 'current' | 'empty')[] = [];

  for (let i = 0; i < goalGrains; i++) {
    if (i < completedGrains) {
      grains.push('completed');
    } else if (i === completedGrains && isActive) {
      grains.push('current');
    } else {
      grains.push('empty');
    }
  }

  const progressPercent = Math.round(currentProgress * 100);

  return (
    <div className="timegrain-grain-stack">
      {/* Grain dot grid */}
      <div className="timegrain-grain-grid" role="progressbar" aria-valuenow={completedGrains} aria-valuemax={goalGrains}>
        {grains.map((status, index) => (
          <div
            key={index}
            className={`timegrain-grain-dot timegrain-grain-dot-${status}`}
            title={status === 'current' ? `${progressPercent}% complete` : status === 'completed' ? 'Completed' : 'Pending'}
          >
            {status === 'current' && (
              <div
                className="timegrain-grain-dot-fill"
                style={{ height: `${progressPercent}%` }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress text */}
      <div className="timegrain-grain-progress-text">
        {completedGrains} of {goalGrains} grains harvested
      </div>
    </div>
  );
}
