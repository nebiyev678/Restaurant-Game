import * as THREE from 'three';
import { CharacterParts } from './models';

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
}

/**
 * Applies physically grounded, expressive limb, torso, head, and hip-height kinematics.
 */
export function applyCharacterKinematics(p: CharacterPoseParams) {
  const {
    parts,
    walkPhase,
    speedRatio,
    carrying,
    sitBlend,
    pose,
    activityTime,
    seedOffset,
    impatient,
    baseGroundY,
  } = p;

  const strideAmp = THREE.MathUtils.clamp(speedRatio, 0, 1);
  const swing = strideAmp > 0.02 ? Math.sin(walkPhase) * 0.65 * strideAmp : 0;

  // 1. Legs: smoothly transition between walking stride and seated bend (-1.45 rad)
  const seatedLegAngle = -1.46;
  parts.leftLeg.rotation.x = THREE.MathUtils.lerp(swing, seatedLegAngle, sitBlend);
  parts.rightLeg.rotation.x = THREE.MathUtils.lerp(-swing, seatedLegAngle, sitBlend);

  // Subtle restless foot tap for impatient seated customers
  if (sitBlend > 0.85 && pose === 'seated_waiting' && impatient) {
    parts.rightLeg.rotation.x = seatedLegAngle + Math.sin(activityTime * 9.5 + seedOffset) * 0.08;
  }

  // 2. Vertical hip height: walk bounce when moving, lower pelvis onto chair cushion when seated
  const walkBounce = strideAmp > 0.05 ? Math.abs(Math.sin(walkPhase)) * 0.032 * strideAmp : 0;
  parts.root.position.y = baseGroundY + walkBounce - sitBlend * 0.075;

  // Subtle torso lean forward while walking fast or eating
  let leanX = strideAmp * 0.055;
  if (sitBlend > 0.5 && pose === 'eating') {
    leanX = 0.09 + Math.sin(activityTime * 4.5 + seedOffset) * 0.025;
  } else if (pose === 'cooking') {
    leanX = 0.06;
  } else if (pose === 'cleaning') {
    leanX = 0.14;
  }
  parts.torsoMesh.rotation.x = leanX;

  // 3. Arms & Carrying Tray
  parts.trayMesh.visible = carrying;
  if (carrying) {
    parts.leftArm.rotation.x = -swing * 0.72;
    parts.leftArm.rotation.z = 0;
    parts.rightArm.rotation.x = -2.15 + Math.sin(walkPhase) * 0.04 * strideAmp;
    parts.rightArm.rotation.z = 0.30;
  } else if (sitBlend > 0.2) {
    // Seated pose: arms rest forward over lap/table; right hand eats when eating
    const standLeft = -swing * 0.72;
    const standRight = swing * 0.72;
    const sitLeft = -0.62;
    let sitRight = -0.62;
    let sitRightZ = -0.06;

    if (pose === 'eating') {
      const biteCycle = Math.max(0, Math.sin(activityTime * 4.2 + seedOffset));
      sitRight = -0.78 - biteCycle * 0.65;
      sitRightZ = -0.16 * biteCycle;
    }

    parts.leftArm.rotation.x = THREE.MathUtils.lerp(standLeft, sitLeft, sitBlend);
    parts.leftArm.rotation.z = THREE.MathUtils.lerp(0, 0.06, sitBlend);
    parts.rightArm.rotation.x = THREE.MathUtils.lerp(standRight, sitRight, sitBlend);
    parts.rightArm.rotation.z = THREE.MathUtils.lerp(0, sitRightZ, sitBlend);
  } else if (pose === 'cooking') {
    // Alternating spatula/stirring motion over stove or prep station
    const stir = Math.sin(activityTime * 7.2 + seedOffset);
    parts.leftArm.rotation.x = -0.75 + stir * 0.16;
    parts.leftArm.rotation.z = 0.08;
    parts.rightArm.rotation.x = -0.88 - stir * 0.24;
    parts.rightArm.rotation.z = -0.1 + Math.cos(activityTime * 7.2 + seedOffset) * 0.08;
  } else if (pose === 'cleaning') {
    // Wiping table surface in sweeping arcs
    const wipe = Math.sin(activityTime * 8.0 + seedOffset);
    parts.leftArm.rotation.x = -0.4;
    parts.leftArm.rotation.z = 0.08;
    parts.rightArm.rotation.x = -0.95 + Math.cos(activityTime * 8.0 + seedOffset) * 0.12;
    parts.rightArm.rotation.z = -0.2 + wipe * 0.28;
  } else {
    parts.leftArm.rotation.x = -swing * 0.75;
    parts.leftArm.rotation.z = 0;
    parts.rightArm.rotation.x = swing * 0.75;
    parts.rightArm.rotation.z = 0;
  }

  // 4. Head expression & natural looking around
  if (pose === 'eating') {
    parts.headGroup.rotation.x = 0.12 + Math.sin(activityTime * 6.5 + seedOffset) * 0.12;
    parts.headGroup.rotation.y = 0;
  } else if (pose === 'seated_waiting') {
    const glanceSpeed = impatient ? 2.1 : 0.95;
    parts.headGroup.rotation.x = Math.sin(activityTime * 1.4 + seedOffset) * 0.04;
    parts.headGroup.rotation.y = Math.sin(activityTime * glanceSpeed + seedOffset) * 0.22;
  } else if (pose === 'cooking' || pose === 'cleaning') {
    parts.headGroup.rotation.x = 0.14;
    parts.headGroup.rotation.y = Math.sin(activityTime * 1.8 + seedOffset) * 0.08;
  } else {
    parts.headGroup.rotation.x = 0;
    parts.headGroup.rotation.y = 0;
  }
}
