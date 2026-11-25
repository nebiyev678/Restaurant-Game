import * as THREE from 'three';
import { CharacterParts, FaceExpression, HandProp, setHandProp, updateFace } from './models';

export type WorldCollider =
  | { kind: 'aabb'; minX: number; maxX: number; minZ: number; maxZ: number }
  | { kind: 'circle'; x: number; z: number; r: number };

export interface NavWaypoint {
  x: number;
  z: number;
}

export interface AvoidanceActor {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  isFirm: boolean; // Seated diners or player car
  isCar?: boolean;
}

const SQRT2 = Math.SQRT2;

export function distanceToCollider(x: number, z: number, c: WorldCollider): number {
  if (c.kind === 'circle') {
    return Math.hypot(x - c.x, z - c.z) - c.r;
  }
  const cx = THREE.MathUtils.clamp(x, c.minX, c.maxX);
  const cz = THREE.MathUtils.clamp(z, c.minZ, c.maxZ);
  const dx = x - cx;
  const dz = z - cz;
  if (dx === 0 && dz === 0) {
    return -Math.min(x - c.minX, c.maxX - x, z - c.minZ, c.maxZ - z);
  }
  return Math.hypot(dx, dz);
}

export function isPointBlocked(
  x: number,
  z: number,
  radius: number,
  ...colliderLists: WorldCollider[][]
): boolean {
  for (let l = 0; l < colliderLists.length; l++) {
    const list = colliderLists[l];
    for (let i = 0; i < list.length; i++) {
      if (distanceToCollider(x, z, list[i]) < radius) {
        return true;
      }
    }
  }
  return false;
}

export function resolveColliderList(
  pos: THREE.Vector3,
  radius: number,
  colliders: WorldCollider[]
) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.kind === 'circle') {
      const dx = pos.x - c.x;
      const dz = pos.z - c.z;
      const minDist = radius + c.r;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        if (distSq < 1e-6) {
          pos.x += minDist;
        } else {
          const dist = Math.sqrt(distSq);
          const overlap = minDist - dist;
          pos.x += (dx / dist) * overlap;
          pos.z += (dz / dist) * overlap;
        }
      }
    } else {
      const closestX = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
      const closestZ = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;
      if (distSq === 0) {
        const dLeft = pos.x - c.minX;
        const dRight = c.maxX - pos.x;
        const dTop = pos.z - c.minZ;
        const dBot = c.maxZ - pos.z;
        const minEdge = Math.min(dLeft, dRight, dTop, dBot);
        if (minEdge === dLeft) pos.x = c.minX - radius;
        else if (minEdge === dRight) pos.x = c.maxX + radius;
        else if (minEdge === dTop) pos.z = c.minZ - radius;
        else pos.z = c.maxZ + radius;
      } else if (distSq < radius * radius) {
        const dist = Math.sqrt(distSq);
        const overlap = radius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      }
    }
  }
}

export function resolveVehicleCapsule(
  pos: THREE.Vector3,
  radius: number,
  carPos: THREE.Vector3,
  carYaw: number
) {
  const fx = Math.sin(carYaw) * 0.85;
  const fz = Math.cos(carYaw) * 0.85;
  const carR = 0.88;
  for (const sign of [-1, 1]) {
    const cx = carPos.x + fx * sign;
    const cz = carPos.z + fz * sign;
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const minDist = radius + carR;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      if (distSq < 1e-6) {
        pos.x += minDist;
      } else {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      }
    }
  }
}

/**
 * Lightweight 2D occupancy grid & A* pathfinder with line-of-sight smoothing
 * for restaurant, patio, and entrance navigation.
 */
export class RestaurantNavGrid {
  readonly minX = -15.5;
  readonly maxX = 12.5;
  readonly minZ = -11.5;
  readonly maxZ = 11.5;
  readonly cellSize = 0.65;
  readonly cols: number;
  readonly rows: number;

  private blocked: Uint8Array;
  private gScore: Float32Array;
  private fScore: Float32Array;
  private cameFrom: Int32Array;
  private closed: Uint8Array;
  private openList: number[] = [];

