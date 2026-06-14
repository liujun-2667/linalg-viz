import type { Matrix2, Matrix3 } from '../utils/math';
import { analyzeMatrix2, analyzeMatrix3 } from '../utils/matrixTypes';
import { det2, det3, eigenvalues2 } from '../utils/math';

interface MatrixInfoProps {
  matrix: Matrix2 | Matrix3;
  dimensions: 2 | 3;
}

export function MatrixInfo(props: MatrixInfoProps) {
  const info = props.dimensions === 2 
    ? analyzeMatrix2(props.matrix as Matrix2)
    : analyzeMatrix3(props.matrix as Matrix3);
  
  const det = props.dimensions === 2 
    ? det2(props.matrix as Matrix2)
    : det3(props.matrix as Matrix3);
  
  const eigenvalues = props.dimensions === 2 
    ? eigenvalues2(props.matrix as Matrix2)
    : null;
  
  const typeColors: Record<string, string> = {
    '旋转矩阵': '#3b82f6',
    '反射矩阵': '#8b5cf6',
    '剪切矩阵': '#f59e0b',
    '缩放矩阵': '#10b981',
    '投影矩阵': '#ef4444',
    '奇异矩阵': '#dc2626',
  };
  
  return (
    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
        矩阵分析
      </h3>
      
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>行列式: </span>
        <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
          {det.toFixed(4)}
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
          ({props.dimensions === 2 ? '面积' : '体积'}缩放因子)
        </span>
      </div>
      
      {eigenvalues && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>特征值: </span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#8b5cf6' }}>
            λ₁={eigenvalues[0].toFixed(4)}, λ₂={eigenvalues[1].toFixed(4)}
          </span>
        </div>
      )}
      
      <div>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>矩阵类型: </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
          {info.types.length > 0 ? (
            info.types.map((type, i) => (
              <span
                key={i}
                style={{
                  padding: '3px 8px',
                  backgroundColor: typeColors[type] || '#6b7280',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {type}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>普通矩阵</span>
          )}
        </div>
      </div>
    </div>
  );
}
