from fastapi import APIRouter
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter(prefix="/api/migrate", tags=["migration"])

# Database reference
db = None

def init_db(database):
    global db
    db = database

# Initial data from mockData.js
CATEGORIES_DATA = [
    {
        "id": 1,
        "name": "Femme",
        "slug": "femme",
        "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
        "subcategories": [
            {"id": 11, "name": "Nouveautés", "slug": "nouveautes", "isPromotion": False},
            {"id": 12, "name": "Vêtements", "slug": "vetements", "isPromotion": False},
            {"id": 13, "name": "Robes", "slug": "robes", "isPromotion": False},
            {"id": 14, "name": "Hauts", "slug": "hauts", "isPromotion": False},
            {"id": 15, "name": "Sacs", "slug": "sacs", "isPromotion": False},
            {"id": 16, "name": "Chaussures", "slug": "chaussures", "isPromotion": False},
            {"id": 17, "name": "Accessoires", "slug": "accessoires", "isPromotion": False},
            {"id": 18, "name": "Promotions", "slug": "promotions", "isPromotion": True}
        ]
    },
    {
        "id": 2,
        "name": "Homme",
        "slug": "homme",
        "image": "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&q=80",
        "subcategories": [
            {"id": 21, "name": "Nouveautés", "slug": "nouveautes", "isPromotion": False},
            {"id": 22, "name": "Vêtements", "slug": "vetements", "isPromotion": False},
            {"id": 23, "name": "Chemises", "slug": "chemises", "isPromotion": False},
            {"id": 24, "name": "Chaussures", "slug": "chaussures", "isPromotion": False},
            {"id": 25, "name": "Accessoires", "slug": "accessoires", "isPromotion": False},
            {"id": 26, "name": "Promotions", "slug": "promotions", "isPromotion": True}
        ]
    },
    {
        "id": 3,
        "name": "Enfant",
        "slug": "enfant",
        "image": "https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80",
        "subcategories": [
            {"id": 31, "name": "Garçons", "slug": "garcons", "isPromotion": False},
            {"id": 32, "name": "Filles", "slug": "filles", "isPromotion": False},
            {"id": 33, "name": "Bébé Garçons", "slug": "bebe-garcons", "isPromotion": False},
            {"id": 34, "name": "Bébé Filles", "slug": "bebe-filles", "isPromotion": False},
            {"id": 35, "name": "Promotions", "slug": "promotions", "isPromotion": True}
        ]
    }
]

