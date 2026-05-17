import os
import sys
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import uuid

_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from auth_deps import require_admin

router = APIRouter(prefix="/api/categories", tags=["categories"])

# Database reference
db = None

def init_db(database):
    global db
    db = database

# Models
class TranslatedName(BaseModel):
    name: Optional[str] = ""

class SubSubcategory(BaseModel):
    id: Optional[int] = None
    name: str
    slug: str
    translations: Optional[dict] = None  # {fr: {name}, en: {name}, ar: {name}}

class Subcategory(BaseModel):
    id: int
    name: str
    slug: str
    isPromotion: bool = False
    children: List[SubSubcategory] = []
    translations: Optional[dict] = None

class CategoryBase(BaseModel):
    name: str
    slug: str
    image: str
    subcategories: List[Subcategory] = []
    translations: Optional[dict] = None  # {fr: {name}, en: {name}, ar: {name}}

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int

SUPPORTED_LANGS = ("fr", "en", "ar")

def _ensure_translations(node: dict) -> dict:
    """Make sure every category/subcat has a `translations` dict with FR fallback."""
    if not isinstance(node, dict):
        return node
    t = node.get("translations") or {}
    if not t.get("fr") or not t["fr"].get("name"):
        t["fr"] = {"name": node.get("name", "")}
    for lang in SUPPORTED_LANGS:
        t.setdefault(lang, {"name": ""})
    node["translations"] = t
    for sub in node.get("subcategories", []) or []:
        _ensure_translations(sub)
    for child in node.get("children", []) or []:
        _ensure_translations(child)
    return node

# Routes
@router.get("/")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return [_ensure_translations(c) for c in categories]

@router.get("/{category_slug}")
async def get_category(category_slug: str):
    category = await db.categories.find_one({"slug": category_slug}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return _ensure_translations(category)

@router.post("/")
async def create_category(category: CategoryCreate, _admin: dict = Depends(require_admin)):
    # Get max ID
    last = await db.categories.find_one(sort=[("id", -1)])
    new_id = (last["id"] + 1) if last else 1
    
    category_dict = category.model_dump()
    category_dict["id"] = new_id
    
    await db.categories.insert_one(category_dict)
    return category_dict

@router.put("/{category_id}")
async def update_category(category_id: str, category: CategoryUpdate, _admin: dict = Depends(require_admin)):
    category_dict = category.model_dump()
    
    # Try to find by ID (int) or by slug (str)
    query = {}
    try:
        query = {"id": int(category_id)}
    except ValueError:
        query = {"slug": category_id}
    
    result = await db.categories.update_one(query, {"$set": category_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    updated = await db.categories.find_one(query, {"_id": 0})
    return updated

@router.delete("/{category_id}")
async def delete_category(category_id: str, _admin: dict = Depends(require_admin)):
    # Try to find by ID (int) or by slug (str)
    query = {}
    try:
        query = {"id": int(category_id)}
    except ValueError:
        query = {"slug": category_id}
    
    result = await db.categories.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}
