import { createSignal, onMount, onCleanup } from 'solid-js';
import type { Matrix2 } from '../utils/math';
import { eigenvalues2, mat2MulVec2 } from '../utils/math';

interface EigenvalueExplorerProps {
  onMatrixChange: (matrix: Matrix2) => void;
}

export function EigenvalueExplorer(props: EigenvalueExplorerProps) {
  const angle = createSignal(0);
  const eigenvalueHistory = createSignal<[number, number][]>([]);
  const canvasRef = <canvas ref />;
  
  function updateMatrix() {
    const theta = angle() * Math.PI / 180;
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const scale = 1.5;
    const matrix: Matrix2 = [c * scale, -s, s, c * scale];
    props.onMatrixChange(matrix);
    
    const eigenvalues = eigenvalues2(matrix);
    eigenvalueHistory(prev => {
      const newHistory = [...prev, eigenvalues];
      if (newHistory.length > 72) {
        return newHistory.slice(-72);
      }
      return newHistory;
    });
  }
  
  function draw() {
    const canvas = canvasRef();
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 60;
    
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
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Re', width - 20, centerY + 15);
    ctx.save();
    ctx.translate(15, height - 20);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Im', 0, 0);
    ctx.restore();
    
    const history = eigenvalueHistory();
    const eps = 1e-10;
    
    history.forEach((eigenvalues, i) => {
      const alpha = (i + 1) / history.length;
      const [lambda1, lambda2] = eigenvalues;
      
      const trace = (lambda1 + lambda2) / 2;
      const det = lambda1 * lambda2;
      const discriminant = trace * trace - det;
      
      if (discriminant >= -eps) {
        const sqrtD = Math.sqrt(Math.max(0, discriminant));
        const real1 = trace;
        const imag1 = sqrtD;
        const real2 = trace;
        const imag2 = -sqrtD;
        
        ctx.fillStyle = `rgba(239, 68, 68, ${alpha})`;
        ctx.beginPath();
        ctx.arc(centerX + real1 * scale, centerY - imag1 * scale, 4 * alpha, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = `rgba(59, 130, 246, ${alpha})`;
        ctx.beginPath();
        ctx.arc(centerX + real2 * scale, centerY - imag2 * scale, 4 * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    
    if (history.length > 1) {
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      history.forEach((eigenvalues, i) => {
        const trace = (eigenvalues[0] + eigenvalues[1]) / 2;
        const det = eigenvalues[0] * eigenvalues[1];
        const discriminant = trace * trace - det;
        
        if (discriminant >= -eps) {
          const sqrtD = Math.sqrt(Math.max(0, discriminant));
          const x = centerX + trace * scale;
          const y = centerY - sqrtD * scale;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
      });
      ctx.stroke();
    }
    
    const currentEigenvalues = eigenvalues2([
      Math.cos(angle() * Math.PI / 180) * 1.5,
      -Math.sin(angle() * Math.PI / 180),
      Math.sin(angle() * Math.PI / 180),
      Math.cos(angle() * Math.PI / 180) * 1.5,
    ]);
    
    const currentTrace = (currentEigenvalues[0] + currentEigenvalues[1]) / 2;
    const currentDet = currentEigenvalues[0] * currentEigenvalues[1];
    const currentDiscriminant = currentTrace * currentTrace - currentDet;
    
    if (currentDiscriminant >= -eps) {
      const sqrtD = Math.sqrt(Math.max(0, currentDiscriminant));
      
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(centerX + currentTrace * scale, centerY - sqrtD * scale, 6, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(centerX + currentTrace * scale, centerY + sqrtD * scale, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  let animationRef: number;
  
  onMount(() => {
    updateMatrix();
    draw();
    
    function animate() {
      angle((angle() + 1) % 360);
      updateMatrix();
      draw();
      animationRef = requestAnimationFrame(animate);
    }
    
    animationRef = requestAnimationFrame(animate);
    
    onCleanup(() => {
      cancelAnimationFrame(animationRef);
    });
  });
  
  return (
    <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
        特征值轨迹探索
      </h3>
      <canvas
        ref={canvasRef}
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
          onChange={(e) => angle(parseInt(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: '12px', color: '#374151', width: '50px', textAlign: 'right' }}>
          {angle()}°
        </span>
      </div>
    </div>
  );
}
