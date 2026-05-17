import os
import sys
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional

_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _parent not in sys.path:
    sys.path.insert(0, _parent)
from auth_deps import require_admin

router = APIRouter(prefix="/api/attributes", tags=["attributes"])

# Database reference
db = None

def init_db(database):
    global db
    db = database

# Models
class ColorAttribute(BaseModel):
    name: str
    hex: str

class AttributesData(BaseModel):
    colors: List[ColorAttribute] = []
    sizes: List[str] = []
    brands: List[str] = []
    customAttributes: List[dict] = []

# Routes
@router.get("/", response_model=AttributesData)
async def get_attributes():
    attrs = await db.attributes.find_one({"type": "global"}, {"_id": 0})
    if not attrs:
        # Return default attributes
        return AttributesData(
            colors=[
                {"name": "Noir", "hex": "#000000"},
                {"name": "Blanc", "hex": "#FFFFFF"},
                {"name": "Rouge", "hex": "#FF0000"},
                {"name": "Bleu", "hex": "#0000FF"},
                {"name": "Vert", "hex": "#008000"}
            ],
            sizes=["XS", "S", "M", "L", "XL", "XXL"],
            brands=[],
            customAttributes=[]
        )
    return attrs

@router.put("/", response_model=AttributesData)
async def update_attributes(attributes: AttributesData, _admin: dict = Depends(require_admin)):
    attrs_dict = attributes.model_dump()
    attrs_dict["type"] = "global"
    
    await db.attributes.update_one(
        {"type": "global"},
        {"$set": attrs_dict},
        upsert=True
    )
    
    return attrs_dict

@router.post("/colors", response_model=ColorAttribute)
async def add_color(color: ColorAttribute, _admin: dict = Depends(require_admin)):
    await db.attributes.update_one(
        {"type": "global"},
        {"$push": {"colors": color.model_dump()}},
        upsert=True
    )
    return color

@router.delete("/colors/{color_name}")
async def delete_color(color_name: str, _admin: dict = Depends(require_admin)):
    await db.attributes.update_one(
        {"type": "global"},
        {"$pull": {"colors": {"name": color_name}}}
    )
    return {"message": "Color deleted"}

@router.post("/sizes/{size}")
async def add_size(size: str, _admin: dict = Depends(require_admin)):
    await db.attributes.update_one(
        {"type": "global"},
        {"$addToSet": {"sizes": size}},
        upsert=True
    )
    return {"message": "Size added", "size": size}

@router.delete("/sizes/{size}")
async def delete_size(size: str, _admin: dict = Depends(require_admin)):
    await db.attributes.update_one(
        {"type": "global"},
        {"$pull": {"sizes": size}}
    )
    return {"message": "Size deleted"}

@router.post("/brands/{brand}")
async def add_brand(brand: str, _admin: dict = Depends(require_admin)):
    await db.attributes.update_one(
        {"type": "global"},
        {"$addToSet": {"brands": brand}},
        upsert=True
    )
    return {"message": "Brand added", "brand": brand}

@router.delete("/brands/{brand}")
async def delete_brand(brand: str, _admin: dict = Depends(require_admin)):
    await db.attributes.update_one(
        {"type": "global"},
        {"$pull": {"brands": brand}}
    )
    return {"message": "Brand deleted"}
