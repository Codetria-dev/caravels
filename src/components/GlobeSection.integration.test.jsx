import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import GlobeSection from './GlobeSection';
import { buildGlobeGeometries } from '../utils/geoGeometryBuilder';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

const mockLocations = [
  { id: 'region-1', label: 'Europe', lat: 54.526, lng: 15.2551, color: '#4ade80', type: 'region' },
];
const mockCountriesIndex = [
  { id: 0, name: 'Mockland', lat: 12, lng: 34, type: 'country' },
];

vi.mock('../utils/geoGeometryBuilder', () => ({
  buildGlobeGeometries: vi.fn(async () => ({
    fillGeometries: [{ geometry: { dispose: vi.fn() }, featureIndex: 0, name: 'Mockland' }],
    lineGeometries: [{ geometry: { dispose: vi.fn() }, featureIndex: 0, name: 'Mockland' }],
    countryMetadata: [{ name: 'Mockland', featureIndex: 0 }],
  })),
}));

vi.mock('three', () => {
  let raycastMode = 'country';

  class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    clone() { return new Vec3(this.x, this.y, this.z); }
    normalize() {
      const len = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z) || 1;
      this.x /= len; this.y /= len; this.z /= len;
      return this;
    }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    transformDirection() { return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    lerpVectors(a, b, t) {
      this.x = a.x + (b.x - a.x) * t;
      this.y = a.y + (b.y - a.y) * t;
      this.z = a.z + (b.z - a.z) * t;
      return this;
    }
    addVectors(a, b) {
      this.x = a.x + b.x;
      this.y = a.y + b.y;
      this.z = a.z + b.z;
      return this;
    }
    crossVectors(a, b) {
      this.x = a.y * b.z - a.z * b.y;
      this.y = a.z * b.x - a.x * b.z;
      this.z = a.x * b.y - a.y * b.x;
      return this;
    }
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
  }

  class Node {
    constructor() {
      this.children = [];
      this.position = new Vec3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1, set: (x, y, z) => { this.scale.x = x; this.scale.y = y; this.scale.z = z; } };
    }
    add(child) { this.children.push(child); }
    remove() {}
    traverse(fn) {
      fn(this);
      this.children.forEach((c) => c?.traverse?.(fn) ?? fn(c));
    }
    updateMatrixWorld() {}
    getWorldPosition(target) {
      target.x = this.position.x;
      target.y = this.position.y;
      target.z = this.position.z;
      return target;
    }
    lookAt() {}
  }

  class Scene extends Node {}
  class Group extends Node {}
  class PerspectiveCamera extends Node {
    constructor() { super(); this.position = new Vec3(0, 0, 0); }
    updateProjectionMatrix() {}
  }
  class Mesh extends Node {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.userData = { type: 'country', countryIndex: 0, meshIndex: 0, name: 'Mockland' };
      this.isMesh = true;
      this.face = { normal: new Vec3(0, 0, 1) };
    }
  }
  class LineSegments extends Node {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.isLineSegments = true;
    }
  }
  class SphereGeometry { dispose() {} }
  class TorusGeometry { constructor() {} dispose() {} }
  class WebGLRenderer {
    setSize() {}
    setClearColor() {}
    setPixelRatio() {}
    render() {}
    dispose() {}
  }
  class CanvasTexture {
    constructor() { this.needsUpdate = false; }
  }
  class SpriteMaterial {
    constructor(props = {}) { Object.assign(this, props); }
  }
  class Sprite extends Node {
    constructor(material) {
      super();
      this.material = material;
      this.isSprite = true;
      this.visible = true;
    }
  }
  class Color {
    constructor(c) { this.hex = c; }
    set(c) { this.hex = c; return this; }
    getHex() { return typeof this.hex === 'string' ? parseInt(this.hex.replace('#', ''), 16) : this.hex; }
    clone() { return new Color(this.hex); }
  }
  class Material {
    constructor(props = {}) {
      this.color = new Color();
      this.emissive = new Color();
      this.emissiveIntensity = 0;
      Object.assign(this, props);
      // Restore color/emissive as Color objects after Object.assign
      if (typeof props.color !== 'undefined') this.color = new Color(props.color);
      if (typeof props.emissive !== 'undefined') this.emissive = new Color(props.emissive);
    }
    dispose() {}
    clone() { return new Material(); }
  }
  class MeshStandardMaterial extends Material {}
  class MeshBasicMaterial extends Material {}
  class LineBasicMaterial extends Material {}
  class DirectionalLight extends Node {}
  class AmbientLight extends Node {}
  class Vector2 { constructor(x, y) { this.x = x; this.y = y; } }
  class Raycaster {
    constructor() {
      this.ray = { direction: new Vec3(0, 0, -1) };
    }
    setFromCamera() {}
    intersectObjects(objects) {
      if (!objects || objects.length === 0) return [];
      if (raycastMode === 'country') {
        return objects[0].isMesh
          ? [{ object: objects[0], face: { normal: new Vec3(0, 0, 1) } }]
          : [];
      }
      return [];
    }
  }

  class QuadraticBezierCurve3 {
    constructor(start, mid, end) {
      this.start = start;
      this.mid = mid;
      this.end = end;
    }
    getPoint(t) {
      const u = 1 - t;
      return new Vec3(
        u * u * this.start.x + 2 * u * t * this.mid.x + t * t * this.end.x,
        u * u * this.start.y + 2 * u * t * this.mid.y + t * t * this.end.y,
        u * u * this.start.z + 2 * u * t * this.mid.z + t * t * this.end.z,
      );
    }
    getPoints(n) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        pts.push(this.getPoint(i / n));
      }
      return pts;
    }
  }
  class BufferGeometry extends Node {
    constructor() { super(); }
    setFromPoints() { return this; }
    setAttribute() { return this; }
    setIndex() { return this; }
    computeVertexNormals() { return this; }
    dispose() {}
  }
  class Line extends Node {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.isLine = true;
    }
  }
  class BufferAttribute {
    constructor(array, size) { this.array = array; this.itemSize = size; }
  }
  class PointsMaterial extends Material {
    constructor(props = {}) { super(props); }
  }
  class Points extends Node {
    constructor(geometry, material) {
      super();
      this.geometry = geometry;
      this.material = material;
      this.isPoints = true;
    }
  }
  class MeshPhongMaterial extends Material {
    constructor(props = {}) {
      super(props);
      this.specular = new Color(props.specular || '#000000');
    }
  }

  return {
    __setRaycastMode: (mode) => { raycastMode = mode; },
    Scene,
    Group,
    PerspectiveCamera,
    WebGLRenderer,
    SphereGeometry,
    TorusGeometry,
    Mesh,
    LineSegments,
    Line,
    CanvasTexture,
    SpriteMaterial,
    Sprite,
    MeshStandardMaterial,
    MeshBasicMaterial,
    LineBasicMaterial,
    DirectionalLight,
    AmbientLight,
    Vector2,
    Vector3: Vec3,
    Raycaster,
    QuadraticBezierCurve3,
    BufferGeometry,
    BufferAttribute,
    PointsMaterial,
    Points,
    MeshPhongMaterial,
    DoubleSide: 'DoubleSide',
    BackSide: 'BackSide',
  };
});

describe('GlobeSection Integration', () => {
  beforeEach(async () => {
    const three = await import('three');
    three.__setRaycastMode('country');
  });

  it('emits country selection when a country mesh is clicked', async () => {
    const onLocationSelect = vi.fn();
    const { container } = render(
      <GlobeSection
        onLocationSelect={onLocationSelect}
        selectedLocation={null}
        locations={mockLocations}
        countriesIndex={mockCountriesIndex}
        loading={false}
      />
    );

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeTruthy();
    Object.defineProperty(canvas, 'clientWidth', { value: 800, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 600, configurable: true });
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 });

    await waitFor(() => {
      expect(buildGlobeGeometries).toHaveBeenCalled();
    });

    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(canvas, { clientX: 100, clientY: 100 });
    fireEvent.click(canvas, { clientX: 100, clientY: 100 });

    await waitFor(() => {
      expect(onLocationSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mockland',
          type: 'country',
          lat: 12,
          lng: 34,
        })
      );
    });
  });

  it('renders loading overlay when loading', () => {
    const { container } = render(
      <GlobeSection
        onLocationSelect={vi.fn()}
        selectedLocation={null}
        locations={[]}
        countriesIndex={[]}
        loading={true}
      />
    );
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
