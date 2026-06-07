import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock canvas and WebGL context
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return {
      fillRect: vi.fn(),
      fillStyle: '',
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Array(4),
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(() => []),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      fillText: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };
  }
  // WebGL context
  return {
    useProgram: vi.fn(),
    attachShader: vi.fn(),
    compileShader: vi.fn(),
    createBuffer: vi.fn(),
    createProgram: vi.fn(),
    createShader: vi.fn(),
    linkProgram: vi.fn(),
    bufferData: vi.fn(),
    vertexAttribPointer: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    drawElements: vi.fn(),
    uniform1f: vi.fn(),
    uniformMatrix4fv: vi.fn(),
    VERTEX_SHADER: 0,
    FRAGMENT_SHADER: 0,
    ARRAY_BUFFER: 0,
  };
});
