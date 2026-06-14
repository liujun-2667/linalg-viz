import { onMount, onCleanup, createEffect, createSignal } from 'solid-js';
import type { Matrix2, Vector2 } from '../utils/math';
import { mat2MulVec2, lerpVec2, det2, eigenvalues2, eigenvector2, normalize } from '../utils/math';

interface Canvas2DProps {
  matrix: Matrix2;
  onApplyTransform: () => void;
  transformHistory: Matrix2[];
  customVectors: Vector2[];
  onAddVector: (v: Vector2) => void;
  onUpdateVector: (index: number, v: Vector2) => void;
  showEigenvectors: boolean;
  showNullSpace: boolean;
  isAnimating: boolean;
}

export function Canvas2D(props: Canvas2DProps) {
  let canvasEl: HTMLCanvasElement | undefined;
  const [animationRef, setAnimationRef] = createSignal(0);
  const [currentVectors, setCurrentVectors] = createSignal<Vector2[]>([[1, 0], [0, 1]]);
  const [currentSquare, setCurrentSquare] = createSignal<Vector2[]>([[0, 0], [1, 0], [1, 1], [0, 1]]);
  const [transformedVectors, setTransformedVectors] = createSignal<Vector2[]>([[1, 0], [0, 1]]);
  const [transformedSquare, setTransformedSquare] = createSignal<Vector2[]>([[0, 0], [1, 0], [1, 1], [0, 1]]);
  const [transformedCustomVectors, setTransformedCustomVectors] = createSignal<Vector2[]>([]);
  const [animationProgress, setAnimationProgress] = createSignal(0);
  const [isAnimatingLocal, setIsAnimatingLocal] = createSignal(false);
  const [draggingVector, setDraggingVector] = createSignal(-1);
  
  const gridSize = 5;
  const canvasSize = 500;
  const scale = canvasSize / (gridSize * 2);
  const center = canvasSize / 2;
  
  function toScreen(v: Vector2): Vector2 {
    return [center + v[0] * scale, center - v[1] * scale];
  }
  
  function fromScreen(screenX: number, screenY: number): Vector2 {
    return [(screenX - center) / scale, (center - screenY) / scale];
  }
  
  function drawGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    for (let i = -gridSize; i <= gridSize; i++) {
      const screenX = center + i * scale;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvasSize);
      ctx.stroke();
    }
    
    for (let i = -gridSize; i <= gridSize; i++) {
      const screenY = center - i * scale;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvasSize, screenY);
      ctx.stroke();
    }
    
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(canvasSize, center);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(center, 0);
    ctx.lineTo(center, canvasSize);
    ctx.stroke();
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = -gridSize; i <= gridSize; i++) {
      if (i !== 0) {
        const screenX = center + i * scale;
        ctx.fillText(i.toString(), screenX, center + 5);
      }
    }
    
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = -gridSize; i <= gridSize; i++) {
      if (i !== 0) {
        const screenY = center - i * scale;
        ctx.fillText(i.toString(), center + 5, screenY);
      }
    }
    
    ctx.fillStyle = '#374151';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('x', canvasSize - 15, center + 20);
    ctx.fillText('y', center - 20, 15);
  }
  
  function drawVector(ctx: CanvasRenderingContext2D, start: Vector2, end: Vector2, color: string, label: string, dashed = false) {
    const screenStart = toScreen(start);
    const screenEnd = toScreen(end);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash(dashed ? [5, 5] : []);
    ctx.beginPath();
    ctx.moveTo(screenStart[0], screenStart[1]);
    ctx.lineTo(screenEnd[0], screenEnd[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    const arrowSize = 12;
    const angle = Math.atan2(end[1] - start[1], end[0] - start[0]);
    ctx.beginPath();
    ctx.moveTo(screenEnd[0], screenEnd[1]);
    ctx.lineTo(
      screenEnd[0] - arrowSize * Math.cos(angle - Math.PI / 6),
      screenEnd[1] + arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(screenEnd[0], screenEnd[1]);
    ctx.lineTo(
      screenEnd[0] - arrowSize * Math.cos(angle + Math.PI / 6),
      screenEnd[1] + arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
    
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    const offsetX = end[0] > 0 ? 10 : -10;
    const offsetY = end[1] > 0 ? -10 : 10;
    ctx.fillText(label, screenEnd[0] + offsetX, screenEnd[1] + offsetY);
  }
  
  function drawSquare(ctx: CanvasRenderingContext2D, points: Vector2[], color: string, alpha: number = 1) {
    ctx.fillStyle = color.replace(')', `, ${alpha})`);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    points.forEach((point, i) => {
      const screenPoint = toScreen(point);
      if (i === 0) {
        ctx.moveTo(screenPoint[0], screenPoint[1]);
      } else {
        ctx.lineTo(screenPoint[0], screenPoint[1]);
      }
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  
  function drawCustomVectors(ctx: CanvasRenderingContext2D, vectors: Vector2[], color: string) {
    vectors.forEach((vec, i) => {
      const screenEnd = toScreen(vec);
      const screenStart = toScreen([0, 0]);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(screenStart[0], screenStart[1]);
      ctx.lineTo(screenEnd[0], screenEnd[1]);
      ctx.stroke();
      
      const arrowSize = 10;
      const angle = Math.atan2(vec[1], vec[0]);
      ctx.beginPath();
      ctx.moveTo(screenEnd[0], screenEnd[1]);
      ctx.lineTo(
        screenEnd[0] - arrowSize * Math.cos(angle - Math.PI / 6),
        screenEnd[1] + arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(screenEnd[0], screenEnd[1]);
      ctx.lineTo(
        screenEnd[0] - arrowSize * Math.cos(angle + Math.PI / 6),
        screenEnd[1] + arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      
      ctx.fillStyle = color;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`v${i+1}=(${vec[0].toFixed(2)}, ${vec[1].toFixed(2)})`, screenEnd[0], screenEnd[1] - 15);
    });
  }
  
  function drawNullSpace(ctx: CanvasRenderingContext2D) {
    const det = det2(props.matrix);
    if (Math.abs(det) > 1e-10) return;
    
    const a = props.matrix[0];
    const b = props.matrix[1];
    
    let direction: Vector2;
    if (Math.abs(a) > Math.abs(b)) {
      direction = [-b / a, 1];
    } else if (Math.abs(b) > 1e-10) {
      direction = [1, -a / b];
    } else {
      direction = [1, 0];
    }
    
    const len = Math.sqrt(direction[0] ** 2 + direction[1] ** 2);
    direction = [direction[0] / len * gridSize * 1.5, direction[1] / len * gridSize * 1.5];
    
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    const start = toScreen([-direction[0], -direction[1]]);
    const end = toScreen(direction);
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    ctx.setLineDash([]);
    
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('零空间', end[0] + 10, end[1]);
  }
  
  function drawEigenvectors(ctx: CanvasRenderingContext2D) {
    if (!props.showEigenvectors) return;
    
    const evals = eigenvalues2(props.matrix);
    
    evals.forEach((lambda, i) => {
      const vec = eigenvector2(props.matrix, lambda);
      if (!vec) return;
      
      const normalized = normalize(vec);
      const scaled: Vector2 = [normalized[0] * 2, normalized[1] * 2];
      
      const color = i === 0 ? '#8b5cf6' : '#f59e0b';
      drawVector(ctx, [0, 0], scaled, color, `λ${i+1}=${lambda.toFixed(2)}`, false);
    });
  }
  
  function draw() {
    const canvas = canvasEl;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    drawGrid(ctx);
    
    if (props.showNullSpace) {
      drawNullSpace(ctx);
    }
    
    drawEigenvectors(ctx);
    
    const t = animationProgress();
    
    const displayVectors = currentVectors().map((v, i) => 
      lerpVec2(v, transformedVectors()[i], t)
    );
    const displaySquare = currentSquare().map((p, i) => 
      lerpVec2(p, transformedSquare()[i], t)
    );
    const displayCustomVectors = props.customVectors.map((v, i) => 
      lerpVec2(v, transformedCustomVectors()[i] || v, t)
    );
    
    drawSquare(ctx, displaySquare, 'rgba(34, 197, 94, 0.3)', 0.5);
    
    drawVector(ctx, [0, 0], displayVectors[0], '#3b82f6', 'e₁');
    drawVector(ctx, [0, 0], displayVectors[1], '#ef4444', 'e₂');
    
    drawCustomVectors(ctx, displayCustomVectors, '#f59e0b');
    
    props.transformHistory.slice(-4).forEach((_, idx) => {
      const alpha = (idx + 1) / 4 * 0.3;
      const prevVectors = props.transformHistory.slice(0, idx + 1).reduce(
        (acc, m) => acc.map(v => mat2MulVec2(m, v)),
        [[1, 0] as Vector2, [0, 1] as Vector2]
      );
      const prevSquare = [[0, 0], [1, 0], [1, 1], [0, 1]].map(v => 
        props.transformHistory.slice(0, idx + 1).reduce(
          (acc, m) => mat2MulVec2(m, acc),
          v as Vector2
        )
      );
      
      drawSquare(ctx, prevSquare, `rgba(156, 163, 175, ${alpha})`, alpha);
      drawVector(ctx, [0, 0], prevVectors[0], `rgba(59, 130, 246, ${alpha})`, '', false);
      drawVector(ctx, [0, 0], prevVectors[1], `rgba(239, 68, 68, ${alpha})`, '', false);
    });
  }
  
  function startAnimation() {
    setIsAnimatingLocal(true);
    setAnimationProgress(0);
    
    const startVectors = [...currentVectors()];
    const startSquare = [...currentSquare()];
    const startCustomVectors = [...props.customVectors];
    
    const endVectors = startVectors.map(v => mat2MulVec2(props.matrix, v));
    const endSquare = startSquare.map(v => mat2MulVec2(props.matrix, v));
    const endCustomVectors = startCustomVectors.map(v => mat2MulVec2(props.matrix, v));
    
    setTransformedVectors(endVectors);
    setTransformedSquare(endSquare);
    setTransformedCustomVectors(endCustomVectors);
    
    const startTime = performance.now();
    const duration = 800;
    
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const t = Math.min(elapsed / duration, 1);
      
      const easeT = 1 - Math.pow(1 - t, 3);
      setAnimationProgress(easeT);
      
      if (t < 1) {
        setAnimationRef(requestAnimationFrame(animate));
      } else {
        setCurrentVectors(endVectors);
        setCurrentSquare(endSquare);
        setIsAnimatingLocal(false);
        props.onApplyTransform();
      }
    }
    
    setAnimationRef(requestAnimationFrame(animate));
  }
  
  function handleClick(e: MouseEvent) {
    const canvas = canvasEl;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const vec = fromScreen(x, y);
    
    if (props.customVectors.length < 8) {
      props.onAddVector(vec);
    }
  }
  
  function handleMouseDown(e: MouseEvent) {
    const canvas = canvasEl;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickPos = fromScreen(x, y);
    
    props.customVectors.forEach((vec, i) => {
      const dist = Math.sqrt((vec[0] - clickPos[0]) ** 2 + (vec[1] - clickPos[1]) ** 2);
      if (dist < 0.3) {
        setDraggingVector(i);
      }
    });
  }
  
  function handleMouseMove(e: MouseEvent) {
    if (draggingVector() === -1) return;
    
    const canvas = canvasEl;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const vec = fromScreen(x, y);
    
    props.onUpdateVector(draggingVector(), vec);
  }
  
  function handleMouseUp() {
    setDraggingVector(-1);
  }
  
  createEffect(() => {
    if (props.isAnimating && !isAnimatingLocal()) {
      startAnimation();
    }
  });
  
  onMount(() => {
    draw();
    const interval = setInterval(draw, 16);
    onCleanup(() => {
      clearInterval(interval);
      cancelAnimationFrame(animationRef());
    });
  });
  
  return (
    <canvas
      ref={canvasEl}
      width={canvasSize}
      height={canvasSize}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'crosshair',
      }}
    />
  );
}
