-- Current - Supabase Database Schema
-- Initial migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Projects
-- ============================================
CREATE TABLE projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{}',
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3D Assets (Physical Asset Library)
-- ============================================
CREATE TABLE assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  
  -- Physical dimensions (cm)
  dimension_length FLOAT,
  dimension_width FLOAT,
  dimension_height FLOAT,
  
  -- Physical properties (JSONB for flexibility)
  physical_params JSONB DEFAULT '{}',
  -- Example: {"density": 7800, "friction": 0.5, "mass": 12.5, "youngs_modulus": 200, "poissons_ratio": 0.3}
  
  -- Parts breakdown
  parts JSONB DEFAULT '[]',
  -- Example: [{"id": 0, "name": "base", "material": "steel", "density": 7800}]
  
  -- Group/joint info
  group_info JSONB DEFAULT '{}',
  -- Example: {"0": [0,1], "1": [[2], "0", [0,0,1,0,0,0,0,0], "C"]}
  
  -- File references
  model_url TEXT,
  thumbnail_url TEXT,
  urdf_url TEXT,
  source_image_url TEXT,
  format TEXT DEFAULT 'glb',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Asset Instances (placed in maps)
-- ============================================
CREATE TABLE asset_instances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE NOT NULL,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE,
  
  -- Position on map
  position_x FLOAT DEFAULT 0,
  position_y FLOAT DEFAULT 0,
  position_z FLOAT DEFAULT 0,
  rotation FLOAT DEFAULT 0,
  scale FLOAT DEFAULT 1,
  
  -- Transform matrix (for 3D)
  transform JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Maps
-- ============================================
CREATE TABLE maps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  
  -- Scale calibration
  scale_ratio FLOAT DEFAULT 1.0,
  -- pixels_per_meter: how many pixels = 1 real meter
  calibration JSONB DEFAULT '{}',
  -- Example: {"point_a": [100, 200], "point_b": [500, 200], "real_distance_m": 10}
  
  -- Base map image
  base_image_url TEXT,
  base_image_width FLOAT,
  base_image_height FLOAT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Map Layers
-- ============================================
CREATE TABLE map_layers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  -- Types: 'base_map', 'constraint_zone', 'routing', 'custom'
  
  z_index INT DEFAULT 0,
  visible BOOLEAN DEFAULT TRUE,
  locked BOOLEAN DEFAULT FALSE,
  opacity FLOAT DEFAULT 1.0,
  
  -- Layer data (Fabric.js JSON or GeoJSON)
  data JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Route Nodes (waypoints on the map)
-- ============================================
CREATE TABLE route_nodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  
  -- Position
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  
  -- Node classification
  node_type TEXT DEFAULT 'waypoint',
  -- Types: 'waypoint', 'station', 'charger', 'parking', 'intersection'
  
  -- Display name
  label TEXT,
  
  -- Additional properties
  properties JSONB DEFAULT '{}',
  -- Example: {"dwell_time_s": 5, "charging": true}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Route Edges (path segments between nodes)
-- ============================================
CREATE TABLE route_edges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  
  from_node_id UUID REFERENCES route_nodes(id) ON DELETE CASCADE NOT NULL,
  to_node_id UUID REFERENCES route_nodes(id) ON DELETE CASCADE NOT NULL,
  
  -- Edge properties
  length FLOAT,
  -- Computed or manual real-world length in meters
  
  speed_limit FLOAT DEFAULT 1.5,
  -- m/s
  
  direction TEXT DEFAULT 'bidirectional',
  -- 'forward', 'backward', 'bidirectional'
  
  -- Path geometry (for curved paths)
  geometry JSONB DEFAULT '{}',
  -- Example: {"type": "bezier", "control_points": [[x1,y1], [x2,y2]]}
  
  -- Constraints
  constraints JSONB DEFAULT '{}',
  -- Example: {"mutex_zone": true, "max_agvs": 1, "priority": 5}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Constraint Zones (obstacles, restricted areas)
