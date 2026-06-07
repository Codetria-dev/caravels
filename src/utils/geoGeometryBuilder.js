import earcut from 'earcut';

const GLOBE_RADIUS = 130;
const LINE_RADIUS = GLOBE_RADIUS + 0.5;

/**
 * Convert lat/lng to 3D cartesian coordinates on sphere
 */
function latLngToCartesian(lat, lng, radius = GLOBE_RADIUS) {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const x = radius * Math.cos(latRad) * Math.cos(lngRad);
  const y = radius * Math.sin(latRad);
  const z = -radius * Math.cos(latRad) * Math.sin(lngRad);

  return [x, y, z];
}

/**
 * Project a 2D polygon ring to 3D sphere surface
 * Returns array of [x, y, z] points
 */
function projectRingTo3D(ring, radius = GLOBE_RADIUS) {
  return ring.map(([lng, lat]) => latLngToCartesian(lat, lng, radius));
}

/**
 * Create Three.js geometry from a GeoJSON polygon ring.
 * Uses raw [lng, lat] as 2D coordinates for earcut triangulation,
 * which is the standard approach and avoids projection distortion.
 *
 * coordinates[0] = exterior ring, coordinates[1+] = holes
 * Each ring is an array of [lng, lat] pairs (GeoJSON order).
 */
export function createPolygonGeometry(coordinates, THREE, radius = GLOBE_RADIUS) {
  const geometry = new THREE.BufferGeometry();

  const exteriorRing = coordinates[0];
  const holes = coordinates.slice(1);

  const vertices = [];
  const vertices2D = [];
  const holeIndices = [];

  // Process exterior ring: build 3D positions + 2D [lng, lat] for earcut
  exteriorRing.forEach(([lng, lat]) => {
    const [x, y, z] = latLngToCartesian(lat, lng, radius);
    vertices.push(x, y, z);
    vertices2D.push(lng, lat);
  });

  // Process holes
  holes.forEach((hole) => {
    holeIndices.push(vertices2D.length / 2);
    hole.forEach(([lng, lat]) => {
      const [x, y, z] = latLngToCartesian(lat, lng, radius);
      vertices.push(x, y, z);
      vertices2D.push(lng, lat);
    });
  });

  // Triangulate with earcut using raw [lng, lat] 2D coordinates
  const indices = earcut(vertices2D, holeIndices, 2);

  // Fix triangle winding: ensure all face normals point outward from sphere.
  // Earcut winding depends on input ring orientation; outward normals are
  // critical for correct lighting and raycasting front-face detection.
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3;
    const b = indices[i + 1] * 3;
    const c = indices[i + 2] * 3;

    const abx = vertices[b] - vertices[a];
    const aby = vertices[b + 1] - vertices[a + 1];
    const abz = vertices[b + 2] - vertices[a + 2];
    const acx = vertices[c] - vertices[a];
    const acy = vertices[c + 1] - vertices[a + 1];
    const acz = vertices[c + 2] - vertices[a + 2];

    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    const tcx = (vertices[a] + vertices[b] + vertices[c]) / 3;
    const tcy = (vertices[a + 1] + vertices[b + 1] + vertices[c + 1]) / 3;
    const tcz = (vertices[a + 2] + vertices[b + 2] + vertices[c + 2]) / 3;

    if (nx * tcx + ny * tcy + nz * tcz < 0) {
      const tmp = indices[i + 1];
      indices[i + 1] = indices[i + 2];
      indices[i + 2] = tmp;
    }
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));

  // Outward-pointing sphere normals (more robust than computeVertexNormals)
  const normals = new Float32Array(vertices.length);
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i];
    const y = vertices[i + 1];
    const z = vertices[i + 2];
    const len = Math.sqrt(x * x + y * y + z * z);
    normals[i] = x / len;
    normals[i + 1] = y / len;
    normals[i + 2] = z / len;
  }
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));

  return geometry;
}

/**
 * Create boundary lines from a polygon ring
 * Returns line segment vertices
 */
function createRingLineVertices(ring, radius = GLOBE_RADIUS) {
  const vertices = [];
  const points3D = projectRingTo3D(ring, radius);

  // Create line segments between consecutive points
  for (let i = 0; i < points3D.length; i++) {
    const [x, y, z] = points3D[i];
    vertices.push(x, y, z);
    if (i < points3D.length - 1) {
      const [x2, y2, z2] = points3D[(i + 1) % points3D.length];
      vertices.push(x2, y2, z2);
    }
  }

  return vertices;
}

/**
 * Create boundary lines for a GeoJSON polygon
 */
export function createPolygonLineGeometry(coordinates, THREE, radius = GLOBE_RADIUS) {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];

  // Add exterior ring
  vertices.push(...createRingLineVertices(coordinates[0], radius));

  // Add hole rings
  coordinates.slice(1).forEach((hole) => {
    vertices.push(...createRingLineVertices(hole, radius));
  });

  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(new Float32Array(vertices), 3)
  );

  return geometry;
}

/**
 * Process TopoJSON and create Three.js geometries for all countries
 */
export async function buildGlobeGeometries(THREE) {
  try {
    const ThreeLib = THREE || await import('three');
    const res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json');
    const topoData = await res.json();

    // Extract countries feature collection using topojson-client
    const topojson = await import('topojson-client');
    const countries = topojson.feature(topoData, topoData.objects.countries).features;

    const fillGeometries = [];
    const lineGeometries = [];
    const countryMetadata = [];

    countries.forEach((feature, idx) => {
      try {
        const geom = feature.geometry;
        if (!geom) return;

        // Store country metadata (will be used for raycasting identification)
        const properties = feature.properties || {};
        const countryName = properties.name || `Country ${idx}`;
        countryMetadata[idx] = { name: countryName, featureIndex: idx };

        if (geom.type === 'Polygon') {
          // Single polygon
          const fillGeom = createPolygonGeometry(geom.coordinates, ThreeLib);
          const lineGeom = createPolygonLineGeometry(geom.coordinates, ThreeLib, LINE_RADIUS);
          fillGeometries.push({ geometry: fillGeom, featureIndex: idx, name: countryName });
          lineGeometries.push({ geometry: lineGeom, featureIndex: idx, name: countryName });
        } else if (geom.type === 'MultiPolygon') {
          // Multiple polygons (e.g., island nations)
          geom.coordinates.forEach((polygon) => {
            const fillGeom = createPolygonGeometry(polygon, ThreeLib);
            const lineGeom = createPolygonLineGeometry(polygon, ThreeLib, LINE_RADIUS);
            fillGeometries.push({ geometry: fillGeom, featureIndex: idx, name: countryName });
            lineGeometries.push({ geometry: lineGeom, featureIndex: idx, name: countryName });
          });
        }
      } catch (error) {
        console.warn(`Error processing country ${idx}:`, error);
      }
    });

    return { fillGeometries, lineGeometries, countryMetadata };
  } catch (error) {
    console.error('Error building globe geometries:', error);
    return { fillGeometries: [], lineGeometries: [], countryMetadata: [] };
  }
}