PRODUCTS_DATA = [
    {
        "id": "1",
        "name": "Robe en Soie Élégante",
        "brand": "Marque de Luxe",
        "price": 450,
        "originalPrice": 600,
        "promotionStartDate": "2026-01-01",
        "promotionEndDate": "2026-12-31",
        "category": "femme",
        "subcategory": "robes",
        "images": [
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80"
        ],
        "variants": [
            {"color": "Noir", "size": "XS", "stock": 5, "sku": "ROBE-001-BLK-XS"},
            {"color": "Noir", "size": "S", "stock": 10, "sku": "ROBE-001-BLK-S"},
            {"color": "Noir", "size": "M", "stock": 8, "sku": "ROBE-001-BLK-M"},
            {"color": "Noir", "size": "L", "stock": 3, "sku": "ROBE-001-BLK-L"},
            {"color": "Noir", "size": "XL", "stock": 0, "sku": "ROBE-001-BLK-XL"},
            {"color": "Marine", "size": "S", "stock": 7, "sku": "ROBE-001-NAV-S"},
            {"color": "Marine", "size": "M", "stock": 5, "sku": "ROBE-001-NAV-M"},
            {"color": "Marine", "size": "L", "stock": 2, "sku": "ROBE-001-NAV-L"}
        ],
        "colors": [
            {"name": "Noir", "hex": "#000000", "available": True, "images": [
                "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80"
            ]},
            {"name": "Marine", "hex": "#001f3f", "available": True, "images": [
                "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80"
            ]},
            {"name": "Bordeaux", "hex": "#800020", "available": False, "images": []}
        ],
        "sizes": [
            {"size": "XS", "stock": 5},
            {"size": "S", "stock": 17},
            {"size": "M", "stock": 13},
            {"size": "L", "stock": 5},
            {"size": "XL", "stock": 0}
        ],
        "description": "Robe luxueuse en soie avec un drapé élégant. Parfaite pour les occasions spéciales.",
        "details": ["100% Soie", "Nettoyage à sec uniquement", "Fabriqué en Italie", "Coupe designer"],
        "newArrival": True,
        "featured": True
    },
    {
        "id": "2",
        "name": "Sac à Main en Cuir",
        "brand": "Cuir Premium",
        "price": 890,
        "category": "femme",
        "subcategory": "sacs",
        "images": [
            "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80",
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80"
        ],
        "colors": [
            {"name": "Noir", "hex": "#000000", "available": True, "images": [
                "https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80"
            ]},
            {"name": "Tan", "hex": "#D2B48C", "available": True, "images": [
                "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80"
            ]},
            {"name": "Marron", "hex": "#8B4513", "available": True, "images": [
                "https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80"
            ]}
        ],
        "sizes": [{"size": "Taille Unique", "stock": 15}],
        "variants": [],
        "description": "Sac à main en cuir fait main avec quincaillerie dorée.",
        "details": ["Cuir véritable", "Poches intérieures", "Bandoulière amovible", "Housse de protection incluse"],
        "newArrival": True,
        "featured": True
    },
    {
        "id": "3",
        "name": "Baskets Designer",
        "brand": "Sport Luxe",
        "price": 650,
        "originalPrice": 750,
        "promotionStartDate": "2026-01-01",
        "promotionEndDate": "2026-06-30",
        "category": "femme",
        "subcategory": "chaussures",
        "images": [
            "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80",
            "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80"
        ],
        "colors": [
            {"name": "Blanc", "hex": "#FFFFFF", "available": True, "images": [
                "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"
            ]},
            {"name": "Noir", "hex": "#000000", "available": True, "images": [
                "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
            ]},
            {"name": "Rose", "hex": "#FFC0CB", "available": True, "images": [
                "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80"
            ]}
        ],
        "sizes": [
            {"size": "36", "stock": 2},
            {"size": "37", "stock": 5},
            {"size": "38", "stock": 8},
            {"size": "39", "stock": 6},
            {"size": "40", "stock": 4},
            {"size": "41", "stock": 2}
        ],
        "variants": [],
        "description": "Baskets de designer haut de gamme avec confort supérieur.",
        "details": ["Dessus en cuir", "Semelle en caoutchouc", "Semelle intérieure rembourrée", "Fabriqué au Portugal"],
        "newArrival": False,
        "featured": True
    },
    {
        "id": "4",
        "name": "Blazer en Laine",
        "brand": "Excellence Sur Mesure",
        "price": 780,
        "category": "homme",
        "subcategory": "vetements",
        "images": [
            "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80",
            "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800&q=80"
        ],
        "colors": [
            {"name": "Marine", "hex": "#001f3f", "available": True, "images": [
                "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80"
            ]},
            {"name": "Anthracite", "hex": "#36454F", "available": True, "images": [
                "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80"
            ]},
            {"name": "Noir", "hex": "#000000", "available": False, "images": []}
        ],
        "sizes": [
            {"size": "S", "stock": 4},
            {"size": "M", "stock": 7},
            {"size": "L", "stock": 5},
            {"size": "XL", "stock": 3},
            {"size": "XXL", "stock": 2}
        ],
        "variants": [],
        "description": "Blazer classique en laine avec coupe moderne.",
        "details": ["100% Laine", "Doublure complète", "Fermeture deux boutons", "Fabriqué au Royaume-Uni"],
        "newArrival": True,
        "featured": False
    },
    {
        "id": "5",
        "name": "Chaussures Oxford en Cuir",
        "brand": "Chaussures Classiques",
        "price": 420,
        "category": "homme",
        "subcategory": "chaussures",
        "images": [
            "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80",
            "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80"
        ],
        "colors": [
            {"name": "Noir", "hex": "#000000", "available": True, "images": [
                "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80"
            ]},
            {"name": "Marron", "hex": "#8B4513", "available": True, "images": [
                "https://images.unsplash.com/photo-1582897085656-c52139049cbf?w=800&q=80"
            ]}
        ],
        "sizes": [
            {"size": "40", "stock": 3},
            {"size": "41", "stock": 6},
            {"size": "42", "stock": 8},
            {"size": "43", "stock": 5},
            {"size": "44", "stock": 4},
            {"size": "45", "stock": 2}
        ],
        "variants": [],
        "description": "Chaussures Oxford en cuir faites à la main pour le gentleman moderne.",
        "details": ["Cuir pleine fleur", "Semelle en cuir", "Cousu Goodyear", "Fabriqué en Italie"],
        "newArrival": False,
        "featured": True
    },
    {
        "id": "6",
        "name": "Pull en Cachemire",
        "brand": "Luxe Doux",
        "price": 340,
        "category": "homme",
        "subcategory": "vetements",
        "images": [
            "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80",
            "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80"
        ],
        "colors": [
            {"name": "Beige", "hex": "#F5F5DC", "available": True, "images": [
                "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80"
            ]},
            {"name": "Marine", "hex": "#001f3f", "available": True, "images": [
                "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80"
            ]},
            {"name": "Gris", "hex": "#808080", "available": True, "images": [
                "https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?w=800&q=80"
            ]}
        ],
        "sizes": [
            {"size": "S", "stock": 8},
            {"size": "M", "stock": 12},
            {"size": "L", "stock": 10},
            {"size": "XL", "stock": 6}
        ],
        "variants": [],
        "description": "Pull ultra-doux en cachemire pour un confort ultime.",
        "details": ["100% Cachemire", "Lavage à la main", "Poignets côtelés", "Fabriqué en Écosse"],
        "newArrival": True,
        "featured": True
    },
    {
        "id": "7",
        "name": "Veste en Jean Enfant",
        "brand": "Style Jeunesse",
        "price": 85,
        "category": "enfant",
        "subcategory": "garcons",
        "images": [
            "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80",
            "https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80"
        ],
        "colors": [
            {"name": "Jean Bleu", "hex": "#1560BD", "available": True, "images": [
                "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80"
            ]},
            {"name": "Jean Noir", "hex": "#2C2C2C", "available": True, "images": [
                "https://images.unsplash.com/photo-1516826957135-700dedea698c?w=800&q=80"
            ]}
        ],
        "sizes": [
            {"size": "4A", "stock": 10},
            {"size": "6A", "stock": 12},
            {"size": "8A", "stock": 15},
            {"size": "10A", "stock": 8},
            {"size": "12A", "stock": 5}
        ],
        "variants": [],
        "description": "Veste en jean classique pour enfants avec coupe confortable.",
        "details": ["100% Coton", "Lavable en machine", "Fermeture à boutons", "Deux poches"],
        "newArrival": False,
        "featured": False
    }
]

