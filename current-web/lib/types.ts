// Current - TypeScript Type Definitions

// ============================================
// Database Row Types (matches Supabase schema)
// ============================================

export interface Project {
  id: string
  name: string
  description: string | null
  settings: Record<string, unknown>
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Asset {
  id: string
  name: string
  category: AssetCategory
  dimension_length: number | null
  dimension_width: number | null
  dimension_height: number | null
  physical_params: PhysicalParams
  parts: AssetPart[]
  group_info: Record<string, unknown>
  model_url: string | null
  thumbnail_url: string | null
  urdf_url: string | null
  source_image_url: string | null
  format: 'glb' | 'obj' | 'urdf' | 'mjcf'
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AssetCategory =
  | 'agv_lmr'      // 潜伏式 AGV
  | 'agv_fmr'      // 叉车式 AGV
  | 'agv_ctu'      // 料箱车
  | 'shelf'        // 货架
  | 'conveyor'     // 传送带
  | 'robot_arm'    // 机械臂
  | 'workstation'  // 工作台
  | 'pallet'       // 托盘
  | 'charger'      // 充电桩
  | 'other'

export interface PhysicalParams {
  density?: number       // kg/m³
  friction?: number      // 摩擦系数
  mass?: number          // kg
  youngs_modulus?: number // GPa
  poissons_ratio?: number
  center_of_mass?: [number, number, number]
  bounding_box?: { x: number; y: number; z: number }
}

export interface AssetPart {
  id: number
  name: string
  material: string
  density: number
  youngs_modulus?: number
  poissons_ratio?: number
  description: string
}

export interface AssetInstance {
  id: string
  project_id: string
  asset_id: string
  map_id: string | null
  position_x: number
  position_y: number
  position_z: number
  rotation: number
  scale: number
  transform: Record<string, unknown>
  created_at: string
}

export interface MapData {
  id: string
  project_id: string
  name: string
  scale_ratio: number
  calibration: MapCalibration
  base_image_url: string | null
  base_image_width: number | null
  base_image_height: number | null
  created_at: string
  updated_at: string
}

export interface MapCalibration {
  point_a: [number, number]
  point_b: [number, number]
  real_distance_m: number
  pixels_per_meter?: number
}

export interface MapLayer {
  id: string
  map_id: string
  name: string
  type: 'base_map' | 'constraint_zone' | 'routing' | 'custom'
  z_index: number
  visible: boolean
  locked: boolean
  opacity: number
  data: Record<string, unknown>
  created_at: string
}

export interface LogisticsConfig {
  throughput_items_per_hour?: number
  processing_time_seconds?: number
  buffer_capacity?: number
  operation_type?: 'pickup' | 'dropoff' | 'both'
}

export interface RouteNode {
  id: string
  map_id: string
  x: number
  y: number
  node_type: NodeType
  label: string | null
  properties: Record<string, unknown>
  logistics_config?: LogisticsConfig
  created_at: string
}

export type NodeType =
  | 'waypoint'
  | 'station'
  | 'charger'
  | 'parking'
  | 'intersection'
  | 'loading_port'
  | 'unloading_port'
  | 'workstation'

export interface RouteEdge {
  id: string
  map_id: string
  from_node_id: string
  to_node_id: string
  length: number | null
  speed_limit: number
  direction: 'forward' | 'backward' | 'bidirectional'
  geometry: Record<string, unknown>
  constraints: EdgeConstraints
  created_at: string
}

export interface EdgeConstraints {
  mutex_zone?: boolean
  max_agvs?: number
  priority?: number
  time_restricted?: boolean
}

export interface ConstraintZone {
  id: string
  map_id: string
  name: string | null
  zone_type: ZoneType
  polygon: { points: [number, number][] }
  rules: Record<string, unknown>
  created_at: string
}

export type ZoneType = 'obstacle' | 'keep_out' | 'slow_zone' | 'mutex_zone' | 'deadlock_prevention'

export interface Simulation {
  id: string
  project_id: string
  name: string
  status: SimulationStatus
  config: SimulationConfig
  results: SimulationResults
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export type SimulationStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed'

export interface SimulationConfig {
  mode: 'lightweight' | 'dynamic'
  speed_multiplier: number
  duration_s: number
  agvs: SimulationAGV[]
  tasks: SimulationTask[]
}

export interface SimulationAGV {
  id: string
  type: string
  speed: number    // m/s
  capacity: number
  start_node_id: string
}

export interface SimulationTask {
  id: string
  type: 'transport' | 'charge' | 'park'
  from_node_id: string
  to_node_id: string
  frequency: number  // tasks per hour
  priority: number
}

export interface SimulationResults {
  throughput_uph?: number
  avg_utilization?: number
  total_distance_m?: number
  deadlocks?: number
  heatmap_data?: HeatmapPoint[]
  agv_metrics?: AGVMetric[]
}

export interface HeatmapPoint {
  edge_id: string
  congestion: number  // 0-1
  avg_speed: number
  time_spent_s: number
}

export interface AGVMetric {
  agv_id: string
  utilization: number     // 0-1
  empty_run_ratio: number // 0-1
  total_distance_m: number
  tasks_completed: number
}

export interface InferenceJob {
  id: string
  asset_id: string | null
  status: InferenceStatus
  input_image_url: string
  progress: number
  current_step: string | null
  output_metadata: Record<string, unknown>
  error_message: string | null
  created_at: string
  updated_at: string
}

export type InferenceStatus =
  | 'pending'
  | 'vlm_processing'
  | 'generating_3d'
  | 'splitting'
  | 'generating_urdf'
  | 'completed'
  | 'failed'
