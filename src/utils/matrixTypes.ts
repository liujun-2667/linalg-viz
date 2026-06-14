import type { Matrix2, Matrix3 } from './math';
import { det2, det3, isOrthogonal2, isOrthogonal3, isDiagonal2, isDiagonal3, isShear2, isIdempotent2, isIdempotent3, mat2MulMat2, mat3MulMat3 } from './math';

export interface MatrixInfo {
  types: string[];
  det: number;
  isSingular: boolean;
}

function isIdentity2(m: Matrix2): boolean {
  const eps = 1e-10;
  return Math.abs(m[0] - 1) < eps && Math.abs(m[1]) < eps &&
         Math.abs(m[2]) < eps && Math.abs(m[3] - 1) < eps;
}

function isIdentity3(m: Matrix3): boolean {
  const eps = 1e-10;
  return Math.abs(m[0] - 1) < eps && Math.abs(m[1]) < eps && Math.abs(m[2]) < eps &&
         Math.abs(m[3]) < eps && Math.abs(m[4] - 1) < eps && Math.abs(m[5]) < eps &&
         Math.abs(m[6]) < eps && Math.abs(m[7]) < eps && Math.abs(m[8] - 1) < eps;
}

function isPureRotation2(m: Matrix2): boolean {
  const eps = 1e-10;
  if (!isOrthogonal2(m)) return false;
  if (Math.abs(det2(m) - 1) > eps) return false;
  // 纯旋转矩阵的对角线元素相等，符号相同
  const trace = m[0] + m[3];
  if (Math.abs(m[0] - m[3]) > eps) return false;
  if (trace < -2 - eps) return false; // 不允许180度旋转（那是反射）
  return true;
}

function isPureReflection2(m: Matrix2): boolean {
  const eps = 1e-10;
  if (!isOrthogonal2(m)) return false;
  return Math.abs(det2(m) + 1) < eps;
}

function isPureScaling2(m: Matrix2): boolean {
  const eps = 1e-10;
  // 纯缩放：对角矩阵且行列式等于对角线元素乘积
  if (!isDiagonal2(m)) return false;
  // 确保不是单位矩阵的缩放（那是旋转）
  if (isIdentity2(m)) return false;
  return true;
}

function isPureShear2(m: Matrix2): boolean {
  const eps = 1e-10;
  return isShear2(m) && !isIdentity2(m);
}

function isPureProjection2(m: Matrix2): boolean {
  const eps = 1e-10;
  if (!isIdempotent2(m)) return false;
  if (isIdentity2(m)) return false;
  // 投影矩阵行列式为0或1
  const det = det2(m);
  return Math.abs(det) < eps || Math.abs(det - 1) < eps;
}

export function analyzeMatrix2(m: Matrix2): MatrixInfo {
  const types: string[] = [];
  const det = det2(m);
  const isSingular = Math.abs(det) < 1e-10;
  
  // 检查各种类型，使用更严格的分类
  if (isPureRotation2(m)) {
    types.push('旋转矩阵');
  }
  
  if (isPureReflection2(m)) {
    types.push('反射矩阵');
  }
  
  if (isPureScaling2(m)) {
    types.push('缩放矩阵');
  }
  
  if (isPureShear2(m)) {
    types.push('剪切矩阵');
  }
  
  if (isPureProjection2(m)) {
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
  
  if (isDiagonal3(m) && !isIdentity3(m)) {
    types.push('缩放矩阵');
  }
  
  if (isIdempotent3(m) && !isIdentity3(m)) {
    const det3Val = det3(m);
    if (Math.abs(det3Val) < 1e-10 || Math.abs(det3Val - 1) < 1e-10) {
      types.push('投影矩阵');
    }
  }
  
  if (isSingular) {
    types.push('奇异矩阵');
  }
  
  return { types, det, isSingular };
}
