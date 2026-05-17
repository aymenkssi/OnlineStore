from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from typing import List
import os
import uuid
from datetime import datetime

from auth_deps import require_admin

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Configuration
#UPLOAD_DIR = os.path.realpath("/app/backend/uploads")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(os.getcwd(), "uploads"))
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
# SVG removed: stored SVGs can contain <script> → XSS risk when served inline
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico'}
# Magic-bytes signatures to validate content (not just extension)
MAGIC_BYTES = {
    '.jpg': [b'\xff\xd8\xff'],
    '.jpeg': [b'\xff\xd8\xff'],
    '.png': [b'\x89PNG\r\n\x1a\n'],
    '.gif': [b'GIF87a', b'GIF89a'],
    '.webp': [b'RIFF'],  # followed by "WEBP" at offset 8
    '.ico': [b'\x00\x00\x01\x00'],
}

os.makedirs(UPLOAD_DIR, exist_ok=True)


def get_file_extension(filename: str) -> str:
    return os.path.splitext(filename or "")[1].lower()


def is_allowed_file(filename: str) -> bool:
    return get_file_extension(filename) in ALLOWED_EXTENSIONS


def is_valid_content(content: bytes, ext: str) -> bool:
    """Verify magic bytes match the declared extension (defends against renamed binaries)."""
    signatures = MAGIC_BYTES.get(ext, [])
    if not signatures:
        return True  # unknown ext already rejected upstream
    if ext == '.webp':
        return content[:4] == b'RIFF' and content[8:12] == b'WEBP'
    return any(content.startswith(sig) for sig in signatures)


def _safe_resolve(filename: str) -> str:
    """Resolve a filename inside UPLOAD_DIR, blocking path traversal attempts."""
    # Only keep basename to ignore any ../ or absolute paths
    safe_name = os.path.basename(filename)
    if not safe_name or safe_name.startswith('.'):
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")
    full_path = os.path.realpath(os.path.join(UPLOAD_DIR, safe_name))
    if not full_path.startswith(UPLOAD_DIR + os.sep) and full_path != UPLOAD_DIR:
        raise HTTPException(status_code=400, detail="Chemin non autorisé")
    return full_path


async def _save_upload(file: UploadFile) -> dict:
    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Type non autorisé. Extensions acceptées: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"Fichier trop volumineux (>{MAX_FILE_SIZE // (1024*1024)}MB)")
    if not is_valid_content(content, ext):
        raise HTTPException(status_code=400, detail="Contenu du fichier ne correspond pas au type déclaré")
    unique_filename = f"{uuid.uuid4()}{ext}"
    file_path = _safe_resolve(unique_filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return {
        "url": f"/api/upload/images/{unique_filename}",
        "filename": unique_filename,
        "original_name": file.filename,
        "size": len(content),
    }


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    _admin: dict = Depends(require_admin),
):
    """Upload a single image and return its URL (ADMIN ONLY)"""
    return await _save_upload(file)


@router.post("/images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    _admin: dict = Depends(require_admin),
):
    """Upload multiple images and return their URLs (ADMIN ONLY)"""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images à la fois")
    results = []
    for file in files:
        try:
            results.append(await _save_upload(file))
        except HTTPException as e:
            results.append({"error": e.detail, "filename": file.filename})
    return {"images": results}


@router.get("/images/{filename}")
async def get_image(filename: str):
    """Serve an uploaded image (public)."""
    file_path = _safe_resolve(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image non trouvée")
    ext = get_file_extension(filename)
    media_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
    }
    return FileResponse(
        file_path,
        media_type=media_types.get(ext, 'application/octet-stream'),
        headers={"X-Content-Type-Options": "nosniff"},
    )


@router.delete("/images/{filename}")
async def delete_image(
    filename: str,
    _admin: dict = Depends(require_admin),
):
    """Delete an uploaded image (ADMIN ONLY)"""
    file_path = _safe_resolve(filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image non trouvée")
    os.remove(file_path)
    return {"message": "Image supprimée avec succès"}


@router.get("/list")
async def list_images(_admin: dict = Depends(require_admin)):
    """List all uploaded images (ADMIN ONLY)"""
    files = os.listdir(UPLOAD_DIR)
    images = []
    for filename in files:
        if is_allowed_file(filename):
            file_path = os.path.join(UPLOAD_DIR, filename)
            stat = os.stat(file_path)
            images.append({
                "filename": filename,
                "url": f"/api/upload/images/{filename}",
                "size": stat.st_size,
                "created_at": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            })
    return {"images": images, "total": len(images)}
