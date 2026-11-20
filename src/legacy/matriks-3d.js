import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const HIGH_PRIORITY = 75;
const MEDIUM_PRIORITY = 50;
// Scores 3 and 4 normalize to 5 and 7.5, so their midpoint is 6.25.
const QUADRANT_SPLIT = 6.25;
const LABEL_FONT_SIZE = 44;
const LABEL_TEXT_SIZE = 15;
const LABEL_CANVAS_HEIGHT = 60;
const QUADRANT_COLORS = {
  utama: 0x2e9e5b,
  potensi: 0xe0a800,
  pertimbangkan: 0x2f80ed,
  tunda: 0xd64545
};

const priorityFor = function (score) {
  if (score >= HIGH_PRIORITY) return { name: 'Prioritas Tinggi', color: 0x22e5ff };
  if (score >= MEDIUM_PRIORITY) return { name: 'Prioritas Sedang', color: 0x3b82f6 };
  return { name: 'Prioritas Rendah', color: 0x6b7a99 };
};

const quadrantFor = function (idea) {
  const feasibilityHigh = idea.f >= QUADRANT_SPLIT;
  const impactHigh = idea.i >= QUADRANT_SPLIT;
  if (feasibilityHigh && impactHigh) return { name: 'Prioritas Utama', color: QUADRANT_COLORS.utama };
  if (!feasibilityHigh && impactHigh) return { name: 'Potensi', color: QUADRANT_COLORS.potensi };
  if (feasibilityHigh && !impactHigh) return { name: 'Pertimbangkan', color: QUADRANT_COLORS.pertimbangkan };
  return { name: 'Tunda', color: QUADRANT_COLORS.tunda };
};

const colorHex = function (color) {
  return '#' + color.toString(16).padStart(6, '0');
};

const escapeHtml = function (text) {
  return String(text).replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character];
  });
};

