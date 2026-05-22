"""
Mesh splitting router - wraps 3_split.py logic
Segments a 3D mesh into parts based on voxel label points using geodesic propagation.
"""
import os
import tempfile
from typing import Optional
import numpy as np
import trimesh
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.mesh_splitter import segment_mesh_by_labels

router = APIRouter()


class SplitRequest(BaseModel):
    model_url: str  # URL to the GLB/OBJ file
    label_points: dict[str, list]  # {"0": [[x,y,z], ...], "1": [[x,y,z], ...]}
    output_format: str = "obj"  # "obj" or "glb"


class SplitResponse(BaseModel):
    parts: dict[str, str]  # {"0": "url_to_part_0.obj", "1": "url_to_part_1.obj"}
    vertex_counts: dict[str, int]
    face_counts: dict[str, int]


@router.post("/split-mesh", response_model=SplitResponse)
async def split_mesh(request: SplitRequest):
    """
    Split a 3D mesh into labeled parts using geodesic propagation.
    
    This wraps the 3_split.py algorithm:
    1. Load the mesh from URL
    2. Convert label points to numpy arrays
    3. Run geodesic propagation segmentation
    4. Export each part as a separate mesh
    """
    try:
        # Download mesh
        import httpx
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(request.model_url)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail="Failed to download model")
        
        # Save to temp file and load
        with tempfile.NamedTemporaryFile(suffix=".glb", delete=False) as f:
            f.write(resp.content)
            temp_path = f.name
        
        mesh = trimesh.load(temp_path, force="mesh")
        
        # Convert label points
        label_to_points = {}
        for label, points in request.label_points.items():
            label_to_points[label] = np.array(points, dtype=np.float64)
        
        # Run segmentation
        with tempfile.TemporaryDirectory() as out_dir:
            flabels = segment_mesh_by_labels(mesh, label_to_points, out_dir)
            
            parts = {}
            vertex_counts = {}
            face_counts = {}
            
            for label in label_to_points.keys():
                part_path = os.path.join(out_dir, label, f"{label}.obj")
                if os.path.exists(part_path):
                    part_mesh = trimesh.load(part_path)
                    vertex_counts[label] = len(part_mesh.vertices)
                    face_counts[label] = len(part_mesh.faces)
                    # In production, upload to Supabase Storage
                    parts[label] = f"part_{label}.obj"
            
            os.unlink(temp_path)
            
            return SplitResponse(
                parts=parts,
                vertex_counts=vertex_counts,
                face_counts=face_counts,
            )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
