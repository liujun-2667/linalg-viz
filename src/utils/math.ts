export type Vector2 = [number, number];
export type Vector3 = [number, number, number];
export type Matrix2 = [number, number, number, number];
export type Matrix3 = [number, number, number, number, number, number, number, number, number];

export function mat2MulVec2(m: Matrix2, v: Vector2): Vector2 {
  return [
    m[0] * v[0] + m[1] * v[1],
    m[2] * v[0] + m[3] * v[1],
  ];
}

export function mat3MulVec3(m: Matrix3, v: Vector3): Vector3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

export function mat2MulMat2(a: Matrix2, b: Matrix2): Matrix2 {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
}

export function mat3MulMat3(a: Matrix3, b: Matrix3): Matrix3 {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  ];
}

export function det2(m: Matrix2): number {
  return m[0] * m[3] - m[1] * m[2];
}

export function det3(m: Matrix3): number {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  );
}

export function transpose2(m: Matrix2): Matrix2 {
  return [m[0], m[2], m[1], m[3]];
}

export function transpose3(m: Matrix3): Matrix3 {
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function isOrthogonal2(m: Matrix2): boolean {
  const eps = 1e-6;
  const t = transpose2(m);
  const identity = mat2MulMat2(m, t);
  return (
    Math.abs(identity[0] - 1) < eps &&
    Math.abs(identity[1]) < eps &&
    Math.abs(identity[2]) < eps &&
    Math.abs(identity[3] - 1) < eps
  );
}

export function isOrthogonal3(m: Matrix3): boolean {
  const eps = 1e-6;
  const t = transpose3(m);
  const identity = mat3MulMat3(m, t);
  return (
    Math.abs(identity[0] - 1) < eps &&
    Math.abs(identity[1]) < eps &&
    Math.abs(identity[2]) < eps &&
    Math.abs(identity[3]) < eps &&
    Math.abs(identity[4] - 1) < eps &&
    Math.abs(identity[5]) < eps &&
    Math.abs(identity[6]) < eps &&
    Math.abs(identity[7]) < eps &&
    Math.abs(identity[8] - 1) < eps
  );
}

export function isDiagonal2(m: Matrix2): boolean {
  const eps = 1e-6;
  return Math.abs(m[1]) < eps && Math.abs(m[2]) < eps;
}

export function isDiagonal3(m: Matrix3): boolean {
  const eps = 1e-6;
  return (
    Math.abs(m[1]) < eps &&
    Math.abs(m[2]) < eps &&
    Math.abs(m[3]) < eps &&
    Math.abs(m[5]) < eps &&
    Math.abs(m[6]) < eps &&
    Math.abs(m[7]) < eps
  );
}

export function isShear2(m: Matrix2): boolean {
  const eps = 1e-6;
  return (
    Math.abs(m[0] - 1) < eps &&
    Math.abs(m[3] - 1) < eps &&
    ((Math.abs(m[1]) > eps && Math.abs(m[2]) < eps) ||
      (Math.abs(m[2]) > eps && Math.abs(m[1]) < eps))
  );
}

export function isIdempotent2(m: Matrix2): boolean {
  const eps = 1e-6;
  const m2 = mat2MulMat2(m, m);
  return (
    Math.abs(m2[0] - m[0]) < eps &&
    Math.abs(m2[1] - m[1]) < eps &&
    Math.abs(m2[2] - m[2]) < eps &&
    Math.abs(m2[3] - m[3]) < eps
  );
}

export function isIdempotent3(m: Matrix3): boolean {
  const eps = 1e-6;
  const m2 = mat3MulMat3(m, m);
  return (
    Math.abs(m2[0] - m[0]) < eps &&
    Math.abs(m2[1] - m[1]) < eps &&
    Math.abs(m2[2] - m[2]) < eps &&
    Math.abs(m2[3] - m[3]) < eps &&
    Math.abs(m2[4] - m[4]) < eps &&
    Math.abs(m2[5] - m[5]) < eps &&
    Math.abs(m2[6] - m[6]) < eps &&
    Math.abs(m2[7] - m[7]) < eps &&
    Math.abs(m2[8] - m[8]) < eps
  );
}

export function solveLinearSystem2(a: Matrix2, b: Vector2): Vector2 | null {
  const d = det2(a);
  if (Math.abs(d) < 1e-10) return null;
  const invD = 1 / d;
  return [
    invD * (a[3] * b[0] - a[1] * b[1]),
    invD * (-a[2] * b[0] + a[0] * b[1]),
  ];
}

export function eigenvalues2(m: Matrix2): [number, number] {
  const trace = m[0] + m[3];
  const det = det2(m);
  const discriminant = trace * trace - 4 * det;
  if (discriminant >= 0) {
    const sqrtD = Math.sqrt(discriminant);
    return [(trace + sqrtD) / 2, (trace - sqrtD) / 2];
  }
  return [trace / 2, trace / 2];
}

export function eigenvector2(m: Matrix2, lambda: number): Vector2 | null {
  const eps = 1e-10;
  const a = m[0] - lambda;
  const b = m[1];
  const c = m[2];
  const d = m[3] - lambda;
  
  if (Math.abs(a) > eps || Math.abs(b) > eps) {
    if (Math.abs(a) < eps) return [1, 0];
    return [-b / a, 1];
  } else if (Math.abs(c) > eps || Math.abs(d) > eps) {
    if (Math.abs(c) < eps) return [1, 0];
    return [-d / c, 1];
  }
  return [1, 0];
}

export function normalize(v: Vector2): Vector2 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
  if (len < 1e-10) return [1, 0];
  return [v[0] / len, v[1] / len];
}

export function normalize3(v: Vector3): Vector3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 1e-10) return [1, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function cross3(a: Vector3, b: Vector3): Vector3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function dot3(a: Vector3, b: Vector3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(a: Vector2, b: Vector2, t: number): Vector2 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

export function lerpVec3(a: Vector3, b: Vector3, t: number): Vector3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function rotateVec2(v: Vector2, angle: number): Vector2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

export function rotate3D(v: Vector3, axis: Vector3, angle: number): Vector3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const [x, y, z] = axis;
  
  const m: Matrix3 = [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
  return mat3MulVec3(m, v);
}
