import type { Matrix2, Matrix3 } from '../utils/math';

interface MatrixInputProps {
  dimensions: 2 | 3;
  matrix: Matrix2 | Matrix3;
  onMatrixChange: (matrix: Matrix2 | Matrix3) => void;
}

export function MatrixInput(props: MatrixInputProps) {
  const size = props.dimensions;
  const count = size === 2 ? 4 : 9;
  
  function handleChange(index: number, value: string) {
    const num = parseFloat(value);
    const newMatrix = [...(props.matrix as number[])];
    newMatrix[index] = isNaN(num) ? 0 : num;
    props.onMatrixChange(newMatrix as Matrix2 | Matrix3);
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gap: '8px',
        marginBottom: '16px',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <input
            key={i}
            type="number"
            value={(props.matrix as number[])[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            style={{
              width: '60px',
              height: '40px',
              textAlign: 'center',
              fontSize: '16px',
              border: '2px solid #e5e7eb',
              borderRadius: '4px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).borderColor = '#3b82f6';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).borderColor = '#e5e7eb';
            }}
            step="any"
          />
        ))}
      </div>
    </div>
  );
}
