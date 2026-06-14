import { createSignal, createMemo, onMount } from 'solid-js';
import type { Matrix2, Vector2 } from '../utils/math';
import { mat2MulMat2, det2, transpose2, isOrthogonal2, isDiagonal2, normalize } from '../utils/math';

interface AnalysisResult {
  compositeMatrix: Matrix2;
  determinant: number;
  trace: number;
  eigenvalues: { lambda1: number; lambda2: number; isComplex: boolean };
  eigenvectors: { v1: Vector2 | null; v2: Vector2 | null };
  geometricType: string;
  ellipse: {
    majorAxis: number;
    minorAxis: number;
    angle: number;
  };
}

function parseScriptToMatrices(script: string): { matrices: Matrix2[]; errors: string[] } {
  const matrices: Matrix2[] = [];
  const errors: string[] = [];
  const lines = script.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) return;
    if (trimmed === 'reset') return;

    const rotateMatch = trimmed.match(/^rotate\s*\(\s*([\d.-]+)\s*\)$/);
    if (rotateMatch) {
      const angle = parseFloat(rotateMatch[1]);
      if (isNaN(angle)) {
        errors.push(`第${lineNum}行: rotate参数必须是数字`);
      } else {
        const rad = (angle * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        matrices.push([c, -s, s, c]);
      }
      return;
    }

    const scaleMatch = trimmed.match(/^scale\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/);
    if (scaleMatch) {
      const x = parseFloat(scaleMatch[1]);
      const y = parseFloat(scaleMatch[2]);
      if (isNaN(x) || isNaN(y)) {
        errors.push(`第${lineNum}行: scale参数必须是数字`);
      } else {
        matrices.push([x, 0, 0, y]);
      }
      return;
    }

    const shearMatch = trimmed.match(/^shear\s*\(\s*(h|v)\s*,\s*([\d.-]+)\s*\)$/);
    if (shearMatch) {
      const direction = shearMatch[1];
      const amount = parseFloat(shearMatch[2]);
      if (isNaN(amount)) {
        errors.push(`第${lineNum}行: shear量必须是数字`);
      } else {
        matrices.push(direction === 'h' ? [1, amount, 0, 1] : [1, 0, amount, 1]);
      }
      return;
    }

    const reflectMatch = trimmed.match(/^reflect\s*\(\s*(x|y)\s*\)$/);
    if (reflectMatch) {
      const axis = reflectMatch[1];
      matrices.push(axis === 'x' ? [1, 0, 0, -1] : [-1, 0, 0, 1]);
      return;
    }

    const matrixMatch = trimmed.match(/^matrix\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/);
    if (matrixMatch) {
      const a = parseFloat(matrixMatch[1]);
      const b = parseFloat(matrixMatch[2]);
      const c = parseFloat(matrixMatch[3]);
      const d = parseFloat(matrixMatch[4]);
      if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) {
        errors.push(`第${lineNum}行: matrix参数必须是数字`);
      } else {
        matrices.push([a, b, c, d]);
      }
      return;
    }

    if (trimmed.startsWith('wait(')) return;
    errors.push(`第${lineNum}行: 无效的指令格式`);
  });

  return { matrices, errors };
}

function computeCompositeMatrix(matrices: Matrix2[]): Matrix2 {
  if (matrices.length === 0) return [1, 0, 0, 1];
  let result = matrices[0];
  for (let i = 1; i < matrices.length; i++) {
    result = mat2MulMat2(result, matrices[i]);
  }
  return result;
}

function computeEigenvalues(m: Matrix2): { lambda1: number; lambda2: number; isComplex: boolean } {
  const trace = m[0] + m[3];
  const det = det2(m);
  const discriminant = trace * trace - 4 * det;

  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    return {
      lambda1: (trace + sqrtD) / 2,
      lambda2: (trace - sqrtD) / 2,
      isComplex: false
    };
  } else {
    const realPart = trace / 2;
    const imagPart = Math.sqrt(-discriminant) / 2;
    return {
      lambda1: realPart,
      lambda2: imagPart,
      isComplex: true
    };
  }
}

