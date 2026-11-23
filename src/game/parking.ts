/**
 * Customer cars: drive in from the edge of town, park in the restaurant lot,
 * the driver walks to the entrance (and becomes a normal customer), later walks
 * back, reverses out of the bay and drives away.
 *
 * Driving is right-hand traffic on a two-lane back street (z = 19 westbound,
 * z = 21 eastbound). Cars brake smoothly, keep distance from other cars and stop
 * for the player. Simple priority rules prevent cars blocking each other forever.
 */
import * as THREE from 'three';
import { VEHICLE_CATALOG } from './data';
import { CharacterParts, createVehicleMesh } from './models';
import { applyCharacterKinematics } from './npcPhysics';
import { CustomerArchetype, VehicleDef } from './types';

// ---------------------------------------------------------------------------
// Layout (shared with the old-town ground builder)
// ---------------------------------------------------------------------------
export const PARKING = {
  /** Bay centre x positions; cars park nose-in facing the restaurant (-z). */
  bays: [-6.0, -3.4, -0.8, 1.8, 4.4],
  bayWidth: 2.6,
  parkedZ: 15.2,
  bayFrontZ: 12.9,
  bayBackZ: 17.7,
  /** Back street from the lot to the edge of town. */
  street: { minX: -8.6, maxX: 56, minZ: 17.8, maxZ: 22.2, westLaneZ: 19.0, eastLaneZ: 21.0 },
  spawnX: 56,
  /** Footpath column east of the terrace, leading down to the entrance area. */
  walkX: 11.15,
  walkZ: 11.3,
  /** Where the driver becomes a regular customer (the usual arrival spot). */
  handoff: { x: 10.6, z: 2.3 },
  maxCars: 3,
} as const;

type Waypoint = { x: number; z: number; speed: number; reverse?: boolean };

interface NpcCar {
  id: string;
  bay: number;
  group: THREE.Group;
  wheels: THREE.Mesh[];
  pos: THREE.Vector3;
  yaw: number;
  speed: number;
  path: Waypoint[];
  pathIdx: number;
  state: 'arriving' | 'parked' | 'unparking' | 'departing';
  blockedTimer: number;
  /** Driver (customer) details, kept so the same person walks back. */
  archetype: CustomerArchetype;
  seed: number;
}

interface Walker {
  carId: string;
  mesh: CharacterParts;
  path: { x: number; z: number }[];
  idx: number;
  phase: number;
  activity: number;
  seedOffset: number;
  direction: 'toRestaurant' | 'toCar';
  archetype: CustomerArchetype;
  seed: number;
}

export interface ParkingHooks {
  scene: THREE.Scene;
  /** Driver reached the entrance area: engine turns them into a customer. Return false if there's no room. */
  onDriverArrived: (mesh: CharacterParts, archetype: CustomerArchetype, seed: number, carId: string) => boolean;
  /** Creates the driver's character model. */
  createDriver: (archetype: CustomerArchetype, seed: number) => CharacterParts;
}

const CAR_COLORS = ['#b91c1c', '#1d4ed8', '#f8fafc', '#111827', '#15803d', '#a16207', '#64748b', '#7c3aed', '#0e7490'];
const CAR_RADIUS = 1.9; // forward look-ahead separation

export class ParkingTraffic {
  private cars: NpcCar[] = [];
  private walkers: Walker[] = [];
  private hooks: ParkingHooks;
  private nextId = 1;

  constructor(hooks: ParkingHooks) {
    this.hooks = hooks;
  }

  /** Cars as 2-circle capsules for collision (player walking / driving). */
  getCarObstacles(): { pos: THREE.Vector3; yaw: number }[] {
    return this.cars.map((c) => ({ pos: c.pos, yaw: c.yaw }));
  }

  /** Customers on their way in (driving or walking from the lot) — counts toward restaurant capacity. */
  inTransitCount(): number {
    return (
      this.cars.filter((c) => c.state === 'arriving').length +
      this.walkers.filter((w) => w.direction === 'toRestaurant').length
    );
  }

  freeBayCount(): number {
    const used = new Set(this.cars.map((c) => c.bay));
    return PARKING.bays.length - used.size;
  }