ATTRIBUTES_DATA = {
    "type": "global",
    "colors": [
        {"name": "Noir", "hex": "#000000"},
        {"name": "Blanc", "hex": "#FFFFFF"},
        {"name": "Rouge", "hex": "#FF0000"},
        {"name": "Bleu", "hex": "#0000FF"},
        {"name": "Vert", "hex": "#008000"},
        {"name": "Marine", "hex": "#001f3f"},
        {"name": "Beige", "hex": "#F5F5DC"},
        {"name": "Gris", "hex": "#808080"},
        {"name": "Rose", "hex": "#FFC0CB"},
        {"name": "Marron", "hex": "#8B4513"}
    ],
    "sizes": ["XS", "S", "M", "L", "XL", "XXL", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "4A", "6A", "8A", "10A", "12A", "Taille Unique"],
    "brands": ["Marque de Luxe", "Cuir Premium", "Sport Luxe", "Excellence Sur Mesure", "Chaussures Classiques", "Luxe Doux", "Style Jeunesse"],
    "customAttributes": [
        {
            "id": 1,
            "name": "Matière",
            "type": "select",
            "values": ["Coton", "Soie", "Laine", "Polyester", "Lin", "Cuir", "Cachemire", "Viscose"]
        },
        {
            "id": 2,
            "name": "Style",
            "type": "select",
            "values": ["Casual", "Formel", "Sport", "Élégant", "Décontracté", "Vintage", "Moderne"]
        }
    ]
}