function computeEigenvector(m: Matrix2, lambda: number): Vector2 | null {
  const eps = 1e-10;
  const a = m[0] - lambda;
  const b = m[1];
  const c = m[2];
  const d = m[3] - lambda;

  if (Math.abs(a) > eps || Math.abs(b) > eps) {
    if (Math.abs(a) < eps) return normalize([1, 0]);
    return normalize([-b / a, 1]);
  } else if (Math.abs(c) > eps || Math.abs(d) > eps) {
    if (Math.abs(c) < eps) return normalize([1, 0]);
    return normalize([-d / c, 1]);
  }
  return normalize([1, 0]);
}

function classifyGeometricType(m: Matrix2): string {
  const eps = 1e-6;
  const det = det2(m);
  const orthogonal = isOrthogonal2(m);
  const diagonal = isDiagonal2(m);

  if (orthogonal) {
    if (Math.abs(det - 1) < eps) return '纯旋转';
    if (Math.abs(det + 1) < eps) return '反射';
  }

  if (diagonal) {
    return '纯缩放';
  }

  const isUpperTriangular = Math.abs(m[2]) < eps && Math.abs(m[0] - 1) < eps && Math.abs(m[3] - 1) < eps && Math.abs(m[1]) > eps;
  const isLowerTriangular = Math.abs(m[1]) < eps && Math.abs(m[0] - 1) < eps && Math.abs(m[3] - 1) < eps && Math.abs(m[2]) > eps;
  if (isUpperTriangular || isLowerTriangular) {
    return '剪切';
  }

  if (orthogonal) {
    return '带缩放的旋转';
  }

  return '一般线性变换';
}

function computeSVD(m: Matrix2): { majorAxis: number; minorAxis: number; angle: number } {
  const mt = transpose2(m);
  const mtm = mat2MulMat2(mt, m);

  const a = mtm[0];
  const b = mtm[1];
  const c = mtm[2];
  const d = mtm[3];

  const trace = a + d;
  const det = a * d - b * c;
  const discriminant = trace * trace - 4 * det;

  let lambda1, lambda2;
  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    lambda1 = (trace + sqrtD) / 2;
    lambda2 = (trace - sqrtD) / 2;
  } else {
    lambda1 = trace / 2;
    lambda2 = trace / 2;
  }

  const sigma1 = Math.sqrt(Math.max(lambda1, 0));
  const sigma2 = Math.sqrt(Math.max(lambda2, 0));

  const majorAxis = Math.max(sigma1, sigma2);
  const minorAxis = Math.min(sigma1, sigma2);

  let angle = 0;
  if (Math.abs(b) > 1e-10) {
    angle = Math.atan2(b, a) / 2;
  } else if (Math.abs(c) > 1e-10) {
    angle = Math.atan2(-c, d) / 2;
  }

  return {
    majorAxis,
    minorAxis,
    angle: (angle * 180) / Math.PI
  };
}

function analyzeComposite(m: Matrix2): AnalysisResult {
  const determinant = det2(m);
  const trace = m[0] + m[3];
  const eigenvalues = computeEigenvalues(m);

  let v1: Vector2 | null = null;
  let v2: Vector2 | null = null;

  if (!eigenvalues.isComplex) {
    v1 = computeEigenvector(m, eigenvalues.lambda1);
    v2 = computeEigenvector(m, eigenvalues.lambda2);
  }

  const geometricType = classifyGeometricType(m);
  const ellipse = computeSVD(m);

  return {
    compositeMatrix: m,
    determinant,
    trace,
    eigenvalues,
    eigenvectors: { v1, v2 },
    geometricType,
    ellipse
  };
}

function EllipseCanvas(props: { analysis: AnalysisResult | null }) {
  let canvasRef: HTMLCanvasElement | undefined;
  const size = 200;
  const center = size / 2;
  const scale = 80;

  function draw() {
    if (!canvasRef) return;
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(size, center);
    ctx.moveTo(center, 0);
    ctx.lineTo(center, size);
    ctx.stroke();

    if (!props.analysis) return;

    const m = props.analysis.compositeMatrix;
    const { majorAxis, minorAxis, angle } = props.analysis.ellipse;

    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((angle * Math.PI) / 180);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, majorAxis * scale / 2, minorAxis * scale / 2, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-majorAxis * scale / 2, 0);
    ctx.lineTo(majorAxis * scale / 2, 0);
    ctx.stroke();

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -minorAxis * scale / 2);
    ctx.lineTo(0, minorAxis * scale / 2);
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = '#374151';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`长轴: ${majorAxis.toFixed(2)}`, center, 12);
    ctx.fillText(`短轴: ${minorAxis.toFixed(2)}`, center, 24);
    ctx.fillText(`角度: ${angle.toFixed(1)}°`, center, 36);
  }

  onMount(() => {
    draw();
  });

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          backgroundColor: '#ffffff'
        }}
      />
    </div>
  );
}