  constructor() {
    this.cols = Math.ceil((this.maxX - this.minX) / this.cellSize);
    this.rows = Math.ceil((this.maxZ - this.minZ) / this.cellSize);
    const total = this.cols * this.rows;
    this.blocked = new Uint8Array(total);
    this.gScore = new Float32Array(total);
    this.fScore = new Float32Array(total);
    this.cameFrom = new Int32Array(total);
    this.closed = new Uint8Array(total);
  }

  public rebuild(clearanceRadius: number, ...colliderLists: WorldCollider[][]) {
    this.blocked.fill(0);
    for (let r = 0; r < this.rows; r++) {
      const wz = this.minZ + (r + 0.5) * this.cellSize;
      for (let c = 0; c < this.cols; c++) {
        const wx = this.minX + (c + 0.5) * this.cellSize;
        if (isPointBlocked(wx, wz, clearanceRadius, ...colliderLists)) {
          this.blocked[r * this.cols + c] = 1;
        }
      }
    }
  }

  private worldToCell(x: number, z: number): { c: number; r: number } {
    const c = THREE.MathUtils.clamp(
      Math.floor((x - this.minX) / this.cellSize),
      0,
      this.cols - 1
    );
    const r = THREE.MathUtils.clamp(
      Math.floor((z - this.minZ) / this.cellSize),
      0,
      this.rows - 1
    );
    return { c, r };
  }

  private cellToWorld(c: number, r: number): NavWaypoint {
    return {
      x: this.minX + (c + 0.5) * this.cellSize,
      z: this.minZ + (r + 0.5) * this.cellSize,
    };
  }