@router.post("/seed")
async def seed_database():
    """Seed the database with initial data"""
    results = {
        "categories": 0,
        "products": 0,
        "attributes": False
    }
    
    # Clear existing data
    await db.categories.delete_many({})
    await db.products.delete_many({})
    await db.attributes.delete_many({})
    
    # Insert categories
    if CATEGORIES_DATA:
        await db.categories.insert_many(CATEGORIES_DATA)
        results["categories"] = len(CATEGORIES_DATA)
    
    # Insert products
    if PRODUCTS_DATA:
        await db.products.insert_many(PRODUCTS_DATA)
        results["products"] = len(PRODUCTS_DATA)
    
    # Insert attributes
    await db.attributes.insert_one(ATTRIBUTES_DATA)
    results["attributes"] = True
    
    return {
        "message": "Database seeded successfully",
        "data": results
    }

@router.get("/status")
async def migration_status():
    """Check migration status"""
    categories_count = await db.categories.count_documents({})
    products_count = await db.products.count_documents({})
    attributes = await db.attributes.find_one({"type": "global"})
    orders_count = await db.orders.count_documents({})
    customers_count = await db.customers.count_documents({})
    promotions_count = await db.promotions.count_documents({})
    returns_count = await db.returns.count_documents({})
    coupons_count = await db.coupons.count_documents({})
    settings_count = await db.settings.count_documents({})
    admins_count = await db.admin_users.count_documents({})
    
    return {
        "categories": categories_count,
        "products": products_count,
        "attributes_configured": attributes is not None,
        "orders": orders_count,
        "customers": customers_count,
        "promotions": promotions_count,
        "returns": returns_count,
        "coupons": coupons_count,
        "settings": settings_count,
        "admin_users": admins_count
    }

@router.post("/seed-all")
async def seed_all_data():
    """Seed ALL data including orders, customers, promotions, returns, settings"""
    from routes.orders import seed_sample_orders
    from routes.customers import seed_sample_customers
    from routes.promotions import seed_sample_promotions
    from routes.returns import seed_sample_returns
    from routes.settings import seed_default_settings
    from routes.coupons import seed_default_coupons
    
    results = {}
    
    # Seed base data first
    await db.categories.delete_many({})
    await db.products.delete_many({})
    await db.attributes.delete_many({})
    
    if CATEGORIES_DATA:
        await db.categories.insert_many(CATEGORIES_DATA)
        results["categories"] = len(CATEGORIES_DATA)
    
    if PRODUCTS_DATA:
        await db.products.insert_many(PRODUCTS_DATA)
        results["products"] = len(PRODUCTS_DATA)
    
    await db.attributes.insert_one(ATTRIBUTES_DATA)
    results["attributes"] = True
    
    # Seed additional data
    await seed_default_coupons()
    results["coupons"] = await db.coupons.count_documents({})
    
    await seed_sample_orders()
    results["orders"] = await db.orders.count_documents({})
    
    await seed_sample_customers()
    results["customers"] = await db.customers.count_documents({})
    
    await seed_sample_promotions()
    results["promotions"] = await db.promotions.count_documents({})
    
    await seed_sample_returns()
    results["returns"] = await db.returns.count_documents({})
    
    await seed_default_settings()
    results["settings"] = await db.settings.count_documents({})
    results["admin_users"] = await db.admin_users.count_documents({})
    
    return {
        "message": "All data seeded successfully",
        "data": results
    }
