import { createSignal, createMemo } from 'solid-js';
import type { Matrix2 } from '../utils/math';
import { det2 } from '../utils/math';

interface TransformTimelineProps {
  history: Matrix2[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function getMatrixLabel(matrix: Matrix2): string {
  const [a, b, c, d] = matrix;
  
  const eps = 1e-5;
  
  if (Math.abs(a) < eps && Math.abs(b + 1) < eps && Math.abs(c - 1) < eps && Math.abs(d) < eps) {
    return 'R90°';
  }
  if (Math.abs(a + 1) < eps && Math.abs(b) < eps && Math.abs(c) < eps && Math.abs(d + 1) < eps) {
    return 'R180°';
  }
  if (Math.abs(a) < eps && Math.abs(b - 1) < eps && Math.abs(c + 1) < eps && Math.abs(d) < eps) {
    return 'R270°';
  }
  if (Math.abs(a - 1) < eps && Math.abs(b) < eps && Math.abs(c) < eps && Math.abs(d + 1) < eps) {
    return 'X反射';
  }
  if (Math.abs(a + 1) < eps && Math.abs(b) < eps && Math.abs(c) < eps && Math.abs(d - 1) < eps) {
    return 'Y反射';
  }
  if (Math.abs(a - 1) < eps && Math.abs(c) < eps && Math.abs(d - 1) < eps && Math.abs(b) > eps) {
    return `H${b.toFixed(1)}`;
  }
  if (Math.abs(a - 1) < eps && Math.abs(b) < eps && Math.abs(d - 1) < eps && Math.abs(c) > eps) {
    return `V${c.toFixed(1)}`;
  }
  if (Math.abs(b) < eps && Math.abs(c) < eps) {
    return `${a.toFixed(1)}x${d.toFixed(1)}`;
  }
  
  return `[${a.toFixed(1)},${b.toFixed(1)},${c.toFixed(1)},${d.toFixed(1)}]`;
}

function formatMatrix(matrix: Matrix2): string {
  return `[${matrix[0].toFixed(2)}, ${matrix[1].toFixed(2)}, ${matrix[2].toFixed(2)}, ${matrix[3].toFixed(2)}]`;
}

export function TransformTimeline(props: TransformTimelineProps) {
  const [tooltipVisible, setTooltipVisible] = createSignal(false);
  const [tooltipContent, setTooltipContent] = createSignal('');
  const [tooltipPosition, setTooltipPosition] = createSignal({ x: 0, y: 0 });

  const maxHistory = 8;
  
  const displayHistory = createMemo(() => props.history.slice(-maxHistory));
  const adjustedActiveIndex = createMemo(() => {
    if (props.activeIndex >= 0 && props.activeIndex >= props.history.length - maxHistory) {
      return props.activeIndex - (props.history.length - maxHistory);
    }
    return props.activeIndex;
  });

  function handleMouseEnter(e: MouseEvent, matrix: Matrix2) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    const det = det2(matrix);
    setTooltipContent(`矩阵: ${formatMatrix(matrix)}\n行列式: ${det.toFixed(4)}`);
    setTooltipVisible(true);
  }

  function handleMouseLeave() {
    setTooltipVisible(false);
  }

  function handleExport() {
    const activeMatrices = props.activeIndex >= 0 
      ? props.history.slice(0, props.activeIndex + 1)
      : props.history;
    const text = activeMatrices.map(m => `[${m.join(',')}]`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      alert('变换链已复制到剪贴板！');
    });
  }

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
          margin: 0,
        }}>
          变换历史 ({displayHistory().length}/{maxHistory})
        </h3>
        {props.history.length > 0 && (
          <button
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.backgroundColor = '#3b82f6';
            }}
          >
            导出变换链
          </button>
        )}
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 0',
        overflowX: 'auto',
      }}>
        {displayHistory().length === 0 ? (
          <span style={{
            color: '#9ca3af',
            fontSize: '14px',
          }}>
            暂无变换记录，点击"应用变换"开始记录
          </span>
        ) : (
          displayHistory().map((matrix, index) => {
            const isActive = index === adjustedActiveIndex();
            const isGrayed = adjustedActiveIndex() >= 0 && index > adjustedActiveIndex();
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && (
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    style={{
                      marginRight: '4px',
                      opacity: isGrayed ? 0.3 : 0.6,
                    }}
                  >
                    <path
                      d="M5 10h10M12 7l3 3-3 3"
                      fill="none"
                      stroke={isGrayed ? '#9ca3af' : '#3b82f6'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                
                <button
                  onClick={() => props.onSelect(index + (props.history.length - displayHistory.length))}
                  onMouseEnter={(e) => handleMouseEnter(e, matrix)}
                  onMouseLeave={handleMouseLeave}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '2px solid',
                    borderColor: isActive ? '#3b82f6' : isGrayed ? '#e5e7eb' : '#d1d5db',
                    backgroundColor: isActive ? '#dbeafe' : isGrayed ? '#f9fafb' : 'white',
                    color: isGrayed ? '#9ca3af' : '#374151',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none',
                    opacity: isGrayed ? 0.5 : 1,
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}>
                    T{index + 1}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: isGrayed ? '#9ca3af' : '#6b7280',
                  }}>
                    {getMatrixLabel(matrix)}
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>
      
      {tooltipVisible() && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition().x,
            top: tooltipPosition().y,
            transform: 'translate(-50%, -100%)',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '12px',
            whiteSpace: 'pre',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {tooltipContent()}
        </div>
      )}
    </div>
  );
}