  /** Try to send a customer by car. Returns false if the lot is full or traffic is at its limit. */
  trySpawnCar(archetype: CustomerArchetype, seed: number): boolean {
    if (this.cars.length >= PARKING.maxCars) return false;
    const used = new Set(this.cars.map((c) => c.bay));
    const free = PARKING.bays.map((_, i) => i).filter((i) => !used.has(i));
    if (free.length === 0) return false;
    // Nobody may be in the spawn area (avoid two cars popping in on top of each other)
    if (this.cars.some((c) => c.pos.x > PARKING.spawnX - 8 && c.state === 'arriving')) return false;
    const bay = free[Math.floor(Math.random() * free.length)];

    const pool = VEHICLE_CATALOG.filter((v) => ['hatch', 'compact', 'sedan', 'suv'].includes(v.style));
    const base = pool[Math.floor(Math.random() * pool.length)] ?? VEHICLE_CATALOG[0];
    const def: VehicleDef = { ...base, bodyColor: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)] };
    const parts = createVehicleMesh(def);
    const pos = new THREE.Vector3(PARKING.spawnX, 0, PARKING.street.westLaneZ);
    const yaw = -Math.PI / 2; // heading -x
    parts.group.position.copy(pos);
    parts.group.rotation.y = yaw;
    this.hooks.scene.add(parts.group);

    const car: NpcCar = {
      id: `npccar_${this.nextId++}`,
      bay,
      group: parts.group,
      wheels: parts.wheels,
      pos,
      yaw,
      speed: 6,
      path: this.arrivalPath(bay),
      pathIdx: 0,
      state: 'arriving',
      blockedTimer: 0,
      archetype,
      seed,
    };
    this.cars.push(car);
    return true;
  }

  /** A car customer finished their visit: walk them back to their car. */
  driverReturn(carId: string, mesh: CharacterParts, archetype: CustomerArchetype, seed: number) {
    const car = this.cars.find((c) => c.id === carId);
    if (!car) {
      this.hooks.scene.remove(mesh.root);
      return;
    }
    const doorX = PARKING.bays[car.bay] - 1.15;
    this.walkers.push({
      carId,
      mesh,
      path: [
        { x: PARKING.handoff.x + 0.4, z: PARKING.handoff.z + 0.4 },
        { x: PARKING.walkX, z: 2.9 },
        { x: PARKING.walkX, z: PARKING.walkZ },
        { x: doorX, z: PARKING.walkZ },
        { x: doorX, z: PARKING.parkedZ },
      ],
      idx: 0,
      phase: 0,
      activity: 0,
      seedOffset: (seed % 100) * 0.17,
      direction: 'toCar',
      archetype,
      seed,
    });
  }

  clear() {
    for (const c of this.cars) this.hooks.scene.remove(c.group);
    for (const w of this.walkers) this.hooks.scene.remove(w.mesh.root);
    this.cars = [];
    this.walkers = [];
  }

  update(dt: number, player: { pos: THREE.Vector3; inVehicle: boolean }) {
    this.updateWalkers(dt);
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      if (car.state === 'parked') continue;
      this.driveCar(car, dt, player);
      if (car.state === 'departing' && car.pathIdx >= car.path.length) {
        this.hooks.scene.remove(car.group);
        this.cars.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  private arrivalPath(bay: number): Waypoint[] {
    const bx = PARKING.bays[bay];
    const lz = PARKING.street.westLaneZ;
    return [
      { x: bx + 6, z: lz, speed: 6.5 },
      { x: bx + 2.8, z: lz - 0.2, speed: 2.6 },
      { x: bx + 1.0, z: 17.6, speed: 2.0 },
      { x: bx, z: 16.4, speed: 1.6 },
      { x: bx, z: PARKING.parkedZ, speed: 1.2 },
    ];
  }

  private departurePath(bay: number): Waypoint[] {
    const bx = PARKING.bays[bay];
    const ez = PARKING.street.eastLaneZ;
    return [
      { x: bx, z: 16.8, speed: 1.4, reverse: true },
      { x: bx - 0.7, z: 18.6, speed: 1.4, reverse: true },
      { x: bx - 1.4, z: 19.7, speed: 1.2, reverse: true },
      { x: bx + 1.8, z: ez, speed: 2.4 },
      { x: bx + 6, z: ez, speed: 5 },
      { x: PARKING.spawnX + 2, z: ez, speed: 7 },
    ];
  }

  private driveCar(car: NpcCar, dt: number, player: { pos: THREE.Vector3; inVehicle: boolean }) {
    const wp = car.path[car.pathIdx];
    if (!wp) return;
    const dx = wp.x - car.pos.x;
    const dz = wp.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    const isLast = car.pathIdx === car.path.length - 1;

    // Desired speed: segment limit, braking for the final stop
    let target = wp.speed;
    if (isLast && car.state !== 'departing') target = Math.min(target, Math.sqrt(2 * 2.2 * dist) + 0.15);

    // Yield to whatever is in front of the direction of travel
    const dirX = dist > 1e-4 ? dx / dist : Math.sin(car.yaw);
    const dirZ = dist > 1e-4 ? dz / dist : Math.cos(car.yaw);
    let blocked = this.isPathBlocked(car, dirX, dirZ, player);
    // Anti-deadlock: give up yielding to other cars after a while (people still always win)
    if (blocked === 'car') {
      car.blockedTimer += dt;
      if (car.blockedTimer > 5) blocked = false;
    } else if (!blocked) {
      car.blockedTimer = 0;
    }
    if (blocked) target = 0;

    // Smooth acceleration (3.2 m/s²) and braking (7 m/s²)
    if (car.speed < target) car.speed = Math.min(target, car.speed + 3.2 * dt);
    else car.speed = Math.max(target, car.speed - 7 * dt);

    const step = Math.min(dist, car.speed * dt);
    if (dist > 1e-4) {
      car.pos.x += dirX * step;
      car.pos.z += dirZ * step;
      // Heading follows the motion (reversed when backing out)
      let desiredYaw = Math.atan2(dirX, dirZ);
      if (wp.reverse) desiredYaw += Math.PI;
      const turnRate = 2.2 + car.speed * 0.9;
      car.yaw = lerpAngle(car.yaw, desiredYaw, Math.min(1, turnRate * dt));
    }
    const wheelSpin = (wp.reverse ? -1 : 1) * car.speed * dt * 2.9;
    for (const w of car.wheels) w.rotation.x += wheelSpin;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.yaw;

    if (dist < 0.12 || (step >= dist && dist < 0.5)) {
      car.pathIdx++;
      if (car.pathIdx >= car.path.length && car.state === 'arriving') {
        // Parked: square up, driver gets out
        car.state = 'parked';
        car.speed = 0;
        car.yaw = Math.PI;
        car.group.rotation.y = car.yaw;
        this.spawnDriver(car);
      }
    }
  }

  private isPathBlocked(
    car: NpcCar,
    dirX: number,
    dirZ: number,
    player: { pos: THREE.Vector3; inVehicle: boolean }
  ): false | 'car' | 'person' {
    const check = (px: number, pz: number, reach: number) => {
      const rx = px - car.pos.x;
      const rz = pz - car.pos.z;
      const ahead = rx * dirX + rz * dirZ;
      if (ahead <= 0 || ahead > reach) return false;
      const lateral = Math.abs(rx * dirZ - rz * dirX);
      return lateral < 1.5;
    };
    const lookAhead = CAR_RADIUS + 1.2 + car.speed * 0.6;
    // Player (on foot or driving)
    if (check(player.pos.x, player.pos.z, player.inVehicle ? lookAhead + 1.5 : lookAhead)) return 'person';
    // Walking drivers
    for (const w of this.walkers) {
      if (check(w.mesh.root.position.x, w.mesh.root.position.z, lookAhead)) return 'person';
    }
    // Other cars (a reversing car doesn't wait for others: it's slow and has right of way)
    const reversing = car.path[car.pathIdx]?.reverse;
    if (!reversing) {
      for (const o of this.cars) {
        // Parked cars sit inside their bays, never in the driving lane
        if (o === car || o.state === 'parked') continue;
        if (check(o.pos.x, o.pos.z, lookAhead + 1.6)) return 'car';
      }
    }
    return false;
  }

  private spawnDriver(car: NpcCar) {
    const mesh = this.hooks.createDriver(car.archetype, car.seed);
    const bx = PARKING.bays[car.bay];
    const doorX = bx - 1.15;
    mesh.root.position.set(doorX, 0, PARKING.parkedZ);
    this.hooks.scene.add(mesh.root);
    this.walkers.push({
      carId: car.id,
      mesh,
      path: [
        { x: doorX, z: PARKING.walkZ },
        { x: PARKING.walkX, z: PARKING.walkZ },
        { x: PARKING.walkX, z: 2.9 },
        { x: PARKING.handoff.x, z: PARKING.handoff.z },
      ],
      idx: 0,
      phase: 0,
      activity: 0,
      seedOffset: (car.seed % 100) * 0.17,
      direction: 'toRestaurant',
      archetype: car.archetype,
      seed: car.seed,
    });
  }

  private updateWalkers(dt: number) {
    const speed = 2.3;
    for (let i = this.walkers.length - 1; i >= 0; i--) {
      const w = this.walkers[i];
      w.activity += dt;
      const p = w.mesh.root.position;
      const t = w.path[w.idx];
      if (t) {
        const dx = t.x - p.x;
        const dz = t.z - p.z;
        const d = Math.hypot(dx, dz);
        const step = Math.min(d, speed * dt);
        if (d > 1e-4) {
          p.x += (dx / d) * step;
          p.z += (dz / d) * step;
          w.mesh.root.rotation.y = lerpAngle(w.mesh.root.rotation.y, Math.atan2(dx, dz), Math.min(1, 10 * dt));
        }
        w.phase += dt * 11;
        applyCharacterKinematics({
          parts: w.mesh,
          walkPhase: w.phase,
          speedRatio: 0.75,
          carrying: false,
          sitBlend: 0,
          pose: 'locomotion',
          activityTime: w.activity,
          seedOffset: w.seedOffset,
          baseGroundY: 0,
        });
        if (d < 0.08) w.idx++;
        continue;
      }

      // Reached the end of the path
      this.walkers.splice(i, 1);
      if (w.direction === 'toRestaurant') {
        const accepted = this.hooks.onDriverArrived(w.mesh, w.archetype, w.seed, w.carId);
        // No table / takeaway slot after all: walk straight back to the car
        if (!accepted) this.driverReturn(w.carId, w.mesh, w.archetype, w.seed);
      } else {
        // Back at the car: get in and leave
        this.hooks.scene.remove(w.mesh.root);
        const car = this.cars.find((c) => c.id === w.carId);
        if (car) {
          car.state = 'departing';
          car.path = this.departurePath(car.bay);
          car.pathIdx = 0;
          car.speed = 0;
        }
      }
    }
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