  private findNearestWalkable(c0: number, r0: number): number {
    const idx0 = r0 * this.cols + c0;
    if (this.blocked[idx0] === 0) return idx0;
    let bestIdx = -1;
    let bestDistSq = Infinity;
    for (let rad = 1; rad <= 5; rad++) {
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const nc = c0 + dc;
          const nr = r0 + dr;
          if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
          const nIdx = nr * this.cols + nc;
          if (this.blocked[nIdx] === 0) {
            const dSq = dc * dc + dr * dr;
            if (dSq < bestDistSq) {
              bestDistSq = dSq;
              bestIdx = nIdx;
            }
          }
        }
      }
      if (bestIdx !== -1) return bestIdx;
    }
    return idx0;
  }

  /** Every cell reachable on foot from a point (1 = reachable). */
  public floodFrom(x: number, z: number): Uint8Array {
    const seen = new Uint8Array(this.cols * this.rows);
    const { c, r } = this.worldToCell(x, z);
    const start = this.findNearestWalkable(c, r);
    if (this.blocked[start]) return seen;
    const queue = [start];
    seen[start] = 1;
    while (queue.length) {
      const idx = queue.pop()!;
      const cc = idx % this.cols;
      const rr = (idx - cc) / this.cols;
      for (const [dc, dr] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const nc = cc + dc;
        const nr = rr + dr;
        if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
        const n = nr * this.cols + nc;
        if (seen[n] || this.blocked[n]) continue;
        seen[n] = 1;
        queue.push(n);
      }
    }
    return seen;
  }

  /** True when a point (or a cell right next to it) was reached by `floodFrom`. */
  public canReach(flood: Uint8Array, x: number, z: number): boolean {
    const { c, r } = this.worldToCell(x, z);
    for (const [dc, dr] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nc = c + dc;
      const nr = r + dr;
      if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
      if (flood[nr * this.cols + nc]) return true;
    }
    return false;
  }

  public hasGridLineOfSight(x0: number, z0: number, x1: number, z1: number): boolean {
    const dist = Math.hypot(x1 - x0, z1 - z0);
    const steps = Math.max(3, Math.ceil(dist / (this.cellSize * 0.25)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      const { c, r } = this.worldToCell(px, pz);
      if (this.blocked[r * this.cols + c] !== 0) return false;
    }
    return true;
  }

  public findPath(startX: number, startZ: number, goalX: number, goalZ: number): NavWaypoint[] {
    if (
      startX >= this.minX &&
      startX <= this.maxX &&
      goalX >= this.minX &&
      goalX <= this.maxX &&
      startZ >= this.minZ &&
      startZ <= this.maxZ &&
      goalZ >= this.minZ &&
      goalZ <= this.maxZ &&
      this.hasGridLineOfSight(startX, startZ, goalX, goalZ)
    ) {
      return [{ x: goalX, z: goalZ }];
    }

    const sc = this.worldToCell(startX, startZ);
    const gc = this.worldToCell(goalX, goalZ);
    const startIdx = this.findNearestWalkable(sc.c, sc.r);
    const goalIdx = this.findNearestWalkable(gc.c, gc.r);

    if (startIdx === goalIdx) {
      return [{ x: goalX, z: goalZ }];
    }

    const goalC = goalIdx % this.cols;
    const goalR = Math.floor(goalIdx / this.cols);

    this.gScore.fill(Infinity);
    this.fScore.fill(Infinity);
    this.cameFrom.fill(-1);
    this.closed.fill(0);
    this.openList.length = 0;

    this.gScore[startIdx] = 0;
    const sC = startIdx % this.cols;
    const sR = Math.floor(startIdx / this.cols);
    const dx0 = Math.abs(goalC - sC);
    const dz0 = Math.abs(goalR - sR);
    this.fScore[startIdx] = Math.max(dx0, dz0) + (SQRT2 - 1) * Math.min(dx0, dz0);
    this.openList.push(startIdx);

    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, SQRT2],
      [1, -1, SQRT2],
      [-1, 1, SQRT2],
      [-1, -1, SQRT2],
    ];

    let found = false;
    let iters = 0;
    const maxIters = 4000;

    while (this.openList.length > 0 && iters++ < maxIters) {
      // Find lowest fScore in openList
      let bestPos = 0;
      let bestF = this.fScore[this.openList[0]];
      for (let i = 1; i < this.openList.length; i++) {
        const f = this.fScore[this.openList[i]];
        if (f < bestF) {
          bestF = f;
          bestPos = i;
        }
      }

      const curr = this.openList[bestPos];
      this.openList[bestPos] = this.openList[this.openList.length - 1];
      this.openList.pop();

      if (curr === goalIdx) {
        found = true;
        break;
      }

      if (this.closed[curr]) continue;
      this.closed[curr] = 1;

      const cc = curr % this.cols;
      const cr = Math.floor(curr / this.cols);
      const currG = this.gScore[curr];

      for (let d = 0; d < 8; d++) {
        const dc = dirs[d][0];
        const dr = dirs[d][1];
        const cost = dirs[d][2];
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nc >= this.cols || nr < 0 || nr >= this.rows) continue;
        const nIdx = nr * this.cols + nc;
        if (this.closed[nIdx] || this.blocked[nIdx]) continue;

        // Prevent diagonal corner cutting through blocked orthogonal cells
        if (dc !== 0 && dr !== 0) {
          if (
            this.blocked[cr * this.cols + (cc + dc)] ||
            this.blocked[(cr + dr) * this.cols + cc]
          ) {
            continue;
          }
        }

        const tentativeG = currG + cost;
        if (tentativeG < this.gScore[nIdx]) {
          this.cameFrom[nIdx] = curr;
          this.gScore[nIdx] = tentativeG;
          const hdx = Math.abs(goalC - nc);
          const hdz = Math.abs(goalR - nr);
          const h = Math.max(hdx, hdz) + (SQRT2 - 1) * Math.min(hdx, hdz);
          this.fScore[nIdx] = tentativeG + h;
          this.openList.push(nIdx);
        }
      }
    }

    if (!found) {
      return [{ x: goalX, z: goalZ }];
    }

    // Reconstruct raw path from start to goal
    const raw: NavWaypoint[] = [];
    let cur = goalIdx;
    while (cur !== -1 && cur !== startIdx) {
      const c = cur % this.cols;
      const r = Math.floor(cur / this.cols);
      raw.push(this.cellToWorld(c, r));
      cur = this.cameFrom[cur];
    }
    raw.reverse();
    if (raw.length > 0) {
      raw[raw.length - 1] = { x: goalX, z: goalZ };
    } else {
      raw.push({ x: goalX, z: goalZ });
    }

    // String-pulling line-of-sight smoothing for natural diagonal paths
    const smoothed: NavWaypoint[] = [];
    let anchorX = startX;
    let anchorZ = startZ;
    let idx = 0;
    while (idx < raw.length) {
      let furthest = idx;
      for (let j = raw.length - 1; j > idx; j--) {
        if (this.hasGridLineOfSight(anchorX, anchorZ, raw[j].x, raw[j].z)) {
          furthest = j;
          break;
        }
      }
      const nextPt = raw[furthest];
      smoothed.push(nextPt);
      anchorX = nextPt.x;
      anchorZ = nextPt.z;
      idx = furthest + 1;
    }

    return smoothed;
  }
}

