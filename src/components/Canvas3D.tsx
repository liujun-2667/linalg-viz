import { onMount, onCleanup, createSignal, createEffect } from 'solid-js';
import type { Matrix3, Vector3 } from '../utils/math';
import { mat3MulVec3, lerpVec3 } from '../utils/math';

interface Canvas3DProps {
  matrix: Matrix3;
  isAnimating: boolean;
}

export function Canvas3D(props: Canvas3DProps) {
  let canvasEl: HTMLCanvasElement | undefined;
  const [animationRefId, setAnimationRefId] = createSignal(0);
  const [rotationX, setRotationX] = createSignal(0.5);
  const [rotationY, setRotationY] = createSignal(0.5);
  const [viewScale, setViewScale] = createSignal(1);
  const [usePerspective, setUsePerspective] = createSignal(true);
  const [isDragging, setIsDragging] = createSignal(false);
  const [lastMouseX, setLastMouseX] = createSignal(0);
  const [lastMouseY, setLastMouseY] = createSignal(0);
  
  const [currentCube, setCurrentCube] = createSignal<Vector3[]>([
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ]);
  const [currentVectors, setCurrentVectors] = createSignal<Vector3[]>([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  const [transformedCube, setTransformedCube] = createSignal<Vector3[]>([
    [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
    [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
  ]);
  const [transformedVectors, setTransformedVectors] = createSignal<Vector3[]>([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  const [animationProgress, setAnimationProgress] = createSignal(0);
  const [isAnimatingLocal, setIsAnimatingLocal] = createSignal(false);
  
  const canvasSize = 500;
  const center = canvasSize / 2;
  const fov = 300;
  
  function project(v: Vector3): [number, number] {
    let [sx, sy, sz] = v;
    
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
      const scaleFactor = fov / (fov + sz * viewScale() * 50);
      return [center + sx * viewScale() * 50 * scaleFactor, center - sy * viewScale() * 50 * scaleFactor];
    } else {
      return [center + sx * viewScale() * 50, center - sy * viewScale() * 50];
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
    const canvas = canvasEl;
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
    setIsAnimatingLocal(true);
    setAnimationProgress(0);
    
    const startCube = [...currentCube()];
    const startVectors = [...currentVectors()];
    
    const endCube = startCube.map(v => mat3MulVec3(props.matrix, v));
    const endVectors = startVectors.map(v => mat3MulVec3(props.matrix, v));
    
    setTransformedCube(endCube);
    setTransformedVectors(endVectors);
    
    const startTime = performance.now();
    const duration = 800;
    
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      const easeT = 1 - Math.pow(1 - t, 3);
      setAnimationProgress(easeT);
      
      if (t < 1) {
        setAnimationRefId(requestAnimationFrame(animate));
      } else {
        setCurrentCube(endCube);
        setCurrentVectors(endVectors);
        setIsAnimatingLocal(false);
      }
    }
    
    setAnimationRefId(requestAnimationFrame(animate));
  }
  
  function handleMouseDown(e: MouseEvent) {
    setIsDragging(true);
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (!isDragging()) return;
    
    const deltaX = e.clientX - lastMouseX();
    const deltaY = e.clientY - lastMouseY();
    
    setRotationY(rotationY() + deltaX * 0.01);
    setRotationX(rotationX() + deltaY * 0.01);
    
    setLastMouseX(e.clientX);
    setLastMouseY(e.clientY);
  }
  
  function handleMouseUp() {
    setIsDragging(false);
  }
  
  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setViewScale(Math.max(0.3, Math.min(3, viewScale() * delta)));
  }
  
  createEffect(() => {
    if (props.isAnimating && !isAnimatingLocal()) {
      startAnimation();
    }
  });
  
  onMount(() => {
    draw();
    const interval = setInterval(draw, 16);
    
    const canvas = canvasEl;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    onCleanup(() => {
      clearInterval(interval);
      cancelAnimationFrame(animationRefId());
      if (canvas) {
        canvas.removeEventListener('wheel', handleWheel);
      }
    });
  });
  
  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasEl}
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
        onClick={() => setUsePerspective(!usePerspective())}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
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
