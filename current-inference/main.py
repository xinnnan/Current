"""
Current Inference Service - FastAPI entry point
Mesh splitting and URDF generation microservice
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import split, urdf, health

app = FastAPI(
    title="Current Inference Service",
    description="Mesh splitting and URDF/MJCF generation for Current",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(split.router, prefix="/api/v1", tags=["mesh-split"])
app.include_router(urdf.router, prefix="/api/v1", tags=["urdf-generation"])


@app.get("/")
async def root():
    return {"service": "current-inference", "version": "0.1.0", "status": "running"}
