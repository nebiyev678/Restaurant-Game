import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { sound } from './audio';
import { QUALITY_PRESETS, ResolvedQuality } from './mobile';
import { ParkingTraffic } from './parking';
import {
  CAFE_THEMES,
  CITY_ZONES,
  CLOTHING_CATALOG,
  HOUSE_CATALOG,
  RECIPES,
  RECIPE_LIST,
  STATION_INFO,
  VEHICLE_CATALOG,
  STREAK_WINDOW,
  getActiveStations,
  getComboBonusMult,
  getMasteryPriceMult,
  getStreakMult,
  rollComboSize,
  getCleanlinessPatienceMult,
  getEarlyPatienceMult,
  getEarlySpawnDelay,
  getCleanlinessReputationMult,
  getPrestigeTipBonus,
  getRestaurantTier,
} from './data';
import {
  CharacterParts,
  DiningTableParts,
  VehicleParts,
  applyPlayerClothes,
  createBistroStringLights,
  createCharacterModel,
  createCutawayHalfWallSegment,
  createDiningTableMesh,
  createDishMesh,
  createEntranceArchwayMesh,
  createEntranceRunnerRugMesh,
  createFloorThresholdStrip,
  createFramedBurgerArtMesh,
  createGrassTexture,
  createHangingIvyShelfMesh,
  createHouseStructure,
  createIngredientShelfMesh,
  createCoveredMachineMesh,
  createKitchenStationMesh,
  createMenuBoardMesh,
  createPassThroughCounterMesh,
  createPendantLampMesh,
  createPottedPlantMesh,
  createPrettyDiningFloorTextures,
  createAntiFatigueMatMesh,
  createFloorDrainMesh,
  createKitchenBinMesh,
  createQuarryTileFloorTextures,
  createRangeHoodMesh,
  createRefrigeratorMesh,
  createRegisterStationMesh,
  createShopBuildingMesh,
  createSinkStationMesh,
  createSubwayTileTexture,
  createTrashBinMesh,
  createTrayStationMesh,
  createVehicleMesh,
  createWallSconceMesh,
  getCustomerAppearance,
  getStaffAppearance,
} from './models';
import {
  CustomerArchetype,
  CustomerOrder,
  DrawerTab,
  EngineHudSnapshot,
  NearbyPrompt,
  ProjectedBubble,
  RecipeId,
  SaveState,
  StationType,
} from './types';

import {
  CAR_TRAVEL_SPOTS,
  OLD_TOWN,
  OldTownExterior,
  createGableRoofMesh,
  createStreetTerrace,
} from './oldTown';
import {
  AvoidanceActor,
  NavWaypoint,
  NpcActivityPose,
  RestaurantNavGrid,
  WorldCollider,
  applyCharacterKinematics,
  computeNpcSteering,
  isPointBlocked,
  resolveColliderList,
  resolveVehicleCapsule,
} from './npcPhysics';

// Pre-allocated math helpers (zero GC in loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();
const _steer2D = new THREE.Vector2();

interface SimCustomer {
  id: string;
  name: string;
  archetype: CustomerArchetype;
  mesh: CharacterParts;
  state: 'entering' | 'seating' | 'seated_waiting' | 'eating' | 'standing_up' | 'leaving';
  tableId: number; // -1 takeaway
  seatSide: number;
  approachPos: THREE.Vector3;
  seatPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  vel: THREE.Vector3;
  waypoints: NavWaypoint[];
  waypointIdx: number;
  sitBlend: number;
  stuckTimer: number;
  repathCooldown: number;
  orderId: string | null;
  eatTimer: number;
  activityTime: number;
  walkPhase: number;
  seedOffset: number;
  /** Set when the customer came by car: they walk back to it when leaving. */
  carId?: string;
  seed?: number;
}

interface SimTable {
  id: number;
  x: number;
  z: number;
  isVip: boolean;
  occupiedBy: string | null;
  dirty: boolean;
  parts: DiningTableParts;
  servedDishMesh: THREE.Group | null;
}

interface SimStaff {
  id: string;
  role: SaveState['staff'][number]['role'];
  level: number;
  mesh: CharacterParts;
  state: 'idle' | 'working' | 'carrying';
  timer: number;
  targetPos: THREE.Vector3;
  vel: THREE.Vector3;
  waypoints: NavWaypoint[];
  waypointIdx: number;
  stuckTimer: number;
  repathCooldown: number;
  facingYaw: number | null;
  poseMode: NpcActivityPose;
  activityTime: number;
  seedOffset: number;
  targetTableId: number | null;
  targetOrderId: string | null;
  carryingRecipe: RecipeId | null;
  /** Dish a chef is currently cooking (so two chefs don't cook the same thing). */
  cookingRecipe: RecipeId | null;
  carryingQuality: number;
  carryingMesh: THREE.Group | null;
  walkPhase: number;
}

interface SimParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: EngineHudSnapshot) => void;
  onOrderServed: (
    recipeId: RecipeId,
    revenue: number,
    tip: number,
    repDelta: number,
    xpGain: number,
    worldPos: { x: number; y: number; z: number },
    info: { items: RecipeId[]; comboSize: number; streak: number; streakMult: number }
  ) => void;
  /** One dish of a combo delivered, more still to come. */
  onItemServed: (recipeId: RecipeId, remaining: number) => void;
  /** Streak changed (count 0 = it broke or cooled down). */
  onStreakChanged: (count: number, mult: number) => void;
  onOrderFailed: (repDelta: number) => void;
  onCookRequested: (station: StationType, suggestedOrder: CustomerOrder | null) => void;
  onShopRequested: (tab: DrawerTab, subTab?: string) => void;
  onDeliveryIncome: (amount: number) => void;
  onTableCleaned: () => void;
  onDirtyChanged: (cleanlinessDelta: number) => void;
  /** A machine finished cooking; `toPass` = it went to the pass counter (player was busy / away). */
  onDishReady: (recipeId: RecipeId, qualityBonus: number, toPass: boolean) => void;
  /** Fired once when the in-game clock passes midnight during active play. */
  onDayEnded: () => void;
  /** Fired when a hired staff member finishes a task (cooking, serving, cleaning, checkout). */
  onStaffTaskDone: (staffId: string) => void;
}

const CUSTOMER_NAMES = [
  'Maya',
  'Lucas',
  'Sofia',
  'Liam',
  'Elena',
  'Noah',
  'Chloe',
  'Marcus',
  'Aria',
  'Julian',
  'Nadia',
  'Theo',
];

