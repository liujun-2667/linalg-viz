import { createSignal, createEffect } from 'solid-js';
import type { Matrix2 } from '../utils/math';
import { det2 } from '../utils/math';

interface ScriptError {
  line: number;
  message: string;
}

interface ParsedCommand {
  type: 'rotate' | 'scale' | 'shear' | 'reflect' | 'matrix' | 'wait' | 'reset';
  line: number;
  matrix?: Matrix2;
  waitMs?: number;
}

interface TransformScriptEditorProps {
  onApplyMatrix: (matrix: Matrix2) => void;
  onReset: () => void;
  onApplyTransform: () => void;
  currentMatrix: Matrix2;
}

const exampleScripts = {
  '正方形旋转动画': `# 连续8次旋转45度，展示方形旋转一圈的过程
rotate(45)
rotate(45)
rotate(45)
rotate(45)
rotate(45)
rotate(45)
rotate(45)
rotate(45)`,
  '先缩后剪': `# 先缩放再剪切再反射
scale(2, 1)
wait(800)
shear(h, 0.5)
wait(800)
reflect(y)`,
  '渐进缩放': `# 连续5次缩小
scale(0.8, 0.8)
scale(0.8, 0.8)
scale(0.8, 0.8)
scale(0.8, 0.8)
scale(0.8, 0.8)`
};