export function TransformCompositionAnalysis(props: { script: string }) {
  const [analysis, setAnalysis] = createSignal<AnalysisResult | null>(null);
  const [parseErrors, setParseErrors] = createSignal<string[]>([]);
  const [showPanel, setShowPanel] = createSignal(false);

  function handleAnalyze() {
    const { matrices, errors } = parseScriptToMatrices(props.script);
    setParseErrors(errors);

    if (matrices.length === 0) {
      setAnalysis(null);
      setShowPanel(true);
      return;
    }

    const composite = computeCompositeMatrix(matrices);
    const result = analyzeComposite(composite);
    setAnalysis(result);
    setShowPanel(true);
  }

  const eigenvaluesDisplay = createMemo(() => {
    const a = analysis();
    if (!a) return '';
    if (a.eigenvalues.isComplex) {
      const real = a.eigenvalues.lambda1.toFixed(4);
      const imag = a.eigenvalues.lambda2.toFixed(4);
      return `${real} ± ${imag}i`;
    }
    return `λ₁=${a.eigenvalues.lambda1.toFixed(4)}, λ₂=${a.eigenvalues.lambda2.toFixed(4)}`;
  });

  const eigenvectorsDisplay = createMemo(() => {
    const a = analysis();
    if (!a || !a.eigenvectors.v1 || !a.eigenvectors.v2) return '';
    const v1 = a.eigenvectors.v1;
    const v2 = a.eigenvectors.v2;
    return `v₁=(${v1[0].toFixed(4)}, ${v1[1].toFixed(4)}), v₂=(${v2[0].toFixed(4)}, ${v2[1].toFixed(4)})`;
  });

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
        变换组合分析
      </h3>

      <button
        onClick={handleAnalyze}
        style={{
          padding: '10px 20px',
          backgroundColor: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        分析变换链
      </button>

      {showPanel() && (
        <>
          {parseErrors().length > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              backgroundColor: '#fef2f2',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#dc2626',
            }}>
              {parseErrors().map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          {!analysis() && parseErrors().length === 0 && (
            <div style={{
              marginTop: '12px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
            }}>
              无有效变换指令
            </div>
          )}

          {analysis() && (
            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '24px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    复合矩阵
                  </h4>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#374151' }}>
                    <div>[{analysis()!.compositeMatrix[0].toFixed(4)}, {analysis()!.compositeMatrix[1].toFixed(4)}]</div>
                    <div>[{analysis()!.compositeMatrix[2].toFixed(4)}, {analysis()!.compositeMatrix[3].toFixed(4)}]</div>
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                    行列式: {analysis()!.determinant.toFixed(4)}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    特征值
                  </h4>
                  <div style={{ fontFamily: 'monospace', fontSize: '14px', color: '#374151' }}>
                    {eigenvaluesDisplay()}
                  </div>
                  {analysis()!.eigenvectors.v1 && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#6b7280' }}>
                      特征向量: {eigenvectorsDisplay()}
                    </div>
                  )}
                </div>

                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '12px',
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    几何类型
                  </h4>
                  <div style={{
                    display: 'inline-block',
                    padding: '4px 12px',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}>
                    {analysis()!.geometricType}
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    单位圆变换结果 (椭圆参数)
                  </h4>
                  <div style={{ fontSize: '13px', color: '#374151' }}>
                    <div>长轴长度: {analysis()!.ellipse.majorAxis.toFixed(4)}</div>
                    <div>短轴长度: {analysis()!.ellipse.minorAxis.toFixed(4)}</div>
                    <div>长轴方向: {analysis()!.ellipse.angle.toFixed(2)}°</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  椭圆可视化
                </h4>
                <EllipseCanvas analysis={analysis()} />
                <div style={{
                  marginTop: '8px',
                  display: 'flex',
                  gap: '16px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '2px', backgroundColor: '#f97316' }} />
                    <span>长轴</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '2px', height: '16px', backgroundColor: '#a855f7' }} />
                    <span>短轴</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