export class RestaurantWorldEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private saveRef: { current: SaveState };

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private isSoftwareGl = false;

  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private rimLight!: THREE.DirectionalLight;
  private streetLampBulbs: THREE.MeshStandardMaterial[] = [];

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private paused = false;
  private titleMode = true;

  // Groups rebuilt on upgrades
  private restaurantGroup = new THREE.Group();
  private tablesGroup = new THREE.Group();
  private homeGroup = new THREE.Group();
  private showroomGroup = new THREE.Group();

  // Player & Vehicle
  private playerParts!: CharacterParts;
  private playerPos = new THREE.Vector3(-2.4, 0, 1.0);
  private playerVel = new THREE.Vector3();
  private playerYaw = 0;
  private playerWalkPhase = 0;
  private tapWalkTarget: THREE.Vector3 | null = null;
  private tapWaypoints: NavWaypoint[] = [];
  private tapWaypointIdx = 0;
  private stuckTapTimer = 0;
  private heldRecipe: RecipeId | null = null;
  private heldQuality = 1.0;
  private heldDishMesh: THREE.Group | null = null;

  private playerCarParts: VehicleParts | null = null;
  private carPos = new THREE.Vector3(OLD_TOWN.carSpawn.x, 0, OLD_TOWN.carSpawn.z);
  private carVel = new THREE.Vector3();
  private carYaw = -Math.PI / 2;
  private inVehicle = false;

  // Input state
  private heldKeys: Record<string, boolean> = {};
  private joystickVec = new THREE.Vector2(0, 0);

  // Camera spherical orbit around player/target
  private camAzimuth = Math.PI * 0.25; // Isometric angle
  private camPitch = 0.68;
  private camDistance = 19;
  private camTarget = new THREE.Vector3(-4, 1, 0);
  private draggingCam = false;
  private dragStart = { x: 0, y: 0 };
  private pointerMoved = false;

  // Raycasting & Collision Physics
  private raycaster = new THREE.Raycaster();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private clickables: THREE.Object3D[] = [];
  private staticColliders: WorldCollider[] = [];
  private restaurantColliders: WorldCollider[] = [];
  private homeColliders: WorldCollider[] = [];
  private restaurantBounds = { minX: -12, maxX: 3, minZ: -7, maxZ: 7 };
  private navGrid = new RestaurantNavGrid();
  private avoidanceActors: AvoidanceActor[] = [];

  // Simulation entities
  private tables: SimTable[] = [];
  /** Installed (active) machines. x/z = where the cook stands; mx/mz = the machine itself. */
  private stations: { type: StationType; x: number; z: number; mx: number; mz: number; ring: THREE.Mesh }[] = [];
  private lastStationsKey = '';
  /** Called right after every rendered frame (HUD uses it to keep 3D-anchored icons glued on). */
  private frameListener: (() => void) | null = null;
  // Tall back (-z) and left (-x) walls fade out when the camera swings behind them
  private backWallMats: THREE.MeshStandardMaterial[] = [];
  private leftWallMats: THREE.MeshStandardMaterial[] = [];
  private backWallFade = 1;
  private leftWallFade = 1;
  private stationPulseTime = 0;
  private registerPos = new THREE.Vector3(-5.5, 0, -4.4);
  private customers: SimCustomer[] = [];
  private orders: CustomerOrder[] = [];
  private readyDishes: { id: string; recipeId: RecipeId; qualityBonus: number }[] = [];
  /** Pass counter (shelf for ready dishes) and kitchen bin positions, set on each rebuild. */
  private passPos = { x: 0, z: 0 };
  private binPos = { x: 0, z: 0 };
  private passDishGroup: THREE.Group | null = null;
  /** Customers who arrive by car and use the restaurant parking lot. */
  private parking!: ParkingTraffic;
  /** Serving streak: consecutive completed orders without a walk-out. */
  private streakCount = 0;
  private streakTimer = 0;
  /** Dishes cooking on machines (one per machine). */
  private cookJobs = new Map<StationType, { recipeId: RecipeId; quality: number; remaining: number; total: number; steam: number }>();
  private passDishKey = '';
  static readonly PASS_SLOTS = 6;
  private staffAgents: SimStaff[] = [];

  private spawnTimer = 1.5;
  private deliveryTimer = 14;
  /** Last observed timeOfDay, used to detect the midnight rollover (including external jumps). */
  private lastTimeOfDay = -1;
  private hudSyncTimer = 0;
  private lastTier = -1;
  private lastCafeThemeId = '';
  private lastHouseId = '';
  private lastFurnitureKey = '';
  private lastVehicleId: string | null = null;
  private lastClothesKey = '';

  // Particles
  private particles: SimParticle[] = [];

  // Old-town exterior (streets, fountain, lanterns, trees, skyline)
  private oldTown = new OldTownExterior();
  private nightTarget = 0;

  // Graphics quality (mobile performance)
  private quality: ResolvedQuality = 'high';
  private autoQuality = false;
  private pixelRatioCap = 2;
  private fpsAccum = 0;
  private fpsFrames = 0;
  private slowWindows = 0;

  constructor(
    container: HTMLElement,
    saveRef: { current: SaveState },
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.saveRef = saveRef;
    this.callbacks = callbacks;
    this.initThree();
    this.buildStaticWorld();
    this.syncDynamicWorld(true);
    this.bindEvents();
    this.startLoop();
  }

  /** Portrait phones get a wider field of view so the restaurant still fits on screen. */
  private fovForAspect(aspect: number): number {
    if (aspect < 0.6) return 62;
    if (aspect < 0.85) return 54;
    return 42;
  }

  private currentPixelRatio(): number {
    return this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, this.pixelRatioCap);
  }

  /**
   * Applies a graphics preset. `auto` lets the engine step quality down by itself
   * if the frame rate stays low (it never steps back up on its own).
   */
  public setGraphicsQuality(quality: ResolvedQuality, auto: boolean) {
    this.quality = quality;
    this.autoQuality = auto;
    this.slowWindows = 0;
    const preset = QUALITY_PRESETS[quality];
    this.pixelRatioCap = preset.pixelRatioCap;
    this.renderer.setPixelRatio(this.currentPixelRatio());
    const shadows = preset.shadows && !this.isSoftwareGl;
    this.renderer.shadowMap.enabled = shadows;
    this.renderer.shadowMap.type = preset.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.sunLight.castShadow = shadows;
    // Coarser shadow maps need a little more offset to avoid blotchy "shadow acne" on walls
    this.sunLight.shadow.normalBias = preset.shadowMapSize >= 2048 ? 0.02 : preset.shadowMapSize >= 1024 ? 0.035 : 0.05;
    if (this.sunLight.shadow.mapSize.x !== preset.shadowMapSize) {
      this.sunLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }
    this.renderer.shadowMap.needsUpdate = true;
  }

  public getGraphicsQuality(): ResolvedQuality {
    return this.quality;
  }

  /** Frame-rate watchdog for 'auto' quality: two slow 4-second windows → one level down. */
  private trackFrameRate(rawDt: number) {
    if (!this.autoQuality || this.paused || this.titleMode || this.quality === 'low') return;
    this.fpsAccum += rawDt;
    this.fpsFrames++;
    if (this.fpsAccum < 4) return;
    const fps = this.fpsFrames / this.fpsAccum;
    this.fpsAccum = 0;
    this.fpsFrames = 0;
    if (fps < 38) {
      this.slowWindows++;
      if (this.slowWindows >= 2) {
        this.setGraphicsQuality(this.quality === 'high' ? 'medium' : 'low', true);
      }
    } else {
      this.slowWindows = 0;
    }
  }

  // ---- Combo order helpers ----------------------------------------------------
  /** Does this waiting order still need this dish? */
  private orderNeeds(o: CustomerOrder, recipeId: RecipeId): boolean {
    return o.status === 'waiting' && o.remaining.includes(recipeId);
  }

  /** The first still-needed dish of an order that is cooked on a given machine. */
  private remainingAtStation(o: CustomerOrder, station: StationType): RecipeId | undefined {
    return o.status === 'waiting' ? o.remaining.find((r) => RECIPES[r].station === station) : undefined;
  }

  /** All dishes still needed across waiting orders (with repeats). */
  private allNeededDishes(): RecipeId[] {
    return this.orders.filter((o) => o.status === 'waiting').flatMap((o) => o.remaining);
  }

  private breakStreak() {
    if (this.streakCount > 0) {
      this.streakCount = 0;
      this.streakTimer = 0;
      this.callbacks.onStreakChanged(0, 1);
    }
  }

  /** A dirty table that no other staff member is already walking to / cleaning. */
  private findUnclaimedDirtyTable(self: { id: string }) {
    const claimed = new Set(
      this.staffAgents.filter((a) => a.id !== self.id && a.targetTableId !== null).map((a) => a.targetTableId)
    );
    return this.tables.find((t) => t.dirty && !claimed.has(t.id));
  }

  /** Seconds a dish takes on its machine: a short wait that better equipment shortens. */
  private cookDuration(recipeId: RecipeId): number {
    const def = RECIPES[recipeId];
    const eqLevel = this.saveRef.current.equipmentLevels[def.station] ?? 1;
    return Math.max(1.5, def.basePrepTime * 0.55 - (eqLevel - 1) * 0.25);
  }

  public isStationBusy(type: StationType): boolean {
    return this.cookJobs.has(type);
  }

  /** Puts a dish on its machine to cook for a few seconds. Returns false if the machine is busy. */
  public startCookJob(recipeId: RecipeId, qualityBonus: number): boolean {
    const station = RECIPES[recipeId].station;
    if (this.cookJobs.has(station)) return false;
    const total = this.cookDuration(recipeId);
    this.cookJobs.set(station, { recipeId, quality: qualityBonus, remaining: total, total, steam: 0 });
    sound.playSizzle();
    return true;
  }

  private updateCookJobs(dt: number) {
    for (const [type, job] of this.cookJobs) {
      job.remaining -= dt;
      const st = this.stations.find((s) => s.type === type);
      job.steam -= dt;
      if (st && job.steam <= 0) {
        job.steam = 0.45;
        this.spawnBurst(st.mx + 0.15, 1.35, st.mz, '#e5e7eb', 3);
      }
      if (job.remaining > 0) continue;
      this.cookJobs.delete(type);
      // Straight into the chef's hands if they're nearby and empty-handed, otherwise onto the pass
      const near = st ? Math.hypot(this.playerPos.x - st.x, this.playerPos.z - st.z) < 3 : false;
      const toHands = near && !this.heldRecipe && !this.inVehicle;
      if (toHands) {
        this.setHeldDish(job.recipeId, job.quality);
      } else {
        this.readyDishes.push({
          id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          recipeId: job.recipeId,
          qualityBonus: job.quality,
        });
      }
      if (st) this.spawnBurst(st.mx + 0.15, 1.3, st.mz, '#facc15', 8);
      this.callbacks.onDishReady(job.recipeId, job.quality, !toHands);
    }
  }

  /** Puts the carried dish on the pass counter (waiters or the player can serve it later). */
  public putHeldDishOnCounter(): boolean {
    if (!this.heldRecipe || this.readyDishes.length >= RestaurantWorldEngine.PASS_SLOTS) return false;
    this.readyDishes.push({
      id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipeId: this.heldRecipe,
      qualityBonus: this.heldQuality,
    });
    this.clearHeldDish();
    sound.playClick();
    return true;
  }

  /** Throws the carried dish in the bin. */
  public trashHeldDish(): boolean {
    if (!this.heldRecipe) return false;
    this.clearHeldDish();
    sound.playClick();
    return true;
  }

  /** Picks a dish up from the pass counter, preferring one a customer is waiting for. */
  public pickUpFromCounter(): boolean {
    if (this.heldRecipe || this.readyDishes.length === 0) return false;
    const wanted = new Set(this.allNeededDishes());
    let idx = this.readyDishes.findIndex((d) => wanted.has(d.recipeId));
    if (idx < 0) idx = 0;
    const [dish] = this.readyDishes.splice(idx, 1);
    this.setHeldDish(dish.recipeId, dish.qualityBonus);
    sound.playClick();
    return true;
  }

  /** Rebuilds the dish meshes on the pass counter when its contents change. */
  private syncPassDishes() {
    if (!this.passDishGroup) return;
    const key = this.readyDishes.map((d) => d.id).join('|');
    if (key === this.passDishKey) return;
    this.passDishKey = key;
    this.passDishGroup.clear();
    this.readyDishes.slice(0, RestaurantWorldEngine.PASS_SLOTS).forEach((d, i) => {
      const dish = createDishMesh(d.recipeId);
      dish.scale.setScalar(0.85);
      dish.position.set(this.passPos.x, 1.035, this.passPos.z - 1.1 + i * 0.44);
      this.passDishGroup!.add(dish);
    });
  }

  /** Walks the chef to a table (used by the dirty-table icon) instead of teleporting. */
  public walkToTable(tableId: number) {
    if (this.inVehicle || this.titleMode || this.paused) return;
    const tbl = this.tables.find((t) => t.id === tableId);
    if (!tbl) return;
    // Aim for a spot beside the table (toward the player) so the Clean prompt appears on arrival
    const dx = this.playerPos.x - tbl.x;
    const dz = this.playerPos.z - tbl.z;
    const len = Math.hypot(dx, dz) || 1;
    this.setTapTarget(new THREE.Vector3(tbl.x + (dx / len) * 1.2, 0, tbl.z + (dz / len) * 1.2));
  }

  /** Registers a callback that runs after every rendered frame (pass null to clear). */
  public setFrameListener(fn: (() => void) | null) {
    this.frameListener = fn;
  }

  /** Projects a world point to screen pixels using the camera of the frame just rendered. */
  public projectWorld(x: number, y: number, z: number) {
    return this.projectToScreen(x, y, z);
  }

  /** Opens the cooking window for a machine (from its floating sign). */
  public openCookAtStation(type: StationType) {
    const pending = this.orders.find((o) => this.remainingAtStation(o, type)) ?? null;
    this.callbacks.onCookRequested(type, pending);
  }

  /** Tap at a screen point (used by the touch-controls overlay to forward short taps). */
  public tapAt(clientX: number, clientY: number) {
    if (this.titleMode || this.paused) return;
    this.handleCanvasTap(clientX, clientY);
  }

  private detectSoftwareWebGL(): boolean {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initThree() {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bae6fd');
    this.scene.fog = new THREE.Fog('#bae6fd', 42, 105);

    this.camera = new THREE.PerspectiveCamera(this.fovForAspect(width / height), width / height, 0.5, 160);
    this.camera.position.set(10, 14, 14);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    // Mandatory studio environment map via RoomEnvironment
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // 3-point warm/cool lighting rig
    this.hemiLight = new THREE.HemisphereLight('#bae6fd', '#64748b', 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff7ed', 1.45);
    this.sunLight.position.set(18, 28, 16);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const d = 24;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 75;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight('#e0f2fe', 0.42);
    this.rimLight.position.set(-20, 14, -18);
    this.scene.add(this.rimLight);

    this.scene.add(this.restaurantGroup);
    this.scene.add(this.tablesGroup);
    this.scene.add(this.homeGroup);
    this.scene.add(this.showroomGroup);

    // Player character (Restaurant Owner-Chef starter look)
    this.playerParts = createCharacterModel({
      shirtColor: '#f5efe6',
      pantsColor: '#463b38',
      apronColor: '#dc2626',
      shoeColor: '#dc2626',
      trimColor: '#dc2626',
      hairColor: '#5a3826',
      hasTowel: true,
      apronStyle: 'bib',
    });
    this.playerParts.root.position.copy(this.playerPos);
    this.scene.add(this.playerParts.root);

    // Particle pool
    const pGeo = new THREE.SphereGeometry(0.14, 6, 6);
    for (let i = 0; i < 36; i++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        vel: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildStaticWorld() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Extended City Ground Plane with procedural grass texture (no flat void!)
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(240, 240),
      new THREE.MeshStandardMaterial({ map: createGrassTexture(maxAniso), roughness: 0.94 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Cozy old-town streets: sandstone sidewalks, fan-cobbled piazza, granite-sett roads,
    // fountain roundabout, lanterns, plane trees, benches, planters, bollards & skyline
    const town = this.oldTown.build(maxAniso);
    this.scene.add(this.oldTown.group);

    this.parking = new ParkingTraffic({
      scene: this.scene,
      createDriver: (archetype, seed) => createCharacterModel(getCustomerAppearance(archetype, seed)),
      onDriverArrived: (mesh, archetype, seed, carId) => this.spawnCustomer({ mesh, archetype, seed, carId }),
    });
    this.staticColliders.push(...town.colliders);
    this.streetLampBulbs.push(...town.lanternMats);

    // City Buildings
    const shops: {
      zoneId: 'clothing' | 'dealership' | 'supermarket' | 'bank';
      name: string;
      color: string;
      wall: string;
      roof: string;
      x: number;
      z: number;
      rotY: number;
    }[] = [
      { zoneId: 'clothing', name: 'Style Atelier', color: '#be185d', wall: '#f4dccf', roof: '#a8492a', x: 10.5, z: -13.5, rotY: 0 },
      { zoneId: 'dealership', name: 'Apex Motors', color: '#1d4ed8', wall: '#e9e0cc', roof: '#5b5f66', x: 24.5, z: -13.5, rotY: 0 },
      { zoneId: 'supermarket', name: 'Fresh Market', color: '#15803d', wall: '#f6e7c1', roof: '#b4532a', x: 10.5, z: 14.5, rotY: Math.PI },
      { zoneId: 'bank', name: 'Metro Bank', color: '#a16207', wall: '#e4d8c4', roof: '#7c3a26', x: 24.5, z: 14.5, rotY: Math.PI },
    ];

    shops.forEach((s) => {
      const building = createShopBuildingMesh(s.name, s.color, s.wall);
      // Old-town pitched terracotta roof on top of the cornice
      const roof = createGableRoofMesh(7.3, 5.7, 1.7, s.roof);
      roof.position.y = 3.46;
      building.add(roof);
      building.position.set(s.x, 0, s.z);
      building.rotation.y = s.rotY;
      this.scene.add(building);

      // Solid building footprint collider (6.8 x 5.2)
      this.staticColliders.push({
        kind: 'aabb',
        minX: s.x - 3.4,
        maxX: s.x + 3.4,
        minZ: s.z - 2.6,
        maxZ: s.z + 2.6,
      });

      // Interactive pad in front of shop
      const padPos = new THREE.Vector3(s.x, 0.04, s.z + (s.rotY === 0 ? 4.1 : -4.1));
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 0.04, 24),
        new THREE.MeshStandardMaterial({
          color: s.color,
          emissive: s.color,
          emissiveIntensity: 0.35,
          roughness: 0.4,
        })
      );
      pad.position.copy(padPos);
      pad.userData.zoneAction = s.zoneId;
      this.scene.add(pad);
      this.clickables.push(pad);
    });

    // Dealership Showroom Plinth + Display Car
    const plinth = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.5, 0.2, 24),
      new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.6, roughness: 0.3 })
    );
    plinth.position.set(24.5, 0.1, -6.5);
    this.showroomGroup.add(plinth);
    this.staticColliders.push({ kind: 'circle', x: 24.5, z: -6.5, r: 2.35 });
    const showcaseCar = createVehicleMesh(VEHICLE_CATALOG[4]); // Sports car preview
    showcaseCar.group.position.set(24.5, 0.2, -6.5);
    showcaseCar.group.scale.setScalar(0.82);
    showcaseCar.group.rotation.y = 0.6;
    this.showroomGroup.add(showcaseCar.group);
  }

  public syncDynamicWorld(force = false) {
    const save = this.saveRef.current;
    const tierInfo = getRestaurantTier(save.restaurantLevel);

    // A forced sync (new career / reset) must not be mistaken for a midnight rollover.
    if (force) {
      this.lastTimeOfDay = -1;
      this.cookJobs.clear();
      this.parking?.clear();
      this.streakCount = 0;
      this.streakTimer = 0;
    }

    // 1. Rebuild Restaurant Structure & Tables if tier or cafe theme changed
    const activeThemeId = save.activeCafeThemeId ?? 'classic_bistro';
    const stationsKey = getActiveStations(save.unlockedRecipes).join(',');
    if (
      force ||
      this.lastTier !== tierInfo.tier ||
      this.lastCafeThemeId !== activeThemeId ||
      this.lastStationsKey !== stationsKey
    ) {
      this.lastTier = tierInfo.tier;
      this.lastCafeThemeId = activeThemeId;
      this.lastStationsKey = stationsKey;
      this.rebuildRestaurant(tierInfo.tier, tierInfo.tableCount);
    }

    // 2. Update Player Clothes
    const clothesKey = `${save.equippedOutfitId}_${save.equippedHatId}_${save.equippedWatchId}`;
    if (force || this.lastClothesKey !== clothesKey) {
      this.lastClothesKey = clothesKey;
      const outfit =
        CLOTHING_CATALOG.find((c) => c.id === save.equippedOutfitId) ?? CLOTHING_CATALOG[0];
      const hat =
        CLOTHING_CATALOG.find((c) => c.id === save.equippedHatId) ?? CLOTHING_CATALOG[5];
      const watch =
        CLOTHING_CATALOG.find((c) => c.id === save.equippedWatchId) ?? CLOTHING_CATALOG[10];
      applyPlayerClothes(this.playerParts, outfit, hat, watch);
    }

    // 3. Update Home & Furniture
    const furnKey = save.ownedFurniture.slice().sort().join(',');
    if (force || this.lastHouseId !== save.activeHouseId || this.lastFurnitureKey !== furnKey) {
      this.lastHouseId = save.activeHouseId;
      this.lastFurnitureKey = furnKey;
      while (this.homeGroup.children.length > 0) {
        this.homeGroup.remove(this.homeGroup.children[0]);
      }
      const houseDef =
        HOUSE_CATALOG.find((h) => h.id === save.activeHouseId) ?? HOUSE_CATALOG[0];
      const houseMesh = createHouseStructure(houseDef, save.ownedFurniture);
      houseMesh.position.set(40, 0, -5);
      this.homeGroup.add(houseMesh);
      this.rebuildHomeColliders(houseDef, save.ownedFurniture);
    }

    // 4. Update Owned Vehicle Parked in Driveway / Street
    if (force || this.lastVehicleId !== save.activeVehicleId) {
      this.lastVehicleId = save.activeVehicleId;
      if (this.playerCarParts) {
        this.scene.remove(this.playerCarParts.group);
        this.playerCarParts = null;
      }
      if (save.activeVehicleId) {
        const vDef = VEHICLE_CATALOG.find((v) => v.id === save.activeVehicleId);
        if (vDef) {
          this.playerCarParts = createVehicleMesh(vDef);
          this.playerCarParts.group.position.copy(this.carPos);
          this.playerCarParts.group.rotation.y = this.carYaw;
          this.scene.add(this.playerCarParts.group);
        }
      }
    }

    // 5. Sync Staff 3D Agents
    this.syncStaffAgents();

    // 6. Keep player/vehicle clear of newly spawned tables, furniture, or parked cars
    if (this.inVehicle && this.playerCarParts) {
      this.resolveWorldCollision(this.carPos, 1.05, false, false);
      this.playerCarParts.group.position.copy(this.carPos);
      this.playerPos.copy(this.carPos);
    } else {
      this.resolveWorldCollision(this.playerPos, 0.32, true, false);
      this.playerParts.root.position.copy(this.playerPos);
    }
  }

  private rebuildRestaurant(tier: 1 | 2 | 3 | 4 | 5, tableCount: number) {
    while (this.restaurantGroup.children.length > 0) {
      this.restaurantGroup.remove(this.restaurantGroup.children[0]);
    }
    while (this.tablesGroup.children.length > 0) {
      this.tablesGroup.remove(this.tablesGroup.children[0]);
    }
    this.stations = [];
    this.restaurantColliders = [];

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const w = tier === 1 ? 15 : tier === 2 ? 17 : tier >= 4 ? 20 : 18.5;
    const d = tier === 1 ? 14 : tier === 2 ? 16 : tier >= 4 ? 19 : 17.5;
    const centerX = -4.5;
    this.restaurantBounds = {
      minX: centerX - w / 2,
      maxX: centerX + w / 2,
      minZ: -d / 2,
      maxZ: d / 2,
    };

    const activeTheme =
      CAFE_THEMES.find((t) => t.id === (this.saveRef.current.activeCafeThemeId ?? 'classic_bistro')) ??
      CAFE_THEMES[0];

    const minX = centerX - w / 2;
    const maxX = centerX + w / 2;
    const minZ = -d / 2;
    const maxZ = d / 2;

    // Architectural Subfloor Plinth (grounds walls & outer perimeter edges cleanly)
    const subfloor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.12, d),
      new THREE.MeshStandardMaterial({
        color: '#7c4727',
        roughness: 0.65,
      })
    );
    subfloor.position.set(centerX, 0.04, 0);
    subfloor.receiveShadow = true;
    this.restaurantGroup.add(subfloor);

    // Kitchen Floor Zone: real commercial red quarry tile (15 cm) with dark epoxy grout
    const kitchenStartX = minX + 0.27;
    const kitchenEndX = minX + 5.68;
    const kitchenW = kitchenEndX - kitchenStartX;
    const floorSpanD = d - 0.54;
    const kitchenTextures = createQuarryTileFloorTextures(kitchenW, floorSpanD, maxAniso);
    const kitchenFloor = new THREE.Mesh(
      new THREE.BoxGeometry(kitchenW, 0.018, floorSpanD),
      new THREE.MeshStandardMaterial({
        map: kitchenTextures.map,
        bumpMap: kitchenTextures.bumpMap,
        bumpScale: 0.02,
        roughnessMap: kitchenTextures.roughnessMap,
        roughness: 1,
        metalness: 0,
      })
    );
    kitchenFloor.position.set(kitchenStartX + kitchenW / 2, 0.101, 0);
    kitchenFloor.receiveShadow = true;
    this.restaurantGroup.add(kitchenFloor);

    // Stainless floor drain in the middle of the cooking line
    const drain = createFloorDrainMesh();
    drain.position.set(kitchenStartX + kitchenW * 0.55, 0.111, 0.9);
    this.restaurantGroup.add(drain);

    // Dining Floor Zone (bespoke mosaic-bordered designer tile / herringbone wood with cabochons & center medallion)
    const diningEndX = maxX - 0.26;
    const diningW = diningEndX - kitchenEndX;
    const diningTextures = createPrettyDiningFloorTextures(
      activeTheme,
      diningW,
      floorSpanD,
      maxAniso
    );
    const diningFloor = new THREE.Mesh(
      new THREE.BoxGeometry(diningW, 0.018, floorSpanD),
      new THREE.MeshStandardMaterial({
        map: diningTextures.map,
        bumpMap: diningTextures.bumpMap,
        bumpScale: 0.016,
        roughnessMap: diningTextures.roughnessMap,
        roughness: 0.95,
        metalness: activeTheme.id === 'royal_salon' ? 0.06 : 0.02,
      })
    );
    diningFloor.position.set((kitchenEndX + diningEndX) / 2, 0.101, 0);
    diningFloor.receiveShadow = true;
    this.restaurantGroup.add(diningFloor);

    // Brushed Brass & Oak Floor Threshold Strip separating Kitchen & Dining Zones
    const thresholdStrip = createFloorThresholdStrip(floorSpanD, activeTheme.wainscotColor);
    thresholdStrip.position.set(kitchenEndX, 0.11, 0);
    this.restaurantGroup.add(thresholdStrip);

    // Cozy Woven Entrance Gallery Runner Rug inside the glass double doors
    const entryRunner = createEntranceRunnerRugMesh(
      activeTheme.trimColor,
      activeTheme.wainscotColor,
      maxAniso
    );
    entryRunner.position.set(maxX - 1.28, 0.111, 0);
    this.restaurantGroup.add(entryRunner);

    // Back & Left Cutaway Walls with caramel-wood pilasters, cap molding, baseboard & white subway-tile kitchen backsplash
    const wallMat = new THREE.MeshStandardMaterial({
      color: activeTheme.wallColor,
      roughness: 0.72,
    });
    const woodTrimMat = new THREE.MeshStandardMaterial({
      color: activeTheme.wainscotColor,
      roughness: 0.48,
      metalness: activeTheme.id === 'royal_salon' ? 0.32 : 0.08,
    });
    const darkBaseMat = new THREE.MeshStandardMaterial({
      color: '#6b381f',
      roughness: 0.55,
    });
    const subwayMat = new THREE.MeshStandardMaterial({
      map: createSubwayTileTexture(5, 3, maxAniso),
      roughness: 0.32,
    });

    // Each tall wall gets its own materials so it can fade independently
    const backSet = {
      wall: wallMat,
      trim: woodTrimMat,
      base: darkBaseMat,
      subway: subwayMat,
    };
    const leftSet = {
      wall: wallMat.clone(),
      trim: woodTrimMat.clone(),
      base: darkBaseMat.clone(),
      subway: subwayMat.clone(),
    };
    this.backWallMats = Object.values(backSet);
    this.leftWallMats = Object.values(leftSet);
    this.backWallFade = 1;
    this.leftWallFade = 1;

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.95, 0.28), backSet.wall);
    backWall.position.set(centerX, 1.48, minZ + 0.14);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    this.restaurantGroup.add(backWall);

    // Top Caramel-Wood Cap & Baseboard Trim on Back Wall
    const backCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.14, 0.38), backSet.trim);
    backCap.position.set(centerX, 2.98, minZ + 0.14);
    const backBase = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.24, 0.06), backSet.base);
    backBase.position.set(centerX, 0.2, minZ + 0.3);
    // White subway-tile kitchen backsplash cleanly bounded between corner and divider pilasters
    const backBacksplash = new THREE.Mesh(new THREE.BoxGeometry(5.1, 1.55, 0.04), backSet.subway);
    backBacksplash.position.set(minX + 2.9, 1.48, minZ + 0.3);
    backBacksplash.receiveShadow = true;
    this.restaurantGroup.add(backCap, backBase, backBacksplash);

    this.restaurantColliders.push({
      kind: 'aabb',
      minX: minX - 0.16,
      maxX,
      minZ: minZ - 0.16,
      maxZ: minZ + 0.34,
    });

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.95, d), leftSet.wall);
    leftWall.position.set(minX + 0.14, 1.48, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    this.restaurantGroup.add(leftWall);

    const leftCap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, d + 0.12), leftSet.trim);
    leftCap.position.set(minX + 0.14, 2.98, 0);
    const leftBase = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, d - 0.1), leftSet.base);
    leftBase.position.set(minX + 0.3, 0.2, 0);
    const leftTileStartZ = minZ + 0.36;
    const leftTileEndZ = 1.2;
    const leftTileSpan = Math.max(2, leftTileEndZ - leftTileStartZ);
    const leftBacksplash = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.55, leftTileSpan), leftSet.subway);
    leftBacksplash.position.set(minX + 0.3, 1.48, (leftTileStartZ + leftTileEndZ) / 2);
    leftBacksplash.receiveShadow = true;
    this.restaurantGroup.add(leftCap, leftBase, leftBacksplash);

    // Architectural Caramel-Wood Corner & Section Pilasters along Back & Left Walls
    for (const [px, pz, onBack] of [
      [minX + 0.16, minZ + 0.16, 1],
      [maxX - 0.16, minZ + 0.16, 1],
      [minX + 0.16, maxZ - 0.16, 0],
      [minX + 5.65, minZ + 0.18, 1],
      [minX + 0.18, 1.4, 0],
    ]) {
      const pilaster = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 3.04, 0.36),
        onBack ? backSet.trim : leftSet.trim
      );
      pilaster.position.set(px, 1.52, pz);
      pilaster.castShadow = true;
      this.restaurantGroup.add(pilaster);
    }

    this.restaurantColliders.push({
      kind: 'aabb',
      minX: minX - 0.16,
      maxX: minX + 0.34,
      minZ: minZ - 0.16,
      maxZ: maxZ + 0.16,
    });

    // Low Cutaway Perimeter Half-Walls with Flower Planters along Front (+Z) and Entrance Side (+X)
    const frontHalfLen = w - 0.28;
    const frontHalfWall = createCutawayHalfWallSegment(
      frontHalfLen,
      activeTheme.wainscotColor,
      '#ede3d7',
      true
    );
    frontHalfWall.position.set(minX + 0.28 + frontHalfLen / 2, 0.1, maxZ - 0.14);
    this.restaurantGroup.add(frontHalfWall);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: minX - 0.16,
      maxX: maxX + 0.16,
      minZ: maxZ - 0.34,
      maxZ: maxZ + 0.16,
    });

    // +X Right Perimeter Half-Walls leaving a wide doorway centered at z = 0
    const topRightLen = Math.max(1.2, -1.95 - (minZ + 0.28));
    const topRightHalfWall = createCutawayHalfWallSegment(
      topRightLen,
      activeTheme.wainscotColor,
      '#ede3d7',
      true
    );
    topRightHalfWall.rotation.y = Math.PI / 2;
    topRightHalfWall.position.set(maxX - 0.14, 0.1, minZ + 0.28 + topRightLen / 2);
    this.restaurantGroup.add(topRightHalfWall);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: maxX - 0.34,
      maxX: maxX + 0.16,
      minZ: minZ - 0.16,
      maxZ: -1.95,
    });

    const botRightLen = Math.max(1.2, maxZ - 1.95);
    const botRightHalfWall = createCutawayHalfWallSegment(
      botRightLen,
      activeTheme.wainscotColor,
      '#ede3d7',
      true
    );
    botRightHalfWall.rotation.y = Math.PI / 2;
    botRightHalfWall.position.set(maxX - 0.14, 0.1, 1.95 + botRightLen / 2);
    this.restaurantGroup.add(botRightHalfWall);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: maxX - 0.34,
      maxX: maxX + 0.16,
      minZ: 1.95,
      maxZ: maxZ + 0.16,
    });

    // Grand Diner Entrance Archway (Open Double Glass Doors + Scalloped Striped Awning + Chef Crest Sign + Topiary Pots + Doormat)
    const entranceArch = createEntranceArchwayMesh(activeTheme.trimColor, activeTheme.wainscotColor);
    entranceArch.position.set(maxX - 0.1, 0.1, 0);
    this.restaurantGroup.add(entranceArch);
    this.restaurantColliders.push(
      { kind: 'circle', x: maxX - 0.1, z: -1.95, r: 0.25 },
      { kind: 'circle', x: maxX - 0.1, z: 1.95, r: 0.25 },
      { kind: 'circle', x: maxX + 0.45, z: -2.05, r: 0.28 },
      { kind: 'circle', x: maxX + 0.45, z: 2.05, r: 0.28 }
    );
    // Solid colliders for open glass door leaves swung inward at rotY = side * 1.38
    for (const side of [-1, 1]) {
      for (const distAlongDoor of [0.26, 0.62]) {
        this.restaurantColliders.push({
          kind: 'circle',
          x: maxX - 0.1 - distAlongDoor * Math.sin(1.38),
          z: side * (1.72 - distAlongDoor * Math.cos(1.38)),
          r: 0.16,
        });
      }
    }

    // Old-town street terraces either side of the entrance (theme-coloured umbrellas & cushions)
    for (const side of [1, -1] as const) {
      const terrace = createStreetTerrace(
        side,
        {
          umbrellaColor: activeTheme.trimColor,
          cushionColor: activeTheme.cushionColor,
          woodColor: activeTheme.woodPrimary,
        },
        side === 1
      );
      terrace.group.position.set(maxX, 0, 0);
      this.restaurantGroup.add(terrace.group);
      for (const c of terrace.colliders) {
        this.restaurantColliders.push(
          c.kind === 'circle'
            ? { ...c, x: c.x + maxX }
            : { ...c, minX: c.minX + maxX, maxX: c.maxX + maxX }
        );
      }
      // String lights strung between the terrace corner posts
      for (const zEdge of [3.7 * side, 6.9 * side]) {
        const strand = createBistroStringLights(
          new THREE.Vector3(maxX + 0.6, 2.55, zEdge),
          new THREE.Vector3(maxX + 5.2, 2.55, zEdge),
          5,
          activeTheme.lightColor,
          activeTheme.lightColor
        );
        this.restaurantGroup.add(strand.group);
      }
    }

    // Subtle Patio Bistro String Lights flanking upper entrance edge
    const stringLights = createBistroStringLights(
      new THREE.Vector3(maxX - 0.2, 2.9, minZ + 0.5),
      new THREE.Vector3(maxX - 0.2, 2.9, -2.2),
      4,
      activeTheme.lightColor,
      activeTheme.lightColor
    );
    this.restaurantGroup.add(stringLights.group);

    // Warm Dining Room Overhead Glow + Pendant Lamps + Wall Sconces + Hanging Ivy + Framed Burger Art
    const diningLight = new THREE.PointLight(activeTheme.lightColor, 2.7, 19, 1.5);
    diningLight.position.set(centerX + 1.5, 3.8, 0);
    this.restaurantGroup.add(diningLight);

    const passX = minX + 5.05;
    const passZ = 0.8;
    this.passPos = { x: passX, z: passZ };
    // Dishes waiting on the pass counter are shown on its marble top
    this.passDishGroup = new THREE.Group();
    this.passDishKey = '';
    this.restaurantGroup.add(this.passDishGroup);

    // Kitchen waste bin (throw away wrong dishes)
    const bin = createKitchenBinMesh();
    this.binPos = { x: minX + 3.2, z: minZ + 0.62 };
    bin.position.set(this.binPos.x, 0.11, this.binPos.z);
    this.restaurantGroup.add(bin);
    this.restaurantColliders.push({ kind: 'circle', x: this.binPos.x, z: this.binPos.z, r: 0.3 });

    for (const [lx, lz] of [
      [passX, passZ - 0.45],
      [centerX + 2.2, -0.6],
      [centerX + 2.2, 2.9],
    ]) {
      const pendant = createPendantLampMesh(activeTheme.lightColor);
      pendant.position.set(lx, 2.68, lz);
      this.restaurantGroup.add(pendant);
    }

    // Stainless Range Hood above the main cooking stations (cleanly inside wall & below wall cap)
    const rangeHood = createRangeHoodMesh();
    rangeHood.rotation.y = Math.PI / 2;
    rangeHood.position.set(minX + 0.8, 2.2, -2.05);
    this.restaurantGroup.add(rangeHood);

    // Hanging Trailing Ivy Shelves & Warm Wall Sconces & Framed Burger Poster
    const ivyLeft = createHangingIvyShelfMesh(activeTheme.wainscotColor);
    ivyLeft.rotation.y = Math.PI / 2;
    ivyLeft.position.set(minX + 0.47, 2.58, 3.2);
    const ivyBack = createHangingIvyShelfMesh(activeTheme.wainscotColor);
    ivyBack.position.set(maxX - 1.5, 2.58, minZ + 0.47);
    const burgerArt = createFramedBurgerArtMesh(activeTheme.wainscotColor);
    burgerArt.position.set(maxX - 1.5, 1.72, minZ + 0.34);
    const sconceBack = createWallSconceMesh(activeTheme.lightColor);
    sconceBack.position.set(centerX + 2.3, 2.18, minZ + 0.32);
    const sconceLeft = createWallSconceMesh(activeTheme.lightColor);
    sconceLeft.rotation.y = Math.PI / 2;
    sconceLeft.position.set(minX + 0.32, 2.18, 4.4);
    this.restaurantGroup.add(ivyLeft, ivyBack, burgerArt, sconceBack, sconceLeft);

    // Kitchen Stations flush inside left wall + Drink Bar on back wall
    const stationLayout: { type: StationType; x: number; z: number }[] = [
      { type: 'grill', x: minX + 0.96, z: -4.3 },
      { type: 'prep', x: minX + 0.96, z: -2.05 },
      { type: 'fryer', x: minX + 0.96, z: 0.3 },
      { type: 'oven', x: minX + 0.96, z: 2.65 },
      { type: 'specialty', x: minX + 0.96, z: 4.9 },
      { type: 'bar', x: centerX - 1.6, z: minZ + 1.02 },
    ];

    const activeStations = new Set(getActiveStations(this.saveRef.current.unlockedRecipes));
    const unlockedSet = new Set(this.saveRef.current.unlockedRecipes);
    stationLayout.forEach((st) => {
      const isActive = activeStations.has(st.type);
      let mesh: THREE.Group;
      if (isActive) {
        mesh = createKitchenStationMesh(st.type);
      } else {
        // Machines not unlocked yet arrive covered and strapped, tagged with what they'll cook
        const upcoming = RECIPE_LIST.filter((r) => r.station === st.type && !unlockedSet.has(r.id)).sort(
          (a, b) => a.requiredLevel - b.requiredLevel
        );
        const first = upcoming[0];
        const level = first?.requiredLevel ?? 1;
        mesh = createCoveredMachineMesh(st.type, first?.name ?? STATION_INFO[st.type].short, level);
      }
      mesh.position.set(st.x, 0.1, st.z);
      mesh.rotation.y = st.type === 'bar' ? 0 : Math.PI / 2;
      this.restaurantGroup.add(mesh);

      if (st.type === 'bar') {
        this.restaurantColliders.push({
          kind: 'aabb',
          minX: st.x - 0.94,
          maxX: st.x + 0.94,
          minZ: minZ + 0.34,
          maxZ: st.z + 0.57,
        });
      } else {
        this.restaurantColliders.push({
          kind: 'aabb',
          minX: minX + 0.34,
          maxX: st.x + 0.58,
          minZ: st.z - (st.type === 'grill' ? 1.23 : 0.92),
          maxZ: st.z + 0.92,
        });
      }

      if (!isActive) return;

      // Subtle floor interaction highlight ring in front of station
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.55, 0.72, 24),
        new THREE.MeshBasicMaterial({
          color: st.type === 'specialty' ? '#ec4899' : '#f97316',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
        })
      );
      ring.rotation.x = -Math.PI / 2;
      const rx = st.type === 'bar' ? st.x : st.x + 1.3;
      const rz = st.type === 'bar' ? st.z + 1.25 : st.z;
      ring.position.set(rx, 0.13, rz);
      this.restaurantGroup.add(ring);

      // Black rubber anti-fatigue mat where the cook stands
      const mat = st.type === 'bar' ? createAntiFatigueMatMesh(1.5, 0.75) : createAntiFatigueMatMesh(0.75, 1.5);
      mat.position.set(rx, 0.111, rz);
      this.restaurantGroup.add(mat);

      this.stations.push({ type: st.type, x: rx, z: rz, mx: st.x, mz: st.z, ring });
    });

    // Glass Sneeze-Guard Service Pass-Through Counter between Kitchen Line & Dining Floor
    const passCounter = createPassThroughCounterMesh(activeTheme);
    passCounter.rotation.y = Math.PI / 2;
    passCounter.position.set(passX, 0.1, passZ);
    this.restaurantGroup.add(passCounter);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: passX - 0.4,
      maxX: passX + 0.4,
      minZ: passZ - 1.4,
      maxZ: passZ + 1.4,
    });

    // Service Counter / Cash Register (clear of Espresso Bar ring and Pass-Through Counter)
    const regMesh = createRegisterStationMesh(activeTheme);
    regMesh.position.set(-5.4, 0.1, -3.55);
    this.restaurantGroup.add(regMesh);
    this.registerPos.set(-5.4, 0, -2.35);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: -6.53,
      maxX: -4.27,
      minZ: -4.06,
      maxZ: -3.04,
    });

    // Stylized Back-Wall Kitchen & Service Props (Fridge, Ingredient Shelf, Sink, Tray Station, Trash Bin, Menu Board)
    const fridgeX = minX + 1.12;
    const fridgeZ = minZ + 0.85;
    const fridge = createRefrigeratorMesh();
    fridge.position.set(fridgeX, 0.1, fridgeZ);
    this.restaurantGroup.add(fridge);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: minX + 0.34,
      maxX: fridgeX + 0.62,
      minZ: minZ + 0.34,
      maxZ: fridgeZ + 0.48,
    });

    const shelfX = centerX - 4.1;
    const shelfZ = minZ + 0.72;
    const shelf = createIngredientShelfMesh();
    shelf.position.set(shelfX, 0.1, shelfZ);
    this.restaurantGroup.add(shelf);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: shelfX - 0.75,
      maxX: shelfX + 0.75,
      minZ: minZ + 0.34,
      maxZ: shelfZ + 0.33,
    });

    const sinkX = centerX + 0.8;
    const sinkZ = minZ + 0.86;
    const sink = createSinkStationMesh();
    sink.position.set(sinkX, 0.1, sinkZ);
    this.restaurantGroup.add(sink);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: sinkX - 0.77,
      maxX: sinkX + 0.77,
      minZ: minZ + 0.34,
      maxZ: sinkZ + 0.49,
    });

    const trayX = centerX + 2.75;
    const trayZ = minZ + 0.8;
    const trayStation = createTrayStationMesh();
    trayStation.position.set(trayX, 0.1, trayZ);
    this.restaurantGroup.add(trayStation);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: trayX - 0.72,
      maxX: trayX + 0.72,
      minZ: minZ + 0.34,
      maxZ: trayZ + 0.41,
    });

    const binX = centerX + 4.1;
    const binZ = minZ + 0.74;
    const trashBin = createTrashBinMesh();
    trashBin.position.set(binX, 0.1, binZ);
    this.restaurantGroup.add(trashBin);
    this.restaurantColliders.push({
      kind: 'aabb',
      minX: binX - 0.38,
      maxX: binX + 0.38,
      minZ: minZ + 0.34,
      maxZ: binZ + 0.35,
    });

    const menuBoard = createMenuBoardMesh();
    menuBoard.position.set(centerX + 3.8, 1.88, minZ + 0.36);
    this.restaurantGroup.add(menuBoard);

    // Decorative Potted Plants along Dining Room Corners (avoiding doorway & specialty station)
    const plantSpots: [number, number][] = [
      [maxX - 0.75, minZ + 1.0],
      [maxX - 0.75, maxZ - 1.0],
      [minX + 2.6, maxZ - 0.85],
      [maxX - 0.75, -2.7],
      [maxX - 0.75, 2.7],
    ];
    const plantCount = Math.min(tier + 1, plantSpots.length);
    for (let i = 0; i < plantCount; i++) {
      const plant = createPottedPlantMesh(activeTheme.trimColor);
      const [px, pz] = plantSpots[i];
      plant.position.set(px, 0.1, pz);
      this.restaurantGroup.add(plant);
      this.restaurantColliders.push({ kind: 'circle', x: px, z: pz, r: 0.3 });
    }

    // Dining Tables (preserve existing occupation state if possible)
    const oldTables = new Map(this.tables.map((t) => [t.id, t]));
    this.tables = [];

    const tableCoords: [number, number][] = [
      [-4.2, -0.6],
      [-4.2, 2.9],
      [-0.6, 2.9],
      [-0.6, -0.6],
      [-0.6, -4.0],
      [-4.2, 6.2],
      [-0.6, 6.2],
      [2.6, -4.0],
      [2.6, -0.6],
      [2.6, 2.9],
      [2.6, 6.2],
      [2.6, -6.9],
    ];

    for (let i = 0; i < Math.min(tableCount, tableCoords.length); i++) {
      const [tx, tz] = tableCoords[i];
      const isVip = tier >= 4 && i >= tableCount - 2;
      const parts = createDiningTableMesh(isVip, activeTheme);
      parts.group.position.set(tx, 0.1, tz);
      this.tablesGroup.add(parts.group);

      // Solid colliders for table top + chairs / VIP booths
      if (isVip) {
        this.restaurantColliders.push(
          { kind: 'aabb', minX: tx - 0.48, maxX: tx + 0.48, minZ: tz - 0.58, maxZ: tz + 0.58 },
          { kind: 'aabb', minX: tx - 1.22, maxX: tx - 0.62, minZ: tz - 0.59, maxZ: tz + 0.59 },
          { kind: 'aabb', minX: tx + 0.62, maxX: tx + 1.22, minZ: tz - 0.59, maxZ: tz + 0.59 }
        );
      } else {
        this.restaurantColliders.push(
          { kind: 'aabb', minX: tx - 0.59, maxX: tx + 0.59, minZ: tz - 0.56, maxZ: tz + 0.56 },
          { kind: 'circle', x: tx - 0.98, z: tz, r: 0.24 },
          { kind: 'circle', x: tx + 0.98, z: tz, r: 0.24 }
        );
      }

      const prev = oldTables.get(i + 1);
      const tbl: SimTable = {
        id: i + 1,
        x: tx,
        z: tz,
        isVip,
        occupiedBy: prev?.occupiedBy ?? null,
        dirty: prev?.dirty ?? false,
        parts,
        servedDishMesh: null,
      };
      parts.dirtyMesh.visible = tbl.dirty;
      this.tables.push(tbl);
    }

    this.navGrid.rebuild(
      0.3,
      this.staticColliders,
      this.restaurantColliders,
      this.homeColliders
    );
  }

  private rebuildHomeColliders(
    house: (typeof HOUSE_CATALOG)[number],
    ownedFurniture: string[]
  ) {
    this.homeColliders = [];
    const hx = 40;
    const hz = -5;
    const w = 8.4 * house.sizeScale;
    const d = 7.4 * house.sizeScale;

    // Back, left, right walls (front +Z remains open for entry) with solid anti-tunnel thickness
    this.homeColliders.push(
      {
        kind: 'aabb',
        minX: hx - w / 2 - 0.12,
        maxX: hx + w / 2 + 0.12,
        minZ: hz - d / 2 - 0.12,
        maxZ: hz - d / 2 + 0.34,
      },
      {
        kind: 'aabb',
        minX: hx - w / 2 - 0.12,
        maxX: hx - w / 2 + 0.34,
        minZ: hz - d / 2 - 0.12,
        maxZ: hz + d / 2 + 0.12,
      },
      {
        kind: 'aabb',
        minX: hx + w / 2 - 0.34,
        maxX: hx + w / 2 + 0.12,
        minZ: hz - d / 2 - 0.12,
        maxZ: hz + d / 2 + 0.12,
      }
    );

    if (house.tier >= 4) {
      this.homeColliders.push(
        { kind: 'circle', x: hx - w / 2 + 0.42, z: hz + d / 2 - 0.3, r: 0.25 },
        { kind: 'circle', x: hx + w / 2 - 0.42, z: hz + d / 2 - 0.3, r: 0.25 }
      );
    }

    // Starter Bed
    const bedX = hx - w / 2 + 1.4;
    const bedZ = hz - d / 2 + 1.4;
    this.homeColliders.push({
      kind: 'aabb',
      minX: bedX - 0.85,
      maxX: bedX + 0.85,
      minZ: bedZ - 1.1,
      maxZ: bedZ + 1.1,
    });

    if (ownedFurniture.includes('furn_sofa')) {
      this.homeColliders.push({
        kind: 'aabb',
        minX: hx + 0.8 - 1.05,
        maxX: hx + 0.8 + 1.05,
        minZ: hz - 0.3 - 0.45,
        maxZ: hz - 0.3 + 0.45,
      });
    }
    if (ownedFurniture.includes('furn_tv')) {
      this.homeColliders.push({
        kind: 'aabb',
        minX: hx + 0.8 - 1.0,
        maxX: hx + 0.8 + 1.0,
        minZ: hz - d / 2 + 0.55 - 0.24,
        maxZ: hz - d / 2 + 0.55 + 0.24,
      });
    }
    if (ownedFurniture.includes('furn_plant')) {
      this.homeColliders.push({
        kind: 'circle',
        x: hx + w / 2 - 0.85,
        z: hz - d / 2 + 0.85,
        r: 0.3,
      });
    }
    if (ownedFurniture.includes('furn_dining')) {
      const dx = hx - 1.3;
      const dz = hz + 1.2;
      this.homeColliders.push(
        { kind: 'circle', x: dx, z: dz, r: 0.74 },
        { kind: 'circle', x: dx - 0.98, z: dz, r: 0.22 },
        { kind: 'circle', x: dx + 0.98, z: dz, r: 0.22 }
      );
    }
    if (ownedFurniture.includes('furn_arcade')) {
      const ax = hx + w / 2 - 1.1;
      const az = hz + 1.2;
      this.homeColliders.push({
        kind: 'aabb',
        minX: ax - 0.38,
        maxX: ax + 0.38,
        minZ: az - 0.38,
        maxZ: az + 0.38,
      });
    }
    if (ownedFurniture.includes('furn_piano')) {
      const px = hx + 2.2;
      const pz = hz - 0.8;
      this.homeColliders.push({
        kind: 'aabb',
        minX: px - 0.8,
        maxX: px + 0.8,
        minZ: pz - 0.65,
        maxZ: pz + 0.65,
      });
    }

    this.navGrid.rebuild(
      0.3,
      this.staticColliders,
      this.restaurantColliders,
      this.homeColliders
    );
  }

  private syncStaffAgents() {
    const desired = this.saveRef.current.staff;
    const existingIds = new Set(this.staffAgents.map((s) => s.id));
    const desiredIds = new Set(desired.map((s) => s.id));

    // Remove fired
    this.staffAgents = this.staffAgents.filter((agent) => {
      if (!desiredIds.has(agent.id)) {
        this.scene.remove(agent.mesh.root);
        return false;
      }
      return true;
    });

    // Add newly hired & update levels
    desired.forEach((d, idx) => {
      const existing = this.staffAgents.find((a) => a.id === d.id);
      if (existing) {
        existing.level = d.level;
        return;
      }
      if (!existingIds.has(d.id)) {
        const appearance = getStaffAppearance(d.role);
        const mesh = createCharacterModel(appearance);
        const startPos = new THREE.Vector3(-7.4 + (idx % 3) * 1.15, 0.1, -1.8 + Math.floor(idx / 3) * 1.8);
        this.resolveNpcStaticColliders(startPos, 0.27);
        startPos.y = this.getGroundHeight(startPos.x, startPos.z);
        mesh.root.position.copy(startPos);
        this.scene.add(mesh.root);
        this.staffAgents.push({
          id: d.id,
          role: d.role,
          level: d.level,
          mesh,
          state: 'idle',
          timer: 0.5,
          targetPos: startPos.clone(),
          vel: new THREE.Vector3(),
          waypoints: [],
          waypointIdx: 0,
          stuckTimer: 0,
          repathCooldown: 0,
          facingYaw: null,
          poseMode: 'locomotion',
          activityTime: 0,
          seedOffset: idx * 1.37 + Math.random() * 2,
          targetTableId: null,
          cookingRecipe: null,
          targetOrderId: null,
          carryingRecipe: null,
          carryingQuality: 1.0,
          carryingMesh: null,
          walkPhase: 0,
        });
      }
    });
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      this.heldKeys[e.code] = true;
      if ((e.code === 'Space' || e.code === 'KeyE') && !this.paused && !this.titleMode) {
        this.triggerContextAction();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      this.heldKeys[e.code] = false;
    };
    const onBlur = () => {
      this.heldKeys = {};
      this.joystickVec.set(0, 0);
    };

    const activePointers = new Map<number, { x: number; y: number }>();
    let camPointerId: number | null = null;
    let lastPinchDist = 0;

    const getPinchDist = () => {
      const pts = Array.from(activePointers.values());
      if (pts.length < 2) return 0;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };

    const onPointerDown = (e: PointerEvent) => {
      sound.unlock();
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 1) {
        camPointerId = e.pointerId;
        this.draggingCam = true;
        this.pointerMoved = false;
        this.dragStart = { x: e.clientX, y: e.clientY };
      } else if (activePointers.size === 2) {
        this.pointerMoved = true;
        lastPinchDist = getPinchDist();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (activePointers.size >= 2 && !this.titleMode) {
        const dist = getPinchDist();
        if (lastPinchDist > 0 && dist > 0) {
          this.camDistance = THREE.MathUtils.clamp(
            this.camDistance - (dist - lastPinchDist) * 0.045,
            11,
            34
          );
        }
        lastPinchDist = dist;
        return;
      }

      if (!this.draggingCam || e.pointerId !== camPointerId || this.titleMode) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (Math.hypot(dx, dy) > 6) this.pointerMoved = true;
      if (this.pointerMoved) {
        this.camAzimuth -= dx * 0.0065;
        this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.0045, 0.35, 1.15);
        this.dragStart = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      const wasCamPointer = e.pointerId === camPointerId;
      activePointers.delete(e.pointerId);

      if (wasCamPointer && this.draggingCam && !this.pointerMoved && !this.titleMode && !this.paused) {
        this.handleCanvasTap(e.clientX, e.clientY);
      }

      if (activePointers.size === 0) {
        this.draggingCam = false;
        camPointerId = null;
        lastPinchDist = 0;
      } else if (activePointers.size === 1) {
        const [remainingId, pos] = Array.from(activePointers.entries())[0];
        camPointerId = remainingId;
        this.dragStart = { x: pos.x, y: pos.y };
        lastPinchDist = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      this.camDistance = THREE.MathUtils.clamp(this.camDistance + e.deltaY * 0.012, 11, 34);
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.fov = this.fovForAspect(w / h);
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.renderer.setPixelRatio(this.currentPixelRatio());
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    dom.addEventListener('wheel', onWheel, { passive: true });

    this.cleanupListeners = () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      dom.removeEventListener('wheel', onWheel);
    };
  }

  private cleanupListeners: () => void = () => {};

  private setTapTarget(target: THREE.Vector3) {
    this.tapWalkTarget = target;
    this.tapWaypoints = [];
    this.tapWaypointIdx = 0;

    if (!this.inVehicle) {
      const p = this.playerPos;
      const inNavStart =
        p.x >= this.navGrid.minX &&
        p.x <= this.navGrid.maxX &&
        p.z >= this.navGrid.minZ &&
        p.z <= this.navGrid.maxZ;
      const inNavEnd =
        target.x >= this.navGrid.minX &&
        target.x <= this.navGrid.maxX &&
        target.z >= this.navGrid.minZ &&
        target.z <= this.navGrid.maxZ;

      if (inNavStart && inNavEnd) {
        this.tapWaypoints = this.navGrid.findPath(p.x, p.z, target.x, target.z);
      } else if (inNavStart !== inNavEnd) {
        // Cross cleanly through the open entrance doorway when walking between restaurant and city
        const doorX = this.restaurantBounds.maxX + 1.1;
        const startIsInside = this.isInsideRestaurant(p.x, p.z);
        if (startIsInside && target.x > doorX) {
          this.tapWaypoints = [
            ...this.navGrid.findPath(p.x, p.z, doorX, 0),
            { x: target.x, z: target.z },
          ];
        } else if (!startIsInside && this.isInsideRestaurant(target.x, target.z)) {
          this.tapWaypoints = [
            { x: doorX, z: 0 },
            ...this.navGrid.findPath(doorX, 0, target.x, target.z),
          ];
        }
      }
    }
  }

  private handleCanvasTap(clientX: number, clientY: number) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    _rayMouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(_rayMouse, this.camera);

    // Check clickable shop pads first
    const hits = this.raycaster.intersectObjects(this.clickables, false);
    if (hits.length > 0) {
      const zone = hits[0].object.userData.zoneAction as CityZoneAction | undefined;
      if (zone) {
        this.setTapTarget(hits[0].point.clone());
        return;
      }
    }

    // Raycast onto ground plane for tap-to-walk
    const hitPoint = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
      hitPoint.x = THREE.MathUtils.clamp(hitPoint.x, -16, 46);
      hitPoint.z = THREE.MathUtils.clamp(hitPoint.z, -18, 18);
      this.setTapTarget(hitPoint);
    }
  }

  public setJoystick(x: number, y: number) {
    this.joystickVec.set(x, y);
    if (Math.hypot(x, y) > 0.1) {
      this.tapWalkTarget = null;
      this.tapWaypoints = [];
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
  }

  public setTitleMode(title: boolean) {
    this.titleMode = title;
  }

  public adjustZoom(delta: number) {
    this.camDistance = THREE.MathUtils.clamp(this.camDistance + delta, 11, 34);
  }

  public rotateCamera(deltaAzimuth: number) {
    this.camAzimuth += deltaAzimuth;
  }

  public teleportToZone(zoneId: string) {
    const z = CITY_ZONES.find((c) => c.id === zoneId);
    if (!z) return;
    this.tapWalkTarget = null;
    this.tapWaypoints = [];
    if (this.inVehicle && this.playerCarParts) {
      // Cars arrive on a road or open paving (the piazza is pedestrian-only behind bollards)
      const spot = CAR_TRAVEL_SPOTS[zoneId] ?? { x: z.x, z: Math.min(Math.max(z.z, -3), 3) };
      this.carPos.set(spot.x, 0, spot.z);
      this.resolveWorldCollision(this.carPos, 1.05, false, false);
      this.playerCarParts.group.position.copy(this.carPos);
      this.playerPos.copy(this.carPos);
    } else {
      this.playerPos.set(z.x, 0, z.z);
      this.resolveWorldCollision(this.playerPos, 0.32, true, false);
      this.playerParts.root.position.copy(this.playerPos);
    }
    sound.playClick();
  }

  public toggleVehicle() {
    if (!this.playerCarParts) return;
    if (this.inVehicle) {
      this.inVehicle = false;
      this.playerParts.root.visible = true;
      // Pick first unobstructed exit spot next to car door
      const offsets: [number, number][] = [
        [0, 1.85],
        [0, -1.85],
        [1.85, 0],
        [-1.85, 0],
      ];
      let chosenX = this.carPos.x;
      let chosenZ = this.carPos.z + 1.85;
      for (const [ox, oz] of offsets) {
        _v2.set(
          THREE.MathUtils.clamp(this.carPos.x + ox, -14.5, 45.5),
          0,
          THREE.MathUtils.clamp(this.carPos.z + oz, -16, 16)
        );
        const beforeX = _v2.x;
        const beforeZ = _v2.z;
        this.resolveWorldCollision(_v2, 0.32, true, false);
        if (Math.hypot(_v2.x - beforeX, _v2.z - beforeZ) < 0.25) {
          chosenX = _v2.x;
          chosenZ = _v2.z;
          break;
        }
      }
      this.playerPos.set(chosenX, 0, chosenZ);
      this.resolveWorldCollision(this.playerPos, 0.32, true, false);
      this.playerParts.root.position.copy(this.playerPos);
      sound.playClick();
    } else {
      this.inVehicle = true;
      this.playerParts.root.visible = false;
      this.tapWalkTarget = null;
      sound.playEngineStart();
    }
  }

  public setHeldDish(recipeId: RecipeId, qualityBonus: number) {
    if (this.heldDishMesh) {
      this.playerParts.carryAnchor.remove(this.heldDishMesh);
      this.heldDishMesh = null;
    }
    this.heldRecipe = recipeId;
    this.heldQuality = qualityBonus;
    this.heldDishMesh = createDishMesh(recipeId);
    this.heldDishMesh.scale.setScalar(0.82);
    this.heldDishMesh.position.y = 0.008;
    this.playerParts.carryAnchor.add(this.heldDishMesh);
    this.spawnBurst(this.playerPos.x, 1.4, this.playerPos.z, '#fbbf24', 7);
    sound.playBell();
  }

  public addReadyDishToCounter(recipeId: RecipeId, qualityBonus: number) {
    if (!this.heldRecipe) {
      this.setHeldDish(recipeId, qualityBonus);
      return;
    }
    this.readyDishes.push({
      id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      recipeId,
      qualityBonus,
    });
  }

  public clearHeldDish() {
    if (this.heldDishMesh) {
      this.playerParts.carryAnchor.remove(this.heldDishMesh);
      this.heldDishMesh = null;
    }
    this.heldRecipe = null;
    this.heldQuality = 1.0;
  }

  public openCookForOrder(orderId: string) {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return;
    const def = RECIPES[order.recipeId];
    this.callbacks.onCookRequested(def.station, order);
  }

  public triggerContextAction() {
    const prompt = this.computeNearbyPrompt();
    if (!prompt) return;

    if (prompt.actionType === 'cook_station' && prompt.stationType) {
      const matchingOrder =
        this.orders.find((o) => this.remainingAtStation(o, prompt.stationType!)) ??
        this.orders.find((o) => o.status === 'waiting') ??
        null;
      this.callbacks.onCookRequested(prompt.stationType, matchingOrder);
    } else if (prompt.actionType === 'serve_table' && prompt.tableId !== undefined) {
      this.serveTableByPlayer(prompt.tableId);
    } else if (prompt.actionType === 'serve_takeaway') {
      this.serveTakeawayByPlayer();
    } else if (prompt.actionType === 'clean_table' && prompt.tableId !== undefined) {
      this.cleanTableByPlayer(prompt.tableId);
    } else if (prompt.actionType === 'enter_car' || prompt.actionType === 'exit_car') {
      this.toggleVehicle();
    } else if (prompt.actionType === 'open_shop' && prompt.shopTab) {
      this.callbacks.onShopRequested(prompt.shopTab, prompt.shopSubTab);
    } else if (prompt.actionType === 'open_bank') {
      this.callbacks.onShopRequested('city', 'bank');
    } else if (prompt.actionType === 'open_supermarket') {
      this.callbacks.onShopRequested('city', 'market');
    } else if (prompt.actionType === 'open_home') {
      this.callbacks.onShopRequested('lifestyle', 'housing');
    } else if (prompt.actionType === 'put_down') {
      this.putHeldDishOnCounter();
    } else if (prompt.actionType === 'pick_up') {
      this.pickUpFromCounter();
    } else if (prompt.actionType === 'trash') {
      this.trashHeldDish();
    }
  }

  private computeNearbyPrompt(): NearbyPrompt | null {
    if (this.inVehicle) {
      return {
        id: 'exit_car',
        label: 'Park & Exit Car',
        sublabel: 'Step out onto street',
        actionType: 'exit_car',
      };
    }

    const playerInside = this.isInsideRestaurant(this.playerPos.x, this.playerPos.z);

    // 1. Check nearby seated customer needing held dish (only when inside restaurant)
    if (this.heldRecipe && playerInside) {
      for (const tbl of this.tables) {
        if (!tbl.occupiedBy) continue;
        const order = this.orders.find(
          (o) => o.tableId === tbl.id && this.orderNeeds(o, this.heldRecipe!)
        );
        if (order && Math.hypot(this.playerPos.x - tbl.x, this.playerPos.z - tbl.z) < 2.6) {
          return {
            id: `serve_${tbl.id}`,
            label: `Serve ${RECIPES[this.heldRecipe].name}`,
            sublabel: `Table ${tbl.id}`,
            actionType: 'serve_table',
            tableId: tbl.id,
          };
        }
      }

      // Takeaway counter
      const takeOrder = this.orders.find((o) => o.tableId === -1 && this.orderNeeds(o, this.heldRecipe!));
      if (takeOrder && this.playerPos.distanceTo(this.registerPos) < 2.8) {
        return {
          id: 'serve_takeaway',
          label: `Hand Takeaway ${RECIPES[this.heldRecipe].name}`,
          sublabel: takeOrder.customerName,
          actionType: 'serve_takeaway',
        };
      }
    }

    // 1b. Pass counter (put down / pick up) and waste bin (throw away)
    if (playerInside) {
      const nearPass = Math.hypot(this.playerPos.x - this.passPos.x, this.playerPos.z - this.passPos.z) < 1.9;
      if (this.heldRecipe) {
        if (Math.hypot(this.playerPos.x - this.binPos.x, this.playerPos.z - this.binPos.z) < 1.4) {
          return {
            id: 'trash',
            label: `Throw away ${RECIPES[this.heldRecipe].name}`,
            sublabel: 'Waste bin',
            actionType: 'trash',
          };
        }
        if (nearPass && this.readyDishes.length < RestaurantWorldEngine.PASS_SLOTS) {
          return {
            id: 'put_down',
            label: `Put ${RECIPES[this.heldRecipe].name} on pass`,
            sublabel: 'Serve it later',
            actionType: 'put_down',
          };
        }
      } else if (nearPass && this.readyDishes.length > 0) {
        const wanted = new Set(this.allNeededDishes());
        const dish = this.readyDishes.find((d) => wanted.has(d.recipeId)) ?? this.readyDishes[0];
        return {
          id: 'pick_up',
          label: `Pick up ${RECIPES[dish.recipeId].name}`,
          sublabel: `${this.readyDishes.length} on the pass`,
          actionType: 'pick_up',
        };
      }
    }

    // 2. Check dirty tables (only when inside restaurant)
    if (playerInside) {
      for (const tbl of this.tables) {
        if (tbl.dirty && Math.hypot(this.playerPos.x - tbl.x, this.playerPos.z - tbl.z) < 2.3) {
          return {
            id: `clean_${tbl.id}`,
            label: `Clean Table ${tbl.id}`,
            sublabel: '+Cleanliness & Tip Boost',
            actionType: 'clean_table',
            tableId: tbl.id,
          };
        }
      }
    }

    // 3. Check kitchen stations (only when inside restaurant)
    if (playerInside) {
      for (const st of this.stations) {
        if (Math.hypot(this.playerPos.x - st.x, this.playerPos.z - st.z) < 2.15) {
          const pending = this.orders.find((o) => this.remainingAtStation(o, st.type));
          const pendingDish = pending ? this.remainingAtStation(pending, st.type) : undefined;
          const stationLabel = STATION_INFO[st.type].name;
          return {
            id: `cook_${st.type}`,
            label: pendingDish ? `Cook ${RECIPES[pendingDish].name}` : `Use ${stationLabel}`,
            sublabel: pending ? `For ${pending.customerName}` : 'Prepare dish',
            actionType: 'cook_station',
            stationType: st.type,
          };
        }
      }
    }

    // 4. Check parked car
    if (
      this.playerCarParts &&
      Math.hypot(this.playerPos.x - this.carPos.x, this.playerPos.z - this.carPos.z) < 2.9
    ) {
      return {
        id: 'enter_car',
        label: 'Drive Car',
        sublabel: 'Cruise the City Avenue',
        actionType: 'enter_car',
      };
    }

    // 5. Check City Shop Pads
    if (Math.hypot(this.playerPos.x - 10.5, this.playerPos.z - -9.4) < 2.6) {
      return {
        id: 'shop_clothes',
        label: 'Enter Style Atelier',
        sublabel: 'Buy Outfits & Watches',
        actionType: 'open_shop',
        shopTab: 'lifestyle',
        shopSubTab: 'clothing',
      };
    }
    if (Math.hypot(this.playerPos.x - 24.5, this.playerPos.z - -9.4) < 2.6) {
      return {
        id: 'shop_cars',
        label: 'Enter Apex Motors',
        sublabel: 'Car Dealership',
        actionType: 'open_shop',
        shopTab: 'lifestyle',
        shopSubTab: 'cars',
      };
    }
    if (Math.hypot(this.playerPos.x - 10.5, this.playerPos.z - 10.4) < 2.6) {
      return {
        id: 'shop_market',
        label: 'Fresh Wholesale',
        sublabel: 'Ingredient Discounts',
        actionType: 'open_supermarket',
      };
    }
    if (Math.hypot(this.playerPos.x - 24.5, this.playerPos.z - 10.4) < 2.6) {
      return {
        id: 'shop_bank',
        label: 'Metro Bank',
        sublabel: 'Withdraw & Franchises',
        actionType: 'open_bank',
      };
    }
    if (Math.hypot(this.playerPos.x - 40, this.playerPos.z - -2) < 4.5) {
      return {
        id: 'home_interior',
        label: 'Decorate Residence',
        sublabel: 'Housing & Furniture',
        actionType: 'open_home',
      };
    }

    return null;
  }

  private serveTableByPlayer(tableId: number) {
    if (!this.heldRecipe) return;
    const order = this.orders.find((o) => o.tableId === tableId && this.orderNeeds(o, this.heldRecipe!));
    if (!order) return;
    const recipe = this.heldRecipe;
    const quality = this.heldQuality;
    this.clearHeldDish();
    this.deliverItem(order, recipe, quality);
  }

  private serveTakeawayByPlayer() {
    if (!this.heldRecipe) return;
    const order = this.orders.find((o) => o.tableId === -1 && this.orderNeeds(o, this.heldRecipe!));
    if (!order) return;
    const recipe = this.heldRecipe;
    const quality = this.heldQuality;
    this.clearHeldDish();
    this.deliverItem(order, recipe, quality);
  }

  private cleanTableByPlayer(tableId: number) {
    const tbl = this.tables.find((t) => t.id === tableId);
    if (!tbl || !tbl.dirty) return;
    tbl.dirty = false;
    tbl.parts.dirtyMesh.visible = false;
    this.spawnBurst(tbl.x, 1.0, tbl.z, '#34d399', 8);
    sound.playClean();
    this.callbacks.onTableCleaned();
  }

  /**
   * Delivers one dish of an order. Combos stay open (with a small patience boost)
   * until every dish has arrived; then the whole order is paid out.
   */
  private deliverItem(order: CustomerOrder, recipeId: RecipeId, qualityBonus: number): boolean {
    const idx = order.remaining.indexOf(recipeId);
    if (order.status !== 'waiting' || idx === -1) return false;
    order.remaining.splice(idx, 1);
    order.qualitySum += qualityBonus;
    if (order.remaining.length > 0) order.recipeId = order.remaining[0];

    // Show the dish on the table (combos line up side by side)
    if (order.tableId !== -1) {
      const tbl = this.tables.find((t) => t.id === order.tableId);
      if (tbl) {
        if (!tbl.servedDishMesh) {
          tbl.servedDishMesh = new THREE.Group();
          tbl.parts.plateAnchor.add(tbl.servedDishMesh);
        }
        const n = tbl.servedDishMesh.children.length;
        const dish = createDishMesh(recipeId);
        if (order.items.length > 1) {
          dish.scale.setScalar(0.8);
          dish.position.x = (n - (order.items.length - 1) / 2) * 0.34;
        }
        tbl.servedDishMesh.add(dish);
      }
    }

    if (order.remaining.length > 0) {
      order.patience = Math.min(order.maxPatience, order.patience + order.maxPatience * 0.12);
      sound.playClick();
      this.callbacks.onItemServed(recipeId, order.remaining.length);
      return true;
    }
    this.finalizeOrder(order);
    return true;
  }

  private finalizeOrder(order: CustomerOrder) {
    order.status = 'served';
    this.orders = this.orders.filter((o) => o.id !== order.id);

    const cust = this.customers.find((c) => c.id === order.customerId);
    const save = this.saveRef.current;
    const qualityBonus = order.qualitySum / Math.max(1, order.items.length);

    // Financial math (every dish in the combo counts; mastery raises each dish's price)
    const repFactor = 0.85 + save.reputation * 0.1;
    const decorFactor = 1 + (save.equipmentLevels.decor - 1) * 0.1;
    const regFactor = 1 + (save.equipmentLevels.register - 1) * 0.08;
    const patienceRatio = order.patience / order.maxPatience;
    const itemsValue = order.items.reduce((sum, r) => {
      const def = RECIPES[r];
      const specialtyFactor =
        def.station === 'specialty' ? 1 + ((save.equipmentLevels.specialty ?? 1) - 1) * 0.1 : 1;
      return sum + def.sellPrice * specialtyFactor * getMasteryPriceMult(save.recipeMastery?.[r] ?? 0);
    }, 0);
    const baseSale = Math.round(itemsValue * qualityBonus * getComboBonusMult(order.items.length));

    // Serving streak: completed in a row (resets on a walk-out or after STREAK_WINDOW idle seconds)
    this.streakCount += 1;
    this.streakTimer = STREAK_WINDOW;
    const streakMult = getStreakMult(this.streakCount);
    this.callbacks.onStreakChanged(this.streakCount, streakMult);

    const tipRate =
      order.archetype === 'vip'
        ? 0.45
        : order.archetype === 'critic'
          ? 0.35
          : order.archetype === 'business'
            ? 0.25
            : 0.16;
    const activeTheme =
      CAFE_THEMES.find((t) => t.id === (save.activeCafeThemeId ?? 'classic_bistro')) ?? CAFE_THEMES[0];
    const themeTipMult = 1 + activeTheme.tipBonus / 100;
    // Equipped outfit / hat / watch prestige (advertised as "+X% Tip Prestige" in the shop)
    const prestigeTipMult = 1 + getPrestigeTipBonus(save) / 100;
    // Head Cashier: "+15% tip efficiency"
    const cashierTipMult = save.staff.some((s) => s.role === 'cashier') ? 1.15 : 1;
    const tip = Math.round(
      baseSale *
        tipRate *
        (0.5 + patienceRatio * 0.8) *
        decorFactor *
        regFactor *
        repFactor *
        themeTipMult *
        prestigeTipMult *
        cashierTipMult *
        streakMult
    );

    const repDelta =
      (order.archetype === 'critic' ? 0.12 : 0.04) *
      (patienceRatio > 0.5 ? 1 : 0.4) *
      (qualityBonus > 1.05 ? 1.3 : 1) *
      getCleanlinessReputationMult(save.cleanliness);
    const xpGain = Math.round(16 + itemsValue * 0.45);
    const info = {
      items: order.items.slice(),
      comboSize: order.items.length,
      streak: this.streakCount,
      streakMult,
    };

    if (order.tableId !== -1) {
      const tbl = this.tables.find((t) => t.id === order.tableId);
      if (cust) {
        cust.state = 'eating';
        cust.eatTimer = 4.0 + (order.items.length - 1) * 1.5;
      }
      this.spawnBurst(tbl?.x ?? 0, 1.2, tbl?.z ?? 0, '#10b981', 10 + order.items.length * 4);
      this.callbacks.onOrderServed(order.items[0], baseSale, tip, repDelta, xpGain, {
        x: tbl?.x ?? 0,
        y: 1.9,
        z: tbl?.z ?? 0,
      }, info);
    } else {
      if (cust) {
        this.sendCustomerToExit(cust);
      }
      this.spawnBurst(this.registerPos.x, 1.3, this.registerPos.z, '#10b981', 10);
      this.callbacks.onOrderServed(order.items[0], baseSale, tip, repDelta, xpGain, {
        x: this.registerPos.x,
        y: 2.0,
        z: this.registerPos.z,
      }, info);
    }
    sound.playCash();
  }

  private spawnBurst(x: number, y: number, z: number, colorHex: string, count: number) {
    let spawned = 0;
    for (const p of this.particles) {
      if (!p.active && spawned < count) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.65 + Math.random() * 0.35;
        p.mesh.visible = true;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.setScalar(1);
        (p.mesh.material as THREE.MeshBasicMaterial).color.set(colorHex);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
        p.vel.set(
          (Math.random() - 0.5) * 2.4,
          1.8 + Math.random() * 2.2,
          (Math.random() - 0.5) * 2.4
        );
        spawned++;
      }
    }
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      this.trackFrameRate(rawDt);

      this.updateSimulation(dt);
      this.renderer.render(this.scene, this.camera);
      this.frameListener?.();

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };
    this.frameId = requestAnimationFrame(tick);
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateSimulation(dt: number) {
    const save = this.saveRef.current;

    // Gentle Day/Night Atmosphere Cycle
    if (!this.paused) {
      save.timeOfDay = (save.timeOfDay + dt * 0.0045) % 1;
    }
    this.updateAtmosphere(save.timeOfDay);

    // Midnight rollover: a large backwards jump in timeOfDay means the clock wrapped
    // (either naturally or via the Settings "Cycle Time" button). Only counts during play.
    if (
      this.lastTimeOfDay >= 0 &&
      save.timeOfDay + 0.5 < this.lastTimeOfDay &&
      !this.titleMode
    ) {
      this.callbacks.onDayEnded();
    }
    this.lastTimeOfDay = save.timeOfDay;

    // Fountain water + lantern light pools + lit skyline windows (runs on title screen too)
    this.oldTown.update(dt, this.nightTarget);

    // Title screen smooth orbiting showcase
    if (this.titleMode) {
      this.camAzimuth += dt * 0.16;
      const targetX = -2;
      const targetZ = 0;
      this.camTarget.set(targetX, 1.4, targetZ);
      this.updateCameraTransform(dt, 20, 0.56);
      // Let a couple background customers exist on title screen
      this.updateParticles(dt);
      return;
    }

    if (this.paused) return;

    // 1. Player or Vehicle Movement
    this.updatePlayerMovement(dt);

    // 2. Build shared avoidance snapshot & update Customers + Staff with physics
    this.rebuildAvoidanceActors();
    this.updateCustomers(dt);
    this.updateStaffAI(dt);
    this.resolveNpcMutualSeparations();

    // 4. Particles
    this.updateParticles(dt);

    this.updateCookJobs(dt);
    if (this.streakCount > 0) {
      this.streakTimer -= dt;
      if (this.streakTimer <= 0) this.breakStreak();
    }
    this.syncPassDishes();

    // Machines with a customer waiting for one of their dishes glow and pulse
    this.stationPulseTime += dt;
    for (const st of this.stations) {
      const hasOrder = this.orders.some((o) => this.remainingAtStation(o, st.type));
      const mat = st.ring.material as THREE.MeshBasicMaterial;
      if (hasOrder) {
        const k = 0.5 + 0.5 * Math.sin(this.stationPulseTime * 5);
        mat.color.set('#22c55e');
        mat.opacity = 0.55 + k * 0.4;
        st.ring.scale.setScalar(1 + k * 0.18);
      } else {
        mat.color.set(st.type === 'specialty' ? '#ec4899' : '#f97316');
        mat.opacity = 0.35;
        st.ring.scale.setScalar(1);
      }
    }

    // 5. Camera Follow
    const focus = this.inVehicle ? this.carPos : this.playerPos;
    this.camTarget.x = THREE.MathUtils.damp(this.camTarget.x, focus.x, 7.5, dt);
    this.camTarget.y = THREE.MathUtils.damp(this.camTarget.y, 1.1, 7.5, dt);
    this.camTarget.z = THREE.MathUtils.damp(this.camTarget.z, focus.z, 7.5, dt);
    this.updateCameraTransform(dt, this.inVehicle ? this.camDistance + 3.5 : this.camDistance, this.camPitch);

    // Move sun light shadow frustum with player
    this.sunLight.position.set(this.camTarget.x + 18, 28, this.camTarget.z + 16);
    this.sunLight.target.position.copy(this.camTarget);
    this.sunLight.target.updateMatrixWorld();

    // 6. Sync HUD Snapshot at ~18Hz so React never stalls 60fps Three.js loop
    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.055) {
      this.hudSyncTimer = 0;
      this.emitHudSnapshot();
    }
  }

  private updateAtmosphere(t: number) {
    // t: 0.25 morning, 0.5 noon, 0.75 sunset, 0.92 night
    const daylight = Math.max(0.18, Math.sin(t * Math.PI));
    const sunsetFactor = Math.max(0, 1 - Math.abs(t - 0.74) * 7.5);
    const nightFactor = t > 0.8 || t < 0.16 ? 1 : 0;

    const skyColor = _v1.set(0.72, 0.89, 0.99);
    if (sunsetFactor > 0.1) {
      skyColor.lerp(_v2.set(0.98, 0.68, 0.45), sunsetFactor * 0.7);
    }
    if (nightFactor > 0) {
      skyColor.lerp(_v2.set(0.08, 0.12, 0.22), 0.88);
    }

    const bg = this.scene.background as THREE.Color;
    bg.setRGB(skyColor.x, skyColor.y, skyColor.z);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(bg);
    }

    this.sunLight.intensity = 0.35 + daylight * 1.18;
    this.hemiLight.intensity = 0.38 + daylight * 0.38;

    const lampGlow = nightFactor > 0 || sunsetFactor > 0.3 ? 1.4 : 0.25;
    this.nightTarget = nightFactor > 0 ? 1 : sunsetFactor > 0.3 ? 0.6 : 0;
    for (const mat of this.streetLampBulbs) {
      mat.emissiveIntensity = lampGlow;
    }
  }

  /**
   * When the camera swings behind the restaurant, the tall wall between it and the
   * dining room fades to see-through instead of filling the screen.
   */
  private updateWallFade(dt: number) {
    const b = this.restaurantBounds;
    const cam = this.camera.position;
    const backTarget = cam.z < b.minZ + 0.6 ? 0.14 : 1;
    const leftTarget = cam.x < b.minX + 0.6 ? 0.14 : 1;
    this.backWallFade = THREE.MathUtils.damp(this.backWallFade, backTarget, 9, dt);
    this.leftWallFade = THREE.MathUtils.damp(this.leftWallFade, leftTarget, 9, dt);
    const apply = (mats: THREE.MeshStandardMaterial[], fade: number) => {
      const see = fade < 0.98;
      for (const m of mats) {
        if (m.transparent !== see) {
          m.transparent = see;
          m.needsUpdate = true;
        }
        m.opacity = see ? fade : 1;
        m.depthWrite = fade > 0.6;
      }
    };
    apply(this.backWallMats, this.backWallFade);
    apply(this.leftWallMats, this.leftWallFade);
  }

  private updateCameraTransform(dt: number, dist: number, pitch: number) {
    const horiz = Math.cos(pitch) * dist;
    const vert = Math.sin(pitch) * dist;
    const desiredX = this.camTarget.x + Math.sin(this.camAzimuth) * horiz;
    const desiredY = this.camTarget.y + vert;
    const desiredZ = this.camTarget.z + Math.cos(this.camAzimuth) * horiz;

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, desiredX, 10, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, desiredY, 10, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, desiredZ, 10, dt);
    this.camera.lookAt(this.camTarget);
    this.updateWallFade(dt);
  }

  private updatePlayerMovement(dt: number) {
    let inputX = this.joystickVec.x;
    let inputY = this.joystickVec.y;

    if (this.heldKeys['KeyW'] || this.heldKeys['ArrowUp']) inputY -= 1;
    if (this.heldKeys['KeyS'] || this.heldKeys['ArrowDown']) inputY += 1;
    if (this.heldKeys['KeyA'] || this.heldKeys['ArrowLeft']) inputX -= 1;
    if (this.heldKeys['KeyD'] || this.heldKeys['ArrowRight']) inputX += 1;

    const hasDirectional = Math.hypot(inputX, inputY) > 0.08;

    // Camera-relative movement direction on XZ plane
    _v1.set(0, 0, 0);
    if (hasDirectional) {
      this.tapWalkTarget = null;
      this.tapWaypoints = [];
      const sinA = Math.sin(this.camAzimuth);
      const cosA = Math.cos(this.camAzimuth);
      // Screen-right = (cosA, 0, -sinA), Screen-down = (sinA, 0, cosA)
      _v1.x = inputX * cosA + inputY * sinA;
      _v1.z = -inputX * sinA + inputY * cosA;
      _v1.normalize();
    } else if (this.tapWalkTarget) {
      const pos = this.inVehicle ? this.carPos : this.playerPos;
      if (!this.inVehicle && this.tapWaypointIdx < this.tapWaypoints.length) {
        const wp = this.tapWaypoints[this.tapWaypointIdx];
        if (
          this.tapWaypointIdx < this.tapWaypoints.length - 1 &&
          Math.hypot(wp.x - pos.x, wp.z - pos.z) < 0.45
        ) {
          this.tapWaypointIdx++;
        }
        const activeWp = this.tapWaypoints[this.tapWaypointIdx] ?? this.tapWalkTarget;
        _v1.set(activeWp.x - pos.x, 0, activeWp.z - pos.z);
        const distToFinal = Math.hypot(this.tapWalkTarget.x - pos.x, this.tapWalkTarget.z - pos.z);
        if (distToFinal < 0.35) {
          this.tapWalkTarget = null;
          this.tapWaypoints = [];
          _v1.set(0, 0, 0);
        } else if (_v1.lengthSq() > 1e-4) {
          _v1.normalize();
        }
      } else {
        _v1.subVectors(this.tapWalkTarget, pos);
        _v1.y = 0;
        if (_v1.length() < 0.35) {
          this.tapWalkTarget = null;
          this.tapWaypoints = [];
          _v1.set(0, 0, 0);
        } else {
          _v1.normalize();
        }
      }
    }

    const moving = _v1.lengthSq() > 0.01;

    if (this.inVehicle && this.playerCarParts) {
      const carDef =
        VEHICLE_CATALOG.find((v) => v.id === this.saveRef.current.activeVehicleId) ??
        VEHICLE_CATALOG[0];
      const speed = carDef.speed;
      const minCarX = Math.max(this.restaurantBounds.maxX + 1.55, 4.5);
      if (moving) {
        const prevX = this.carPos.x;
        const prevZ = this.carPos.z;
        const stepDist = speed * dt;
        const subSteps = Math.max(1, Math.ceil(stepDist / 0.25));
        const subStep = stepDist / subSteps;
        for (let s = 0; s < subSteps; s++) {
          this.carPos.x = THREE.MathUtils.clamp(this.carPos.x + _v1.x * subStep, minCarX, 45);
          this.carPos.z = THREE.MathUtils.clamp(this.carPos.z + _v1.z * subStep, -16, 16);
          this.resolveWorldCollision(this.carPos, 1.05, false, false);
          this.carPos.x = THREE.MathUtils.clamp(this.carPos.x, minCarX, 45);
          this.carPos.z = THREE.MathUtils.clamp(this.carPos.z, -16, 16);
        }
        this.carVel.set(
          (this.carPos.x - prevX) / Math.max(dt, 1e-4),
          0,
          (this.carPos.z - prevZ) / Math.max(dt, 1e-4)
        );

        if (this.tapWalkTarget) {
          if (Math.hypot(this.carPos.x - prevX, this.carPos.z - prevZ) < 0.015) {
            this.stuckTapTimer += dt;
            if (this.stuckTapTimer > 0.25) {
              this.tapWalkTarget = null;
              this.tapWaypoints = [];
              this.stuckTapTimer = 0;
            }
          } else {
            this.stuckTapTimer = 0;
          }
        }

        const targetYaw = Math.atan2(_v1.x, _v1.z);
        this.carYaw = this.lerpAngle(this.carYaw, targetYaw, 10 * dt);
        for (const w of this.playerCarParts.wheels) {
          w.rotation.x += speed * dt * 1.4;
        }
      } else {
        this.stuckTapTimer = 0;
        this.carVel.set(0, 0, 0);
      }
      this.playerVel.copy(this.carVel);
      this.playerCarParts.group.position.copy(this.carPos);
      this.playerCarParts.group.rotation.y = this.carYaw;
      this.playerPos.copy(this.carPos);
    } else {
      const speed = 6.6;
      this.carVel.set(0, 0, 0);
      if (moving) {
        const prevX = this.playerPos.x;
        const prevZ = this.playerPos.z;
        const stepDist = speed * dt;
        const subSteps = Math.max(1, Math.ceil(stepDist / 0.1));
        const subStep = stepDist / subSteps;
        for (let s = 0; s < subSteps; s++) {
          this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x + _v1.x * subStep, -16, 45.5);
          this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z + _v1.z * subStep, -16, 16);
          this.resolveWorldCollision(this.playerPos, 0.32, true, s === subSteps - 1);
          this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -16, 45.5);
          this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -16, 16);
        }
        this.playerVel.set(
          (this.playerPos.x - prevX) / Math.max(dt, 1e-4),
          0,
          (this.playerPos.z - prevZ) / Math.max(dt, 1e-4)
        );

        if (this.tapWalkTarget) {
          if (Math.hypot(this.playerPos.x - prevX, this.playerPos.z - prevZ) < 0.012) {
            this.stuckTapTimer += dt;
            if (this.stuckTapTimer > 0.28) {
              this.tapWalkTarget = null;
              this.tapWaypoints = [];
              this.stuckTapTimer = 0;
            }
          } else {
            this.stuckTapTimer = 0;
          }
        }

        const targetYaw = Math.atan2(_v1.x, _v1.z);
        this.playerYaw = this.lerpAngle(this.playerYaw, targetYaw, 14 * dt);
        this.playerWalkPhase += dt * 13;
      } else {
        this.playerWalkPhase = 0;
        this.stuckTapTimer = 0;
        this.playerVel.set(0, 0, 0);
        // Gently separate even if an NPC walks right into stationary player
        this.resolveWorldCollision(this.playerPos, 0.32, true, true);
      }
      this.animateCharacterLimbs(this.playerParts, this.playerWalkPhase, Boolean(this.heldRecipe));
      const targetGroundY = this.getGroundHeight(this.playerPos.x, this.playerPos.z);
      const nextY = THREE.MathUtils.damp(this.playerParts.root.position.y, targetGroundY, 18, dt);
      this.playerParts.root.position.set(this.playerPos.x, nextY, this.playerPos.z);
      this.playerParts.root.rotation.y = this.playerYaw;
    }

    // Proximity auto-serve if holding exact matching dish right next to waiting customer inside restaurant
    if (this.heldRecipe && !this.inVehicle && this.isInsideRestaurant(this.playerPos.x, this.playerPos.z)) {
      for (const tbl of this.tables) {
        if (!tbl.occupiedBy) continue;
        const order = this.orders.find((o) => o.tableId === tbl.id && this.orderNeeds(o, this.heldRecipe!));
        if (order && Math.hypot(this.playerPos.x - tbl.x, this.playerPos.z - tbl.z) < 1.55) {
          const recipe = this.heldRecipe;
          const quality = this.heldQuality;
          this.clearHeldDish();
          this.deliverItem(order, recipe, quality);
          break;
        }
      }
    }
  }

  private isInsideRestaurant(x: number, z: number): boolean {
    return (
      x > this.restaurantBounds.minX + 0.25 &&
      x < this.restaurantBounds.maxX - 0.1 &&
      z > this.restaurantBounds.minZ + 0.25 &&
      z < this.restaurantBounds.maxZ - 0.25
    );
  }

  private getGroundHeight(x: number, z: number): number {
    if (
      x >= this.restaurantBounds.minX &&
      x <= this.restaurantBounds.maxX &&
      z >= this.restaurantBounds.minZ &&
      z <= this.restaurantBounds.maxZ
    ) {
      return 0.1;
    }
    return 0;
  }

  private resolveNpcStaticColliders(pos: THREE.Vector3, radius: number) {
    for (let iter = 0; iter < 2; iter++) {
      resolveColliderList(pos, radius, this.staticColliders);
      resolveColliderList(pos, radius, this.restaurantColliders);
      resolveColliderList(pos, radius, this.homeColliders);
      if (this.playerCarParts) {
        resolveVehicleCapsule(pos, radius, this.carPos, this.carYaw);
      }
    }
  }

  private resolveWorldCollision(
    pos: THREE.Vector3,
    radius: number,
    includeParkedCar: boolean,
    includeNpcs: boolean
  ) {
    // 2 solver iterations ensure smooth wall-sliding at corners & adjacent objects
    for (let iter = 0; iter < 2; iter++) {
      resolveColliderList(pos, radius, this.staticColliders);
      resolveColliderList(pos, radius, this.restaurantColliders);
      resolveColliderList(pos, radius, this.homeColliders);

      // Parked vehicle 2-circle capsule collider
      if (includeParkedCar && this.playerCarParts) {
        resolveVehicleCapsule(pos, radius, this.carPos, this.carYaw);
      }
      // Customer cars (parked in the lot or driving)
      if (this.parking) {
        for (const car of this.parking.getCarObstacles()) {
          resolveVehicleCapsule(pos, radius, car.pos, car.yaw);
        }
      }
    }

    // Character-to-character separation so player doesn't ghost through NPCs
    if (includeNpcs) {
      const npcRadius = 0.27;
      const minDist = radius + npcRadius;
      const minDistSq = minDist * minDist;

      for (const c of this.customers) {
        const nPos = c.mesh.root.position;
        const dx = pos.x - nPos.x;
        const dz = pos.z - nPos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDistSq) {
          const seated =
            (c.tableId !== -1 && c.state !== 'entering' && c.state !== 'leaving') ||
            c.state === 'seated_waiting' ||
            c.state === 'eating';
          const dist = Math.sqrt(Math.max(distSq, 1e-6));
          const overlap = minDist - dist;
          const nx = distSq < 1e-6 ? 1 : dx / dist;
          const nz = distSq < 1e-6 ? 0 : dz / dist;
          if (seated) {
            pos.x += nx * overlap;
            pos.z += nz * overlap;
          } else {
            pos.x += nx * overlap * 0.55;
            pos.z += nz * overlap * 0.55;
            nPos.x -= nx * overlap * 0.45;
            nPos.z -= nz * overlap * 0.45;
            this.resolveNpcStaticColliders(nPos, npcRadius);
          }
        }
      }

      for (const s of this.staffAgents) {
        const sPos = s.mesh.root.position;
        const dx = pos.x - sPos.x;
        const dz = pos.z - sPos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDistSq) {
          const dist = Math.sqrt(Math.max(distSq, 1e-6));
          const overlap = minDist - dist;
          const nx = distSq < 1e-6 ? 1 : dx / dist;
          const nz = distSq < 1e-6 ? 0 : dz / dist;
          pos.x += nx * overlap * 0.5;
          pos.z += nz * overlap * 0.5;
          sPos.x -= nx * overlap * 0.5;
          sPos.z -= nz * overlap * 0.5;
          this.resolveNpcStaticColliders(sPos, npcRadius);
        }
      }

      // Final hard-collider passes so NPC separation never pushes player into a wall/table
      for (let iter = 0; iter < 3; iter++) {
        resolveColliderList(pos, radius, this.staticColliders);
        resolveColliderList(pos, radius, this.restaurantColliders);
        resolveColliderList(pos, radius, this.homeColliders);
      }
    }
  }

  private animateCharacterLimbs(parts: CharacterParts, phase: number, carrying: boolean) {
    const swing = phase > 0 ? Math.sin(phase) * 0.65 : 0;
    parts.leftLeg.rotation.x = swing;
    parts.rightLeg.rotation.x = -swing;
    parts.trayMesh.visible = carrying;
    if (carrying) {
      parts.leftArm.rotation.x = -swing * 0.72;
      parts.leftArm.rotation.z = 0;
      parts.rightArm.rotation.x = -2.15 + Math.sin(phase) * 0.04;
      parts.rightArm.rotation.z = 0.30;
    } else {
      parts.leftArm.rotation.x = -swing * 0.75;
      parts.leftArm.rotation.z = 0;
      parts.rightArm.rotation.x = swing * 0.75;
      parts.rightArm.rotation.z = 0;
    }
  }

  private rebuildAvoidanceActors() {
    this.avoidanceActors.length = 0;
    if (this.inVehicle && this.playerCarParts) {
      this.avoidanceActors.push({
        x: this.carPos.x,
        z: this.carPos.z,
        vx: this.carVel.x,
        vz: this.carVel.z,
        radius: 1.2,
        isFirm: true,
        isCar: true,
      });
    } else {
      this.avoidanceActors.push({
        x: this.playerPos.x,
        z: this.playerPos.z,
        vx: this.playerVel.x,
        vz: this.playerVel.z,
        radius: 0.32,
        isFirm: false,
      });
      if (this.playerCarParts) {
        this.avoidanceActors.push({
          x: this.carPos.x,
          z: this.carPos.z,
          vx: 0,
          vz: 0,
          radius: 1.2,
          isFirm: true,
          isCar: true,
        });
      }
    }

    for (let i = 0; i < this.customers.length; i++) {
      const c = this.customers[i];
      const isFirm = c.state !== 'entering' && c.state !== 'leaving';
      this.avoidanceActors.push({
        x: c.mesh.root.position.x,
        z: c.mesh.root.position.z,
        vx: isFirm ? 0 : c.vel.x,
        vz: isFirm ? 0 : c.vel.z,
        radius: 0.27,
        isFirm,
      });
    }

    for (let i = 0; i < this.staffAgents.length; i++) {
      const s = this.staffAgents[i];
      this.avoidanceActors.push({
        x: s.mesh.root.position.x,
        z: s.mesh.root.position.z,
        vx: s.vel.x,
        vz: s.vel.z,
        radius: 0.27,
        isFirm: false,
      });
    }
  }

  private stepNpcAlongPath(
    pos: THREE.Vector3,
    vel: THREE.Vector3,
    waypoints: NavWaypoint[],
    waypointIdx: number,
    finalTarget: THREE.Vector3,
    maxSpeed: number,
    dt: number,
    selfAvoidIdx: number,
    radius = 0.27
  ): {
    nextWaypointIdx: number;
    actualSpeed: number;
    reachedFinal: boolean;
    blockedProgress: boolean;
  } {
    const activeTargetX =
      waypointIdx < waypoints.length ? waypoints[waypointIdx].x : finalTarget.x;
    const activeTargetZ =
      waypointIdx < waypoints.length ? waypoints[waypointIdx].z : finalTarget.z;

    const distToWaypoint = Math.hypot(activeTargetX - pos.x, activeTargetZ - pos.z);
    const isFinalWp = waypointIdx >= waypoints.length - 1;
    let nextWp = waypointIdx;

    if (!isFinalWp && distToWaypoint < 0.45) {
      nextWp++;
    }

    const goalX = nextWp < waypoints.length ? waypoints[nextWp].x : finalTarget.x;
    const goalZ = nextWp < waypoints.length ? waypoints[nextWp].z : finalTarget.z;
    const distToGoal = Math.hypot(finalTarget.x - pos.x, finalTarget.z - pos.z);

    if (distToGoal < 0.24) {
      vel.x = THREE.MathUtils.damp(vel.x, 0, 18, dt);
      vel.z = THREE.MathUtils.damp(vel.z, 0, 18, dt);
      return {
        nextWaypointIdx: nextWp,
        actualSpeed: 0,
        reachedFinal: true,
        blockedProgress: false,
      };
    }

    computeNpcSteering(
      pos.x,
      pos.z,
      vel.x,
      vel.z,
      radius,
      goalX,
      goalZ,
      maxSpeed,
      this.avoidanceActors,
      selfAvoidIdx,
      _steer2D
    );

    const arrivalScale = distToGoal < 0.7 ? THREE.MathUtils.clamp(distToGoal / 0.7, 0.35, 1) : 1;
    const desiredVx = _steer2D.x * maxSpeed * arrivalScale;
    const desiredVz = _steer2D.y * maxSpeed * arrivalScale;

    vel.x = THREE.MathUtils.damp(vel.x, desiredVx, 11, dt);
    vel.z = THREE.MathUtils.damp(vel.z, desiredVz, 11, dt);

    const prevX = pos.x;
    const prevZ = pos.z;
    const stepLen = Math.hypot(vel.x * dt, vel.z * dt);
    const subSteps = Math.max(1, Math.ceil(stepLen / 0.1));
    let totalCorrX = 0;
    let totalCorrZ = 0;

    for (let s = 0; s < subSteps; s++) {
      const preColX = THREE.MathUtils.clamp(pos.x + (vel.x * dt) / subSteps, -16, 45.5);
      const preColZ = THREE.MathUtils.clamp(pos.z + (vel.z * dt) / subSteps, -16, 16);
      pos.x = preColX;
      pos.z = preColZ;
      this.resolveNpcStaticColliders(pos, radius);
      totalCorrX += pos.x - preColX;
      totalCorrZ += pos.z - preColZ;
    }

    // Project inward velocity along collision push normal so NPCs slide smoothly along walls/tables
    const corrLen = Math.hypot(totalCorrX, totalCorrZ);
    if (corrLen > 1e-4) {
      const nx = totalCorrX / corrLen;
      const nz = totalCorrZ / corrLen;
      const vn = vel.x * nx + vel.z * nz;
      if (vn < 0) {
        vel.x -= nx * vn;
        vel.z -= nz * vn;
      }
    }

    const movedDist = Math.hypot(pos.x - prevX, pos.z - prevZ);
    const actualSpeed = movedDist / Math.max(dt, 1e-4);
    const blockedProgress = actualSpeed < maxSpeed * 0.18 && distToGoal > 0.45;

    return {
      nextWaypointIdx: nextWp,
      actualSpeed,
      reachedFinal: Math.hypot(finalTarget.x - pos.x, finalTarget.z - pos.z) < 0.24,
      blockedProgress,
    };
  }

  private resolveNpcMutualSeparations() {
    const npcR = 0.27;
    const minDist = npcR * 2;
    const minDistSq = minDist * minDist;

    // Collect dynamic walking NPCs + firm seated customers
    const activeNpcs: {
      pos: THREE.Vector3;
      vel: THREE.Vector3;
      firm: boolean;
    }[] = [];

    for (let i = 0; i < this.customers.length; i++) {
      const c = this.customers[i];
      const firm = c.state !== 'entering' && c.state !== 'leaving';
      activeNpcs.push({ pos: c.mesh.root.position, vel: c.vel, firm });
    }
    for (let i = 0; i < this.staffAgents.length; i++) {
      const s = this.staffAgents[i];
      activeNpcs.push({ pos: s.mesh.root.position, vel: s.vel, firm: false });
    }

    for (let i = 0; i < activeNpcs.length; i++) {
      const a = activeNpcs[i];
      for (let j = i + 1; j < activeNpcs.length; j++) {
        const b = activeNpcs[j];
        if (a.firm && b.firm) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDistSq) {
          const dist = Math.sqrt(Math.max(distSq, 1e-6));
          const overlap = minDist - dist;
          const nx = distSq < 1e-6 ? 1 : dx / dist;
          const nz = distSq < 1e-6 ? 0 : dz / dist;
          if (a.firm) {
            b.pos.x += nx * overlap;
            b.pos.z += nz * overlap;
          } else if (b.firm) {
            a.pos.x -= nx * overlap;
            a.pos.z -= nz * overlap;
          } else {
            a.pos.x -= nx * overlap * 0.5;
            a.pos.z -= nz * overlap * 0.5;
            b.pos.x += nx * overlap * 0.5;
            b.pos.z += nz * overlap * 0.5;
          }
        }
      }
    }

    // Final static obstacle clamp for all walking NPCs so separation never embeds into walls/furniture
    for (let i = 0; i < activeNpcs.length; i++) {
      const n = activeNpcs[i];
      if (n.firm) continue;
      this.resolveNpcStaticColliders(n.pos, npcR);
      this.resolveNpcStaticColliders(n.pos, npcR);
    }
  }

  private sendCustomerToExit(c: SimCustomer) {
    c.state = 'leaving';
    c.vel.set(0, 0, 0);
    c.stuckTimer = 0;
    c.repathCooldown = 0;
    // Drivers head to the footpath toward the parking lot; walk-ins leave along the piazza
    if (c.carId) c.targetPos.set(10.6, 0, 2.4);
    else c.targetPos.set(10.5, 0, (Math.random() - 0.5) * 4.4);
    c.waypoints = this.navGrid.findPath(
      c.mesh.root.position.x,
      c.mesh.root.position.z,
      c.targetPos.x,
      c.targetPos.z
    );
    c.waypointIdx = 0;
  }

  private updateCustomers(dt: number) {
    const save = this.saveRef.current;

    // Spawn new customer
    this.spawnTimer -= dt;
    const maxCustomers = this.tables.length + 2;
    if (this.spawnTimer <= 0 && this.customers.length + this.parking.inTransitCount() < maxCustomers) {
      const interval = Math.max(2.6, 6.2 - save.reputation * 0.58) + getEarlySpawnDelay(save.restaurantLevel);
      this.spawnTimer = interval;
      // About 4 in 10 guests drive in and use the parking lot (if a bay is free)
      const seed = Math.floor(Math.random() * 1000);
      const archetype = this.rollArchetype();
      const byCar = Math.random() < 0.4 && this.hasFreeTableOrTakeaway() && this.parking.trySpawnCar(archetype, seed);
      if (!byCar) this.spawnCustomer({ archetype, seed });
    }

    this.parking.update(dt, { pos: this.playerPos, inVehicle: this.inVehicle });

    const mgrCount = save.staff.filter((s) => s.role === 'manager').length;
    const decorMult = 1 + (save.equipmentLevels.decor - 1) * 0.1;
    const patienceDecayBase =
      ((mgrCount > 0 ? 1.85 : 2.55) / decorMult) *
      getCleanlinessPatienceMult(save.cleanliness) *
      getEarlyPatienceMult(save.restaurantLevel);

    // Avoidance array layout: [player (+parkedCar?), ...customers, ...staff]
    const customerBaseIdx = !this.inVehicle && this.playerCarParts ? 2 : 1;

    for (let i = this.customers.length - 1; i >= 0; i--) {
      const c = this.customers[i];
      const pos = c.mesh.root.position;
      c.activityTime += dt;
      c.repathCooldown = Math.max(0, c.repathCooldown - dt);
      const maxSpeed = c.archetype === 'impatient' ? 4.0 : 3.1;

      if (c.state === 'entering') {
        const res = this.stepNpcAlongPath(
          pos,
          c.vel,
          c.waypoints,
          c.waypointIdx,
          c.approachPos,
          maxSpeed,
          dt,
          customerBaseIdx + i
        );
        c.waypointIdx = res.nextWaypointIdx;

        if (res.blockedProgress) {
          c.stuckTimer += dt;
          if (c.stuckTimer > 0.65 && c.repathCooldown <= 0) {
            c.waypoints = this.navGrid.findPath(pos.x, pos.z, c.approachPos.x, c.approachPos.z);
            c.waypointIdx = 0;
            c.stuckTimer = 0;
            c.repathCooldown = 0.75;
          }
        } else {
          c.stuckTimer = 0;
        }

        const speedRatio = THREE.MathUtils.clamp(res.actualSpeed / maxSpeed, 0, 1);
        c.walkPhase += dt * (3 + speedRatio * 9.5);

        if (res.actualSpeed > 0.25) {
          c.mesh.root.rotation.y = this.lerpAngle(
            c.mesh.root.rotation.y,
            Math.atan2(c.vel.x, c.vel.z),
            10 * dt
          );
        }

        const groundY = this.getGroundHeight(pos.x, pos.z);
        applyCharacterKinematics({
          parts: c.mesh,
          walkPhase: c.walkPhase,
          speedRatio,
          carrying: false,
          sitBlend: 0,
          pose: 'locomotion',
          activityTime: c.activityTime,
          seedOffset: c.seedOffset,
          baseGroundY: groundY,
        });

        if (res.reachedFinal) {
          c.vel.set(0, 0, 0);
          if (c.tableId !== -1) {
            c.state = 'seating';
          } else {
            c.state = 'seated_waiting';
            c.mesh.root.rotation.y = Math.PI; // Face register counter
            this.createCustomerOrder(c);
          }
        }
      } else if (c.state === 'seating') {
        pos.x = THREE.MathUtils.damp(pos.x, c.seatPos.x, 10, dt);
        pos.z = THREE.MathUtils.damp(pos.z, c.seatPos.z, 10, dt);
        c.sitBlend = Math.min(1, c.sitBlend + dt * 3.4);

        const tbl = this.tables.find((t) => t.id === c.tableId);
        if (tbl) {
          c.mesh.root.rotation.y = this.lerpAngle(
            c.mesh.root.rotation.y,
            Math.atan2(tbl.x - pos.x, tbl.z - pos.z),
            12 * dt
          );
        }

        applyCharacterKinematics({
          parts: c.mesh,
          walkPhase: 0,
          speedRatio: 0,
          carrying: false,
          sitBlend: c.sitBlend,
          pose: 'seated_waiting',
          activityTime: c.activityTime,
          seedOffset: c.seedOffset,
          impatient: c.archetype === 'impatient',
          baseGroundY: 0.1,
        });

        if (Math.hypot(pos.x - c.seatPos.x, pos.z - c.seatPos.z) < 0.08 && c.sitBlend >= 0.96) {
          pos.x = c.seatPos.x;
          pos.z = c.seatPos.z;
          c.sitBlend = 1;
          c.state = 'seated_waiting';
          this.createCustomerOrder(c);
        }
      } else if (c.state === 'seated_waiting') {
        const isSeated = c.tableId !== -1;
        c.sitBlend = isSeated ? 1 : 0;
        if (isSeated) {
          const tbl = this.tables.find((t) => t.id === c.tableId);
          if (tbl) {
            c.mesh.root.rotation.y = this.lerpAngle(
              c.mesh.root.rotation.y,
              Math.atan2(tbl.x - pos.x, tbl.z - pos.z),
              10 * dt
            );
          }
        } else {
          c.mesh.root.rotation.y = this.lerpAngle(c.mesh.root.rotation.y, Math.PI, 10 * dt);
        }

        applyCharacterKinematics({
          parts: c.mesh,
          walkPhase: 0,
          speedRatio: 0,
          carrying: false,
          sitBlend: c.sitBlend,
          pose: 'seated_waiting',
          activityTime: c.activityTime,
          seedOffset: c.seedOffset,
          impatient: c.archetype === 'impatient',
          baseGroundY: this.getGroundHeight(pos.x, pos.z),
        });

        const order = this.orders.find((o) => o.id === c.orderId);
        if (order) {
          const mult = c.archetype === 'impatient' ? 1.45 : 1.0;
          order.patience -= patienceDecayBase * mult * dt;
          if (order.patience <= 0) {
            this.orders = this.orders.filter((o) => o.id !== order.id);
            this.freeTable(c.tableId, false);
            if (!this.titleMode) {
              sound.playCustomerUnhappy();
            }
            this.callbacks.onOrderFailed(-0.08);
            this.breakStreak();
            if (isSeated) {
              c.state = 'standing_up';
            } else {
              this.sendCustomerToExit(c);
            }
          }
        }
      } else if (c.state === 'eating') {
        c.sitBlend = 1;
        c.eatTimer -= dt;
        applyCharacterKinematics({
          parts: c.mesh,
          walkPhase: 0,
          speedRatio: 0,
          carrying: false,
          sitBlend: 1,
          pose: 'eating',
          activityTime: c.activityTime,
          seedOffset: c.seedOffset,
          baseGroundY: 0.1,
        });
        if (c.eatTimer <= 0) {
          this.freeTable(c.tableId, true);
          c.state = 'standing_up';
        }
      } else if (c.state === 'standing_up') {
        pos.x = THREE.MathUtils.damp(pos.x, c.approachPos.x, 9, dt);
        pos.z = THREE.MathUtils.damp(pos.z, c.approachPos.z, 9, dt);
        c.sitBlend = Math.max(0, c.sitBlend - dt * 3.5);
        c.mesh.root.rotation.y = this.lerpAngle(
          c.mesh.root.rotation.y,
          Math.atan2(c.approachPos.x - pos.x, c.approachPos.z - pos.z),
          10 * dt
        );

        applyCharacterKinematics({
          parts: c.mesh,
          walkPhase: 0,
          speedRatio: 0,
          carrying: false,
          sitBlend: c.sitBlend,
          pose: 'locomotion',
          activityTime: c.activityTime,
          seedOffset: c.seedOffset,
          baseGroundY: 0.1,
        });

        if (c.sitBlend <= 0.05 && Math.hypot(pos.x - c.approachPos.x, pos.z - c.approachPos.z) < 0.2) {
          c.sitBlend = 0;
          this.sendCustomerToExit(c);
        }
      } else if (c.state === 'leaving') {
        const res = this.stepNpcAlongPath(
          pos,
          c.vel,
          c.waypoints,
          c.waypointIdx,
          c.targetPos,
          maxSpeed * 1.05,
          dt,
          customerBaseIdx + i
        );
        c.waypointIdx = res.nextWaypointIdx;

        if (res.blockedProgress) {
          c.stuckTimer += dt;
          if (c.stuckTimer > 0.65 && c.repathCooldown <= 0) {
            c.waypoints = this.navGrid.findPath(pos.x, pos.z, c.targetPos.x, c.targetPos.z);
            c.waypointIdx = 0;
            c.stuckTimer = 0;
            c.repathCooldown = 0.75;
          }
        } else {
          c.stuckTimer = 0;
        }

        const speedRatio = THREE.MathUtils.clamp(res.actualSpeed / maxSpeed, 0, 1);
        c.walkPhase += dt * (3 + speedRatio * 9.5);
        if (res.actualSpeed > 0.25) {
          c.mesh.root.rotation.y = this.lerpAngle(
            c.mesh.root.rotation.y,
            Math.atan2(c.vel.x, c.vel.z),
            10 * dt
          );
        }

        const groundY = this.getGroundHeight(pos.x, pos.z);
        applyCharacterKinematics({
          parts: c.mesh,
          walkPhase: c.walkPhase,
          speedRatio,
          carrying: false,
          sitBlend: 0,
          pose: 'locomotion',
          activityTime: c.activityTime,
          seedOffset: c.seedOffset,
          baseGroundY: groundY,
        });

        if (res.reachedFinal || pos.x > 9.9) {
          if (c.carId) {
            // Drivers walk back to their car and drive away
            this.parking.driverReturn(c.carId, c.mesh, c.archetype, c.seed ?? 0);
          } else {
            this.scene.remove(c.mesh.root);
          }
          this.customers.splice(i, 1);
        }
      }
    }
  }

  private createCustomerOrder(c: SimCustomer) {
    const save = this.saveRef.current;
    const unlocked = save.unlockedRecipes.length > 0 ? save.unlockedRecipes : (['burger'] as RecipeId[]);
    // Combos (2–3 dishes) from level 3, preferring different dishes
    const size = rollComboSize(save.restaurantLevel, unlocked.length);
    const pool = unlocked.slice();
    const items: RecipeId[] = [];
    for (let k = 0; k < size; k++) {
      if (pool.length === 0) pool.push(...unlocked);
      items.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    const recipeId = items[0];
    // Bigger orders get proportionally more patience
    const basePat = c.archetype === 'impatient' ? 70 : c.archetype === 'vip' ? 95 : 100;
    const maxPat = Math.round(basePat * (1 + (items.length - 1) * 0.45));
    const order: CustomerOrder = {
      id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customerId: c.id,
      tableId: c.tableId,
      recipeId,
      items,
      remaining: items.slice(),
      qualitySum: 0,
      archetype: c.archetype,
      customerName: c.name,
      status: 'waiting',
      patience: maxPat,
      maxPatience: maxPat,
      createdAt: Date.now(),
      qualityBonus: 1.0,
    };
    c.orderId = order.id;
    this.orders.push(order);
    if (!this.titleMode) {
      sound.playOrderArrive();
    }
  }

  private rollArchetype(): CustomerArchetype {
    const save = this.saveRef.current;
    const r = Math.random();
    if (save.reputation >= 3.8 && r < 0.18) return 'vip';
    if (save.reputation >= 3.2 && r < 0.28) return 'critic';
    if (r < 0.42) return 'business';
    if (r < 0.56) return 'impatient';
    if (r < 0.72) return 'family';
    return 'regular';
  }

  /** True if a new guest could be seated or join the takeaway queue right now. */
  private hasFreeTableOrTakeaway(): boolean {
    const save = this.saveRef.current;
    if (this.tables.some((t) => !t.occupiedBy && !t.dirty)) return true;
    const takeawayCap = save.restaurantLevel < 3 ? 1 : 2;
    return this.customers.filter((c) => c.tableId === -1).length < takeawayCap;
  }

  /**
   * Seats a new guest. Walk-ins appear at the usual arrival spot; drivers from the
   * parking lot arrive with their existing character model. Returns false if there's no room.
   */
  private spawnCustomer(
    opts: { archetype?: CustomerArchetype; seed?: number; mesh?: CharacterParts; carId?: string } = {}
  ): boolean {
    const save = this.saveRef.current;
    // Find free clean table, or fallback to takeaway
    const freeClean = this.tables.filter((t) => !t.occupiedBy && !t.dirty);
    const isTakeaway = freeClean.length === 0;
    const existingTakeaway = this.customers.filter((c) => c.tableId === -1);
    const takeawayCap = save.restaurantLevel < 3 ? 1 : 2;
    if (isTakeaway && existingTakeaway.length >= takeawayCap) {
      return false;
    }

    const seed = opts.seed ?? Math.floor(Math.random() * 1000);
    const archetype: CustomerArchetype = opts.archetype ?? this.rollArchetype();

    const mesh = opts.mesh ?? createCharacterModel(getCustomerAppearance(archetype, seed));
    const spawnPos = opts.mesh
      ? opts.mesh.root.position.clone()
      : new THREE.Vector3(9.4 + Math.random() * 1.4, 0, (Math.random() - 0.5) * 4.5);
    this.resolveNpcStaticColliders(spawnPos, 0.28);
    mesh.root.position.copy(spawnPos);
    this.scene.add(mesh.root);

    const id = `cust_${Date.now()}_${seed}_${Math.random().toString(36).slice(2, 5)}`;
    const name = CUSTOMER_NAMES[seed % CUSTOMER_NAMES.length];

    let tableId = -1;
    let seatSide = 1;
    const approachPos = new THREE.Vector3(-5.2, 0.1, -2.35);
    const seatPos = new THREE.Vector3(-5.2, 0.1, -2.35);

    if (!isTakeaway) {
      const tbl = freeClean[Math.floor(Math.random() * freeClean.length)];
      tbl.occupiedBy = id;
      tableId = tbl.id;
      seatSide = Math.random() > 0.5 ? -1 : 1;
      const sx = tbl.x + seatSide * (tbl.isVip ? 0.88 : 0.96);
      seatPos.set(sx, 0.1, tbl.z);

      // Pick open aisle side (+Z or -Z) beside the assigned chair
      const candPos = tbl.z + 0.96;
      const candNeg = tbl.z - 0.96;
      const posClear = !isPointBlocked(sx, candPos, 0.25, this.restaurantColliders);
      const negClear = !isPointBlocked(sx, candNeg, 0.25, this.restaurantColliders);
      const az = posClear && negClear ? (tbl.z > 0 ? candNeg : candPos) : posClear ? candPos : candNeg;
      approachPos.set(sx, 0.1, az);
    } else {
      const slot0Taken = existingTakeaway.some((c) => c.approachPos.x < -4.9);
      const slotX = slot0Taken ? -4.35 : -5.45;
      approachPos.set(slotX, 0.1, -2.35);
      seatPos.copy(approachPos);
    }

    const waypoints = this.navGrid.findPath(
      spawnPos.x,
      spawnPos.z,
      approachPos.x,
      approachPos.z
    );

    this.customers.push({
      id,
      name,
      archetype,
      mesh,
      state: 'entering',
      tableId,
      seatSide,
      approachPos,
      seatPos,
      targetPos: approachPos.clone(),
      vel: new THREE.Vector3(),
      waypoints,
      waypointIdx: 0,
      sitBlend: 0,
      stuckTimer: 0,
      repathCooldown: 0,
      orderId: null,
      eatTimer: 0,
      activityTime: 0,
      walkPhase: 0,
      seedOffset: (seed % 100) * 0.17,
      carId: opts.carId,
      seed,
    });
    return true;
  }

  private freeTable(tableId: number, makeDirty: boolean) {
    if (tableId === -1) return;
    const tbl = this.tables.find((t) => t.id === tableId);
    if (!tbl) return;
    tbl.occupiedBy = null;
    if (tbl.servedDishMesh) {
      tbl.parts.plateAnchor.remove(tbl.servedDishMesh);
      tbl.servedDishMesh = null;
    }
    if (makeDirty) {
      tbl.dirty = true;
      tbl.parts.dirtyMesh.visible = true;
      this.callbacks.onDirtyChanged(-4);
    }
  }

  private setStaffDestination(agent: SimStaff, tx: number, tz: number) {
    agent.targetPos.set(tx, this.getGroundHeight(tx, tz), tz);
    agent.waypoints = this.navGrid.findPath(
      agent.mesh.root.position.x,
      agent.mesh.root.position.z,
      tx,
      tz
    );
    agent.waypointIdx = 0;
    agent.stuckTimer = 0;
  }

  private pickTableServiceSpot(agent: SimStaff, tbl: SimTable): { x: number; z: number } {
    const pos = agent.mesh.root.position;
    const candA = tbl.z + 1.02;
    const candB = tbl.z - 1.02;
    const aClear = !isPointBlocked(tbl.x, candA, 0.26, this.restaurantColliders);
    const bClear = !isPointBlocked(tbl.x, candB, 0.26, this.restaurantColliders);
    if (aClear && bClear) {
      return {
        x: tbl.x,
        z: Math.abs(pos.z - candA) <= Math.abs(pos.z - candB) ? candA : candB,
      };
    }
    return { x: tbl.x, z: aClear ? candA : candB };
  }

  private updateStaffAI(dt: number) {
    const save = this.saveRef.current;
    const hasManager = save.staff.some((s) => s.role === 'manager');
    const managerBoost = hasManager ? 1.25 : 1.0;

    // Delivery Driver periodic revenue
    const drivers = save.staff.filter((s) => s.role === 'driver');
    if (drivers.length > 0) {
      this.deliveryTimer -= dt * managerBoost;
      if (this.deliveryTimer <= 0) {
        this.deliveryTimer = Math.max(7, 15 - drivers[0].level * 1.2);
        const avgPrice =
          save.unlockedRecipes.reduce((acc, id) => acc + RECIPES[id].sellPrice, 0) /
          save.unlockedRecipes.length;
        const payout = Math.round(avgPrice * (1.15 + drivers.length * 0.35));
        this.callbacks.onDeliveryIncome(payout);
        this.spawnBurst(5.5, 1.4, 0, '#eab308', 6);
      }
    }

    const staffBaseIdx =
      (!this.inVehicle && this.playerCarParts ? 2 : 1) + this.customers.length;

    for (let idx = 0; idx < this.staffAgents.length; idx++) {
      const agent = this.staffAgents[idx];
      const pos = agent.mesh.root.position;
      agent.activityTime += dt;
      agent.repathCooldown = Math.max(0, agent.repathCooldown - dt);

      const spdMult = (1 + (agent.level - 1) * 0.14) * managerBoost;
      const maxSpeed = 3.8 * spdMult;
      const distToTarget = Math.hypot(agent.targetPos.x - pos.x, agent.targetPos.z - pos.z);

      if (distToTarget > 0.26) {
        const res = this.stepNpcAlongPath(
          pos,
          agent.vel,
          agent.waypoints,
          agent.waypointIdx,
          agent.targetPos,
          maxSpeed,
          dt,
          staffBaseIdx + idx
        );
        agent.waypointIdx = res.nextWaypointIdx;

        if (res.blockedProgress) {
          agent.stuckTimer += dt;
          if (agent.stuckTimer > 0.65 && agent.repathCooldown <= 0) {
            agent.waypoints = this.navGrid.findPath(
              pos.x,
              pos.z,
              agent.targetPos.x,
              agent.targetPos.z
            );
            agent.waypointIdx = 0;
            agent.stuckTimer = 0;
            agent.repathCooldown = 0.75;
          }
        } else {
          agent.stuckTimer = 0;
        }

        const speedRatio = THREE.MathUtils.clamp(res.actualSpeed / maxSpeed, 0, 1);
        agent.walkPhase += dt * (3 + speedRatio * 9.5);
        if (res.actualSpeed > 0.22) {
          agent.mesh.root.rotation.y = this.lerpAngle(
            agent.mesh.root.rotation.y,
            Math.atan2(agent.vel.x, agent.vel.z),
            11 * dt
          );
        }

        applyCharacterKinematics({
          parts: agent.mesh,
          walkPhase: agent.walkPhase,
          speedRatio,
          carrying: Boolean(agent.carryingRecipe),
          sitBlend: 0,
          pose: 'locomotion',
          activityTime: agent.activityTime,
          seedOffset: agent.seedOffset,
          baseGroundY: this.getGroundHeight(pos.x, pos.z),
        });
        continue;
      }

      // Arrived at target: damp residual velocity cleanly
      agent.vel.x = THREE.MathUtils.damp(agent.vel.x, 0, 18, dt);
      agent.vel.z = THREE.MathUtils.damp(agent.vel.z, 0, 18, dt);
      if (agent.facingYaw !== null) {
        agent.mesh.root.rotation.y = this.lerpAngle(agent.mesh.root.rotation.y, agent.facingYaw, 10 * dt);
      }

      applyCharacterKinematics({
        parts: agent.mesh,
        walkPhase: 0,
        speedRatio: 0,
        carrying: Boolean(agent.carryingRecipe),
        sitBlend: 0,
        pose: agent.poseMode,
        activityTime: agent.activityTime,
        seedOffset: agent.seedOffset,
        baseGroundY: this.getGroundHeight(pos.x, pos.z),
      });

      if (agent.role === 'chef') {
        if (agent.state === 'idle') {
          agent.poseMode = 'locomotion';
          // Cook a still-needed dish that isn't already ready, cooking, or being cooked by another chef
          const covered: RecipeId[] = [
            ...this.readyDishes.map((d) => d.recipeId),
            ...Array.from(this.cookJobs.values()).map((j) => j.recipeId),
            ...this.staffAgents.filter((a) => a !== agent && a.cookingRecipe).map((a) => a.cookingRecipe!),
            ...(this.heldRecipe ? [this.heldRecipe] : []),
          ];
          let dishToCook: RecipeId | undefined;
          let waitingOrder: CustomerOrder | undefined;
          for (const o of this.orders) {
            if (o.status !== 'waiting') continue;
            for (const r of o.remaining) {
              const ci = covered.indexOf(r);
              if (ci >= 0) {
                covered.splice(ci, 1);
                continue;
              }
              dishToCook = r;
              waitingOrder = o;
              break;
            }
            if (dishToCook) break;
          }
          if (waitingOrder && dishToCook && this.readyDishes.length < 6) {
            const stType = RECIPES[dishToCook].station;
            const st = this.stations.find((s) => s.type === stType) ?? this.stations[0];
            if (st) {
              const eqLv = save.equipmentLevels[stType] ?? 1;
              const eqSpeedMult = 1 + (eqLv - 1) * 0.12;
              agent.targetOrderId = waitingOrder.id;
              this.setStaffDestination(agent, st.x + 0.35, st.z);
              agent.facingYaw = st.type === 'bar' ? Math.PI : -Math.PI / 2;
              agent.poseMode = 'cooking';
              agent.state = 'working';
              agent.cookingRecipe = dishToCook;
              agent.timer = RECIPES[dishToCook].basePrepTime / (0.85 * spdMult * eqSpeedMult);
            }
          }
        } else if (agent.state === 'working') {
          agent.poseMode = 'cooking';
          agent.timer -= dt;
          if (Math.random() < dt * 3) {
            this.spawnBurst(pos.x - 0.5, 1.3, pos.z, '#e2e8f0', 1);
          }
          if (agent.timer <= 0) {
            const order = this.orders.find((o) => o.id === agent.targetOrderId);
            if (order && agent.cookingRecipe) {
              this.readyDishes.push({
                id: `ready_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                recipeId: agent.cookingRecipe,
                qualityBonus: 1.0,
              });
              this.callbacks.onStaffTaskDone(agent.id);
            }
            agent.cookingRecipe = null;
            agent.targetOrderId = null;
            agent.poseMode = 'locomotion';
            agent.facingYaw = null;
            agent.state = 'idle';
          }
        }
      } else if (agent.role === 'waiter') {
        agent.poseMode = 'locomotion';
        if (agent.state === 'idle') {
          for (let rIdx = 0; rIdx < this.readyDishes.length; rIdx++) {
            const dish = this.readyDishes[rIdx];
            const ord = this.orders.find((o) => this.orderNeeds(o, dish.recipeId));
            if (ord) {
              this.readyDishes.splice(rIdx, 1);
              agent.carryingRecipe = dish.recipeId;
              agent.carryingQuality = dish.qualityBonus;
              agent.carryingMesh = createDishMesh(dish.recipeId);
              agent.carryingMesh.scale.setScalar(0.82);
              agent.carryingMesh.position.y = 0.008;
              agent.mesh.carryAnchor.add(agent.carryingMesh);
              agent.targetOrderId = ord.id;
              if (ord.tableId !== -1) {
                const tbl = this.tables.find((t) => t.id === ord.tableId);
                if (tbl) {
                  const spot = this.pickTableServiceSpot(agent, tbl);
                  this.setStaffDestination(agent, spot.x, spot.z);
                  agent.facingYaw = Math.atan2(tbl.x - spot.x, tbl.z - spot.z);
                }
              } else {
                this.setStaffDestination(agent, this.registerPos.x, this.registerPos.z + 0.55);
                agent.facingYaw = 0;
              }
              agent.state = 'carrying';
              break;
            }
          }
          // Nothing to deliver? Clean a dirty table nobody else is handling
          if (agent.state === 'idle') {
            const dirtyTbl = this.findUnclaimedDirtyTable(agent);
            if (dirtyTbl) {
              agent.targetTableId = dirtyTbl.id;
              const spot = this.pickTableServiceSpot(agent, dirtyTbl);
              this.setStaffDestination(agent, spot.x, spot.z);
              agent.facingYaw = Math.atan2(dirtyTbl.x - spot.x, dirtyTbl.z - spot.z);
              agent.poseMode = 'cleaning';
              agent.state = 'working';
              agent.timer = 1.7 / spdMult;
            }
          }
        } else if (agent.state === 'working') {
          // Waiter wiping a table
          agent.poseMode = 'cleaning';
          agent.timer -= dt;
          if (agent.timer <= 0) {
            const tbl = this.tables.find((t) => t.id === agent.targetTableId);
            if (tbl && tbl.dirty) {
              tbl.dirty = false;
              tbl.parts.dirtyMesh.visible = false;
              this.spawnBurst(tbl.x, 1.0, tbl.z, '#34d399', 6);
              this.callbacks.onTableCleaned();
              this.callbacks.onStaffTaskDone(agent.id);
            }
            agent.targetTableId = null;
            agent.poseMode = 'locomotion';
            agent.facingYaw = null;
            agent.state = 'idle';
          }
        } else if (agent.state === 'carrying') {
          const ord = this.orders.find((o) => o.id === agent.targetOrderId);
          if (ord && agent.carryingRecipe && this.orderNeeds(ord, agent.carryingRecipe)) {
            this.deliverItem(ord, agent.carryingRecipe, agent.carryingQuality);
            this.callbacks.onStaffTaskDone(agent.id);
          } else if (agent.carryingRecipe) {
            // Someone else delivered it meanwhile: put the dish back on the pass
            this.readyDishes.push({
              id: `dish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              recipeId: agent.carryingRecipe,
              qualityBonus: agent.carryingQuality,
            });
          }
          if (agent.carryingMesh) {
            agent.mesh.carryAnchor.remove(agent.carryingMesh);
            agent.carryingMesh = null;
          }
          agent.carryingRecipe = null;
          agent.targetOrderId = null;
          agent.facingYaw = Math.PI / 2;
          agent.state = 'idle';
          this.setStaffDestination(agent, -6.5, -1.6 + (idx % 3) * 1.4);
        }
      } else if (agent.role === 'cleaner') {
        if (agent.state === 'idle') {
          agent.poseMode = 'locomotion';
          const dirtyTbl = this.findUnclaimedDirtyTable(agent);
          if (dirtyTbl) {
            agent.targetTableId = dirtyTbl.id;
            const spot = this.pickTableServiceSpot(agent, dirtyTbl);
            this.setStaffDestination(agent, spot.x, spot.z);
            agent.facingYaw = Math.atan2(dirtyTbl.x - spot.x, dirtyTbl.z - spot.z);
            agent.poseMode = 'cleaning';
            agent.state = 'working';
            agent.timer = 1.4 / spdMult;
          }
        } else if (agent.state === 'working') {
          agent.poseMode = 'cleaning';
          agent.timer -= dt;
          if (agent.timer <= 0) {
            const tbl = this.tables.find((t) => t.id === agent.targetTableId);
            if (tbl && tbl.dirty) {
              tbl.dirty = false;
              tbl.parts.dirtyMesh.visible = false;
              this.callbacks.onTableCleaned();
              this.callbacks.onStaffTaskDone(agent.id);
            }
            agent.targetTableId = null;
            agent.poseMode = 'locomotion';
            agent.facingYaw = null;
            agent.state = 'idle';
          }
        }
      } else if (agent.role === 'cashier') {
        agent.poseMode = 'locomotion';
        if (Math.hypot(agent.targetPos.x - -5.5, agent.targetPos.z - -3.48) > 0.3) {
          this.setStaffDestination(agent, -5.5, -3.48);
        }
        agent.facingYaw = 0; // Face dining room & takeaway queue
        for (const takeOrd of this.orders) {
          if (takeOrd.tableId !== -1 || takeOrd.status !== 'waiting') continue;
          const dIdx = this.readyDishes.findIndex((d) => takeOrd.remaining.includes(d.recipeId));
          if (dIdx !== -1) {
            const d = this.readyDishes.splice(dIdx, 1)[0];
            this.deliverItem(takeOrd, d.recipeId, d.qualityBonus);
            this.callbacks.onStaffTaskDone(agent.id);
            break;
          }
        }
      } else if (agent.role === 'manager' || agent.role === 'driver') {
        agent.poseMode = 'locomotion';
        agent.facingYaw = null;
        agent.timer -= dt;
        if (agent.timer <= 0) {
          agent.timer = 4.5;
          if (agent.role === 'driver') {
            const dx = this.restaurantBounds.maxX + 0.9 + Math.random() * 1.4;
            const dz = (Math.random() - 0.5) * 2.4;
            if (!isPointBlocked(dx, dz, 0.34, this.restaurantColliders, this.staticColliders)) {
              this.setStaffDestination(agent, dx, dz);
            }
          } else {
            const aisleNodes: [number, number][] = [
              [-2.4, -2.3],
              [-2.4, 1.15],
              [1.0, -2.3],
              [1.0, 1.15],
              [4.0, 0],
              [-5.4, -2.1],
            ];
            const [mx, mz] = aisleNodes[Math.floor(Math.random() * aisleNodes.length)];
            if (!isPointBlocked(mx, mz, 0.32, this.restaurantColliders, this.staticColliders)) {
              this.setStaffDestination(agent, mx, mz);
            }
          }
        }
      }
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vel.y -= 2.2 * dt;
      const ratio = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(ratio);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = ratio * 0.85;
    }
  }

  private projectToScreen(wx: number, wy: number, wz: number): { x: number; y: number; visible: boolean } {
    _proj.set(wx, wy, wz);
    _proj.project(this.camera);
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const visible = _proj.z < 1 && _proj.x >= -1.1 && _proj.x <= 1.1 && _proj.y >= -1.1 && _proj.y <= 1.1;
    return {
      x: ((_proj.x + 1) / 2) * w,
      y: ((-_proj.y + 1) / 2) * h,
      visible,
    };
  }

  private emitHudSnapshot() {
    const bubbles: ProjectedBubble[] = [];

    // Customer Order & Eating Bubbles
    for (const c of this.customers) {
      if (c.state === 'seated_waiting' && c.orderId) {
        const order = this.orders.find((o) => o.id === c.orderId);
        if (order) {
          const p = this.projectToScreen(
            c.mesh.root.position.x,
            2.45,
            c.mesh.root.position.z
          );
          if (p.visible) {
            bubbles.push({
              id: `b_${c.id}`,
              screenX: p.x,
              screenY: p.y,
              visible: true,
              kind: order.tableId === -1 ? 'takeaway' : 'order',
              anchor: { x: c.mesh.root.position.x, y: 2.45, z: c.mesh.root.position.z },
              recipeId: order.recipeId,
              recipeIds: order.remaining.slice(),
              patience: (order.patience / order.maxPatience) * 100,
              label: RECIPES[order.recipeId].name,
              archetype: order.archetype,
              tableId: order.tableId,
              orderId: order.id,
            });
          }
        }
      }
    }

    // Dirty Table Markers
    for (const tbl of this.tables) {
      if (tbl.dirty) {
        const p = this.projectToScreen(tbl.x, 1.65, tbl.z);
        if (p.visible) {
          bubbles.push({
            id: `dirty_${tbl.id}`,
            screenX: p.x,
            screenY: p.y,
            visible: true,
            kind: 'dirty',
            anchor: { x: tbl.x, y: 1.65, z: tbl.z },
            label: 'Clean',
            tableId: tbl.id,
          });
        }
      }
    }

    // Floating machine signs: which dishes each machine makes (shown while in the restaurant)
    if (this.isInsideRestaurant(this.playerPos.x, this.playerPos.z) && !this.inVehicle) {
      const unlocked = this.saveRef.current.unlockedRecipes;
      for (const st of this.stations) {
        const p = this.projectToScreen(st.mx, 2.15, st.mz);
        if (!p.visible) continue;
        const recipeIds = unlocked.filter((id) => RECIPES[id].station === st.type);
        bubbles.push({
          id: `station_${st.type}`,
          screenX: p.x,
          screenY: p.y,
          visible: true,
          kind: 'station',
          anchor: { x: st.mx, y: 2.15, z: st.mz },
          cookingRecipeId: this.cookJobs.get(st.type)?.recipeId,
          cookProgress: (() => {
            const j = this.cookJobs.get(st.type);
            return j ? THREE.MathUtils.clamp(1 - j.remaining / j.total, 0, 1) : undefined;
          })(),
          label: STATION_INFO[st.type].short,
          stationType: st.type,
          recipeIds,
          pendingCount: this.allNeededDishes().filter((r) => RECIPES[r].station === st.type).length,
        });
      }
    }

    // Determine player's current city zone
    let zoneLabel = 'City Avenue';
    if (this.playerPos.x < 5.5) zoneLabel = 'Restaurant';
    else if (this.playerPos.x > 33) zoneLabel = 'Residence';
    else if (Math.hypot(this.playerPos.x - 10.5, this.playerPos.z + 11) < 6) zoneLabel = 'Style Atelier';
    else if (Math.hypot(this.playerPos.x - 24.5, this.playerPos.z + 11) < 6) zoneLabel = 'Apex Motors';
    else if (Math.hypot(this.playerPos.x - 10.5, this.playerPos.z - 12) < 6) zoneLabel = 'Fresh Market';
    else if (Math.hypot(this.playerPos.x - 24.5, this.playerPos.z - 12) < 6) zoneLabel = 'Metro Bank';

    this.callbacks.onHudUpdate({
      playerZoneLabel: zoneLabel,
      inVehicle: this.inVehicle,
      heldRecipe: this.heldRecipe,
      heldQuality: this.heldQuality,
      activeOrders: this.orders.slice(0, 6),
      readyDishes: this.readyDishes.slice(),
      dirtyTableCount: this.tables.filter((t) => t.dirty).length,
      nearbyPrompt: this.computeNearbyPrompt(),
      bubbles,
      playerPos: { x: this.playerPos.x, z: this.playerPos.z },
      streak: {
        count: this.streakCount,
        mult: getStreakMult(this.streakCount),
        timeLeft: this.streakCount > 0 ? Math.max(0, this.streakTimer / STREAK_WINDOW) : 0,
      },
    });
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * Math.min(1, t);
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
        else m.material?.dispose();
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

type CityZoneAction = 'clothing' | 'dealership' | 'supermarket' | 'bank';