/**
 * Computes realistic steering direction combining path following,
 * predictive social avoidance (right-hand passing bias), and car dodging.
 */
export function computeNpcSteering(
  selfX: number,
  selfZ: number,
  selfVx: number,
  selfVz: number,
  selfRadius: number,
  targetX: number,
  targetZ: number,
  maxSpeed: number,
  others: AvoidanceActor[],
  selfIndex: number,
  outDir: THREE.Vector2
): void {
  let dirX = targetX - selfX;
  let dirZ = targetZ - selfZ;
  const distToTarget = Math.hypot(dirX, dirZ);
  if (distToTarget < 1e-4) {
    outDir.set(0, 0);
    return;
  }
  dirX /= distToTarget;
  dirZ /= distToTarget;

  let avoidX = 0;
  let avoidZ = 0;

  for (let i = 0; i < others.length; i++) {
    if (i === selfIndex) continue;
    const o = others[i];
    const rx = o.x - selfX;
    const rz = o.z - selfZ;
    const dist = Math.hypot(rx, rz);
    const senseRange = o.isCar ? 3.2 : o.isFirm ? 1.05 : 1.55;
    if (dist > senseRange || dist < 1e-4) continue;

    // Immediate personal space repulsion
    const personalGap = selfRadius + o.radius + (o.isCar ? 0.85 : 0.28);
    if (dist < personalGap) {
      const push = (personalGap - dist) / personalGap;
      avoidX -= (rx / dist) * push * (o.isCar ? 3.4 : 1.85);
      avoidZ -= (rz / dist) * push * (o.isCar ? 3.4 : 1.85);
    }

    // Predictive time-to-closest-approach along forward heading
    const forwardDot = (rx / dist) * dirX + (rz / dist) * dirZ;
    if (forwardDot > -0.15) {
      const rvx = dirX * maxSpeed - o.vx;
      const rvz = dirZ * maxSpeed - o.vz;
      const rvSq = rvx * rvx + rvz * rvz;
      if (rvSq > 0.04) {
        const tca = THREE.MathUtils.clamp((rx * rvx + rz * rvz) / rvSq, 0, 0.75);
        const futDx = rx - rvx * tca;
        const futDz = rz - rvz * tca;
        const futDist = Math.hypot(futDx, futDz);
        const safeDist = selfRadius + o.radius + (o.isCar ? 0.9 : 0.34);
        if (futDist < safeDist) {
          const urgency = ((safeDist - futDist) / safeDist) * (1 - tca * 0.6);
          // Sidestep perpendicular to forward heading (right-hand rule convention)
          const perpX = -dirZ;
          const perpZ = dirX;
          const sideSign = futDx * perpX + futDz * perpZ >= 0 ? -1 : 1;
          // Prefer passing on the right when head-on
          const bias = Math.abs(futDx * perpX + futDz * perpZ) < 0.08 ? 1 : sideSign;
          const weight = o.isCar ? 2.6 : o.isFirm ? 1.25 : 1.5;
          avoidX += perpX * bias * urgency * weight;
          avoidZ += perpZ * bias * urgency * weight;
        }
      }
    }
  }

  let sx = dirX + avoidX;
  let sz = dirZ + avoidZ;
  const sLen = Math.hypot(sx, sz);
  if (sLen > 1e-4) {
    sx /= sLen;
    sz /= sLen;
  } else {
    sx = dirX;
    sz = dirZ;
  }

  // Smooth blend with slight inertia
  outDir.set(sx, sz);
}

export type NpcActivityPose =
  | 'locomotion'
  | 'seated_waiting'
  | 'eating'
  | 'cooking'
  | 'cleaning';

