import type { Matrix2, Matrix3 } from '../utils/math';
import { presets2D, presets3D } from '../utils/presets';

interface PresetLibraryProps {
  dimensions: 2 | 3;
  onSelect: (matrix: Matrix2 | Matrix3) => void;
}

export function PresetLibrary(props: PresetLibraryProps) {
  const presets = props.dimensions === 2 ? presets2D : presets3D;
  
  return (
    <div style={{ marginBottom: '16px' }}>
      <h3 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
        预设变换
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {presets.map((preset, i) => (
          <button
            key={i}
            onClick={() => props.onSelect(preset.matrix)}
            title={preset.description}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#f3f4f6';
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
