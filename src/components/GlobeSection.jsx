import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalTime } from '../utils/timeUtils';

const easeInOutCubic = (t) => (
  t < 0.5 ? 4 * t * t * t : 1 + (-2 * t + 2) ** 3 / 2
);

function LocalTime({ lng }) {
  const { t } = useTranslation();
  const [time, setTime] = useState(() => getLocalTime(0, lng));
  useEffect(() => {
    const id = setInterval(() => setTime(getLocalTime(0, lng)), 60_000);
    return () => clearInterval(id);
  }, [lng]);
  return (
    <div className="flex items-center gap-2 text-slate-400">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{t('globe.localTime')} {time}</span>
    </div>
  );
}

function GlobeSection({
  onLocationSelect,
  selectedLocation,
  voyageHistory = [],
  locations = [],
  countriesIndex = [],
  loading = true,
  chartMode = false,
}) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredName, setHoveredName] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const globeGroupRef = useRef(null);
  const cameraAnimationRef = useRef(null);
  const onLocationSelectRef = useRef(onLocationSelect);
  onLocationSelectRef.current = onLocationSelect;
  const isReady = !loading && locations.length > 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isReady) return;

    let disposed = false;
    let animationId = 0;
    let cleanup = () => {};

    const init = async () => {
      const THREE = await import('three');

      if (disposed) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        2000
      );
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setClearColor('#0f172a', 1);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

      camera.position.z = 240;

      // --- Starfield background ---
      const starsGeometry = new THREE.BufferGeometry();
      const starsCount = 800;
      const starsPositions = new Float32Array(starsCount * 3);
      const starsSizes = new Float32Array(starsCount);
      for (let i = 0; i < starsCount; i++) {
        // Random point on a large sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = 750 + Math.random() * 200;
        starsPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starsPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starsPositions[i * 3 + 2] = r * Math.cos(phi);
        starsSizes[i] = 0.5 + Math.random() * 1.8;
      }
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
      starsGeometry.setAttribute('size', new THREE.BufferAttribute(starsSizes, 1));
      const starsMaterial = new THREE.PointsMaterial({
        color: '#c8d6e5',
        size: 0.7,
        transparent: true,
        opacity: 0.75,
        sizeAttenuation: true,
        depthWrite: false,
      });
      const stars = new THREE.Points(starsGeometry, starsMaterial);
      scene.add(stars);

      const globeRadius = 130;
      const globeGroup = new THREE.Group();
      scene.add(globeGroup);

      // Declare variables outside try block so they're accessible to event handlers and refs
      let fillGroup = null;
      let countryMeshes = [];
      let voyageLinesGroup = null;
      let rebuildVoyageArcs = null;
      let rebuildVisitedMarkers = null;
      let visitedPortsGroup = null;
      let arcMeta = [];
      let lineMaterials = [];

      // Load TopoJSON and render countries with proper triangulation
      try {
        const { buildGlobeGeometries } = await import('../utils/geoGeometryBuilder');
        const { fillGeometries, lineGeometries } = await buildGlobeGeometries(THREE);

        if (disposed) {
          renderer.dispose();
          return;
        }

        // Create filled country meshes and track them for raycasting
        fillGroup = new THREE.Group();
        countryMeshes = [];

        // Earth-tone palette for country variation
        const palette = [
          '#2d4a5c', '#3a5a4a', '#4a4a3a', '#3d4a5a', '#3a4a4a',
          '#354a50', '#3a453a', '#455040', '#3d4550', '#404a45',
          '#38504a', '#3a5048', '#425040', '#384a44', '#3e4a3e',
          '#364c48', '#3e4842', '#3c4a46', '#404c40', '#38483e',
        ];

        fillGeometries.forEach(({ geometry, featureIndex, name }, idx) => {
          const countryColor = palette[featureIndex % palette.length];
          const material = new THREE.MeshStandardMaterial({
            color: countryColor,
            emissive: '#0f172a',
            emissiveIntensity: 0.2,
            metalness: 0.25,
            roughness: 0.65,
            flatShading: false,
            wireframe: false,
            fog: false,
            side: THREE.DoubleSide,
          });

          const mesh = new THREE.Mesh(geometry, material);

          // Add metadata for country identification on click
          mesh.userData = {
            type: 'country',
            countryIndex: featureIndex,
            meshIndex: idx,
            name: name,
            originalColor: countryColor,
            originalEmissive: '#0f172a',
          };

          fillGroup.add(mesh);
          countryMeshes.push(mesh);
        });

        globeGroup.add(fillGroup);

        // Create country boundary lines
        const lineGroup = new THREE.Group();
        lineMaterials = [];
        lineGeometries.forEach(({ geometry }) => {
          const material = new THREE.LineBasicMaterial({
            color: '#64748b',
            linewidth: 1,
            fog: false,
            transparent: true,
            opacity: 0.6,
          });

          const lines = new THREE.LineSegments(geometry, material);
          lineGroup.add(lines);
          lineMaterials.push(material);
        });

        globeGroup.add(lineGroup);

        // Voyage trail arcs group
        voyageLinesGroup = new THREE.Group();
        globeGroup.add(voyageLinesGroup);

        rebuildVoyageArcs = (history) => {
          // Clear previous arcs
          while (voyageLinesGroup.children.length > 0) {
            const child = voyageLinesGroup.children[0];
            child.geometry?.dispose?.();
            child.material?.dispose?.();
            voyageLinesGroup.remove(child);
          }
          arcMeta = [];

          if (!history || history.length < 2) return;

          for (let i = 0; i < history.length - 1; i++) {
            const a = history[i];
            const b = history[i + 1];
            if (!a.lat || !b.lat) continue;

            const latA = (a.lat * Math.PI) / 180;
            const lngA = (a.lng * Math.PI) / 180;
            const latB = (b.lat * Math.PI) / 180;
            const lngB = (b.lng * Math.PI) / 180;

            const start = new THREE.Vector3(
              globeRadius * Math.cos(latA) * Math.cos(lngA),
              globeRadius * Math.sin(latA),
              -globeRadius * Math.cos(latA) * Math.sin(lngA)
            );
            const end = new THREE.Vector3(
              globeRadius * Math.cos(latB) * Math.cos(lngB),
              globeRadius * Math.sin(latB),
              -globeRadius * Math.cos(latB) * Math.sin(lngB)
            );

            // Elevated midpoint for arc above surface
            const mid = new THREE.Vector3()
              .addVectors(start.clone().normalize(), end.clone().normalize())
              .normalize()
              .multiplyScalar(globeRadius + 18);

            const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
            const allPoints = curve.getPoints(64);
            // Start with empty geometry — arc draws progressively
            const arcGeometry = new THREE.BufferGeometry().setFromPoints([]);
            const arcMaterial = new THREE.LineBasicMaterial({
              color: '#fbbf24',
              transparent: true,
              opacity: 0.65,
              linewidth: 1,
              depthTest: true,
            });

            const arcLine = new THREE.Line(arcGeometry, arcMaterial);
            voyageLinesGroup.add(arcLine);
            arcMeta.push({ curve, allPoints, line: arcLine, startTime: Date.now(), duration: 800 });
          }
        };

        // Visited port markers
        visitedPortsGroup = new THREE.Group();
        globeGroup.add(visitedPortsGroup);

        rebuildVisitedMarkers = (history) => {
          while (visitedPortsGroup.children.length > 0) {
            const child = visitedPortsGroup.children[0];
            child.geometry?.dispose?.();
            child.material?.dispose?.();
            if (child.children) {
              child.children.forEach((c) => c.geometry?.dispose?.());
            }
            visitedPortsGroup.remove(child);
          }

          if (!history || history.length === 0) return;

          const seen = new Set();
          history.forEach((entry) => {
            if (!entry.lat || seen.has(entry.name)) return;
            seen.add(entry.name);

            const latR = (entry.lat * Math.PI) / 180;
            const lngR = (entry.lng * Math.PI) / 180;
            const markerRadius = globeRadius + 2;

            const pos = new THREE.Vector3(
              markerRadius * Math.cos(latR) * Math.cos(lngR),
              markerRadius * Math.sin(latR),
              -markerRadius * Math.cos(latR) * Math.sin(lngR)
            );

            // Glowing dot
            const dotGeom = new THREE.SphereGeometry(0.9, 16, 16);
            const dotMat = new THREE.MeshBasicMaterial({
              color: '#fbbf24',
              transparent: true,
              opacity: 0.9,
              depthTest: true,
            });
            const dot = new THREE.Mesh(dotGeom, dotMat);
            dot.position.copy(pos);
            visitedPortsGroup.add(dot);

            // Ring
            const ringGeom = new THREE.TorusGeometry(1.4, 0.06, 8, 20);
            const ringMat = new THREE.MeshBasicMaterial({
              color: '#f59e0b',
              transparent: true,
              opacity: 0.55,
              depthTest: true,
            });
            const ring = new THREE.Mesh(ringGeom, ringMat);
            ring.position.copy(pos);
            // Orient ring to face outward from globe center
            ring.lookAt(new THREE.Vector3(0, 0, 0));
            visitedPortsGroup.add(ring);
          });
        };
      } catch (error) {
        console.error('Error loading countries:', error);
      }

      if (disposed) {
        renderer.dispose();
        return;
      }

      // Ocean background sphere (well inside country surface so chord sagitta
      // of large interior triangles never dips below it — prevents ocean
      // bleeding through the middle of big countries like Brazil, USA, Australia).
      const oceanGeometry = new THREE.SphereGeometry(globeRadius - 10, 128, 128);
      const oceanMaterial = new THREE.MeshPhongMaterial({
        color: '#0a1628',
        emissive: '#040a14',
        specular: '#1a3a5c',
        shininess: 12,
        emissiveIntensity: 0.1,
        flatShading: false,
      });
      const oceanMesh = new THREE.Mesh(oceanGeometry, oceanMaterial);
      globeGroup.add(oceanMesh);

      // Subtle lat/long grid (wireframe sphere at ocean surface)
      const gridGeometry = new THREE.SphereGeometry(globeRadius - 1.8, 64, 32);
      const gridMaterial = new THREE.MeshBasicMaterial({
        color: '#3a5068',
        wireframe: true,
        transparent: true,
        opacity: 0.06,
        depthWrite: false,
      });
      const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
      globeGroup.add(gridMesh);

      // Inner atmosphere glow (closer, slightly brighter)
      const atmosphereInnerGeometry = new THREE.SphereGeometry(globeRadius + 1.2, 64, 64);
      const atmosphereInnerMaterial = new THREE.MeshBasicMaterial({
        color: '#5ba0f0',
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
      });
      globeGroup.add(new THREE.Mesh(atmosphereInnerGeometry, atmosphereInnerMaterial));

      // Outer atmosphere glow (farther, softer falloff)
      const atmosphereOuterGeometry = new THREE.SphereGeometry(globeRadius + 3.5, 64, 64);
      const atmosphereOuterMaterial = new THREE.MeshBasicMaterial({
        color: '#4a80d0',
        transparent: true,
        opacity: 0.06,
        side: THREE.BackSide,
      });
      globeGroup.add(new THREE.Mesh(atmosphereOuterGeometry, atmosphereOuterMaterial));

      // Region labels + subtle surface reference points
      const labelSprites = [];
      const refDots = [];
      try {
        const labelGroup = new THREE.Group();
        const dotGroup = new THREE.Group();
        const dotGeom = new THREE.SphereGeometry(0.8, 8, 8);

        locations.forEach((location) => {
          const lat = (location.lat * Math.PI) / 180;
          const lng = (location.lng * Math.PI) / 180;

          // Surface position for reference dot
          const sx = globeRadius * Math.cos(lat) * Math.cos(lng);
          const sy = globeRadius * Math.sin(lat);
          const sz = -globeRadius * Math.cos(lat) * Math.sin(lng);

          // Label position slightly above surface
          const labelOffset = 7;
          const x = (globeRadius + labelOffset) * Math.cos(lat) * Math.cos(lng);
          const y = (globeRadius + labelOffset) * Math.sin(lat);
          const z = -(globeRadius + labelOffset) * Math.cos(lat) * Math.sin(lng);

          // --- Subtle reference dot on surface ---
          const dotMat = new THREE.MeshBasicMaterial({
            color: '#94a3b8',
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          });
          const dot = new THREE.Mesh(dotGeom, dotMat);
          dot.position.set(sx, sy, sz);
          dotGroup.add(dot);
          refDots.push(dot);

          // --- Label sprite ---
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 256;
          canvas.height = 48;

          const text = location.label;
          const fontSize = Math.min(22, 400 / text.length);

          // Glass-morphism pill background
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
          ctx.lineWidth = 1;
          ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          const textWidth = ctx.measureText(text).width;
          const pw = textWidth + 28;
          const px = (canvas.width - pw) / 2;
          const rx = px, ry = 6, rw = pw, rh = 36, rr = 10;
          ctx.beginPath();
          ctx.moveTo(rx + rr, ry);
          ctx.lineTo(rx + rw - rr, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
          ctx.lineTo(rx + rw, ry + rh - rr);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
          ctx.lineTo(rx + rr, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
          ctx.lineTo(rx, ry + rr);
          ctx.quadraticCurveTo(rx, ry, rx + rr, ry);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Text
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#e2e8f0';
          ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillText(text, canvas.width / 2, canvas.height / 2);

          const texture = new THREE.CanvasTexture(canvas);
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;

          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
            depthTest: true,
            sizeAttenuation: true,
          });

          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.set(x, y, z);
          sprite.scale.set(11, 2.1, 1);
          sprite.userData = location;

          labelGroup.add(sprite);
          labelSprites.push(sprite);
        });
        globeGroup.add(dotGroup);
        globeGroup.add(labelGroup);
      } catch (labelError) {
        console.warn('Could not create region labels:', labelError);
      }

      if (disposed) {
        renderer.dispose();
        return;
      }

      // Lighting setup for depth and cinematic feel
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.4);
      directionalLight.position.set(200, 140, 180);
      directionalLight.castShadow = false;
      scene.add(directionalLight);

      const ambientLight = new THREE.AmbientLight(0x7a9cc8, 0.35);
      scene.add(ambientLight);

      // Rim/edge lighting for atmospheric depth
      const rimLight = new THREE.DirectionalLight(0x5a9fd4, 0.4);
      rimLight.position.set(-200, 60, -140);
      scene.add(rimLight);

      // Subtle fill light from below for balance
      const fillLight = new THREE.DirectionalLight(0x3a5f95, 0.18);
      fillLight.position.set(0, -100, 0);
      scene.add(fillLight);

      // Interaction
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };
      let rotation = { x: 0, y: 0 };
      let sailingAnimation = {
        active: false,
        curve: null,
        startTime: 0,
        duration: 1200,
      };
      let selectedCountryMesh = null;

      // Smooth zoom state
      let zoomTarget = camera.position.z;
      let zoomAnchor = null; // world-space point under cursor for zoom-to-cursor

      const ZOOM_MIN = 140;
      const ZOOM_MAX = 500;
      const ZOOM_SMOOTH = 0.10;
      const ZOOM_STEP = 18;

      const selectCountry = (countryMesh, countryData) => {
        // Reset previous country selection
        if (selectedCountryMesh && selectedCountryMesh !== countryMesh) {
          selectedCountryMesh.material.color.set(selectedCountryMesh.userData?.originalColor || '#2d3a47');
          selectedCountryMesh.material.emissive.set(selectedCountryMesh.userData?.originalEmissive || '#0f172a');
          selectedCountryMesh.material.emissiveIntensity = 0.15;
        }

        selectedCountryMesh = countryMesh;

        // Highlight country mesh with distinctive cyan glow
        countryMesh.material.color.set('#3b82f6');
        countryMesh.material.emissive.set('#3b82f6');
        countryMesh.material.emissiveIntensity = 0.55;

        // Look up country centroid by TopoJSON index (id === featureIndex)
        const countryInfo = countriesIndex?.find((c) => c.id === countryData.countryIndex);

        // Calculate camera target from country centroid
        let targetPos = null;
        if (countryInfo) {
          const lat = countryInfo.lat;
          const lng = countryInfo.lng;
          const latRad = (lat * Math.PI) / 180;
          const lngRad = (lng * Math.PI) / 180;
          const targetDir = {
            x: Math.cos(latRad) * Math.cos(lngRad),
            y: Math.sin(latRad),
            z: -Math.cos(latRad) * Math.sin(lngRad),
          };
          targetPos = {
            x: targetDir.x * 280,
            y: targetDir.y * 280,
            z: targetDir.z * 280,
          };
        } else {
          // Fallback: use generic position
          targetPos = { x: 200, y: 150, z: 200 };
        }

        // Trigger sailing animation (bezier curve around globe)
        const startVec = camera.position.clone();
        const endVec = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
        const midDir = new THREE.Vector3()
          .addVectors(startVec.clone().normalize(), endVec.clone().normalize());
        if (midDir.length() < 0.3) {
          midDir.crossVectors(startVec.clone().normalize(), new THREE.Vector3(0, 1, 0)).normalize();
        }
        midDir.normalize().multiplyScalar(350);

        sailingAnimation = {
          active: true,
          curve: new THREE.QuadraticBezierCurve3(startVec, midDir, endVec),
          startTime: Date.now(),
          duration: 1200,
        };

        // Update parent
        setSelectedCountry(countryData.name);
        onLocationSelectRef.current({
          name: countryData.name,
          lat: countryInfo?.lat || 0,
          lng: countryInfo?.lng || 0,
          type: 'country',
        });
      };

      const onMouseDown = (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
        onClickDown(e);
      };

      let hoveredCountry = null;

      const onMouseMove = (e) => {
        // Handle marker and country hover even when not dragging
        if (!isDragging) {
          const rect = canvas.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

          const raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

          // Ensure world matrices are up to date after rotation
          scene.updateMatrixWorld(true);

          // Raycast against country meshes
          const allIntersects = fillGroup ? raycaster.intersectObjects(fillGroup.children, false) : [];

          // Filter to only front-facing intersections (ray direction vs face normal)
          const countryIntersects = allIntersects.filter((hit) => {
            if (hit.face && hit.object) {
              const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
              return worldNormal.dot(raycaster.ray.direction) < 0;
            }
            return true;
          });

          // Reset previous country hover
          if (hoveredCountry && hoveredCountry !== selectedCountryMesh && countryIntersects.length === 0) {
            hoveredCountry.material.emissiveIntensity = 0.15;
            hoveredCountry = null;
            canvas.style.cursor = 'default';
            setHoveredName(null);
          }

          // Set hover state for country
          if (countryIntersects.length > 0) {
            const hovered = countryIntersects[0].object;
            if (hovered.userData?.type === 'country' && hovered !== hoveredCountry && hovered !== selectedCountryMesh) {
              hoveredCountry = hovered;
              hovered.material.emissiveIntensity = 0.25;
              canvas.style.cursor = 'pointer';
              setHoveredName(hovered.userData?.name || 'Country');
              setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }
          }
        }

        // Handle dragging
        if (!isDragging) return;

        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        rotation.y += deltaX * 0.005;
        rotation.x += deltaY * 0.005;
        rotation.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, rotation.x));

        globeGroup.rotation.y = rotation.y;
        globeGroup.rotation.x = rotation.x;

        previousMousePosition = { x: e.clientX, y: e.clientY };
      };

      const onMouseUp = () => {
        isDragging = false;
      };

      const onWheel = (e) => {
        e.preventDefault();

        // Adjust zoom target
        const step = e.deltaY > 0 ? ZOOM_STEP : -ZOOM_STEP;
        zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget + step));

        // Zoom-to-cursor: find world point under cursor on globe sphere
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

        // Manual ray-sphere intersection with globe surface
        const origin = raycaster.ray.origin;
        const dir = raycaster.ray.direction;
        const L = origin.clone(); // origin - center (center is 0,0,0)
        const a = dir.dot(dir);
        const b = 2 * L.dot(dir);
        const c = L.dot(L) - globeRadius * globeRadius;
        const disc = b * b - 4 * a * c;

        if (disc >= 0) {
          const t = (-b - Math.sqrt(disc)) / (2 * a);
          if (t > 0) {
            zoomAnchor = dir.clone().multiplyScalar(t).add(origin);
          } else {
            // Try the far intersection
            const t2 = (-b + Math.sqrt(disc)) / (2 * a);
            zoomAnchor = t2 > 0 ? dir.clone().multiplyScalar(t2).add(origin) : null;
          }
        } else {
          // Ray misses globe — zoom toward center
          zoomAnchor = null;
        }

        lastInteractionTime = Date.now();
      };

      let clickStart = { x: 0, y: 0 };
      const onClickDown = (event) => {
        clickStart = { x: event.clientX, y: event.clientY };
      };

      const onClick = (event) => {
        // Only register click if mouse hasn't moved much (not a drag)
        const dragDistance = Math.sqrt(
          Math.pow(event.clientX - clickStart.x, 2) +
          Math.pow(event.clientY - clickStart.y, 2)
        );
        if (dragDistance > 5) return; // Ignore if dragged more than 5px

        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

        // Ensure world matrices are up to date
        scene.updateMatrixWorld(true);

        // Check intersections with country meshes
        const allIntersects = fillGroup ? raycaster.intersectObjects(fillGroup.children, false) : [];

        // Filter to front-facing intersections only
        const countryIntersects = allIntersects.filter((hit) => {
          if (hit.face && hit.object) {
            const worldNormal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
            return worldNormal.dot(raycaster.ray.direction) < 0;
          }
          return true;
        });

        if (countryIntersects.length > 0) {
          const selected = countryIntersects[0].object;
          if (selected.userData && selected.userData.type === 'country') {
            selectCountry(selected, selected.userData);
          }
        }
      };

      const handleResize = () => {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };

      // Touch support for mobile/tablet
      let touchStartDist = 0;

      const onTouchStart = (e) => {
        if (e.touches.length === 2) {
          // Two-finger pinch zoom
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          touchStartDist = Math.sqrt(dx * dx + dy * dy);
        } else if (e.touches.length === 1) {
          // Single finger drag
          isDragging = true;
          previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
      };

      const onTouchMove = (e) => {
        if (e.touches.length === 2) {
          // Two-finger pinch zoom
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const currentDist = Math.sqrt(dx * dx + dy * dy);
          if (touchStartDist > 0) {
            const delta = currentDist - touchStartDist;
            zoomTarget = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomTarget + (delta > 0 ? ZOOM_STEP : -ZOOM_STEP)));
            zoomAnchor = null; // no anchor for pinch
            touchStartDist = currentDist;
          }
          e.preventDefault();
        } else if (e.touches.length === 1 && isDragging) {
          // Single finger drag (same as mouse drag)
          const deltaX = e.touches[0].clientX - previousMousePosition.x;
          const deltaY = e.touches[0].clientY - previousMousePosition.y;

          rotation.y += deltaX * 0.005;
          rotation.x += deltaY * 0.005;
          rotation.x = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, rotation.x));

          globeGroup.rotation.y = rotation.y;
          globeGroup.rotation.x = rotation.x;

          previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          lastInteractionTime = Date.now();
          e.preventDefault();
        }
      };

      const onTouchEnd = () => {
        isDragging = false;
        touchStartDist = 0;
      };

      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mousemove', onMouseMove);
      canvas.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('mouseleave', onMouseUp);
      window.addEventListener('mouseup', onMouseUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      canvas.addEventListener('click', onClick);
      canvas.addEventListener('touchstart', onTouchStart, { passive: false });
      canvas.addEventListener('touchmove', onTouchMove, { passive: false });
        canvas.addEventListener('touchend', onTouchEnd);
        window.addEventListener('resize', handleResize);

      let lastInteractionTime = Date.now();
      const animate = () => {
        animationId = requestAnimationFrame(animate);

        if (isDragging) {
          lastInteractionTime = Date.now();
        }

        if (sailingAnimation.active) {
          const elapsed = Date.now() - sailingAnimation.startTime;
          const progress = Math.min(elapsed / sailingAnimation.duration, 1);
          const eased = easeInOutCubic(progress);
          const point = sailingAnimation.curve.getPoint(eased);
          camera.position.copy(point);

          if (progress >= 1) {
            sailingAnimation.active = false;
            zoomTarget = camera.position.length();
          }
        }

        // Smooth zoom interpolation
        if (Math.abs(camera.position.length() - zoomTarget) > 0.05) {
          const currentDist = camera.position.length();
          const newDist = currentDist + (zoomTarget - currentDist) * ZOOM_SMOOTH;
          const cameraDir = camera.position.clone().normalize();

          // Zoom toward cursor anchor if available
          if (zoomAnchor) {
            // Calculate new camera position: move along camera direction,
            // then nudge toward anchor point proportionally to zoom change
            const anchorDir = zoomAnchor.clone().normalize();
            const distRatio = newDist / currentDist;
            // Blend: mostly along camera direction, slightly toward anchor
            const blend = 0.3; // how much to favor anchor direction
            const targetDir = cameraDir.clone().multiplyScalar(1 - blend)
              .add(anchorDir.clone().multiplyScalar(blend))
              .normalize();
            camera.position.copy(targetDir.multiplyScalar(newDist));
          } else {
            // Simple zoom along current camera direction
            camera.position.copy(cameraDir.multiplyScalar(newDist));
          }
        }

        // Auto-rotate
        if (!isDragging && !sailingAnimation.active && Date.now() - lastInteractionTime > 2000) {
          globeGroup.rotation.y += 0.00015;
        }

        // Hide labels + ref dots on the far side of the globe
        // Use normalized dot product with threshold to prevent flickering at horizon
        scene.updateMatrixWorld(true);
        const cameraDir = camera.position.clone().normalize();
        for (let i = 0; i < labelSprites.length; i++) {
          const sprite = labelSprites[i];
          const worldPos = new THREE.Vector3();
          sprite.getWorldPosition(worldPos);
          const dot = worldPos.clone().normalize().dot(cameraDir);
          sprite.visible = dot > 0.02;
        }
        for (let i = 0; i < refDots.length; i++) {
          const dot = refDots[i];
          const worldPos = new THREE.Vector3();
          dot.getWorldPosition(worldPos);
          const d = worldPos.clone().normalize().dot(cameraDir);
          dot.visible = d > 0.02;
        }

        // Animate voyage arcs progressively
        const now = Date.now();
        for (let i = 0; i < arcMeta.length; i++) {
          const meta = arcMeta[i];
          if (meta.done) continue;
          const elapsed = now - meta.startTime;
          const progress = Math.min(elapsed / meta.duration, 1);
          if (progress >= 1) {
            // Finalize with all points — only once
            meta.line.geometry.dispose();
            meta.line.geometry = new THREE.BufferGeometry().setFromPoints(meta.allPoints);
            meta.done = true;
          } else {
            const count = Math.max(2, Math.floor(progress * meta.allPoints.length));
            const visible = meta.allPoints.slice(0, count);
            meta.line.geometry.dispose();
            meta.line.geometry = new THREE.BufferGeometry().setFromPoints(visible);
          }
        }

        // Keep camera always facing globe center after position changes
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      // Store references for external animation (from search)
      globeGroupRef.current = globeGroup;
      cameraAnimationRef.current = {
        scene,
        camera,
        globeGroup,
        _renderer: renderer,
        sailingAnimation,
        _THREE: THREE,
        rebuildVoyageArcs,
        rebuildVisitedMarkers,
        arcMeta,
        // Material refs for nautical chart mode
        oceanMaterialRef: oceanMaterial,
        atmosphereInnerMaterialRef: atmosphereInnerMaterial,
        atmosphereOuterMaterialRef: atmosphereOuterMaterial,
        _gridMesh: gridMesh,
        countryMeshes,
        lineMaterials,
        animateTo: (targetPos) => {
          const startVec = camera.position.clone();
          const endVec = new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z);
          const midDir = new THREE.Vector3()
            .addVectors(startVec.clone().normalize(), endVec.clone().normalize());
          if (midDir.length() < 0.3) {
            midDir.crossVectors(startVec.clone().normalize(), new THREE.Vector3(0, 1, 0)).normalize();
          }
          midDir.normalize().multiplyScalar(350);
          sailingAnimation.active = true;
          sailingAnimation.curve = new THREE.QuadraticBezierCurve3(startVec, midDir, endVec);
          sailingAnimation.startTime = Date.now();
          sailingAnimation.duration = 1200;
        },
      };

      animate();

      cleanup = () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseleave', onMouseUp);
        canvas.removeEventListener('wheel', onWheel);
        canvas.removeEventListener('click', onClick);
        canvas.removeEventListener('touchstart', onTouchStart);
        canvas.removeEventListener('touchmove', onTouchMove);
        canvas.removeEventListener('touchend', onTouchEnd);
        cancelAnimationFrame(animationId);

        // Dispose label sprite textures (CanvasTextures with HTMLCanvasElement)
        labelSprites.forEach((sprite) => {
          if (sprite.material?.map) {
            sprite.material.map.dispose();
          }
          sprite.material?.dispose?.();
        });

        // Dispose dot materials
        refDots.forEach((dot) => {
          dot.material?.dispose?.();
        });

        scene.traverse((object) => {
          if (object.isMesh || object.isLine || object.isLineSegments) {
            if (object.geometry) object.geometry.dispose();
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat?.dispose?.());
            } else {
              object.material?.dispose?.();
            }
          }
        });

        renderer.dispose();
      };
    };

    init().catch((err) => {
      console.error('[Globe] init error:', err);
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [isReady, locations, countriesIndex]);

  // Rebuild voyage arcs and visited markers when history changes
  useEffect(() => {
    if (!cameraAnimationRef.current) return;
    cameraAnimationRef.current.rebuildVoyageArcs?.(voyageHistory);
    cameraAnimationRef.current.rebuildVisitedMarkers?.(voyageHistory);
  }, [voyageHistory]);

  // Nautical chart mode color swap
  useEffect(() => {
    const ref = cameraAnimationRef.current;
    if (!ref) return;

    try {
      if (chartMode) {
        // Save original values before switching
        if (!ref._chartOriginalColors) {
          ref._chartOriginalColors = {
            oceanColor: ref.oceanMaterialRef?.color?.getHex?.() ?? 0x0f1a2e,
            oceanEmissive: ref.oceanMaterialRef?.emissive?.getHex?.() ?? 0x060d18,
            oceanSpecular: ref.oceanMaterialRef?.specular?.getHex?.() ?? 0x1a3a5c,
            atmosphereInnerColor: 0x5ba0f0,
            atmosphereOuterColor: 0x4a80d0,
            clearColor: 0x0f172a,
            gridOpacity: 0.06,
          };
        }
        // Ocean → parchment
        ref.oceanMaterialRef?.color?.set('#d4c5a9');
        ref.oceanMaterialRef?.emissive?.set('#c4b49a');
        ref.oceanMaterialRef?.specular?.set('#c4b49a');
        // Atmosphere → warm gold
        ref.atmosphereInnerMaterialRef?.color?.set('#c4a44a');
        ref.atmosphereOuterMaterialRef?.color?.set('#b8943a');
        // Countries → sepia
        if (ref.countryMeshes) {
          ref.countryMeshes.forEach((mesh) => {
            mesh.material?.color?.set('#c4b598');
            mesh.material?.emissive?.set('#a89878');
          });
        }
        // Border lines
        if (ref.lineMaterials) {
          ref.lineMaterials.forEach((mat) => {
            mat.color?.set('#8b7d6b');
            mat.opacity = 0.8;
          });
        }
        // Grid and background
        if (ref._gridMesh?.material) ref._gridMesh.material.opacity = 0.04;
        if (ref._renderer) ref._renderer.setClearColor('#d4c5a9', 1);
      } else {
        const orig = ref._chartOriginalColors;
        if (orig) {
          ref.oceanMaterialRef?.color?.set(orig.oceanColor);
          ref.oceanMaterialRef?.emissive?.set(orig.oceanEmissive);
          ref.oceanMaterialRef?.specular?.set(orig.oceanSpecular);
          ref.atmosphereInnerMaterialRef?.color?.set(orig.atmosphereInnerColor);
          ref.atmosphereOuterMaterialRef?.color?.set(orig.atmosphereOuterColor);
          if (ref._renderer) ref._renderer.setClearColor(orig.clearColor, 1);
          if (ref._gridMesh?.material) ref._gridMesh.material.opacity = orig.gridOpacity;
        }
        // Restore each country to its original palette color
        if (ref.countryMeshes) {
          ref.countryMeshes.forEach((mesh) => {
            const origColor = mesh.userData?.originalColor || '#334155';
            const origEmissive = mesh.userData?.originalEmissive || '#0f172a';
            mesh.material?.color?.set(origColor);
            mesh.material?.emissive?.set(origEmissive);
          });
        }
        if (ref.lineMaterials) {
          ref.lineMaterials.forEach((mat) => {
            mat.color?.set('#64748b');
            mat.opacity = 0.6;
          });
        }
      }
    } catch (e) {
      console.warn('Chart mode toggle failed:', e);
    }
  }, [chartMode]);

  // Handle camera animation for searched locations
  useEffect(() => {
    if (!selectedLocation || typeof selectedLocation === 'string') return;
    if (selectedLocation.lat == null || selectedLocation.lng == null) return;
    if (!globeGroupRef.current || !cameraAnimationRef.current) return;

    // Animate camera to selected location
    const { lat, lng } = selectedLocation;
    const getWorldPosition = (lat, lng, radius) => {
      const phi = (lat * Math.PI) / 180;
      const theta = (lng * Math.PI) / 180;
      return {
        x: radius * Math.cos(phi) * Math.cos(theta),
        y: radius * Math.sin(phi),
        z: -radius * Math.cos(phi) * Math.sin(theta),
      };
    };

    const targetPos = getWorldPosition(lat, lng, 280);
    if (cameraAnimationRef.current.scene && cameraAnimationRef.current.camera) {
      cameraAnimationRef.current.animateTo(targetPos);
    }

    setSelectedCountry(selectedLocation.name);
  }, [selectedLocation]);

  return (
    <div className="flex-1 relative bg-slate-950 rounded-2xl border border-zinc-800/40 overflow-hidden group shadow-lg" style={{ minHeight: '500px' }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />

      {(loading || !isReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-3"></div>
            <span className="text-xs text-slate-400">{t('globe.loading')}</span>
          </div>
        </div>
      )}

      {isReady && !selectedCountry && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center animate-fade-in">
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-super-wide mb-4">
              {t('globe.emptyTitle')}
            </div>
            <div className="text-sm text-slate-400 font-light leading-relaxed max-w-xs">
              {t('globe.emptySubtitle')}
            </div>
          </div>
        </div>
      )}

      {isReady && selectedCountry && (
        <div className="absolute top-8 left-8 bg-slate-900/90 backdrop-blur-md rounded-xl px-6 py-4 shadow-lg border border-slate-700/50 z-20 pointer-events-auto animate-fade-in">
          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-super-wide mb-3.5">
            {t('globe.currentPort')}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
              <span className="text-slate-200 font-light">{selectedCountry}</span>
            </div>
            {selectedLocation && typeof selectedLocation === 'object' && selectedLocation.lng != null && (
              <LocalTime lng={selectedLocation.lng} />
            )}
          </div>
        </div>
      )}

      {isReady && (
        <div className="absolute bottom-8 right-8 text-slate-500 text-xs tracking-wide font-light opacity-0 group-hover:opacity-100 transition-all duration-500 z-20 pointer-events-none">
          {t('globe.hint')}
        </div>
      )}

      {/* Compass Rose */}
      {isReady && (
        <div className="absolute bottom-8 left-8 z-20 pointer-events-none opacity-30">
          <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#94a3b8" strokeWidth="0.5" />
            {/* N */}
            <polygon points="24,4 26,14 24,12 22,14" fill="#e2e8f0" opacity="0.8" />
            {/* S */}
            <polygon points="24,44 26,34 24,36 22,34" fill="#64748b" opacity="0.5" />
            {/* E */}
            <polygon points="44,24 34,22 36,24 34,26" fill="#64748b" opacity="0.5" />
            {/* W */}
            <polygon points="4,24 14,22 12,24 14,26" fill="#64748b" opacity="0.5" />
            <text x="24" y="8" textAnchor="middle" fill="#e2e8f0" fontSize="5" fontWeight="600">N</text>
          </svg>
        </div>
      )}

      {/* Hover Tooltip for Country/Region Names */}
      {hoveredName && (
        <div
          className="absolute px-3 py-1.5 bg-slate-900/95 border border-slate-700/60 rounded-lg text-slate-200 text-xs font-light tracking-wide pointer-events-none z-30 whitespace-nowrap shadow-lg"
          style={{
            left: `${tooltipPos.x + 12}px`,
            top: `${tooltipPos.y - 24}px`,
          }}
        >
          {hoveredName}
        </div>
      )}
    </div>
  );
}

export default GlobeSection;