/** How a cook works at each machine (and the tool in their hand). */
export type CookStyle = 'flip' | 'chop' | 'shake' | 'stir' | 'pour' | 'scoop';

export const COOK_STYLE_BY_STATION: Record<string, CookStyle> = {
  grill: 'flip',
  prep: 'chop',
  fryer: 'shake',
  oven: 'stir',
  bar: 'pour',
  specialty: 'scoop',
};

export const PROP_BY_STYLE: Record<CookStyle, HandProp> = {
  flip: 'spatula',
  chop: 'knife',
  shake: 'basket',
  stir: 'ladle',
  pour: 'shaker',
  scoop: 'scoop',
};

export interface CharacterPoseParams {
  parts: CharacterParts;
  walkPhase: number;
  speedRatio: number; // 0..1
  carrying: boolean;
  sitBlend: number; // 0 standing .. 1 seated
  pose: NpcActivityPose;
  activityTime: number;
  seedOffset: number;
  impatient?: boolean;
  baseGroundY: number;
  /** Face to show (default: happy). */
  expression?: FaceExpression;
  /** Cooking motion and tool (default: stir). */
  cookStyle?: CookStyle;
}

const damp = THREE.MathUtils.damp;

/**
 * Full-body animation for every character: a smooth walk cycle with knees, elbows,
 * body bob, sway and lean; seated, eating, cleaning and cooking poses with tools in
 * hand; idle breathing; and the face (expression, blinking, chewing).
 */
