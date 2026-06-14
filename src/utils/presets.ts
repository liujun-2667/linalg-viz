import type { Matrix2, Matrix3 } from './math';

export interface Preset {
  name: string;
  matrix: Matrix2 | Matrix3;
  description: string;
}

export const presets2D: Preset[] = [
  {
    name: '90度旋转',
    matrix: [0, -1, 1, 0] as Matrix2,
    description: '将图形绕原点逆时针旋转90度',
  },
  {
    name: '45度旋转',
    matrix: [Math.cos(Math.PI / 4), -Math.sin(Math.PI / 4), Math.sin(Math.PI / 4), Math.cos(Math.PI / 4)] as Matrix2,
    description: '将图形绕原点逆时针旋转45度',
  },
  {
    name: 'X轴反射',
    matrix: [1, 0, 0, -1] as Matrix2,
    description: '将图形关于X轴对称翻转',
  },
  {
    name: 'Y轴反射',
    matrix: [-1, 0, 0, 1] as Matrix2,
    description: '将图形关于Y轴对称翻转',
  },
  {
    name: '水平剪切',
    matrix: [1, 0.5, 0, 1] as Matrix2,
    description: '沿水平方向剪切变形',
  },
  {
    name: '垂直剪切',
    matrix: [1, 0, 0.5, 1] as Matrix2,
    description: '沿垂直方向剪切变形',
  },
  {
    name: '等比缩放2倍',
    matrix: [2, 0, 0, 2] as Matrix2,
    description: '在X和Y方向同时放大2倍',
  },
  {
    name: 'X方向拉伸3倍',
    matrix: [3, 0, 0, 1] as Matrix2,
    description: '仅在X方向拉伸3倍',
  },
  {
    name: '投影到X轴',
    matrix: [1, 0, 0, 0] as Matrix2,
    description: '将所有点投影到X轴上',
  },
  {
    name: '投影到y=x',
    matrix: [0.5, 0.5, 0.5, 0.5] as Matrix2,
    description: '将所有点投影到直线y=x上',
  },
];

export const presets3D: Preset[] = [
  {
    name: 'X轴旋转90度',
    matrix: [1, 0, 0, 0, 0, -1, 0, 1, 0] as Matrix3,
    description: '绕X轴逆时针旋转90度',
  },
  {
    name: 'Y轴旋转90度',
    matrix: [0, 0, 1, 0, 1, 0, -1, 0, 0] as Matrix3,
    description: '绕Y轴逆时针旋转90度',
  },
  {
    name: 'Z轴旋转90度',
    matrix: [0, -1, 0, 1, 0, 0, 0, 0, 1] as Matrix3,
    description: '绕Z轴逆时针旋转90度',
  },
  {
    name: '等比缩放2倍',
    matrix: [2, 0, 0, 0, 2, 0, 0, 0, 2] as Matrix3,
    description: '在所有方向放大2倍',
  },
  {
    name: 'X方向拉伸',
    matrix: [3, 0, 0, 0, 1, 0, 0, 0, 1] as Matrix3,
    description: '仅在X方向拉伸3倍',
  },
];
