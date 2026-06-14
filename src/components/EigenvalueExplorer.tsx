import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';
import type { Matrix2 } from '../utils/math';
import { eigenvalues2 } from '../utils/math';

interface EigenvalueExplorerProps {
  externalMatrix?: Matrix2;
  onMatrixChange: (matrix: Matrix2) => void;
}

export function EigenvalueExplorer(props: EigenvalueExplorerProps) {
  const [angle, setAngle] = createSignal(45);
  const [eigenvalueHistory, setEigenvalueHistory] = createSignal<[number, number][]>([]);
  const [currentMatrix, setCurrentMatrix] = createSignal<Matrix2>([1, 0, 0, 1]);
  let canvasEl: HTMLCanvasElement | undefined;
  let animRefId: number;
  
  function computeMatrix(angleDeg: number): Matrix2 {
    const theta = angleDeg * Math.PI / 180;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const scale = 1.5;
    return [c * scale, -s, s, c * scale];
  }
  
  function updateHistory(evals: [number, number]) {
    setEigenvalueHistory(prev => {
      const newHistory = [...prev, evals];
      if (newHistory.length > 72) {
        return newHistory.slice(-72);
      }
      return newHistory;
    });
  }
  
  function draw() {
    const canvas = canvasEl;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const sc = 40;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Re', width - 15, centerY + 12);
    ctx.save();
    ctx.translate(12, height - 15);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Im', 0, 0);
    ctx.restore();
    
    const history = eigenvalueHistory();
    const eps = 1e-10;
    
    history.forEach((evals, i) => {
      const alpha = (i + 1) / history.length * 0.8;
      const [lambda1, lambda2] = evals;
      
      const trace = (lambda1 + lambda2) / 2;
      const det = lambda1 * lambda2;
      const discriminant = trace * trace - det;
      
      if (discriminant >= -eps) {
        const sqrtD = Math.sqrt(Math.max(0, discriminant));
        const real = trace * sc + centerX;
        const imag1 = centerY - sqrtD * sc;
        const imag2 = centerY + sqrtD * sc;
        
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.arc(real, imag1, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.beginPath();
        ctx.arc(real, imag2, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    if (history.length > 1) {
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      history.forEach((evals, i) => {
        const trace = (evals[0] + evals[1]) / 2;
        const det = evals[0] * evals[1];
        const discriminant = trace * trace - det;
        
        if (discriminant >= -eps) {
          const sqrtD = Math.sqrt(Math.max(0, discriminant));
          const x = trace * sc + centerX;
          const y = centerY - sqrtD * sc;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }
    
    const matrix = currentMatrix();
    const currentEigenvalues = eigenvalues2(matrix);
    
    const currentTrace = (currentEigenvalues[0] + currentEigenvalues[1]) / 2;
    const currentDet = currentEigenvalues[0] * currentEigenvalues[1];
    const currentDiscriminant = currentTrace * currentTrace - currentDet;
    
    if (currentDiscriminant >= -eps) {
      const sqrtD = Math.sqrt(Math.max(0, currentDiscriminant));
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(centerX + currentTrace * sc, centerY - sqrtD * sc, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(centerX + currentTrace * sc, centerY + sqrtD * sc, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  onMount(() => {
    const matrix = computeMatrix(angle());
    setCurrentMatrix(matrix);
    updateHistory(eigenvalues2(matrix));
    draw();
  });
  
  createEffect(() => {
    if (props.externalMatrix) {
      setCurrentMatrix(props.externalMatrix);
      draw();
    }
  });
  
  onCleanup(() => {
    if (animRefId) {
      cancelAnimationFrame(animRefId);
    }
  });
  
  function handleAngleChange(newAngle: number) {
    setAngle(newAngle);
    setEigenvalueHistory([]);
    const matrix = computeMatrix(newAngle);
    setCurrentMatrix(matrix);
    updateHistory(eigenvalues2(matrix));
    draw();
  }
  
  return (
    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
        特征值轨迹探索
      </h3>
      <canvas
        ref={canvasEl}
        width={200}
        height={200}
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          marginBottom: '12px',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>旋转角度:</span>
        <input
          type="range"
          min="0"
          max="360"
          value={angle()}
          onInput={(e) => handleAngleChange(parseInt((e.target as HTMLInputElement).value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '12px', color: '#374151', width: '50px', textAlign: 'right' }}>
          {angle()}°
        </span>
      </div>
    </div>
  );
}
