import type { Matrix2, Matrix3 } from './math';
import { det2, det3, isOrthogonal2, isOrthogonal3, isDiagonal2, isDiagonal3, isShear2, isIdempotent2, isIdempotent3 } from './math';

export interface MatrixInfo {
  types: string[];
  det: number;
  isSingular: boolean;
}

export function analyzeMatrix2(m: Matrix2): MatrixInfo {
  const types: string[] = [];
  const det = det2(m);
  const isSingular = Math.abs(det) < 1e-10;
  
  if (isOrthogonal2(m)) {
    if (Math.abs(det - 1) < 1e-10) {
      types.push('旋转矩阵');
    } else if (Math.abs(det + 1) < 1e-10) {
      types.push('反射矩阵');
    }
  }
  
  if (isShear2(m)) {
    types.push('剪切矩阵');
  }
  
  if (isDiagonal2(m)) {
    types.push('缩放矩阵');
  }
  
  if (isIdempotent2(m)) {
    types.push('投影矩阵');
  }
  
  if (isSingular) {
    types.push('奇异矩阵');
  }
  
  return { types, det, isSingular };
}

export function analyzeMatrix3(m: Matrix3): MatrixInfo {
  const types: string[] = [];
  const det = det3(m);
  const isSingular = Math.abs(det) < 1e-10;
  
  if (isOrthogonal3(m)) {
    if (Math.abs(det - 1) < 1e-10) {
      types.push('旋转矩阵');
    } else if (Math.abs(det + 1) < 1e-10) {
      types.push('反射矩阵');
    }
  }
  
  if (isDiagonal3(m)) {
    types.push('缩放矩阵');
  }
  
  if (isIdempotent3(m)) {
    types.push('投影矩阵');
  }
  
  if (isSingular) {
    types.push('奇异矩阵');
  }
  
  return { types, det, isSingular };
}
