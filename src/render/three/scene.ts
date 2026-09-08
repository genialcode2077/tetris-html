import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Vector3,
} from 'three/webgpu';

import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import { BOARD_W, VISIBLE_H } from '@/core/constants';
import type { Palette } from '../palette';

/** Filas dibujadas: las 20 visibles más la 21 recortada, igual que en Canvas 2D. */
export const ROWS_DRAWN = VISIBLE_H + 1;
export const MAX_CELLS = BOARD_W * ROWS_DRAWN + 4;
export const MAX_GHOST = 4;
export const MAX_PARTICLES = 512;

const GAP = 0.08;

/** Convierte (x, y) del motor a coordenadas de escena, con el tablero centrado. */
export function cellPosition(x: number, y: number, out: Vector3): Vector3 {
  return out.set(x - (BOARD_W - 1) / 2, y - (VISIBLE_H - 1) / 2, 0);
}

export interface SceneParts {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly cells: InstancedMesh;
  readonly ghost: InstancedMesh;
  readonly particles: InstancedMesh;
  readonly board: Group;
  readonly grid: LineSegments;
  readonly well: Mesh;
  readonly walls: readonly Mesh[];
  readonly lights: { key: DirectionalLight; fill: PointLight; ambient: AmbientLight };
  /** Intensidad del brillo emisivo, ajustable en caliente. */
  readonly glow: { value: number };
}

/** Añade el atributo de color por instancia y lo usa también como emisión. */
function withInstanceColor(mesh: InstancedMesh, capacity: number): void {
  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  mesh.instanceColor.setUsage(35048 /* DynamicDrawUsage */);
}

function gridGeometry(): BufferGeometry {
  const positions: number[] = [];
  const halfW = BOARD_W / 2;
  const bottom = -(VISIBLE_H - 1) / 2 - 0.5;
  const top = bottom + ROWS_DRAWN;
  const z = -0.42;
  for (let x = 0; x <= BOARD_W; x++) {
    positions.push(-halfW + x, bottom, z, -halfW + x, top, z);
  }
  for (let y = 0; y <= ROWS_DRAWN; y++) {
    positions.push(-halfW, bottom + y, z, halfW, bottom + y, z);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function buildScene(palette: Palette): SceneParts {
  const scene = new Scene();
  scene.background = new Color(palette.boardBg);

  const camera = new PerspectiveCamera(32, 1, 1, 120);
  camera.position.set(0, 0, 40);

  const board = new Group();
  scene.add(board);

  const glow = { value: palette.glow ? 0.85 : 0.15 };

  // Cubo biselado compartido; el color y la emisión vienen de cada instancia.
  const geometry = new RoundedBoxGeometry(1 - GAP, 1 - GAP, 1 - GAP, 3, 0.14);
  // El color de cada celda llega por `instanceColor`, que three.js aplica al difuso.
  // El resplandor lo produce el bloom sobre esos colores, no una emisión propia:
  // así cada pieza brilla con su color sin quemarse a blanco.
  const material = new MeshStandardNodeMaterial({
    roughness: 0.3,
    metalness: 0.15,
    emissive: new Color(0x000000),
  });
  const cells = new InstancedMesh(geometry, material, MAX_CELLS);
  withInstanceColor(cells, MAX_CELLS);
  cells.frustumCulled = false;
  cells.count = 0;
  board.add(cells);

  const ghostMaterial = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    opacity: palette.ghostAlpha,
  });
  const ghost = new InstancedMesh(geometry, ghostMaterial, MAX_GHOST);
  withInstanceColor(ghost, MAX_GHOST);
  ghost.frustumCulled = false;
  ghost.count = 0;
  board.add(ghost);

  const particleMaterial = new MeshBasicNodeMaterial({ transparent: true });
  const particles = new InstancedMesh(
    new RoundedBoxGeometry(0.24, 0.24, 0.24, 1, 0.06),
    particleMaterial,
    MAX_PARTICLES,
  );
  withInstanceColor(particles, MAX_PARTICLES);
  particles.frustumCulled = false;
  particles.count = 0;
  board.add(particles);

  // Fondo del pozo: oscuro y mate, para que el resplandor de las piezas destaque.
  const well = new Mesh(
    new PlaneGeometry(BOARD_W, ROWS_DRAWN),
    new MeshBasicNodeMaterial({ color: new Color(palette.boardBg) }),
  );
  well.position.set(0, -(VISIBLE_H - 1) / 2 - 0.5 + ROWS_DRAWN / 2, -0.75);
  board.add(well);

  // Paredes del pozo: un marco fino en tres lados que encierra el tablero.
  const wallMaterial = new MeshStandardNodeMaterial({
    color: new Color(palette.boardBg).lerp(new Color(0xffffff), 0.09),
    roughness: 0.6,
    metalness: 0.3,
  });
  const wellBottom = -(VISIBLE_H - 1) / 2 - 0.5;
  const wallThickness = 0.42;
  const wallDepth = 1.5;
  const sideGeometry = new RoundedBoxGeometry(wallThickness, ROWS_DRAWN, wallDepth, 2, 0.08);
  const leftWall = new Mesh(sideGeometry, wallMaterial);
  leftWall.position.set(-BOARD_W / 2 - wallThickness / 2, wellBottom + ROWS_DRAWN / 2, -0.2);
  const rightWall = new Mesh(sideGeometry, wallMaterial);
  rightWall.position.set(BOARD_W / 2 + wallThickness / 2, wellBottom + ROWS_DRAWN / 2, -0.2);
  const floorGeometry = new RoundedBoxGeometry(
    BOARD_W + wallThickness * 2,
    wallThickness,
    wallDepth,
    2,
    0.08,
  );
  const floor = new Mesh(floorGeometry, wallMaterial);
  floor.position.set(0, wellBottom - wallThickness / 2, -0.2);
  board.add(leftWall, rightWall, floor);

  const grid = new LineSegments(
    gridGeometry(),
    new LineBasicMaterial({
      color: new Color(palette.gridSolid),
      transparent: true,
      opacity: 0.07,
    }),
  );
  board.add(grid);

  const ambient = new AmbientLight(0xffffff, 0.62);
  const key = new DirectionalLight(0xffffff, 1.55);
  key.position.set(-8, 14, 18);
  const fill = new PointLight(0x66ccff, 35, 70);
  fill.position.set(8, -8, 14);
  scene.add(ambient, key, fill);

  // Inclinación base: da perspectiva sin dificultar la lectura del tablero.
  board.rotation.set(0.05, 0, 0);

  return {
    scene,
    camera,
    cells,
    ghost,
    particles,
    board,
    grid,
    well,
    walls: [leftWall, rightWall, floor],
    lights: { key, fill, ambient },
    glow,
  };
}

/** Ajusta la cámara para que el pozo quepa completo con un margen pequeño. */
export function fitCamera(camera: PerspectiveCamera, width: number, height: number): void {
  const aspect = width / Math.max(1, height);
  camera.aspect = aspect;
  const fovRad = (camera.fov * Math.PI) / 180;
  const targetH = ROWS_DRAWN + 1.1;
  const targetW = BOARD_W + 1.4;
  const distH = targetH / 2 / Math.tan(fovRad / 2);
  const distW = targetW / 2 / Math.tan(fovRad / 2) / aspect;
  camera.position.z = Math.max(distH, distW);
  camera.updateProjectionMatrix();
}

export const dummy = new Object3D();
export const scratchMatrix = new Matrix4();
export const scratchColor = new Color();
export const scratchVector = new Vector3();