export function applyCharacterKinematics(p: CharacterPoseParams) {
  const { parts, speedRatio, carrying, sitBlend, pose, activityTime, seedOffset, impatient, baseGroundY } = p;
  const a = parts.anim;
  // Own clock so callers don't need to pass dt
  const now = performance.now() / 1000;
  const dt = a.lastNow ? THREE.MathUtils.clamp(now - a.lastNow, 0, 0.1) : 1 / 60;
  a.lastNow = now;
  a.time += dt;

  // Blend speed smoothly so starting and stopping ease in and out (no snapping legs)
  a.speed = damp(a.speed, THREE.MathUtils.clamp(speedRatio, 0, 1), 9, dt);
  const amp = a.speed;
  const phase = p.walkPhase !== 0 ? p.walkPhase : (a.phase ?? 0);
  a.phase = phase;
  const L = phase;
  const R = phase + Math.PI;
  const stand = 1 - sitBlend;

  // ---- Legs: hip swing plus a knee that bends while the leg swings forward ----
  const hip = (ph: number) => Math.sin(ph) * 0.58 * amp;
  const knee = (ph: number) => amp * (0.12 + 0.9 * Math.max(0, -Math.cos(ph)));
  const seatedHip = -1.46;
  const seatedKnee = 1.36;
  parts.leftLeg.rotation.x = THREE.MathUtils.lerp(hip(L), seatedHip, sitBlend);
  parts.rightLeg.rotation.x = THREE.MathUtils.lerp(hip(R), seatedHip, sitBlend);
  if (parts.leftKnee) {
    parts.leftKnee.rotation.x = THREE.MathUtils.lerp(knee(L), seatedKnee, sitBlend);
    parts.rightKnee.rotation.x = THREE.MathUtils.lerp(knee(R), seatedKnee, sitBlend);
  }
  // Restless foot tap for impatient seated customers
  if (sitBlend > 0.85 && pose === 'seated_waiting' && (impatient || p.expression === 'impatient' || p.expression === 'angry') && parts.rightKnee) {
    parts.rightKnee.rotation.x = seatedKnee - Math.max(0, Math.sin(activityTime * 9.5 + seedOffset)) * 0.22;
  }

  // ---- Body: bob twice per stride, sway side to side, lean into the walk, breathe when idle ----
  const bob = Math.abs(Math.cos(phase)) * 0.045 * amp;
  const breathe = Math.sin(a.time * 2.1 + seedOffset) * (1 - amp);
  parts.root.position.y = baseGroundY + bob * stand - sitBlend * 0.075;
  parts.root.rotation.order = 'YXZ';
  parts.root.rotation.z = Math.sin(phase) * 0.035 * amp * stand;

  let lean = amp * 0.09;
  if (sitBlend > 0.5 && pose === 'eating') lean = 0.09 + Math.sin(activityTime * 4.5 + seedOffset) * 0.025;
  else if (pose === 'cooking') lean = 0.07;
  else if (pose === 'cleaning') lean = 0.14;
  a.lean = damp(a.lean, lean, 8, dt);
  parts.root.rotation.x = a.lean * 0.45 * stand;
  parts.torsoMesh.rotation.x = a.lean * 0.6;
  parts.torsoMesh.rotation.y = Math.sin(phase) * 0.1 * amp;
  parts.torsoMesh.scale.y = 1 + breathe * 0.012;

  // ---- Arms ----
  const setArm = (arm: THREE.Group, elbow: THREE.Group | undefined, x: number, z: number, ex: number) => {
    arm.rotation.x = damp(arm.rotation.x, x, 18, dt);
    arm.rotation.z = damp(arm.rotation.z, z, 18, dt);
    if (elbow) elbow.rotation.x = damp(elbow.rotation.x, ex, 18, dt);
  };
  const swingArm = (ph: number) => -Math.sin(ph) * 0.62 * amp;
  const swingElbow = (ph: number) => -0.16 - amp * 0.42 * Math.max(0, Math.sin(ph));
  const idleZ = 0.05 + breathe * 0.015;

  let prop: HandProp | null = null;
  parts.trayMesh.visible = carrying;
  if (carrying) {
    setArm(parts.leftArm, parts.leftElbow, swingArm(L) * 0.8, idleZ, swingElbow(L));
    setArm(parts.rightArm, parts.rightElbow, -2.15 + Math.sin(phase) * 0.04 * amp, 0.3, -0.05);
  } else if (sitBlend > 0.2) {
    const sitLeftX = -0.62;
    let sitRightX = -0.62;
    let sitRightZ = -0.06;
    let sitRightE = -0.5;
    if (pose === 'eating') {
      const bite = Math.max(0, Math.sin(activityTime * 4.2 + seedOffset));
      sitRightX = -0.7 - bite * 0.45;
      sitRightZ = -0.16 * bite;
      sitRightE = -0.6 - bite * 1.0;
    } else if (pose === 'seated_waiting' && (impatient || p.expression === 'impatient' || p.expression === 'angry')) {
      // Drumming fingers on the table
      sitRightE = -0.55 + Math.sin(activityTime * 14 + seedOffset) * 0.12;
    }
    setArm(
      parts.leftArm,
      parts.leftElbow,
      THREE.MathUtils.lerp(swingArm(L), sitLeftX, sitBlend),
      THREE.MathUtils.lerp(0, 0.06, sitBlend),
      THREE.MathUtils.lerp(swingElbow(L), -0.5, sitBlend)
    );
    setArm(
      parts.rightArm,
      parts.rightElbow,
      THREE.MathUtils.lerp(swingArm(R), sitRightX, sitBlend),
      THREE.MathUtils.lerp(0, sitRightZ, sitBlend),
      THREE.MathUtils.lerp(swingElbow(R), sitRightE, sitBlend)
    );
  } else if (pose === 'cooking') {
    const style = p.cookStyle ?? 'stir';
    prop = PROP_BY_STYLE[style];
    const t = activityTime + seedOffset;
    let lx = -0.85;
    let lz = 0.12;
    let le = -0.75;
    let rx = -0.85;
    let rz = -0.1;
    let re = -0.7;
    let wrist = 0;
    switch (style) {
      case 'flip': {
        // Press, press… flip! The spatula flicks up every 1.4 s
        const k = (t % 1.4) / 1.4;
        const lift = k < 0.22 ? Math.sin((k / 0.22) * Math.PI) : 0;
        rx = -0.8 - lift * 0.55 + Math.sin(t * 6) * 0.04;
        re = -0.55 - lift * 0.5;
        wrist = -0.9 * lift;
        break;
      }
      case 'chop': {
        // Quick knife chops, the other hand steadying the food
        const c = Math.max(0, Math.sin(t * 15));
        rx = -0.72 - c * 0.12;
        re = -0.95 + c * 0.35;
        lx = -0.7;
        le = -1.0;
        lz = 0.22;
        break;
      }
      case 'shake': {
        // Lift the fry basket and give it a shake now and then
        const k = (t % 2.2) / 2.2;
        const burst = k < 0.35 ? Math.sin(t * 26) * 0.08 : 0;
        rx = -0.9 + burst;
        re = -0.6 + burst;
        lx = -0.9 + burst;
        le = -0.65;
        break;
      }
      case 'stir': {
        // Round and round with the ladle
        rx = -0.9 + Math.sin(t * 5) * 0.14;
        rz = -0.12 + Math.cos(t * 5) * 0.14;
        re = -0.75;
        break;
      }
      case 'pour': {
        // Shake the drink, holding a glass in the other hand
        const sh = Math.sin(t * 13);
        rx = -1.0 + sh * 0.22;
        re = -1.2 + sh * 0.3;
        lx = -0.75;
        le = -1.0;
        break;
      }
      case 'scoop': {
        // Scoop, lift, serve
        const k = (t % 1.3) / 1.3;
        rx = -0.75 - Math.sin(k * Math.PI * 2) * 0.25;
        re = -0.8 - Math.max(0, Math.sin(k * Math.PI * 2)) * 0.4;
        wrist = Math.sin(k * Math.PI * 2) * 0.5;
        break;
      }
    }
    setArm(parts.leftArm, parts.leftElbow, lx, lz, le);
    setArm(parts.rightArm, parts.rightElbow, rx, rz, re);
    if (parts.rightGrip) parts.rightGrip.rotation.x = damp(parts.rightGrip.rotation.x, wrist, 20, dt);
  } else if (pose === 'cleaning') {
    prop = 'cloth';
    const wipe = Math.sin(activityTime * 8.0 + seedOffset);
    setArm(parts.leftArm, parts.leftElbow, -0.4, 0.08, -0.4);
    setArm(parts.rightArm, parts.rightElbow, -0.95 + Math.cos(activityTime * 8.0 + seedOffset) * 0.12, -0.2 + wipe * 0.28, -0.5);
  } else {
    // Walking or standing: relaxed arms swinging opposite the legs, elbows softly bent
    setArm(parts.leftArm, parts.leftElbow, swingArm(L), idleZ, swingElbow(L));
    setArm(parts.rightArm, parts.rightElbow, swingArm(R), -idleZ, swingElbow(R));
  }
  if (pose !== 'cooking' && parts.rightGrip) parts.rightGrip.rotation.x = damp(parts.rightGrip.rotation.x, 0, 20, dt);
  if (parts.props && (prop || Object.keys(parts.props).length)) setHandProp(parts, carrying ? null : prop);

  // ---- Head: steady while walking, glancing around when waiting, watching the work when cooking ----
  let hx = -bob * 0.6;
  let hy = 0;
  if (pose === 'eating') {
    hx = 0.12 + Math.sin(activityTime * 6.5 + seedOffset) * 0.12;
  } else if (pose === 'seated_waiting') {
    const glanceSpeed = impatient ? 2.1 : 0.95;
    hx = Math.sin(activityTime * 1.4 + seedOffset) * 0.04;
    hy = Math.sin(activityTime * glanceSpeed + seedOffset) * 0.22;
    if (p.expression === 'angry') hy = Math.sin(activityTime * 7 + seedOffset) * 0.12;
  } else if (pose === 'cooking' || pose === 'cleaning') {
    hx = 0.2;
    hy = Math.sin(activityTime * 1.8 + seedOffset) * 0.08;
  } else if (amp < 0.1) {
    // Idle: look around now and then
    hy = Math.sin(a.time * 0.7 + seedOffset) * 0.18 * Math.max(0, Math.sin(a.time * 0.31 + seedOffset * 2));
  }
  parts.headGroup.rotation.x = damp(parts.headGroup.rotation.x, hx, 10, dt);
  parts.headGroup.rotation.y = damp(parts.headGroup.rotation.y, hy, 8, dt);

  // ---- Face ----
  const expr: FaceExpression =
    p.expression ?? (pose === 'eating' ? 'eating' : pose === 'cooking' ? 'focused' : impatient && pose === 'seated_waiting' ? 'impatient' : 'happy');
  updateFace(parts, expr, dt);
}
