import { createSignal, createEffect } from 'solid-js';
import type { Matrix2, Matrix3, Vector2 } from './utils/math';
import { Canvas2D } from './components/Canvas2D';
import { Canvas3D } from './components/Canvas3D';
import { MatrixInput } from './components/MatrixInput';
import { PresetLibrary } from './components/PresetLibrary';
import { MatrixInfo } from './components/MatrixInfo';
import { EigenvalueExplorer } from './components/EigenvalueExplorer';
import { MatrixDecomposition } from './components/MatrixDecomposition';
import { TransformTimeline } from './components/TransformTimeline';

function App() {
  const [dimensions, setDimensions] = createSignal<2 | 3>(2);
  const [matrix2D, setMatrix2D] = createSignal<Matrix2>([1, 0, 0, 1]);
  const [matrix3D, setMatrix3D] = createSignal<Matrix3>([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const [transformHistory, setTransformHistory] = createSignal<Matrix2[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = createSignal(-1);
  const [customVectors, setCustomVectors] = createSignal<Vector2[]>([]);
  const [isAnimating, setIsAnimating] = createSignal(false);
  const [showEigenvectors, setShowEigenvectors] = createSignal(false);
  const [showNullSpace, setShowNullSpace] = createSignal(false);
  
  const maxHistory = 8;
  
  function handleApplyTransform() {
    if (dimensions() === 2) {
      const currentActiveIdx = activeHistoryIndex();
      setTransformHistory(prev => {
        const truncatedHistory = currentActiveIdx >= 0 ? prev.slice(0, currentActiveIdx + 1) : prev;
        const newHistory = [...truncatedHistory, matrix2D()];
        if (newHistory.length > maxHistory) {
          return newHistory.slice(-maxHistory);
        }
        return newHistory;
      });
      setActiveHistoryIndex(prev => {
        const newIndex = currentActiveIdx >= 0 ? currentActiveIdx + 1 : 0;
        return Math.min(newIndex, maxHistory - 1);
      });
    }
  }
  
  function handleReset() {
    setMatrix2D([1, 0, 0, 1]);
    setMatrix3D([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    setTransformHistory([]);
    setActiveHistoryIndex(-1);
    setCustomVectors([]);
    setIsAnimating(false);
  }
  
  function handleSelectHistory(index: number) {
    setActiveHistoryIndex(index);
  }
  
  function handleApply() {
    setIsAnimating(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 800);
  }
  
  function handleAddVector(v: Vector2) {
    setCustomVectors(prev => [...prev, v]);
  }
  
  function handleUpdateVector(index: number, v: Vector2) {
    setCustomVectors(prev => {
      const newVectors = [...prev];
      newVectors[index] = v;
      return newVectors;
    });
  }
  
  function handleRemoveVector(index: number) {
    setCustomVectors(prev => prev.filter((_, i) => i !== index));
  }
  
  createEffect(() => {
    if (dimensions() === 2) {
      setMatrix2D([1, 0, 0, 1]);
      setTransformHistory([]);
      setCustomVectors([]);
    } else {
      setMatrix3D([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    }
  });
  
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <header style={{
          textAlign: 'center',
          marginBottom: '30px',
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1f2937',
            marginBottom: '8px',
          }}>
            线性代数变换可视化工具
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
          }}>
            交互式学习线性代数概念，直观理解矩阵变换的几何含义
          </p>
        </header>
        
        <div style={{
          display: 'flex',
          gap: '24px',
        }}>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <button
                  onClick={() => setDimensions(2)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: dimensions() === 2 ? '#3b82f6' : '#f3f4f6',
                    color: dimensions() === 2 ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  2D 变换
                </button>
                <button
                  onClick={() => setDimensions(3)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: dimensions() === 3 ? '#3b82f6' : '#f3f4f6',
                    color: dimensions() === 3 ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  3D 变换
                </button>
              </div>
              
              {dimensions() === 2 && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                      输入 2x2 矩阵
                    </h3>
                    <MatrixInput
                      dimensions={2}
                      matrix={matrix2D()}
                      onMatrixChange={(m) => setMatrix2D(m as Matrix2)}
                    />
                  </div>
                  
                  <PresetLibrary
                    dimensions={2}
                    onSelect={(m) => setMatrix2D(m as Matrix2)}
                  />
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <button
                      onClick={handleApply}
                      disabled={isAnimating()}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isAnimating() ? 'not-allowed' : 'pointer',
                        opacity: isAnimating() ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isAnimating() ? '变换中...' : '应用变换'}
                    </button>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      重置
                    </button>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '16px',
                  }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={showEigenvectors()}
                        onChange={(e) => setShowEigenvectors(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>显示特征向量</span>
                    </label>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}>
                      <input
                        type="checkbox"
                        checked={showNullSpace()}
                        onChange={(e) => setShowNullSpace(e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      <span style={{ fontSize: '14px', color: '#374151' }}>显示零空间</span>
                    </label>
                  </div>
                </>
              )}
              
              {dimensions() === 3 && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                      输入 3x3 矩阵
                    </h3>
                    <MatrixInput
                      dimensions={3}
                      matrix={matrix3D()}
                      onMatrixChange={(m) => setMatrix3D(m as Matrix3)}
                    />
                  </div>
                  
                  <PresetLibrary
                    dimensions={3}
                    onSelect={(m) => setMatrix3D(m as Matrix3)}
                  />
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                  }}>
                    <button
                      onClick={handleApply}
                      disabled={isAnimating()}
                      style={{
                        flex: 1,
                        padding: '12px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: isAnimating() ? 'not-allowed' : 'pointer',
                        opacity: isAnimating() ? 0.5 : 1,
                        transition: 'all 0.2s',
                      }}
                    >
                      {isAnimating() ? '变换中...' : '应用变换'}
                    </button>
                    <button
                      onClick={handleReset}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      重置
                    </button>
                  </div>
                </>
              )}
            </div>
            
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}>
              <MatrixInfo
                matrix={dimensions() === 2 ? matrix2D() : matrix3D()}
                dimensions={dimensions()}
              />
            </div>
            
            {dimensions() === 2 && (
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <MatrixDecomposition
                  matrix={matrix2D()}
                  onApplyMatrix={(m) => {
                    setMatrix2D(m);
                    setIsAnimating(true);
                    setTimeout(() => setIsAnimating(false), 800);
                  }}
                />
              </div>
            )}
          </div>
          
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              justifyContent: 'center',
            }}>
              {dimensions() === 2 ? (
                <Canvas2D
                  matrix={matrix2D()}
                  onApplyTransform={handleApplyTransform}
                  transformHistory={transformHistory()}
                  activeHistoryIndex={activeHistoryIndex()}
                  customVectors={customVectors()}
                  onAddVector={handleAddVector}
                  onUpdateVector={handleUpdateVector}
                  showEigenvectors={showEigenvectors()}
                  showNullSpace={showNullSpace()}
                  isAnimating={isAnimating()}
                />
              ) : (
                <Canvas3D
                  matrix={matrix3D()}
                  isAnimating={isAnimating()}
                />
              )}
            </div>
            
            {dimensions() === 2 && (
              <TransformTimeline
                history={transformHistory()}
                activeIndex={activeHistoryIndex()}
                onSelect={handleSelectHistory}
              />
            )}
            
            {dimensions() === 2 && customVectors().length > 0 && (
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                  自定义向量 ({customVectors().length}/8)
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {customVectors().map((vec, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <span style={{ fontSize: '14px', color: '#374151' }}>
                        v{i+1} = ({vec[0].toFixed(2)}, {vec[1].toFixed(2)})
                      </span>
                      <button
                        onClick={() => handleRemoveVector(i)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
                <p style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: '#6b7280',
                }}>
                  点击画布添加自定义向量，点击向量终点可拖拽调整位置
                </p>
              </div>
            )}
            
            {dimensions() === 2 && (
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <EigenvalueExplorer
                  externalMatrix={matrix2D()}
                  onMatrixChange={(m) => setMatrix2D(m)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
