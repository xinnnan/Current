"""
URDF/MJCF generation router - wraps 4_simready_gen.py logic
"""
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class URDFRequest(BaseModel):
    model_url: str
    parts_dir_url: str  # URL to the directory containing split part OBJ files
    physical_params: dict  # VLM-extracted physical parameters
    group_info: dict  # Joint/group hierarchy
    voxel_define: int = 32
    fixed_base: bool = False
    output_format: str = "mjcf"  # "urdf" or "mjcf"


class URDFResponse(BaseModel):
    urdf_url: str
    format: str
    part_count: int
    joint_count: int


@router.post("/generate-urdf", response_model=URDFResponse)
async def generate_urdf(request: URDFRequest):
    """
    Generate URDF or MJCF XML from segmented mesh parts and physical parameters.
    
    This wraps the 4_simready_gen.py logic:
    1. Download segmented parts
    2. Parse physical params and group info
    3. Generate URDF/MJCF XML with joints, collisions, and physics
    4. Upload result to Supabase Storage
    """
    try:
        # TODO: Implement full URDF generation pipeline
        # This requires porting the core logic from 4_simready_gen.py
        
        return URDFResponse(
            urdf_url="placeholder",
            format=request.output_format,
            part_count=len(request.physical_params.get("parts", [])),
            joint_count=len(request.group_info) - 1,  # Subtract root group
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