-- ============================================
CREATE TABLE constraint_zones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  map_id UUID REFERENCES maps(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT,
  zone_type TEXT NOT NULL DEFAULT 'obstacle',
  -- Types: 'obstacle', 'keep_out', 'slow_zone', 'mutex_zone', 'deadlock_prevention'
  
  -- Polygon geometry
  polygon JSONB NOT NULL,
  -- Example: {"points": [[x1,y1], [x2,y2], [x3,y3]], "type": "polygon"}
  
  -- Zone rules
  rules JSONB DEFAULT '{}',
  -- Example: {"max_speed": 0.5, "max_agvs": 1, "time_restricted": false}
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Simulations
-- ============================================
CREATE TABLE simulations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  -- 'draft', 'running', 'paused', 'completed', 'failed'
  
  -- Simulation config
  config JSONB DEFAULT '{}',
  -- Example: {
  --   "mode": "lightweight",  // or "dynamic"
  --   "speed_multiplier": 10,
  --   "duration_s": 3600,
  --   "agvs": [{"id": "agv1", "type": "LMR", "speed": 1.5}],
  --   "tasks": [...]
  -- }
  
  -- Results (populated after completion)
  results JSONB DEFAULT '{}',
  -- Example: {
  --   "throughput_uph": 120,
  --   "avg_utilization": 0.85,
  --   "total_distance_m": 15000,
  --   "deadlocks": 0,
  --   "heatmap_data": [...]
  -- }
  
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Inference Jobs (3D asset generation pipeline)
-- ============================================
CREATE TABLE inference_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'pending',
  -- 'pending', 'vlm_processing', 'generating_3d', 'splitting', 'generating_urdf', 'completed', 'failed'
  
  -- Input
  input_image_url TEXT NOT NULL,
  
  -- Progress tracking
  progress FLOAT DEFAULT 0,
  current_step TEXT,
  
  -- Output metadata
  output_metadata JSONB DEFAULT '{}',
  
  -- Error handling
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE map_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraint_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inference_jobs ENABLE ROW LEVEL SECURITY;

-- Projects: users can only access their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Assets: all authenticated users can view, creator can modify
CREATE POLICY "Authenticated users can view assets" ON assets
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create assets" ON assets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creators can update assets" ON assets
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Creators can delete assets" ON assets
  FOR DELETE USING (auth.uid() = created_by);

-- Asset Instances: through project ownership
CREATE POLICY "Users can view instances of own projects" ON asset_instances
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage instances of own projects" ON asset_instances
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can update instances of own projects" ON asset_instances
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can delete instances of own projects" ON asset_instances
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Maps: through project ownership
CREATE POLICY "Users can view maps of own projects" ON maps
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage maps of own projects" ON maps
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can update maps of own projects" ON maps
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can delete maps of own projects" ON maps
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Map Layers: through map → project ownership
CREATE POLICY "Users can view layers of own maps" ON map_layers
  FOR SELECT USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can manage layers of own maps" ON map_layers
  FOR INSERT WITH CHECK (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can update layers of own maps" ON map_layers
  FOR UPDATE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can delete layers of own maps" ON map_layers
  FOR DELETE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );

-- Route Nodes: through map → project ownership
CREATE POLICY "Users can view nodes of own maps" ON route_nodes
  FOR SELECT USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can manage nodes of own maps" ON route_nodes
  FOR INSERT WITH CHECK (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can update nodes of own maps" ON route_nodes
  FOR UPDATE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can delete nodes of own maps" ON route_nodes
  FOR DELETE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );

-- Route Edges: through map → project ownership
CREATE POLICY "Users can view edges of own maps" ON route_edges
  FOR SELECT USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can manage edges of own maps" ON route_edges
  FOR INSERT WITH CHECK (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can update edges of own maps" ON route_edges
  FOR UPDATE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can delete edges of own maps" ON route_edges
  FOR DELETE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );

-- Constraint Zones: through map → project ownership
CREATE POLICY "Users can view zones of own maps" ON constraint_zones
  FOR SELECT USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can manage zones of own maps" ON constraint_zones
  FOR INSERT WITH CHECK (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can update zones of own maps" ON constraint_zones
  FOR UPDATE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );
CREATE POLICY "Users can delete zones of own maps" ON constraint_zones
  FOR DELETE USING (
    map_id IN (SELECT m.id FROM maps m JOIN projects p ON m.project_id = p.id WHERE p.owner_id = auth.uid())
  );

-- Simulations: through project ownership
CREATE POLICY "Users can view own simulations" ON simulations
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage own simulations" ON simulations
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can update own simulations" ON simulations
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can delete own simulations" ON simulations
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- Inference Jobs: through asset ownership
CREATE POLICY "Users can view own inference jobs" ON inference_jobs
  FOR SELECT USING (
    asset_id IN (SELECT id FROM assets WHERE created_by = auth.uid())
  );
CREATE POLICY "Users can manage own inference jobs" ON inference_jobs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own inference jobs" ON inference_jobs
  FOR UPDATE USING (
    asset_id IN (SELECT id FROM assets WHERE created_by = auth.uid())
  );

-- ============================================
-- Storage Buckets (create via Supabase Dashboard)
-- ============================================
-- Run these in Supabase SQL Editor or via Dashboard:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES 
--   ('assets-models', 'assets/models', true),
--   ('assets-thumbnails', 'assets/thumbnails', true),
--   ('assets-urdf', 'assets/urdf', true),
--   ('maps-base-images', 'maps/base-images', true),
--   ('inference-input', 'inference/input', false),
--   ('inference-output', 'inference/output', false);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_assets_category ON assets(category);
CREATE INDEX idx_assets_created_by ON assets(created_by);
CREATE INDEX idx_maps_project ON maps(project_id);
CREATE INDEX idx_map_layers_map ON map_layers(map_id);
CREATE INDEX idx_route_nodes_map ON route_nodes(map_id);
CREATE INDEX idx_route_edges_map ON route_edges(map_id);
CREATE INDEX idx_route_edges_from ON route_edges(from_node_id);
CREATE INDEX idx_route_edges_to ON route_edges(to_node_id);
CREATE INDEX idx_constraint_zones_map ON constraint_zones(map_id);
CREATE INDEX idx_simulations_project ON simulations(project_id);
CREATE INDEX idx_inference_jobs_asset ON inference_jobs(asset_id);
CREATE INDEX idx_inference_jobs_status ON inference_jobs(status);
CREATE INDEX idx_asset_instances_project ON asset_instances(project_id);
CREATE INDEX idx_asset_instances_map ON asset_instances(map_id);

-- ============================================
-- Updated_at trigger function
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_maps_updated_at BEFORE UPDATE ON maps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inference_jobs_updated_at BEFORE UPDATE ON inference_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
