import { createSignal } from 'solid-js';
import type { Matrix2 } from '../utils/math';
import { mat2MulMat2, det2, eigenvalues2, eigenvector2, normalize } from '../utils/math';

interface MatrixDecompositionProps {
  matrix: Matrix2;
  onApplyMatrix: (matrix: Matrix2) => void;
}

export function MatrixDecomposition(props: MatrixDecompositionProps) {
  const [currentStep, setCurrentStep] = createSignal(0);
  const [decompositionType, setDecompositionType] = createSignal<'svd' | 'eigen'>('svd');
  const [isAnimating, setIsAnimating] = createSignal(false);
  
  const steps = [
    { name: '原始状态', matrix: [1, 0, 0, 1] as Matrix2 },
    { name: '第一步', matrix: [1, 0, 0, 1] as Matrix2 },
    { name: '第二步', matrix: [1, 0, 0, 1] as Matrix2 },
    { name: '第三步', matrix: [1, 0, 0, 1] as Matrix2 },
  ];
  
  function computeSVD(m: Matrix2) {
    const det = det2(m);
    const trace = m[0] + m[3];
    const discriminant = trace * trace - 4 * det;
    
    if (discriminant < 0) {
      const theta = Math.acos(Math.max(-1, Math.min(1, trace / 2 / Math.sqrt(Math.abs(det)))));
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const U: Matrix2 = [c, -s, s, c];
      const S: Matrix2 = [Math.sqrt(Math.abs(det)), 0, 0, Math.sqrt(Math.abs(det))];
      const V: Matrix2 = [c, s, -s, c];
      return { U, S, V };
    } else {
      const sqrtD = Math.sqrt(discriminant);
      const lambda1 = (trace + sqrtD) / 2;
      const lambda2 = (trace - sqrtD) / 2;
      
      const v1 = eigenvector2(m, lambda1);
      const v2 = eigenvector2(m, lambda2);
      
      if (!v1 || !v2) {
        return { U: [1, 0, 0, 1] as Matrix2, S: [1, 0, 0, 1] as Matrix2, V: [1, 0, 0, 1] as Matrix2 };
      }
      
      const n1 = normalize(v1);
      const n2 = normalize(v2);
      
      const U: Matrix2 = [n1[0], n2[0], n1[1], n2[1]];
      const S: Matrix2 = [Math.abs(lambda1), 0, 0, Math.abs(lambda2)];
      const V: Matrix2 = [n1[0], n2[0], n1[1], n2[1]];
      
      return { U, S, V };
    }
  }
  
  function computeEigenDecomposition(m: Matrix2) {
    const evals = eigenvalues2(m);
    const v1 = eigenvector2(m, evals[0]);
    const v2 = eigenvector2(m, evals[1]);
    
    if (!v1 || !v2) {
      return { P: [1, 0, 0, 1] as Matrix2, D: [1, 0, 0, 1] as Matrix2, Pinv: [1, 0, 0, 1] as Matrix2 };
    }
    
    const n1 = normalize(v1);
    const n2 = normalize(v2);
    
    const P: Matrix2 = [n1[0], n2[0], n1[1], n2[1]];
    const D: Matrix2 = [evals[0], 0, 0, evals[1]];
    const detP = det2(P);
    const Pinv: Matrix2 = detP !== 0 
      ? [P[3] / detP, -P[1] / detP, -P[2] / detP, P[0] / detP]
      : [1, 0, 0, 1];
    
    return { P, D, Pinv };
  }
  
  function startDecomposition() {
    setIsAnimating(true);
    setCurrentStep(0);
    
    let decomp;
    if (decompositionType() === 'svd') {
      decomp = computeSVD(props.matrix);
      steps[0].matrix = [1, 0, 0, 1];
      steps[1].matrix = decomp.V;
      steps[2].matrix = mat2MulMat2(decomp.S, decomp.V);
      steps[3].matrix = mat2MulMat2(mat2MulMat2(decomp.U, decomp.S), decomp.V);
    } else {
      decomp = computeEigenDecomposition(props.matrix);
      steps[0].matrix = [1, 0, 0, 1];
      steps[1].matrix = decomp.Pinv;
      steps[2].matrix = mat2MulMat2(decomp.D, decomp.Pinv);
      steps[3].matrix = mat2MulMat2(mat2MulMat2(decomp.P, decomp.D), decomp.Pinv);
    }
    
    setTimeout(() => {
      setCurrentStep(1);
      props.onApplyMatrix(steps[1].matrix);
      
      setTimeout(() => {
        setCurrentStep(2);
        props.onApplyMatrix(steps[2].matrix);
        
        setTimeout(() => {
          setCurrentStep(3);
          props.onApplyMatrix(steps[3].matrix);
          setIsAnimating(false);
        }, 1000);
      }, 1000);
    }, 500);
  }
  
  return (
    <div style={{ padding: '12px', "background-color": '#f9fafb', "border-radius": '8px' }}>
      <h3 style={{ "margin-bottom": '12px', "font-size": '14px', "font-weight": '600', color: '#374151' }}>
        矩阵分解可视化
      </h3>
      
      <div style={{ display: 'flex', gap: '8px', "margin-bottom": '12px' }}>
        <button
          onClick={() => setDecompositionType('svd')}
          style={{
            padding: '6px 12px',
            "background-color": decompositionType() === 'svd' ? '#3b82f6' : '#f3f4f6',
            color: decompositionType() === 'svd' ? 'white' : '#374151',
            border: 'none',
            "border-radius": '4px',
            "font-size": '12px',
            cursor: 'pointer',
          }}
        >
          SVD分解
        </button>
        <button
          onClick={() => setDecompositionType('eigen')}
          style={{
            padding: '6px 12px',
            "background-color": decompositionType() === 'eigen' ? '#3b82f6' : '#f3f4f6',
            color: decompositionType() === 'eigen' ? 'white' : '#374151',
            border: 'none',
            "border-radius": '4px',
            "font-size": '12px',
            cursor: 'pointer',
          }}
        >
          特征分解
        </button>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', "margin-bottom": '12px' }}>
        {steps.map((step, i) => (
          <div
            style={{
              flex: '1',
              padding: '8px',
              "background-color": currentStep() === i ? '#3b82f6' : '#e5e7eb',
              color: currentStep() === i ? 'white' : '#374151',
              "border-radius": '4px',
              "text-align": 'center',
              "font-size": '12px',
            }}
          >
            {step.name}
          </div>
        ))}
      </div>
      
      <button
        onClick={startDecomposition}
        disabled={isAnimating()}
        style={{
          width: '100%',
          padding: '10px',
          "background-color": '#10b981',
          color: 'white',
          border: 'none',
          "border-radius": '4px',
          "font-size": '14px',
          "font-weight": '600',
          cursor: isAnimating() ? 'not-allowed' : 'pointer',
          opacity: isAnimating() ? '0.5' : '1',
        }}
      >
        {isAnimating() ? '分解中...' : '开始分解'}
      </button>
    </div>
  );
}
