import type { ShotType, Handedness } from '@tennis/shared';

interface Props {
  shotType: ShotType;
  handedness: Handedness;
  twoHandedBackhand: boolean;
  disabled?: boolean;
  onChange: (next: { shotType: ShotType; handedness: Handedness; twoHandedBackhand: boolean }) => void;
}

const SHOTS: { value: ShotType; label: string }[] = [
  { value: 'forehand', label: 'Forehand' },
  { value: 'backhand', label: 'Backhand' },
  { value: 'serve', label: 'Serve' },
  { value: 'volley', label: 'Volley' },
];

const fieldLabel = 'mt-3 mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-500';

export function ShotForm({ shotType, handedness, twoHandedBackhand, disabled, onChange }: Props) {
  return (
    <div className="card">
      <h2 className="mb-3 text-base font-semibold">1. About the shot</h2>

      <span className={fieldLabel}>Shot type</span>
      <div className="flex flex-wrap gap-2">
        {SHOTS.map((s) => (
          <button
            key={s.value}
            type="button"
            className={shotType === s.value ? 'seg seg-active' : 'seg'}
            disabled={disabled}
            onClick={() => onChange({ shotType: s.value, handedness, twoHandedBackhand })}
          >
            {s.label}
          </button>
        ))}
      </div>

      <span className={fieldLabel}>Handedness</span>
      <div className="flex flex-wrap gap-2">
        {(['right', 'left'] as Handedness[]).map((h) => (
          <button
            key={h}
            type="button"
            className={handedness === h ? 'seg seg-active' : 'seg'}
            disabled={disabled}
            onClick={() => onChange({ shotType, handedness: h, twoHandedBackhand })}
          >
            {h === 'right' ? 'Right-handed' : 'Left-handed'}
          </button>
        ))}
      </div>

      {shotType === 'backhand' && (
        <label className="mt-3.5 flex items-center gap-2 text-[0.95rem]">
          <input
            type="checkbox"
            checked={twoHandedBackhand}
            disabled={disabled}
            onChange={(e) => onChange({ shotType, handedness, twoHandedBackhand: e.target.checked })}
          />
          Two-handed backhand
        </label>
      )}
    </div>
  );
}