export function TransformScriptEditor(props: TransformScriptEditorProps) {
  const [script, setScript] = createSignal('');
  const [errors, setErrors] = createSignal<ScriptError[]>([]);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentLine, setCurrentLine] = createSignal(-1);
  const [summary, setSummary] = createSignal('');
  const [selectedExample, setSelectedExample] = createSignal('');

  let timeoutId: number | null = null;

  function parseScript(): { commands: ParsedCommand[]; errors: ScriptError[] } {
    const commands: ParsedCommand[] = [];
    const errors: ScriptError[] = [];
    const lines = script().split('\n');

    lines.forEach((line, index) => {
      const lineNum = index + 1;
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return;
      }

      if (trimmed === 'reset') {
        commands.push({ type: 'reset', line: lineNum });
        return;
      }

      const rotateMatch = trimmed.match(/^rotate\s*\(\s*([\d.-]+)\s*\)$/);
      if (rotateMatch) {
        const angle = parseFloat(rotateMatch[1]);
        if (isNaN(angle)) {
          errors.push({ line: lineNum, message: 'rotate参数必须是数字' });
        } else {
          const rad = (angle * Math.PI) / 180;
          const c = Math.cos(rad);
          const s = Math.sin(rad);
          commands.push({
            type: 'rotate',
            line: lineNum,
            matrix: [c, -s, s, c]
          });
        }
        return;
      }

      const scaleMatch = trimmed.match(/^scale\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/);
      if (scaleMatch) {
        const x = parseFloat(scaleMatch[1]);
        const y = parseFloat(scaleMatch[2]);
        if (isNaN(x) || isNaN(y)) {
          errors.push({ line: lineNum, message: 'scale参数必须是数字' });
        } else {
          commands.push({
            type: 'scale',
            line: lineNum,
            matrix: [x, 0, 0, y]
          });
        }
        return;
      }

      const shearMatch = trimmed.match(/^shear\s*\(\s*(h|v)\s*,\s*([\d.-]+)\s*\)$/);
      if (shearMatch) {
        const direction = shearMatch[1];
        const amount = parseFloat(shearMatch[2]);
        if (isNaN(amount)) {
          errors.push({ line: lineNum, message: 'shear量必须是数字' });
        } else {
          commands.push({
            type: 'shear',
            line: lineNum,
            matrix: direction === 'h' ? [1, amount, 0, 1] : [1, 0, amount, 1]
          });
        }
        return;
      }

      const reflectMatch = trimmed.match(/^reflect\s*\(\s*(x|y)\s*\)$/);
      if (reflectMatch) {
        const axis = reflectMatch[1];
        commands.push({
          type: 'reflect',
          line: lineNum,
          matrix: axis === 'x' ? [1, 0, 0, -1] : [-1, 0, 0, 1]
        });
        return;
      }

      const matrixMatch = trimmed.match(/^matrix\s*\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/);
      if (matrixMatch) {
        const a = parseFloat(matrixMatch[1]);
        const b = parseFloat(matrixMatch[2]);
        const c = parseFloat(matrixMatch[3]);
        const d = parseFloat(matrixMatch[4]);
        if (isNaN(a) || isNaN(b) || isNaN(c) || isNaN(d)) {
          errors.push({ line: lineNum, message: 'matrix参数必须是数字' });
        } else {
          commands.push({
            type: 'matrix',
            line: lineNum,
            matrix: [a, b, c, d]
          });
        }
        return;
      }

      const waitMatch = trimmed.match(/^wait\s*\(\s*(\d+)\s*\)$/);
      if (waitMatch) {
        const ms = parseInt(waitMatch[1], 10);
        if (isNaN(ms)) {
          errors.push({ line: lineNum, message: 'wait参数必须是正整数' });
        } else {
          commands.push({ type: 'wait', line: lineNum, waitMs: ms });
        }
        return;
      }

      errors.push({ line: lineNum, message: '无效的指令格式' });
    });

    return { commands, errors };
  }

  function validateScript() {
    const result = parseScript();
    setErrors(result.errors);
    setSummary('');
  }

  async function playScript() {
    const result = parseScript();
    setErrors(result.errors);
    
    if (result.commands.length === 0) {
      setSummary('脚本中没有可执行的指令');
      return;
    }

    setIsPlaying(true);
    setCurrentLine(-1);
    setSummary('');

    let totalCommands = 0;
    let skippedErrors = result.errors.length;

    for (const cmd of result.commands) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      setCurrentLine(cmd.line);

      if (cmd.type === 'reset') {
        props.onReset();
        totalCommands++;
      } else if (cmd.type === 'wait') {
        await new Promise(resolve => {
          timeoutId = window.setTimeout(resolve, cmd.waitMs);
        });
      } else if (cmd.matrix) {
        props.onApplyMatrix(cmd.matrix);
        totalCommands++;
        await new Promise(resolve => {
          timeoutId = window.setTimeout(resolve, 1000);
        });
        props.onApplyTransform();
      }
    }

    setIsPlaying(false);
    setCurrentLine(-1);
    
    const finalDet = det2(props.currentMatrix);
    setSummary(`执行完成: 共${totalCommands}条指令, 跳过${skippedErrors}条错误, 最终行列式=${finalDet.toFixed(4)}`);
  }

  function stopScript() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    setIsPlaying(false);
    setCurrentLine(-1);
    setSummary('播放已停止');
  }

  function handleExampleSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    const value = target.value;
    setSelectedExample(value);
    if (value) {
      setScript(exampleScripts[value as keyof typeof exampleScripts]);
      setErrors([]);
      setSummary('');
    }
  }

  createEffect(() => {
    if (!isPlaying()) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  });

  const lines = script().split('\n');

  return (
    <div style={{
      backgroundColor: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    }}>
      <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
        变换脚本编辑器
      </h3>
      
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '14px', color: '#6b7280', marginRight: '8px' }}>
          示例脚本:
        </label>
        <select
          value={selectedExample()}
          onChange={handleExampleSelect}
          disabled={isPlaying()}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            cursor: isPlaying() ? 'not-allowed' : 'pointer',
            backgroundColor: isPlaying() ? '#f9fafb' : 'white',
          }}
        >
          <option value="">选择示例...</option>
          {Object.keys(exampleScripts).map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </select>
      </div>

      <div style={{
        position: 'relative',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          minHeight: '200px',
        }}>
          <div style={{
            padding: '8px 4px',
            backgroundColor: '#f9fafb',
            borderRight: '1px solid #d1d5db',
            textAlign: 'right',
            userSelect: 'none',
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: '20px',
          }}>
            {lines.map((_, i) => (
              <div
                key={i}
                style={{
                  paddingRight: '8px',
                  backgroundColor: currentLine() === i + 1 ? '#dbeafe' : 'transparent',
                  color: currentLine() === i + 1 ? '#1d4ed8' : '#6b7280',
                  fontWeight: currentLine() === i + 1 ? '600' : 'normal',
                }}
              >
                {i + 1}
              </div>
            ))}
            {lines.length === 0 && <div style={{ paddingRight: '8px' }}>1</div>}
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={script()}
              onChange={(e) => setScript(e.target.value)}
              disabled={isPlaying()}
              placeholder={`# 变换脚本编辑器\n# 支持的指令:\n# rotate(角度) - 旋转\n# scale(x,y) - 缩放\n# shear(h|v,量) - 剪切\n# reflect(x|y) - 反射\n# matrix(a,b,c,d) - 自定义矩阵\n# wait(毫秒) - 等待\n# reset - 重置\n# 以#开头的行为注释`}
              style={{
                width: '100%',
                minHeight: '200px',
                padding: '8px',
                border: 'none',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: '20px',
                backgroundColor: isPlaying() ? '#f9fafb' : 'white',
                color: '#374151',
              }}
            />
            {errors().map((error) => (
              <div
                key={error.line}
                style={{
                  position: 'absolute',
                  left: '0',
                  top: `${(error.line - 1) * 20 + 8}px`,
                  width: '4px',
                  height: '20px',
                  backgroundColor: '#ef4444',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {errors().length > 0 && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#fef2f2',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#dc2626',
        }}>
          {errors().map((error, i) => (
            <div key={i}>
              第{error.line}行: {error.message}
            </div>
          ))}
        </div>
      )}

      {summary() && (
        <div style={{
          marginTop: '8px',
          padding: '8px 12px',
          backgroundColor: '#f0fdf4',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#166534',
          fontWeight: '500',
        }}>
          {summary()}
        </div>
      )}

      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '16px',
      }}>
        <button
          onClick={validateScript}
          disabled={isPlaying()}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isPlaying() ? 'not-allowed' : 'pointer',
            opacity: isPlaying() ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          校验脚本
        </button>
        <button
          onClick={playScript}
          disabled={isPlaying()}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isPlaying() ? 'not-allowed' : 'pointer',
            opacity: isPlaying() ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
        >
          播放脚本
        </button>
        <button
          onClick={stopScript}
          disabled={!isPlaying()}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isPlaying() ? 'pointer' : 'not-allowed',
            opacity: isPlaying() ? 1 : 0.5,
            transition: 'all 0.2s',
          }}
        >
          停止
        </button>
      </div>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#6b7280',
      }}>
        <strong style={{ color: '#374151' }}>脚本语法:</strong><br />
        <div style={{ marginTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <span>rotate(角度)</span><span>旋转矩阵(度)</span>
          <span>scale(x,y)</span><span>缩放矩阵</span>
          <span>shear(h|v,量)</span><span>剪切矩阵</span>
          <span>reflect(x|y)</span><span>反射矩阵</span>
          <span>matrix(a,b,c,d)</span><span>自定义2x2矩阵</span>
          <span>wait(毫秒)</span><span>暂停等待</span>
          <span>reset</span><span>重置变换</span>
          <span>#注释</span><span>忽略此行</span>
        </div>
      </div>
    </div>
  );
}
