"""
Mesh splitting service - extracted from 3_split.py
Segments a mesh into labeled parts using geodesic propagation.
"""
import heapq
import numpy as np
import trimesh
from scipy.spatial import cKDTree


def build_edge_graph(mesh: trimesh.Trimesh):
    """Build adjacency graph with edge weights from mesh."""
    edges = mesh.edges_unique
    V = mesh.vertices
    neighbors = [[] for _ in range(len(V))]
    weights = [[] for _ in range(len(V))]
    e_len = np.linalg.norm(V[edges[:, 0]] - V[edges[:, 1]], axis=1)
    for (u, v), w in zip(edges, e_len):
        neighbors[u].append(v); weights[u].append(w)
        neighbors[v].append(u); weights[v].append(w)
    neighbors = [np.asarray(n, dtype=np.int64) for n in neighbors]
    weights = [np.asarray(w, dtype=np.float64) for w in weights]
    return neighbors, weights


def nearest_label_all_vertices(vertices, label_to_points):
    """Find nearest label for each vertex."""
    trees = {}
    labels_sorted = sorted(label_to_points.keys(), key=lambda x: int(x))
    for lab in labels_sorted:
        P = np.asarray(label_to_points[lab], dtype=np.float64)
        trees[lab] = cKDTree(P) if len(P) > 0 else None

    V = vertices.shape[0]
    nearest_label = np.zeros(V, dtype=np.int64)
    dmin_per_v = np.full(V, np.inf, dtype=np.float64)

    for lab in labels_sorted:
        tree = trees[lab]
        if tree is None:
            continue
        d, _ = tree.query(vertices, k=1, workers=-1)
        mask = d < dmin_per_v
        dmin_per_v[mask] = d[mask]
        nearest_label[mask] = int(lab)

    return nearest_label, dmin_per_v


def multisource_geodesic_propagation(neighbors, weights, seed_mask, seed_labels, fallback_labels):
    """Dijkstra-based geodesic propagation from seed vertices."""
    V = len(neighbors)
    labels = np.full(V, -1, dtype=np.int64)
    dist = np.full(V, np.inf, dtype=np.float64)
    pq = []

    for v in range(V):
        if seed_mask[v]:
            labels[v] = seed_labels[v]
            dist[v] = 0.0
            heapq.heappush(pq, (0.0, v))

    if len(pq) == 0:
        return fallback_labels.copy(), np.zeros(V, dtype=np.float64)

    while pq:
        d_u, u = heapq.heappop(pq)
        if d_u != dist[u]:
            continue
        lab_u = labels[u]
        for nv, w in zip(neighbors[u], weights[u]):
            nd = d_u + w
            if nd < dist[nv]:
                dist[nv] = nd
                labels[nv] = lab_u
                heapq.heappush(pq, (nd, nv))

    miss = (labels == -1)
    if np.any(miss):
        labels[miss] = fallback_labels[miss]
        dist[miss] = 0.0

    return labels, dist


def face_majority_label(mesh: trimesh.Trimesh, vlabels, vdist):
    """Assign face labels by majority voting of vertex labels."""
    F = mesh.faces.shape[0]
    flabels = np.zeros(F, dtype=np.int64)
    for i in range(F):
        vs = mesh.faces[i]
        labs = vlabels[vs]
        vals, counts = np.unique(labs, return_counts=True)
        if len(vals) == 1:
            flabels[i] = vals[0]
        else:
            idx = np.argmax(counts)
            if np.sum(counts == counts[idx]) == 1:
                flabels[i] = vals[idx]
            else:
                best_lab, best_sum = None, np.inf
                for lab in vals:
                    s = vdist[vs][labs == lab].sum()
                    if s < best_sum:
                        best_sum, best_lab = s, lab
                flabels[i] = best_lab
    return flabels


def segment_mesh_by_labels(
    mesh,
    label_to_points: dict,
    out_dir: str,
    seed_tau_ratio: float = 0.02,
) -> np.ndarray:
    """
    Segment mesh into labeled parts using geodesic propagation.
    
    Args:
        mesh: trimesh.Trimesh or scene to segment
        label_to_points: {"0": [[x,y,z], ...], "1": [[x,y,z], ...]}
        out_dir: Directory to save segmented parts
        seed_tau_ratio: Ratio of bounding box diagonal for seed threshold
    
    Returns:
        flabels: Array of face labels
    """
    import os
    
    if not isinstance(mesh, trimesh.Trimesh):
        mesh = trimesh.util.concatenate([g for g in mesh.geometry.values()])

    # Find nearest labels
    nearest_lab, dmin, _ = nearest_label_all_vertices(mesh.vertices, label_to_points)

    # Build graph and run geodesic propagation
    neighbors, weights = build_edge_graph(mesh)
    bbox_diag = np.linalg.norm(mesh.bounds[1] - mesh.bounds[0])
    tau_seed = bbox_diag * seed_tau_ratio
    seed_mask = (dmin <= tau_seed)

    vlabels, vdist = multisource_geodesic_propagation(
        neighbors, weights,
        seed_mask=seed_mask,
        seed_labels=nearest_lab,
        fallback_labels=nearest_lab,
    )

    flabels = face_majority_label(mesh, vlabels, vdist)

    # Export submeshes
    os.makedirs(out_dir, exist_ok=True)
    unique_labs = np.unique(flabels)
    for lab in unique_labs:
        mask = (flabels == lab)
        if not np.any(mask):
            continue
        sub = mesh.submesh([np.nonzero(mask)[0]], append=True, repair=True)
        if sub.vertices.shape[0] == 0 or sub.faces.shape[0] == 0:
            continue

        lab_dir = os.path.join(out_dir, f"{lab}")
        os.makedirs(lab_dir, exist_ok=True)
        export_path = os.path.join(lab_dir, f"{lab}.obj")
        sub.export(export_path)

    return flabels
