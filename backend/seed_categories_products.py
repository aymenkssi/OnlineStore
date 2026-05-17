"""
Script pour créer les sous-catégories, sous-sous-catégories et produits
pour un site de vêtements et accessoires.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

# Structure complète des catégories
CATEGORIES = {
    "femme": {
        "name": "Femme",
        "image": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80",
        "subcategories": [
            {
                "name": "Vêtements", "slug": "vetements",
                "children": [
                    {"name": "Robes", "slug": "robes"},
                    {"name": "Tops & Blouses", "slug": "tops-blouses"},
                    {"name": "Pantalons", "slug": "pantalons"},
                    {"name": "Jupes", "slug": "jupes"},
                    {"name": "Vestes & Manteaux", "slug": "vestes-manteaux"},
                ]
            },
            {
                "name": "Chaussures", "slug": "chaussures",
                "children": [
                    {"name": "Talons", "slug": "talons"},
                    {"name": "Baskets", "slug": "baskets"},
                    {"name": "Bottes", "slug": "bottes"},
                    {"name": "Sandales", "slug": "sandales"},
                ]
            },
            {
                "name": "Sacs", "slug": "sacs",
                "children": [
                    {"name": "Sacs à main", "slug": "sacs-a-main"},
                    {"name": "Pochettes", "slug": "pochettes"},
                    {"name": "Sacs à dos", "slug": "sacs-a-dos"},
                ]
            },
            {
                "name": "Lingerie", "slug": "lingerie",
                "children": [
                    {"name": "Soutiens-gorge", "slug": "soutiens-gorge"},
                    {"name": "Pyjamas", "slug": "pyjamas-femme"},
                ]
            },
            {"name": "Promotions", "slug": "promotions", "isPromotion": True, "children": []},
        ]
    },
    "homme": {
        "name": "Homme",
        "image": "https://images.unsplash.com/photo-1617137968427-85e42bb09ffe?w=800&q=80",
        "subcategories": [
            {
                "name": "Vêtements", "slug": "vetements",
                "children": [
                    {"name": "Chemises", "slug": "chemises"},
                    {"name": "T-shirts & Polos", "slug": "tshirts-polos"},
                    {"name": "Pantalons & Jeans", "slug": "pantalons-jeans"},
                    {"name": "Pulls & Sweats", "slug": "pulls-sweats"},
                    {"name": "Vestes & Manteaux", "slug": "vestes-manteaux"},
                ]
            },
            {
                "name": "Costumes", "slug": "costumes",
                "children": [
                    {"name": "Blazers", "slug": "blazers"},
                    {"name": "Pantalons habillés", "slug": "pantalons-habilles"},
                    {"name": "Costumes complets", "slug": "costumes-complets"},
                ]
            },
            {
                "name": "Chaussures", "slug": "chaussures",
                "children": [
                    {"name": "Sneakers", "slug": "sneakers"},
                    {"name": "Chaussures habillées", "slug": "chaussures-habillees"},
                    {"name": "Boots", "slug": "boots"},
                    {"name": "Mocassins", "slug": "mocassins"},
                ]
            },
            {"name": "Promotions", "slug": "promotions", "isPromotion": True, "children": []},
        ]
    },
    "enfant": {
        "name": "Enfant",
        "image": "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=800&q=80",
        "subcategories": [
            {
                "name": "Filles", "slug": "filles",
                "children": [
                    {"name": "Robes & Jupes", "slug": "robes-jupes"},
                    {"name": "Tops & T-shirts", "slug": "tops-tshirts-filles"},
                    {"name": "Pantalons", "slug": "pantalons-filles"},
                ]
            },
            {
                "name": "Garçons", "slug": "garcons",
                "children": [
                    {"name": "T-shirts & Polos", "slug": "tshirts-polos-garcons"},
                    {"name": "Pantalons & Jeans", "slug": "pantalons-jeans-garcons"},
                    {"name": "Vestes", "slug": "vestes-garcons"},
                ]
            },
            {
                "name": "Bébé", "slug": "bebe",
                "children": [
                    {"name": "Bodies & Grenouillères", "slug": "bodies-grenouilleres"},
                    {"name": "Pyjamas", "slug": "pyjamas-bebe"},
                    {"name": "Ensembles", "slug": "ensembles-bebe"},
                ]
            },
            {
                "name": "Chaussures Enfant", "slug": "chaussures-enfant",
                "children": [
                    {"name": "Baskets", "slug": "baskets-enfant"},
                    {"name": "Sandales", "slug": "sandales-enfant"},
                ]
            },
            {"name": "Promotions", "slug": "promotions", "isPromotion": True, "children": []},
        ]
    },
    "accessoires": {
        "name": "Accessoires",
        "image": "https://images.unsplash.com/photo-1611923134239-b9be5816d0f2?w=800&q=80",
        "subcategories": [
            {
                "name": "Bijoux", "slug": "bijoux",
                "children": [
                    {"name": "Colliers", "slug": "colliers"},
                    {"name": "Bracelets", "slug": "bracelets"},
                    {"name": "Boucles d'oreilles", "slug": "boucles-oreilles"},
                    {"name": "Bagues", "slug": "bagues"},
                ]
            },
            {
                "name": "Montres", "slug": "montres",
                "children": [
                    {"name": "Montres classiques", "slug": "montres-classiques"},
                    {"name": "Montres sport", "slug": "montres-sport"},
                ]
            },
            {
                "name": "Lunettes", "slug": "lunettes",
                "children": [
                    {"name": "Lunettes de soleil", "slug": "lunettes-soleil"},
                    {"name": "Lunettes optiques", "slug": "lunettes-optiques"},
                ]
            },
            {
                "name": "Écharpes & Foulards", "slug": "echarpes-foulards",
                "children": [
                    {"name": "Écharpes", "slug": "echarpes"},
                    {"name": "Foulards", "slug": "foulards"},
                ]
            },
            {
                "name": "Ceintures", "slug": "ceintures",
                "children": [
                    {"name": "Ceintures cuir", "slug": "ceintures-cuir"},
                    {"name": "Ceintures tissu", "slug": "ceintures-tissu"},
                ]
            },
            {"name": "Promotions", "slug": "promotions", "isPromotion": True, "children": []},
        ]
    },
}

# Produits par sous-sous-catégorie (category_slug, sub_slug, subsub_slug) -> product
PRODUCTS = {
    # === FEMME ===
    ("femme", "vetements", "robes"): {
        "name": "Robe Midi Fleurie",
        "brand": "Élégance Paris",
        "price": 129.99,
        "description": "Robe midi à imprimé floral avec ceinture à nouer. Coupe fluide et féminine.",
        "images": ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80"],
        "colors": [{"name": "Rose", "hex": "#FFB6C1", "available": True, "images": ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80"]}],
        "sizes": [{"size": "XS", "stock": 5}, {"size": "S", "stock": 10}, {"size": "M", "stock": 12}, {"size": "L", "stock": 8}],
        "details": ["100% Viscose", "Lavable en machine", "Fabriqué en France"],
    },
    ("femme", "vetements", "tops-blouses"): {
        "name": "Blouse en Soie Satinée",
        "brand": "Luxe Femme",
        "price": 89.99,
        "description": "Blouse élégante en soie satinée avec col V. Idéale pour le bureau ou une sortie.",
        "images": ["https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80"],
        "colors": [{"name": "Ivoire", "hex": "#FFFFF0", "available": True, "images": ["https://images.unsplash.com/photo-1551163943-3f6a855d1153?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 8}, {"size": "M", "stock": 15}, {"size": "L", "stock": 10}],
        "details": ["100% Soie", "Nettoyage à sec", "Col V élégant"],
    },
    ("femme", "vetements", "pantalons"): {
        "name": "Pantalon Palazzo Fluide",
        "brand": "Mode Active",
        "price": 79.99,
        "description": "Pantalon palazzo à taille haute, coupe large et fluide. Ultra confortable.",
        "images": ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80"],
        "colors": [{"name": "Noir", "hex": "#000000", "available": True, "images": ["https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800&q=80"]}],
        "sizes": [{"size": "36", "stock": 6}, {"size": "38", "stock": 12}, {"size": "40", "stock": 10}, {"size": "42", "stock": 7}],
        "details": ["Polyester mélangé", "Taille haute élastiquée", "Lavable en machine"],
    },
    ("femme", "vetements", "jupes"): {
        "name": "Jupe Plissée Midi",
        "brand": "Élégance Paris",
        "price": 69.99,
        "description": "Jupe plissée mi-longue en satin. Un classique indémodable.",
        "images": ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80"],
        "colors": [{"name": "Bordeaux", "hex": "#800020", "available": True, "images": ["https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?w=800&q=80"]}],
        "sizes": [{"size": "XS", "stock": 4}, {"size": "S", "stock": 9}, {"size": "M", "stock": 11}, {"size": "L", "stock": 6}],
        "details": ["Satin polyester", "Ceinture élastique", "Longueur midi"],
    },
    ("femme", "vetements", "vestes-manteaux"): {
        "name": "Trench Coat Classique",
        "brand": "Heritage London",
        "price": 249.99,
        "description": "Trench coat intemporel en coton imperméable. Double boutonnage et ceinture.",
        "images": ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80"],
        "colors": [{"name": "Beige", "hex": "#F5F5DC", "available": True, "images": ["https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 5}, {"size": "M", "stock": 8}, {"size": "L", "stock": 6}, {"size": "XL", "stock": 3}],
        "details": ["Coton imperméable", "Double boutonnage", "Fabriqué en Angleterre"],
    },
    ("femme", "chaussures", "talons"): {
        "name": "Escarpins Cuir Verni",
        "brand": "Stiletto Paris",
        "price": 159.99,
        "description": "Escarpins élégants en cuir verni avec talon de 8cm. Bout pointu raffiné.",
        "images": ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80"],
        "colors": [{"name": "Noir", "hex": "#000000", "available": True, "images": ["https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80"]}],
        "sizes": [{"size": "36", "stock": 4}, {"size": "37", "stock": 7}, {"size": "38", "stock": 9}, {"size": "39", "stock": 6}, {"size": "40", "stock": 3}],
        "details": ["Cuir verni", "Talon 8cm", "Semelle cuir"],
    },
    ("femme", "chaussures", "baskets"): {
        "name": "Baskets Plateforme Blanches",
        "brand": "Urban Chic",
        "price": 99.99,
        "description": "Baskets tendance avec semelle plateforme. Confort et style au quotidien.",
        "images": ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"],
        "colors": [{"name": "Blanc", "hex": "#FFFFFF", "available": True, "images": ["https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80"]}],
        "sizes": [{"size": "36", "stock": 5}, {"size": "37", "stock": 8}, {"size": "38", "stock": 12}, {"size": "39", "stock": 7}, {"size": "40", "stock": 4}],
        "details": ["Cuir synthétique", "Semelle plateforme 4cm", "Lacets"],
    },
    ("femme", "chaussures", "bottes"): {
        "name": "Bottes Chelsea en Cuir",
        "brand": "Heritage London",
        "price": 189.99,
        "description": "Bottes Chelsea classiques en cuir souple. Élastique latéral pour un enfilage facile.",
        "images": ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80"],
        "colors": [{"name": "Marron", "hex": "#8B4513", "available": True, "images": ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80"]}],
        "sizes": [{"size": "36", "stock": 3}, {"size": "37", "stock": 6}, {"size": "38", "stock": 8}, {"size": "39", "stock": 5}],
        "details": ["Cuir véritable", "Semelle caoutchouc", "Élastique latéral"],
    },
    ("femme", "chaussures", "sandales"): {
        "name": "Sandales à Lanières Dorées",
        "brand": "Soleil Mode",
        "price": 69.99,
        "description": "Sandales plates avec lanières dorées entrecroisées. Parfaites pour l'été.",
        "images": ["https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80"],
        "colors": [{"name": "Doré", "hex": "#FFD700", "available": True, "images": ["https://images.unsplash.com/photo-1603487742131-4160ec999306?w=800&q=80"]}],
        "sizes": [{"size": "36", "stock": 6}, {"size": "37", "stock": 10}, {"size": "38", "stock": 12}, {"size": "39", "stock": 8}],
        "details": ["Cuir synthétique doré", "Semelle plate", "Boucle cheville"],
    },
    ("femme", "sacs", "sacs-a-main"): {
        "name": "Sac Cabas en Cuir Grainé",
        "brand": "Cuir Premium",
        "price": 219.99,
        "description": "Grand sac cabas en cuir grainé avec compartiments multiples. Élégant et pratique.",
        "images": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80"],
        "colors": [{"name": "Noir", "hex": "#000000", "available": True, "images": ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 15}],
        "details": ["Cuir grainé véritable", "Fermeture zippée", "Bandoulière amovible"],
    },
    ("femme", "sacs", "pochettes"): {
        "name": "Pochette de Soirée Pailletée",
        "brand": "Luxe Femme",
        "price": 59.99,
        "description": "Pochette de soirée ornée de paillettes. Chaîne dorée amovible incluse.",
        "images": ["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80"],
        "colors": [{"name": "Or", "hex": "#FFD700", "available": True, "images": ["https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 20}],
        "details": ["Tissu pailleté", "Chaîne dorée amovible", "Fermoir magnétique"],
    },
    ("femme", "sacs", "sacs-a-dos"): {
        "name": "Sac à Dos Urbain Cuir",
        "brand": "Urban Chic",
        "price": 139.99,
        "description": "Sac à dos compact en cuir végétal. Design minimaliste et fonctionnel.",
        "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"],
        "colors": [{"name": "Taupe", "hex": "#483C32", "available": True, "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 12}],
        "details": ["Cuir végétal", "Poche laptop 13\"", "Bretelles ajustables"],
    },
    ("femme", "lingerie", "soutiens-gorge"): {
        "name": "Bralette en Dentelle",
        "brand": "Intimité",
        "price": 39.99,
        "description": "Bralette délicate en dentelle florale. Sans armatures pour un confort optimal.",
        "images": ["https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?w=800&q=80"],
        "colors": [{"name": "Nude", "hex": "#E8C4A0", "available": True, "images": ["https://images.unsplash.com/photo-1617331721458-bd3bd3f9c7f8?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 10}, {"size": "M", "stock": 15}, {"size": "L", "stock": 10}],
        "details": ["Dentelle florale", "Sans armatures", "Bretelles ajustables"],
    },
    ("femme", "lingerie", "pyjamas-femme"): {
        "name": "Pyjama Satin Rose",
        "brand": "Intimité",
        "price": 59.99,
        "description": "Ensemble pyjama en satin doux. Short et chemise à manches courtes.",
        "images": ["https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&q=80"],
        "colors": [{"name": "Rose poudré", "hex": "#E8B4B8", "available": True, "images": ["https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 8}, {"size": "M", "stock": 12}, {"size": "L", "stock": 9}],
        "details": ["Satin polyester", "Ensemble 2 pièces", "Lavable en machine"],
    },
    # === HOMME ===
    ("homme", "vetements", "chemises"): {
        "name": "Chemise Oxford Slim Fit",
        "brand": "Classic Homme",
        "price": 69.99,
        "description": "Chemise Oxford classique coupe slim. Col boutonné et tissu premium.",
        "images": ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80"],
        "colors": [{"name": "Bleu ciel", "hex": "#87CEEB", "available": True, "images": ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 10}, {"size": "M", "stock": 15}, {"size": "L", "stock": 12}, {"size": "XL", "stock": 8}],
        "details": ["100% Coton Oxford", "Coupe Slim Fit", "Col boutonné"],
    },
    ("homme", "vetements", "tshirts-polos"): {
        "name": "Polo Piqué Premium",
        "brand": "Sport Luxe",
        "price": 49.99,
        "description": "Polo en coton piqué avec broderie logo. Coupe regular confortable.",
        "images": ["https://images.unsplash.com/photo-1625910513413-5fc2e0d1f04b?w=800&q=80"],
        "colors": [{"name": "Marine", "hex": "#001f3f", "available": True, "images": ["https://images.unsplash.com/photo-1625910513413-5fc2e0d1f04b?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 12}, {"size": "M", "stock": 18}, {"size": "L", "stock": 15}, {"size": "XL", "stock": 10}],
        "details": ["Coton piqué", "Coupe Regular", "Col côtelé"],
    },
    ("homme", "vetements", "pantalons-jeans"): {
        "name": "Jean Slim Stretch",
        "brand": "Denim Co",
        "price": 89.99,
        "description": "Jean slim en denim stretch pour un confort optimal. Finition brute indigo.",
        "images": ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80"],
        "colors": [{"name": "Indigo", "hex": "#3F51B5", "available": True, "images": ["https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&q=80"]}],
        "sizes": [{"size": "28", "stock": 5}, {"size": "30", "stock": 10}, {"size": "32", "stock": 14}, {"size": "34", "stock": 10}, {"size": "36", "stock": 6}],
        "details": ["98% Coton, 2% Élasthanne", "Coupe Slim", "Denim stretch"],
    },
    ("homme", "vetements", "pulls-sweats"): {
        "name": "Pull Col Roulé Mérinos",
        "brand": "Luxe Doux",
        "price": 129.99,
        "description": "Pull col roulé en laine mérinos extra-fine. Chaleur et élégance.",
        "images": ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80"],
        "colors": [{"name": "Gris chiné", "hex": "#808080", "available": True, "images": ["https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80"]}],
        "sizes": [{"size": "S", "stock": 7}, {"size": "M", "stock": 12}, {"size": "L", "stock": 10}, {"size": "XL", "stock": 5}],
        "details": ["Laine Mérinos", "Col roulé", "Lavage à la main"],
    },
    ("homme", "vetements", "vestes-manteaux"): {
        "name": "Parka Imperméable",
        "brand": "Outdoor Premium",
        "price": 199.99,
        "description": "Parka imperméable avec capuche amovible et doublure chaude. Idéale mi-saison.",
        "images": ["https://images.unsplash.com/photo-1544923246-77307dd270b9?w=800&q=80"],
        "colors": [{"name": "Kaki", "hex": "#556B2F", "available": True, "images": ["https://images.unsplash.com/photo-1544923246-77307dd270b9?w=800&q=80"]}],
        "sizes": [{"size": "M", "stock": 8}, {"size": "L", "stock": 10}, {"size": "XL", "stock": 7}, {"size": "XXL", "stock": 4}],
        "details": ["Tissu imperméable", "Capuche amovible", "Poches multiples"],
    },
    ("homme", "costumes", "blazers"): {
        "name": "Blazer Laine Italienne",
        "brand": "Excellence Sur Mesure",
        "price": 299.99,
        "description": "Blazer deux boutons en laine italienne super 120's. Coupe ajustée contemporaine.",
        "images": ["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80"],
        "colors": [{"name": "Marine", "hex": "#001f3f", "available": True, "images": ["https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80"]}],
        "sizes": [{"size": "48", "stock": 5}, {"size": "50", "stock": 8}, {"size": "52", "stock": 7}, {"size": "54", "stock": 4}],
        "details": ["Laine Super 120's", "Doublure viscose", "Fabriqué en Italie"],
    },
    ("homme", "costumes", "pantalons-habilles"): {
        "name": "Pantalon à Plis Laine",
        "brand": "Excellence Sur Mesure",
        "price": 149.99,
        "description": "Pantalon de costume à plis en laine vierge. Coupe classique avec pli permanent.",
        "images": ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80"],
        "colors": [{"name": "Charbon", "hex": "#36454F", "available": True, "images": ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80"]}],
        "sizes": [{"size": "48", "stock": 6}, {"size": "50", "stock": 10}, {"size": "52", "stock": 8}, {"size": "54", "stock": 5}],
        "details": ["Laine vierge", "Pli permanent", "Ceinture ajustable"],
    },
    ("homme", "costumes", "costumes-complets"): {
        "name": "Costume 3 Pièces Anthracite",
        "brand": "Excellence Sur Mesure",
        "price": 499.99,
        "description": "Costume 3 pièces (veste, pantalon, gilet) en laine fine. L'élégance absolue.",
        "images": ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80"],
        "colors": [{"name": "Anthracite", "hex": "#36454F", "available": True, "images": ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80"]}],
        "sizes": [{"size": "48", "stock": 3}, {"size": "50", "stock": 6}, {"size": "52", "stock": 5}, {"size": "54", "stock": 3}],
        "details": ["Laine fine italienne", "3 pièces incluses", "Doublure complète"],
    },
    ("homme", "chaussures", "sneakers"): {
        "name": "Sneakers Cuir Minimalistes",
        "brand": "Urban Chic",
        "price": 139.99,
        "description": "Sneakers en cuir lisse au design épuré. Semelle blanche contrastante.",
        "images": ["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80"],
        "colors": [{"name": "Blanc", "hex": "#FFFFFF", "available": True, "images": ["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80"]}],
        "sizes": [{"size": "40", "stock": 6}, {"size": "41", "stock": 9}, {"size": "42", "stock": 12}, {"size": "43", "stock": 8}, {"size": "44", "stock": 5}],
        "details": ["Cuir pleine fleur", "Semelle caoutchouc", "Fabriqué au Portugal"],
    },
    ("homme", "chaussures", "chaussures-habillees"): {
        "name": "Richelieu Cuir Noir",
        "brand": "Chaussures Classiques",
        "price": 219.99,
        "description": "Richelieu en cuir poli cousues Goodyear. L'élégance masculine par excellence.",
        "images": ["https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80"],
        "colors": [{"name": "Noir", "hex": "#000000", "available": True, "images": ["https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80"]}],
        "sizes": [{"size": "40", "stock": 4}, {"size": "41", "stock": 7}, {"size": "42", "stock": 10}, {"size": "43", "stock": 6}, {"size": "44", "stock": 3}],
        "details": ["Cuir poli", "Cousu Goodyear", "Semelle cuir"],
    },
    ("homme", "chaussures", "boots"): {
        "name": "Boots Desert Suède",
        "brand": "Heritage London",
        "price": 169.99,
        "description": "Desert boots en daim véritable avec semelle crêpe. Style décontracté chic.",
        "images": ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80"],
        "colors": [{"name": "Sable", "hex": "#C2B280", "available": True, "images": ["https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=800&q=80"]}],
        "sizes": [{"size": "40", "stock": 5}, {"size": "41", "stock": 8}, {"size": "42", "stock": 10}, {"size": "43", "stock": 6}],
        "details": ["Daim véritable", "Semelle crêpe", "Lacets coton"],
    },
    ("homme", "chaussures", "mocassins"): {
        "name": "Mocassins Cuir Souple",
        "brand": "Cuir Premium",
        "price": 149.99,
        "description": "Mocassins en cuir souple avec couture traditionnelle. Confort incomparable.",
        "images": ["https://images.unsplash.com/photo-1582897085656-c52139049cbf?w=800&q=80"],
        "colors": [{"name": "Cognac", "hex": "#834333", "available": True, "images": ["https://images.unsplash.com/photo-1582897085656-c52139049cbf?w=800&q=80"]}],
        "sizes": [{"size": "40", "stock": 4}, {"size": "41", "stock": 7}, {"size": "42", "stock": 9}, {"size": "43", "stock": 5}],
        "details": ["Cuir souple", "Couture main", "Semelle flexible"],
    },
    # === ENFANT ===
    ("enfant", "filles", "robes-jupes"): {
        "name": "Robe à Volants Enfant",
        "brand": "Style Jeunesse",
        "price": 34.99,
        "description": "Adorable robe à volants en coton doux. Imprimé liberty coloré.",
        "images": ["https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&q=80"],
        "colors": [{"name": "Floral", "hex": "#FFB6C1", "available": True, "images": ["https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=800&q=80"]}],
        "sizes": [{"size": "4A", "stock": 8}, {"size": "6A", "stock": 12}, {"size": "8A", "stock": 10}, {"size": "10A", "stock": 7}],
        "details": ["100% Coton", "Lavable en machine", "Volants superposés"],
    },
    ("enfant", "filles", "tops-tshirts-filles"): {
        "name": "T-shirt Licorne Pailleté",
        "brand": "Style Jeunesse",
        "price": 19.99,
        "description": "T-shirt en coton bio avec motif licorne pailleté réversible.",
        "images": ["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80"],
        "colors": [{"name": "Blanc", "hex": "#FFFFFF", "available": True, "images": ["https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80"]}],
        "sizes": [{"size": "4A", "stock": 15}, {"size": "6A", "stock": 18}, {"size": "8A", "stock": 14}, {"size": "10A", "stock": 10}],
        "details": ["Coton bio", "Paillettes réversibles", "Col rond"],
    },
    ("enfant", "filles", "pantalons-filles"): {
        "name": "Legging Imprimé Étoiles",
        "brand": "Kids Comfort",
        "price": 14.99,
        "description": "Legging stretch imprimé étoiles. Ceinture élastique confortable.",
        "images": ["https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=800&q=80"],
        "colors": [{"name": "Marine étoilé", "hex": "#001f3f", "available": True, "images": ["https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?w=800&q=80"]}],
        "sizes": [{"size": "4A", "stock": 12}, {"size": "6A", "stock": 15}, {"size": "8A", "stock": 13}, {"size": "10A", "stock": 8}],
        "details": ["Coton/Élasthanne", "Ceinture élastique", "Imprimé étoiles"],
    },
    ("enfant", "garcons", "tshirts-polos-garcons"): {
        "name": "T-shirt Dinosaure 3D",
        "brand": "Kids Comfort",
        "price": 17.99,
        "description": "T-shirt fun avec impression 3D de dinosaure. Coton doux et résistant.",
        "images": ["https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80"],
        "colors": [{"name": "Vert", "hex": "#228B22", "available": True, "images": ["https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80"]}],
        "sizes": [{"size": "4A", "stock": 14}, {"size": "6A", "stock": 16}, {"size": "8A", "stock": 12}, {"size": "10A", "stock": 9}],
        "details": ["100% Coton", "Impression 3D", "Lavable en machine"],
    },
    ("enfant", "garcons", "pantalons-jeans-garcons"): {
        "name": "Jean Slim Enfant",
        "brand": "Denim Co Junior",
        "price": 29.99,
        "description": "Jean slim en denim souple avec taille ajustable par élastique intérieur.",
        "images": ["https://images.unsplash.com/photo-1560506840-ec148e82a604?w=800&q=80"],
        "colors": [{"name": "Bleu délavé", "hex": "#6495ED", "available": True, "images": ["https://images.unsplash.com/photo-1560506840-ec148e82a604?w=800&q=80"]}],
        "sizes": [{"size": "4A", "stock": 10}, {"size": "6A", "stock": 14}, {"size": "8A", "stock": 12}, {"size": "10A", "stock": 8}, {"size": "12A", "stock": 5}],
        "details": ["Denim souple", "Taille ajustable", "5 poches"],
    },
    ("enfant", "garcons", "vestes-garcons"): {
        "name": "Veste Bomber Enfant",
        "brand": "Style Jeunesse",
        "price": 44.99,
        "description": "Veste bomber matelassée légère. Fermeture éclair et poches latérales.",
        "images": ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80"],
        "colors": [{"name": "Bleu Marine", "hex": "#001f3f", "available": True, "images": ["https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80"]}],
        "sizes": [{"size": "4A", "stock": 7}, {"size": "6A", "stock": 10}, {"size": "8A", "stock": 9}, {"size": "10A", "stock": 6}],
        "details": ["Polyester matelassé", "Doublure polaire", "Fermeture éclair"],
    },
    ("enfant", "bebe", "bodies-grenouilleres"): {
        "name": "Body Coton Bio Étoiles",
        "brand": "Bébé Doux",
        "price": 12.99,
        "description": "Body à manches longues en coton bio certifié GOTS. Boutons-pression entrejambe.",
        "images": ["https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&q=80"],
        "colors": [{"name": "Écru", "hex": "#FAF0E6", "available": True, "images": ["https://images.unsplash.com/photo-1522771930-78848d9293e8?w=800&q=80"]}],
        "sizes": [{"size": "3M", "stock": 15}, {"size": "6M", "stock": 18}, {"size": "12M", "stock": 14}, {"size": "18M", "stock": 10}],
        "details": ["Coton bio GOTS", "Boutons-pression", "Manches longues"],
    },
    ("enfant", "bebe", "pyjamas-bebe"): {
        "name": "Pyjama Velours Ourson",
        "brand": "Bébé Doux",
        "price": 19.99,
        "description": "Pyjama grenouillère en velours doux avec motif ourson. Pieds intégrés.",
        "images": ["https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80"],
        "colors": [{"name": "Beige", "hex": "#F5F5DC", "available": True, "images": ["https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80"]}],
        "sizes": [{"size": "3M", "stock": 10}, {"size": "6M", "stock": 14}, {"size": "12M", "stock": 12}, {"size": "18M", "stock": 8}],
        "details": ["Velours doux", "Pieds intégrés", "Zip avant"],
    },
    ("enfant", "bebe", "ensembles-bebe"): {
        "name": "Ensemble 3 Pièces Bébé",
        "brand": "Bébé Doux",
        "price": 29.99,
        "description": "Ensemble body + pantalon + bonnet assorti en coton bio. Cadeau idéal.",
        "images": ["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80"],
        "colors": [{"name": "Blanc/Gris", "hex": "#D3D3D3", "available": True, "images": ["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80"]}],
        "sizes": [{"size": "3M", "stock": 12}, {"size": "6M", "stock": 15}, {"size": "12M", "stock": 10}],
        "details": ["Coton bio", "3 pièces", "Coffret cadeau inclus"],
    },
    ("enfant", "chaussures-enfant", "baskets-enfant"): {
        "name": "Baskets Lumineuses Enfant",
        "brand": "Kids Comfort",
        "price": 39.99,
        "description": "Baskets avec semelle LED lumineuse. Scratch facile pour l'autonomie.",
        "images": ["https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80"],
        "colors": [{"name": "Bleu/Vert", "hex": "#00CED1", "available": True, "images": ["https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?w=800&q=80"]}],
        "sizes": [{"size": "24", "stock": 8}, {"size": "26", "stock": 12}, {"size": "28", "stock": 14}, {"size": "30", "stock": 10}, {"size": "32", "stock": 7}],
        "details": ["Semelle LED", "Fermeture scratch", "Rechargeable USB"],
    },
    ("enfant", "chaussures-enfant", "sandales-enfant"): {
        "name": "Sandales Sport Enfant",
        "brand": "Kids Comfort",
        "price": 29.99,
        "description": "Sandales sport avec bout fermé protecteur. Parfaites pour les aventures.",
        "images": ["https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80"],
        "colors": [{"name": "Rouge/Noir", "hex": "#8B0000", "available": True, "images": ["https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&q=80"]}],
        "sizes": [{"size": "24", "stock": 7}, {"size": "26", "stock": 10}, {"size": "28", "stock": 12}, {"size": "30", "stock": 9}],
        "details": ["Bout fermé", "Semelle antidérapante", "Scratch ajustable"],
    },
    # === ACCESSOIRES ===
    ("accessoires", "bijoux", "colliers"): {
        "name": "Collier Pendentif Or",
        "brand": "Bijoux Précieux",
        "price": 79.99,
        "description": "Collier chaîne fine avec pendentif géométrique en plaqué or 18k.",
        "images": ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"],
        "colors": [{"name": "Or", "hex": "#FFD700", "available": True, "images": ["https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 25}],
        "details": ["Plaqué or 18k", "Chaîne 45cm", "Anti-allergique"],
    },
    ("accessoires", "bijoux", "bracelets"): {
        "name": "Bracelet Jonc Argent",
        "brand": "Bijoux Précieux",
        "price": 49.99,
        "description": "Bracelet jonc fin en argent sterling 925. Design épuré et moderne.",
        "images": ["https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80"],
        "colors": [{"name": "Argent", "hex": "#C0C0C0", "available": True, "images": ["https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 30}],
        "details": ["Argent Sterling 925", "Diamètre 6cm", "Poinçon certifié"],
    },
    ("accessoires", "bijoux", "boucles-oreilles"): {
        "name": "Boucles Créoles Or Rose",
        "brand": "Bijoux Précieux",
        "price": 39.99,
        "description": "Créoles classiques en plaqué or rose. Fermoir à charnière sécurisé.",
        "images": ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80"],
        "colors": [{"name": "Or rose", "hex": "#B76E79", "available": True, "images": ["https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 20}],
        "details": ["Plaqué or rose", "Diamètre 3cm", "Fermoir à charnière"],
    },
    ("accessoires", "bijoux", "bagues"): {
        "name": "Bague Solitaire Zircon",
        "brand": "Bijoux Précieux",
        "price": 59.99,
        "description": "Bague solitaire avec zircon cubique taillé brillant. Argent 925 rhodié.",
        "images": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80"],
        "colors": [{"name": "Argent cristal", "hex": "#E8E8E8", "available": True, "images": ["https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80"]}],
        "sizes": [{"size": "50", "stock": 8}, {"size": "52", "stock": 10}, {"size": "54", "stock": 12}, {"size": "56", "stock": 8}],
        "details": ["Argent 925 rhodié", "Zircon cubique", "Écrin inclus"],
    },
    ("accessoires", "montres", "montres-classiques"): {
        "name": "Montre Automatique Classique",
        "brand": "Temps Élégant",
        "price": 299.99,
        "description": "Montre automatique avec cadran blanc et bracelet cuir. Mouvement japonais.",
        "images": ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80"],
        "colors": [{"name": "Cuir marron", "hex": "#8B4513", "available": True, "images": ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 10}],
        "details": ["Mouvement automatique", "Verre saphir", "Étanche 50m"],
    },
    ("accessoires", "montres", "montres-sport"): {
        "name": "Montre Sport Chronographe",
        "brand": "Temps Élégant",
        "price": 199.99,
        "description": "Chronographe sportif avec bracelet silicone. Étanche 100m.",
        "images": ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80"],
        "colors": [{"name": "Noir", "hex": "#000000", "available": True, "images": ["https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 15}],
        "details": ["Chronographe", "Bracelet silicone", "Étanche 100m"],
    },
    ("accessoires", "lunettes", "lunettes-soleil"): {
        "name": "Lunettes de Soleil Aviateur",
        "brand": "Vision Luxe",
        "price": 129.99,
        "description": "Lunettes aviateur avec verres polarisés UV400. Monture métal doré.",
        "images": ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80"],
        "colors": [{"name": "Or/Vert", "hex": "#FFD700", "available": True, "images": ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 18}],
        "details": ["Verres polarisés UV400", "Monture métal", "Étui rigide inclus"],
    },
    ("accessoires", "lunettes", "lunettes-optiques"): {
        "name": "Lunettes Optiques Rondes",
        "brand": "Vision Luxe",
        "price": 89.99,
        "description": "Monture ronde vintage en acétate. Légère et confortable pour un usage quotidien.",
        "images": ["https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&q=80"],
        "colors": [{"name": "Écaille", "hex": "#8B4513", "available": True, "images": ["https://images.unsplash.com/photo-1574258495973-f010dfbb5371?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 14}],
        "details": ["Acétate premium", "Charnières flex", "Verres démo inclus"],
    },
    ("accessoires", "echarpes-foulards", "echarpes"): {
        "name": "Écharpe Cachemire XXL",
        "brand": "Luxe Doux",
        "price": 119.99,
        "description": "Grande écharpe en pur cachemire. Ultra douce et chaude pour l'hiver.",
        "images": ["https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80"],
        "colors": [{"name": "Gris perle", "hex": "#C0C0C0", "available": True, "images": ["https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 12}],
        "details": ["100% Cachemire", "200cm x 70cm", "Lavage à la main"],
    },
    ("accessoires", "echarpes-foulards", "foulards"): {
        "name": "Foulard Soie Imprimé",
        "brand": "Élégance Paris",
        "price": 69.99,
        "description": "Foulard carré en soie avec imprimé floral exclusif. Fabriqué en France.",
        "images": ["https://images.unsplash.com/photo-1601924921557-45e8e0e8af84?w=800&q=80"],
        "colors": [{"name": "Multicolore", "hex": "#FF6347", "available": True, "images": ["https://images.unsplash.com/photo-1601924921557-45e8e0e8af84?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 16}],
        "details": ["100% Soie", "90cm x 90cm", "Ourlet roulotté main"],
    },
    ("accessoires", "ceintures", "ceintures-cuir"): {
        "name": "Ceinture Cuir Pleine Fleur",
        "brand": "Cuir Premium",
        "price": 79.99,
        "description": "Ceinture en cuir pleine fleur avec boucle en laiton brossé. Fabriquée en Italie.",
        "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"],
        "colors": [{"name": "Marron", "hex": "#8B4513", "available": True, "images": ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80"]}],
        "sizes": [{"size": "85", "stock": 6}, {"size": "90", "stock": 10}, {"size": "95", "stock": 12}, {"size": "100", "stock": 8}, {"size": "105", "stock": 5}],
        "details": ["Cuir pleine fleur", "Boucle laiton", "Fabriqué en Italie"],
    },
    ("accessoires", "ceintures", "ceintures-tissu"): {
        "name": "Ceinture Tressée Élastique",
        "brand": "Urban Chic",
        "price": 29.99,
        "description": "Ceinture tressée élastique multi-tailles. Confortable et polyvalente.",
        "images": ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80"],
        "colors": [{"name": "Marine", "hex": "#001f3f", "available": True, "images": ["https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80"]}],
        "sizes": [{"size": "Taille Unique", "stock": 20}],
        "details": ["Tissu tressé élastique", "S'adapte à toutes les tailles", "Boucle métal"],
    },
}


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=== Mise à jour des catégories ===")
    for slug, cat_data in CATEGORIES.items():
        subcats = []
        for i, sub in enumerate(cat_data["subcategories"], 1):
            children = []
            for j, child in enumerate(sub.get("children", []), 1):
                children.append({"id": j, "name": child["name"], "slug": child["slug"]})
            subcats.append({
                "id": i,
                "name": sub["name"],
                "slug": sub["slug"],
                "isPromotion": sub.get("isPromotion", False),
                "children": children
            })
        
        await db.categories.update_one(
            {"slug": slug},
            {"$set": {
                "name": cat_data["name"],
                "image": cat_data["image"],
                "subcategories": subcats
            }}
        )
        total_children = sum(len(s["children"]) for s in subcats)
        print(f"  {cat_data['name']}: {len(subcats)} sous-catégories, {total_children} sous-sous-catégories")
    
    print(f"\n=== Création des produits ({len(PRODUCTS)} produits) ===")
    created = 0
    for (cat_slug, sub_slug, subsub_slug), product_data in PRODUCTS.items():
        product = {
            "id": str(uuid.uuid4()),
            "name": product_data["name"],
            "brand": product_data["brand"],
            "price": product_data["price"],
            "category": cat_slug,
            "subcategory": sub_slug,
            "subSubcategory": subsub_slug,
            "images": product_data["images"],
            "colors": product_data["colors"],
            "sizes": product_data["sizes"],
            "variants": [],
            "description": product_data["description"],
            "details": product_data["details"],
            "newArrival": True,
            "featured": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Generate variants from colors x sizes
        for color in product_data["colors"]:
            for size in product_data["sizes"]:
                product["variants"].append({
                    "color": color["name"],
                    "size": size["size"],
                    "stock": size["stock"],
                    "sku": f"{product['id'][:8]}-{color['name'][:3].upper()}-{size['size']}"
                })
        
        await db.products.insert_one(product)
        created += 1
        print(f"  [{cat_slug}/{sub_slug}/{subsub_slug}] {product_data['name']} - {product_data['price']}€")
    
    print(f"\n=== Terminé: {created} produits créés ===")
    client.close()

asyncio.run(main())
