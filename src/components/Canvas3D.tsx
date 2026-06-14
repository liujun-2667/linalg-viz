import { onMount, onCleanup, createSignal } from 'solid-js';
import type { Matrix3, Vector3 } from '../utils/math';
import { mat3MulVec3, lerpVec3 } from '../utils/math';

interface Canvas3DProps {
  matrix: Matrix3;
  isAnimating: boolean;
}

export function Canvas3D(props: Canvas3DProps) {
  const canvasRef = <canvas ref />;
  const animationRef = createSignal(0);
  const rotationX = createSignal(0.5);
  const rotationY = createSignal(0.5);
  const scale = createSignal(1);
  const usePerspective = createSignal(true);
  const isDragging = createSignal(false);
  const lastMouseX = createSignal(0);
  const lastMouseY = createSignal(0);
  
  const currentCube = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ] as Vector3[];
  const currentVectors = [[1, 0, 0] as Vector3, [0, 1, 0] as Vector3, [0, 0, 1] as Vector3];
  const transformedCube = [
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ] as Vector3[];
  const transformedVectors = [[1, 0, 0] as Vector3, [0, 1, 0] as Vector3, [0, 0, 1] as Vector3];
  const animationProgress = createSignal(0);
  const isAnimatingLocal = createSignal(false);
  
  const canvasSize = 500;
  const center = canvasSize / 2;
  const fov = 300;
  
  function project(v: Vector3): [number, number] {
    const [x, y, z] = v;
    
    let sx = x;
    let sy = y;
    let sz = z;
    
    const cx = Math.cos(rotationX());
    const sxSin = Math.sin(rotationX());
    const tempY = sy * cx - sz * sxSin;
    sz = sy * sxSin + sz * cx;
    sy = tempY;
    
    const cy = Math.cos(rotationY());
    const sySin = Math.sin(rotationY());
    const tempX = sx * cy + sz * sySin;
    sz = -sx * sySin + sz * cy;
    sx = tempX;
    
    if (usePerspective()) {
      const scaleFactor = fov / (fov + sz * scale() * 50);
      return [center + sx * scale() * 50 * scaleFactor, center - sy * scale() * 50 * scaleFactor];
    } else {
      return [center + sx * scale() * 50, center - sy * scale() * 50];
    }
  }
  
  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    const gridSize = 3;
    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        const p1 = project([i, 0, j]);
        const p2 = project([i + 1, 0, j]);
        const p3 = project([i, 0, j + 1]);
        
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.stroke();
      }
    }
    
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    
    const origin = project([0, 0, 0]);
    const xEnd = project([3, 0, 0]);
    const yEnd = project([0, 3, 0]);
    const zEnd = project([0, 0, 3]);
    
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    ctx.lineTo(xEnd[0], xEnd[1]);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    ctx.lineTo(yEnd[0], yEnd[1]);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(origin[0], origin[1]);
    ctx.lineTo(zEnd[0], zEnd[1]);
    ctx.stroke();
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('x', xEnd[0], xEnd[1] + 15);
    ctx.fillText('y', yEnd[0], yEnd[1] - 10);
    ctx.fillText('z', zEnd[0] + 10, zEnd[1]);
  }
  
  function drawVector(ctx: CanvasRenderingContext2D, start: Vector3, end: Vector3, color: string, label: string) {
    const screenStart = project(start);
    const screenEnd = project(end);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenStart[0], screenStart[1]);
    ctx.lineTo(screenEnd[0], screenEnd[1]);
    ctx.stroke();
    
    const arrowSize = 10;
    const angle = Math.atan2(screenStart[1] - screenEnd[1], screenStart[0] - screenEnd[0]);
    ctx.beginPath();
    ctx.moveTo(screenEnd[0], screenEnd[1]);
    ctx.lineTo(
      screenEnd[0] + arrowSize * Math.cos(angle - Math.PI / 6),
      screenEnd[1] + arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(screenEnd[0], screenEnd[1]);
    ctx.lineTo(
      screenEnd[0] + arrowSize * Math.cos(angle + Math.PI / 6),
      screenEnd[1] + arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, screenEnd[0] + 10, screenEnd[1]);
  }
  
  function drawCube(ctx: CanvasRenderingContext2D, points: Vector3[], color: string, alpha: number = 1) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha;
    
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    edges.forEach(([i, j]) => {
      const p1 = project(points[i]);
      const p2 = project(points[j]);
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    });
    
    ctx.globalAlpha = 1;
  }
  
  function draw() {
    const canvas = canvasRef();
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    drawGrid(ctx);
    
    const t = animationProgress();
    
    const displayVectors = currentVectors().map((v, i) => 
      lerpVec3(v, transformedVectors()[i], t)
    );
    const displayCube = currentCube().map((p, i) => 
      lerpVec3(p, transformedCube()[i], t)
    );
    
    drawCube(ctx, displayCube, '#22c55e', 0.8);
    
    drawVector(ctx, [0, 0, 0], displayVectors[0], '#3b82f6', 'e₁');
    drawVector(ctx, [0, 0, 0], displayVectors[1], '#ef4444', 'e₂');
    drawVector(ctx, [0, 0, 0], displayVectors[2], '#22c55e', 'e₃');
  }
  
  function startAnimation() {
    isAnimatingLocal(true);
    animationProgress(0);
    
    const startCube = [...currentCube()];
    const startVectors = [...currentVectors()];
    
    const endCube = startCube.map(v => mat3MulVec3(props.matrix, v));
    const endVectors = startVectors.map(v => mat3MulVec3(props.matrix, v));
    
    transformedCube(endCube);
    transformedVectors(endVectors);
    
    const startTime = performance.now();
    const duration = 800;
    
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      const easeT = 1 - Math.pow(1 - t, 3);
      animationProgress(easeT);
      
      if (t < 1) {
        animationRef(requestAnimationFrame(animate));
      } else {
        currentCube(endCube);
        currentVectors(endVectors);
        isAnimatingLocal(false);
      }
    }
    
    animationRef(requestAnimationFrame(animate));
  }
  
  function handleMouseDown(e: MouseEvent) {
    isDragging(true);
    lastMouseX(e.clientX);
    lastMouseY(e.clientY);
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isDragging()) return;
    
    const deltaX = e.clientX - lastMouseX();
    const deltaY = e.clientY - lastMouseY();
    
    rotationY(rotationY() + deltaX * 0.01);
    rotationX(rotationX() + deltaY * 0.01);
    
    lastMouseX(e.clientX);
    lastMouseY(e.clientY);
  }
  
  function handleMouseUp() {
    isDragging(false);
  }
  
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scale(Math.max(0.3, Math.min(3, scale() * delta)));
  }
  
  onMount(() => {
    draw();
    const interval = setInterval(draw, 16);
    
    const canvas = canvasRef();
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    onCleanup(() => {
      clearInterval(interval);
      cancelAnimationFrame(animationRef());
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    });
  });
  
  if (props.isAnimating && !isAnimatingLocal()) {
    startAnimation();
  }
  
  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize}
        height={canvasSize}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          cursor: isDragging() ? 'grabbing' : 'grab',
        }}
      />
      <button
        onClick={() => usePerspective(!usePerspective())}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          padding: '5px 10px',
          backgroundColor: usePerspective() ? '#3b82f6' : '#6b7280',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        {usePerspective() ? '透视投影' : '正交投影'}
      </button>
    </div>
  );
}