export function mountMatrix3D(container, ideas) {
  const viewport = container.querySelector('.matrix-3d-shell');
  const canvas = container.querySelector('.matrix-3d-canvas');
  const reset = container.querySelector('.matrix-3d-reset');
  const tooltip = container.querySelector('.matrix-3d-tooltip');
  const card = container.querySelector('.matrix-3d-card');
  const cardName = container.querySelector('.matrix-3d-card-name');
  const cardTag = container.querySelector('.matrix-3d-card-tag');
  const cardDetails = container.querySelector('.matrix-3d-card-details');
  const closeCard = container.querySelector('.matrix-3d-close');
  const hint = container.querySelector('.matrix-3d-hint');
  const ranked = ideas.slice().sort(function (a, b) { return b.s - a.s; });
  const topScore = ideas.reduce(function (highest, idea) { return Math.max(highest, idea.s); }, 0);
  const averageScore = ideas.length
    ? ideas.reduce(function (total, idea) { return total + idea.s; }, 0) / ideas.length
    : 0;
  container.querySelector('#matrixIdeaCount').textContent = String(ideas.length);
  container.querySelector('#matrixTopScore').textContent = String(topScore / 10) + '/10';
  container.querySelector('#matrixAverageScore').textContent = (averageScore / 10).toFixed(1) + '/10';
  const resources = new Set();
  const labelSprites = new Set();
  const track = function (resource) {
    if (resource && typeof resource.dispose === 'function') resources.add(resource);
    return resource;
  };
  const pointFor = function (idea) {
    return new THREE.Vector3(idea.f, idea.s / 10, idea.i);
  };
  const positionOffsets = [];
  const duplicateGroups = {};
  ideas.forEach(function (idea, index) {
    const key = [idea.f, idea.i, idea.s].join(',');
    (duplicateGroups[key] = duplicateGroups[key] || []).push(index);
  });
  Object.keys(duplicateGroups).forEach(function (key) {
    const indices = duplicateGroups[key];
    const radius = indices.length === 1 ? 0 : (indices.length === 2 ? 0.14 : 0.2);
    indices.forEach(function (index, order) {
      const angle = Math.PI / 2 + 2 * Math.PI * order / indices.length;
      positionOffsets[index] = {
        x: radius * Math.cos(angle),
        z: radius * Math.sin(angle)
      };
    });
  });
  const displayPointFor = function (idea, index) {
    const position = pointFor(idea);
    const offset = positionOffsets[index] || { x: 0, z: 0 };
    position.x += offset.x;
    position.z += offset.z;
    return position;
  };
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080f20);
  scene.fog = new THREE.Fog(0x0a1020, 28, 60);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  const home = {
    position: new THREE.Vector3(17, 11.5, 18),
    target: new THREE.Vector3(5, 5, 5)
  };
  camera.position.copy(home.position);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(home.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 6;
  controls.maxDistance = 45;
  controls.enabled = false;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.18;
  controls.maxPolarAngle = Math.PI * 0.48;
  const onControlStart = function () { controls.autoRotate = false; };
  controls.addEventListener('start', onControlStart);

  scene.add(new THREE.HemisphereLight(0x8dbbff, 0x101a30, 0.9));
  const directionalLight = new THREE.DirectionalLight(0xd7e9ff, 1.45);
  directionalLight.position.set(8, 16, 11);
  scene.add(directionalLight);
  const pointLight = new THREE.PointLight(0x22d3ee, 1.1, 34);
  pointLight.position.set(4, 9, 8);
  scene.add(pointLight);

  const labelScaleForViewport = function () {
    const textHeight = LABEL_TEXT_SIZE * LABEL_CANVAS_HEIGHT / LABEL_FONT_SIZE;
    return 2 * textHeight * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) /
      Math.max(viewport.clientHeight, 1);
  };

  function label(text, options) {
    const config = Object.assign({ color: '#9fb4da', weight: 500 }, options || {});
    const labelCanvas = document.createElement('canvas');
    const context = labelCanvas.getContext('2d');
    context.font = config.weight + ' ' + LABEL_FONT_SIZE + 'px system-ui, sans-serif';
    const width = Math.ceil(context.measureText(text).width) + 16;
    labelCanvas.width = width;
    labelCanvas.height = LABEL_CANVAS_HEIGHT;
    context.font = config.weight + ' ' + LABEL_FONT_SIZE + 'px system-ui, sans-serif';
    context.fillStyle = config.color;
    context.textBaseline = 'middle';
    context.lineJoin = 'round';
    context.lineWidth = LABEL_FONT_SIZE / 8;
    context.strokeStyle = 'rgba(5, 11, 24, .88)';
    context.strokeText(text, 8, labelCanvas.height / 2 + 2);
    context.fillText(text, 8, labelCanvas.height / 2 + 2);

    const texture = track(new THREE.CanvasTexture(labelCanvas));
    texture.minFilter = THREE.LinearFilter;
    const material = track(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false
    }));
    const sprite = new THREE.Sprite(material);
    const aspect = labelCanvas.width / labelCanvas.height;
    const scale = labelScaleForViewport();
    sprite.scale.set(aspect * scale, scale, 1);
    labelSprites.add(sprite);
    sprite.renderOrder = 10;
    return sprite;
  }

  function resizeLabels() {
    const scale = labelScaleForViewport();
    labelSprites.forEach(function (sprite) {
      const aspect = sprite.scale.x / sprite.scale.y;
      sprite.scale.set(aspect * scale, scale, 1);
    });
  }

  const gridColor = 0x3a5a96;
  const minorGridColor = 0x263957;
  const addGrid = function (rotationX, rotationZ, position) {
    const grid = new THREE.GridHelper(10, 10, gridColor, minorGridColor);
    grid.rotation.x = rotationX;
    grid.rotation.z = rotationZ;
    grid.position.set(position[0], position[1], position[2]);
    grid.material.transparent = true;
    grid.material.opacity = 0.7;
    scene.add(grid);
  };
  addGrid(0, 0, [5, 0, 5]);
  addGrid(Math.PI / 2, 0, [5, 5, 0]);
  addGrid(0, Math.PI / 2, [0, 5, 5]);

  const starPositions = [];
  for (let star = 0; star < 180; star += 1) {
    starPositions.push(
      (Math.random() - 0.5) * 34,
      2 + Math.random() * 18,
      (Math.random() - 0.5) * 34
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: 0x8eaed8, size: 0.035, transparent: true, opacity: 0.45, sizeAttenuation: true })
  );
  scene.add(stars);

  const addQuadrant = function (x, z, width, depth, color, opacity) {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(x + width / 2, 0.01, z + depth / 2);
    scene.add(plane);
  };
  addQuadrant(QUADRANT_SPLIT, QUADRANT_SPLIT, 10 - QUADRANT_SPLIT, 10 - QUADRANT_SPLIT, QUADRANT_COLORS.utama, 0.12);
  addQuadrant(0, QUADRANT_SPLIT, QUADRANT_SPLIT, 10 - QUADRANT_SPLIT, QUADRANT_COLORS.potensi, 0.1);
  addQuadrant(QUADRANT_SPLIT, 0, 10 - QUADRANT_SPLIT, QUADRANT_SPLIT, QUADRANT_COLORS.pertimbangkan, 0.1);
  addQuadrant(0, 0, QUADRANT_SPLIT, QUADRANT_SPLIT, QUADRANT_COLORS.tunda, 0.1);
  [
    [(QUADRANT_SPLIT + 10) / 2, (QUADRANT_SPLIT + 10) / 2, 'PRIORITAS UTAMA', '#69e69a'],
    [QUADRANT_SPLIT / 2, (QUADRANT_SPLIT + 10) / 2, 'POTENSI', '#ffe17c'],
    [(QUADRANT_SPLIT + 10) / 2, QUADRANT_SPLIT / 2, 'PERTIMBANGKAN', '#82b9ff'],
    [QUADRANT_SPLIT / 2, QUADRANT_SPLIT / 2, 'TUNDA', '#ff8b9b']
  ].forEach(function (item) {
    const quadrantLabel = label(item[2], { color: item[3], weight: 700 });
    quadrantLabel.position.set(item[0], 0.08, item[1]);
    scene.add(quadrantLabel);
  });
  const dividerMaterial = new THREE.MeshBasicMaterial({ color: 0x8db7f5, toneMapped: false });
  const dividerAlongX = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.025, 0.045),
    dividerMaterial
  );
  dividerAlongX.position.set(5, 0.04, QUADRANT_SPLIT);
  const dividerAlongZ = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.025, 10),
    dividerMaterial
  );
  dividerAlongZ.position.set(QUADRANT_SPLIT, 0.04, 5);
  scene.add(dividerAlongX, dividerAlongZ);

  const priorityZoneGeometry = new THREE.BoxGeometry(10 - QUADRANT_SPLIT, 2.5, 10 - QUADRANT_SPLIT);
  const priorityZone = new THREE.Mesh(
    priorityZoneGeometry,
    new THREE.MeshBasicMaterial({ color: 0x22e5ff, transparent: true, opacity: 0.05, depthWrite: false })
  );
  priorityZone.position.set((QUADRANT_SPLIT + 10) / 2, 8.75, (QUADRANT_SPLIT + 10) / 2);
  scene.add(priorityZone);
  const priorityZoneEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(priorityZoneGeometry),
    new THREE.LineBasicMaterial({ color: 0x22e5ff, transparent: true, opacity: 0.55 })
  );
  priorityZoneEdges.position.copy(priorityZone.position);
  scene.add(priorityZoneEdges);

  const axisMaterial = new THREE.LineBasicMaterial({ color: 0x8fb0ee });
  const addAxis = function (start, end) {
    scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start[0], start[1], start[2]),
        new THREE.Vector3(end[0], end[1], end[2])
      ]),
      axisMaterial
    ));
  };
  addAxis([0, 0, 10], [10, 0, 10]);
  addAxis([0, 0, 0], [10, 0, 0]);
  addAxis([0, 0, 0], [0, 0, 10]);
  addAxis([0, 0, 0], [0, 10, 0]);
  for (let value = 0; value <= 10; value += 2.5) {
    const sourceScore = Math.round(value / 2.5) + 1;
    let axisLabel = label(sourceScore);
    axisLabel.position.set(value, -0.05, 10.7);
    scene.add(axisLabel);
    axisLabel = label(sourceScore);
    axisLabel.position.set(-0.7, -0.05, value);
    scene.add(axisLabel);
  }
  for (let value = 0; value <= 10; value += 2) {
    const axisLabel = label(value);
    axisLabel.position.set(-0.7, value, -0.05);
    scene.add(axisLabel);
  }
  [
    ['Kelayakan (X)', 5, -0.1, 11.9],
    ['Dampak (Z)', -1.9, -0.1, 5],
    ['Total Nilai (Y)', -0.2, 10.9, -0.05]
  ].forEach(function (item) {
    const axisLabel = label(item[0], { color: '#dbe7ff', weight: 700 });
    axisLabel.position.set(item[1], item[2], item[3]);
    scene.add(axisLabel);
  });

  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const glowContext = glowCanvas.getContext('2d');
  const glowGradient = glowContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  glowGradient.addColorStop(0, 'rgba(255,255,255,.9)');
  glowGradient.addColorStop(0.25, 'rgba(255,255,255,.35)');
  glowGradient.addColorStop(1, 'rgba(255,255,255,0)');
  glowContext.fillStyle = glowGradient;
  glowContext.fillRect(0, 0, 128, 128);
  const glowTexture = track(new THREE.CanvasTexture(glowCanvas));
  const sphereGeometry = new THREE.SphereGeometry(0.19, 40, 32);
  const points = [];
  const pickables = [];
  const rings = [];

  ideas.forEach(function (idea, index) {
    const quadrant = quadrantFor(idea);
    const position = displayPointFor(idea, index);
    const group = new THREE.Group();
    group.position.copy(position);
    const sphere = new THREE.Mesh(sphereGeometry, new THREE.MeshStandardMaterial({
      color: quadrant.color,
      emissive: quadrant.color,
      emissiveIntensity: idea.s >= HIGH_PRIORITY ? 0.9 : 0.45,
      roughness: 0.2,
      metalness: 0.22
    }));
    const size = 0.85 + Math.min(Math.max(idea.s, 0), 100) / 100 * 0.55;
    sphere.scale.setScalar(size);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture,
      color: quadrant.color,
      transparent: true,
      opacity: idea.s >= HIGH_PRIORITY ? 0.9 : 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    halo.scale.setScalar(1.5 * size);
    group.add(sphere, halo);
    const projectionLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -position.y, 0)
      ]),
        new THREE.LineBasicMaterial({ color: quadrant.color, transparent: true, opacity: 0.35 })
    );
    group.add(projectionLine);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.17, 0.22, 40),
      new THREE.MeshBasicMaterial({
        color: quadrant.color,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -position.y + 0.02;
    group.add(ring);

    if (ranked.indexOf(idea) < 3) {
      const isWinner = ranked[0] === idea;
      const priorityRing = new THREE.Mesh(
        new THREE.RingGeometry(isWinner ? 0.34 : 0.29, isWinner ? 0.38 : 0.32, 56),
        new THREE.MeshBasicMaterial({
          color: isWinner ? 0xffd166 : quadrant.color,
          transparent: true,
          opacity: isWinner ? 0.95 : 0.62,
          side: THREE.DoubleSide
        })
      );
      priorityRing.rotation.x = -Math.PI / 2;
      priorityRing.position.y = -position.y + 0.02;
      group.add(priorityRing);
      rings.push(priorityRing);
      const rankLabel = label('#' + (ranked.indexOf(idea) + 1), {
        color: isWinner ? '#ffe19a' : '#c4e6ff',
        weight: 800
      });
      rankLabel.position.set(0, isWinner ? 0.78 : 0.68, 0);
      group.add(rankLabel);
    }

    group.scale.setScalar(0.001);
    scene.add(group);
    sphere.userData.ideaIndex = index;
    pickables.push(sphere);
    points.push({
      group: group,
      sphere: sphere,
      halo: halo,
      idea: idea,
      size: size,
      delay: index * 60,
      startTime: performance.now()
    });
  });

  const projection = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({
      color: 0xaee8ff,
      dashSize: 0.15,
      gapSize: 0.1,
      transparent: true,
      opacity: 0.8
    })
  );
  scene.add(projection);
  const projectionLabels = [0, 1, 2].map(function () {
    const projectionLabel = label('0', { color: '#ffffff', weight: 700 });
    projectionLabel.visible = false;
    scene.add(projectionLabel);
    return projectionLabel;
  });

  function setProjection(index) {
    if (index < 0) {
      projection.visible = false;
      projectionLabels.forEach(function (item) { item.visible = false; });
      return;
    }
    const position = displayPointFor(ideas[index], index);
    const idea = ideas[index];
    projection.geometry.setFromPoints([
      position, new THREE.Vector3(position.x, position.y, 0),
      position, new THREE.Vector3(0, position.y, position.z),
      position, new THREE.Vector3(position.x, 0, position.z)
    ]);
    projection.computeLineDistances();
    projection.visible = true;
    const values = [Math.round(idea.f / 2.5) + 1, Math.round(idea.i / 2.5) + 1, idea.s / 10];
    const spots = [
      new THREE.Vector3(position.x, position.y + 0.35, 0),
      new THREE.Vector3(0, position.y + 0.35, position.z),
      new THREE.Vector3(position.x, 0.35, position.z)
    ];
    projectionLabels.forEach(function (projectionLabel, index) {
      const nextLabel = label(String(values[index]), { color: '#ffffff', weight: 700 });
      projectionLabel.material.map = nextLabel.material.map;
      projectionLabel.scale.copy(nextLabel.scale);
      labelSprites.delete(nextLabel);
      projectionLabel.position.copy(spots[index]);
      projectionLabel.visible = true;
    });
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let hoveredIndex = -1;
  let selectedIndex = -1;
  let pointerDown = null;
  let focusTween = null;
  let interactionActive = false;

  function setInteractionActive(active) {
    interactionActive = active;
    controls.enabled = active;
    container.classList.toggle('controls-active', active);
    hint.setAttribute('aria-label', active
      ? 'Kontrol aktif. Seret untuk memutar, scroll untuk zoom. Klik di luar matriks untuk kembali scroll halaman.'
      : 'Klik matriks untuk mengaktifkan kontrol. Scroll halaman tetap normal.');
  }

  function hitTest(event) {
    const bounds = canvas.getBoundingClientRect();
    mouse.set(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      -(event.clientY - bounds.top) / bounds.height * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    return hits.length ? hits[0].object.userData.ideaIndex : -1;
  }

  function tooltipHtml(idea) {
    return '<b>' + escapeHtml(idea.n) + '</b><small>Kelayakan ' + (Math.round(idea.f / 2.5) + 1) + '/5' +
      ' · Dampak ' + (Math.round(idea.i / 2.5) + 1) + '/5 · Total Score ' + (idea.s / 10) + '/10<br>' +
      quadrantFor(idea).name + ' · ' + priorityFor(idea.s).name + '</small>';
  }

  function onPointerMove(event) {
    const hit = hitTest(event);
    if (hit !== hoveredIndex) {
      hoveredIndex = hit;
      canvas.style.cursor = hit >= 0 ? 'pointer' : '';
      setProjection(hit >= 0 ? hit : selectedIndex);
    }
    if (hit >= 0) {
      const bounds = container.getBoundingClientRect();
      tooltip.innerHTML = tooltipHtml(ideas[hit]);
      tooltip.style.opacity = '1';
      tooltip.style.left = Math.min(event.clientX - bounds.left + 16, bounds.width - 240) + 'px';
      tooltip.style.top = Math.min(event.clientY - bounds.top + 16, bounds.height - 70) + 'px';
    } else {
      tooltip.style.opacity = '0';
    }
  }

  function onPointerDown(event) {
    pointerDown = [event.clientX, event.clientY];
    setInteractionActive(true);
  }

  function onDocumentPointerDown(event) {
    if (interactionActive && !container.contains(event.target)) {
      setInteractionActive(false);
    }
  }

  function select(index) {
    selectedIndex = index;
    setProjection(index >= 0 ? index : -1);
    if (index < 0) {
      card.classList.remove('on');
      return;
    }
    const idea = ideas[index];
    const priority = priorityFor(idea.s);
    const color = colorHex(priority.color);
    cardName.textContent = idea.n;
    cardTag.textContent = priority.name;
    cardTag.style.color = color;
    cardTag.style.borderColor = color;
    const row = function (name, value, max, displayValue) {
      return '<dt>' + name + '</dt><dd>' + displayValue + '</dd>' +
        '<div class="matrix-3d-bar" style="grid-column:1/-1"><i style="width:' +
        value / max * 100 + '%;background:' + color + '"></i></div>';
    };
    const feasibility = Math.round(idea.f / 2.5) + 1;
    const impact = Math.round(idea.i / 2.5) + 1;
    const total = idea.s / 10;
    cardDetails.innerHTML = row('Kelayakan', feasibility, 5, feasibility + '/5') +
      row('Dampak', impact, 5, impact + '/5') +
      row('Total Score', total, 10, total + '/10') +
      '<dt>Kuadran</dt><dd>' + quadrantFor(idea).name + '</dd>' +
      '<dt>Peringkat</dt><dd>#' + (ranked.indexOf(idea) + 1) + ' dari ' + ideas.length + '</dd>';
    card.classList.add('on');
    controls.autoRotate = false;
    const position = displayPointFor(idea, index);
    focusTween = { from: controls.target.clone(), to: position.clone(), progress: 0 };
  }

  function onPointerUp(event) {
    if (!pointerDown || Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) > 4) return;
    select(hitTest(event));
  }

  function onCloseCard() {
    select(-1);
  }

  function onReset() {
    select(-1);
    focusTween = {
      from: controls.target.clone(),
      to: home.target.clone(),
      progress: 0,
      cameraFrom: camera.position.clone(),
      cameraTo: home.position.clone()
    };
  }

  function resize() {
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width / height < 1.4 ? 74 : 42;
    camera.updateProjectionMatrix();
    resizeLabels();
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointerdown', onDocumentPointerDown);
  closeCard.addEventListener('click', onCloseCard);
  reset.addEventListener('click', onReset);
  window.addEventListener('resize', resize);
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  if (resizeObserver) resizeObserver.observe(viewport);
  resize();

  const ease = function (value) { return 1 - Math.pow(1 - value, 3); };
  let active = true;
  let animationFrame = 0;
  function animate() {
    if (!active) return;
    animationFrame = window.requestAnimationFrame(animate);
    const now = performance.now();
    points.forEach(function (point) {
      const progress = Math.min(Math.max((now - point.startTime - point.delay) / 900, 0), 1);
      const highlighted = ideas[hoveredIndex] === point.idea || ideas[selectedIndex] === point.idea;
      const target = ease(progress) * (highlighted ? 1.3 : 1);
      point.group.scale.setScalar(Math.max(point.group.scale.x + (target - point.group.scale.x) * 0.18, 0.001));
      point.halo.material.opacity = (point.idea.s >= HIGH_PRIORITY ? 0.7 + 0.15 * Math.sin(now / 500) : 0.45) +
        (highlighted ? 0.25 : 0);
    });
    rings.forEach(function (ring, index) {
      const scale = 1 + 0.25 * Math.sin(now / 600 + index);
      ring.scale.set(scale, scale, 1);
    });
    priorityZone.material.opacity = 0.04 + 0.02 * Math.sin(now / 900);
    if (focusTween) {
      focusTween.progress = Math.min(focusTween.progress + 0.045, 1);
      const progress = ease(focusTween.progress);
      controls.target.lerpVectors(focusTween.from, focusTween.to, progress);
      if (focusTween.cameraFrom) {
        camera.position.lerpVectors(focusTween.cameraFrom, focusTween.cameraTo, progress);
      }
      if (focusTween.progress >= 1) focusTween = null;
    }
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  return function unmountMatrix3D() {
    if (!active) return;
    active = false;
    window.cancelAnimationFrame(animationFrame);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointerdown', onDocumentPointerDown);
    closeCard.removeEventListener('click', onCloseCard);
    reset.removeEventListener('click', onReset);
    if (resizeObserver) resizeObserver.disconnect();
    controls.removeEventListener('start', onControlStart);
    controls.dispose();
    card.classList.remove('on');
    tooltip.style.opacity = '0';

    scene.traverse(function (object) {
      if (object.geometry) track(object.geometry);
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(function (material) {
          track(material);
          Object.keys(material).forEach(function (key) {
            if (material[key] && material[key].isTexture) track(material[key]);
          });
        });
      }
    });
    resources.forEach(function (resource) { resource.dispose(); });
    renderer.dispose();
  };
}
