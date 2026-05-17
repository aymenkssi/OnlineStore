// Mock data for Best Shop e-commerce

export const categories = [
  {
    id: 1,
    name: 'Femme',
    slug: 'femme',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    subcategories: [
      { id: 11, name: 'Nouveautés', slug: 'nouveautes' },
      { id: 12, name: 'Vêtements', slug: 'vetements' },
      { id: 13, name: 'Robes', slug: 'robes' },
      { id: 14, name: 'Hauts', slug: 'hauts' },
      { id: 15, name: 'Sacs', slug: 'sacs' },
      { id: 16, name: 'Chaussures', slug: 'chaussures' },
      { id: 17, name: 'Accessoires', slug: 'accessoires' },
      { id: 18, name: 'Promotions', slug: 'promotions', isPromotion: true }
    ]
  },
  {
    id: 2,
    name: 'Homme',
    slug: 'homme',
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=800&q=80',
    subcategories: [
      { id: 21, name: 'Nouveautés', slug: 'nouveautes' },
      { id: 22, name: 'Vêtements', slug: 'vetements' },
      { id: 23, name: 'Chemises', slug: 'chemises' },
      { id: 24, name: 'Chaussures', slug: 'chaussures' },
      { id: 25, name: 'Accessoires', slug: 'accessoires' },
      { id: 26, name: 'Promotions', slug: 'promotions', isPromotion: true }
    ]
  },
  {
    id: 3,
    name: 'Enfant',
    slug: 'enfant',
    image: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80',
    subcategories: [
      { id: 31, name: 'Garçons', slug: 'garcons' },
      { id: 32, name: 'Filles', slug: 'filles' },
      { id: 33, name: 'Bébé Garçons', slug: 'bebe-garcons' },
      { id: 34, name: 'Bébé Filles', slug: 'bebe-filles' },
      { id: 35, name: 'Promotions', slug: 'promotions', isPromotion: true }
    ]
  }
];

// Fonction pour obtenir toutes les sous-catégories uniques pour le menu principal
export const getMainMenuItems = () => {
  const allSubcategories = new Map();
  
  categories.forEach(category => {
    category.subcategories.forEach(sub => {
      // Utiliser le slug comme clé pour éviter les doublons
      if (!allSubcategories.has(sub.slug)) {
        allSubcategories.set(sub.slug, {
          name: sub.name,
          slug: sub.slug,
          isPromotion: sub.isPromotion || false
        });
      }
    });
  });
  
  // Convertir Map en array et trier (Promotions en dernier)
  const items = Array.from(allSubcategories.values());
  const promotions = items.filter(item => item.isPromotion);
  const regular = items.filter(item => !item.isPromotion);
  
  return [...regular, ...promotions];
};

// Fonctions utilitaires pour les produits

// Calculer automatiquement si un produit est en promotion
export const isProductOnPromotion = (product) => {
  if (!product.originalPrice || product.originalPrice <= product.price) {
    return false;
  }
  
  const now = new Date();
  
  // Vérifier date de début
  if (product.promotionStartDate) {
    const startDate = new Date(product.promotionStartDate);
    if (now < startDate) return false;
  }
  
  // Vérifier date de fin
  if (product.promotionEndDate) {
    const endDate = new Date(product.promotionEndDate);
    if (now > endDate) return false;
  }
  
  return true;
};

// Calculer le pourcentage de réduction
export const calculateDiscount = (originalPrice, price) => {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

// Obtenir le stock pour une combinaison d'attributs spécifique
export const getVariantStock = (product, selectedColor, selectedSize) => {
  if (!product.variants || product.variants.length === 0) {
    // Fallback sur l'ancienne structure
    const sizeStock = product.sizes?.find(s => s.size === selectedSize)?.stock || 0;
    return sizeStock;
  }
  
  const variant = product.variants.find(
    v => v.color === selectedColor && v.size === selectedSize
  );
  
  return variant?.stock || 0;
};

// Obtenir toutes les couleurs disponibles (avec stock > 0)
export const getAvailableColors = (product) => {
  if (!product.variants || product.variants.length === 0) {
    return product.colors?.filter(c => c.available) || [];
  }
  
  const colorsWithStock = new Set();
  product.variants.forEach(v => {
    if (v.stock > 0) {
      colorsWithStock.add(v.color);
    }
  });
  
  return product.colors?.filter(c => colorsWithStock.has(c.name)) || [];
};

// Obtenir toutes les tailles disponibles pour une couleur (avec stock > 0)
export const getAvailableSizes = (product, selectedColor) => {
  if (!product.variants || product.variants.length === 0) {
    return product.sizes?.filter(s => s.stock > 0) || [];
  }
  
  return product.variants
    .filter(v => v.color === selectedColor && v.stock > 0)
    .map(v => ({ size: v.size, stock: v.stock }));
};

// Enrichir un produit avec les données calculées
export const enrichProduct = (product) => {
  return {
    ...product,
    onPromotion: isProductOnPromotion(product),
    discount: calculateDiscount(product.originalPrice, product.price)
  };
};

// Enrichir tous les produits
export const getEnrichedProducts = () => {
  return products.map(enrichProduct);
};


export const products = [
  {
    id: 1,
    name: 'Robe en Soie Élégante',
    brand: 'Marque de Luxe',
    price: 450,
    originalPrice: 600,
    promotionStartDate: '2026-01-01',
    promotionEndDate: '2026-12-31',
    category: 'femme',
    subcategory: 'robes',
    images: [
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80'
    ],
    // Variants avec stock par combinaison d'attributs
    variants: [
      { color: 'Noir', size: 'XS', stock: 5, sku: 'ROBE-001-BLK-XS' },
      { color: 'Noir', size: 'S', stock: 10, sku: 'ROBE-001-BLK-S' },
      { color: 'Noir', size: 'M', stock: 8, sku: 'ROBE-001-BLK-M' },
      { color: 'Noir', size: 'L', stock: 3, sku: 'ROBE-001-BLK-L' },
      { color: 'Noir', size: 'XL', stock: 0, sku: 'ROBE-001-BLK-XL' },
      { color: 'Marine', size: 'S', stock: 7, sku: 'ROBE-001-NAV-S' },
      { color: 'Marine', size: 'M', stock: 5, sku: 'ROBE-001-NAV-M' },
      { color: 'Marine', size: 'L', stock: 2, sku: 'ROBE-001-NAV-L' },
    ],
    // Ancienne structure pour compatibilité
    colors: [
      { name: 'Noir', hex: '#000000', available: true, images: [
        'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80',
        'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80'
      ]},
      { name: 'Marine', hex: '#001f3f', available: true, images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&q=80'
      ]},
      { name: 'Bordeaux', hex: '#800020', available: false, images: [] }
    ],
    sizes: [
      { size: 'XS', stock: 5 },
      { size: 'S', stock: 17 },
      { size: 'M', stock: 13 },
      { size: 'L', stock: 5 },
      { size: 'XL', stock: 0 }
    ],
    description: 'Robe luxueuse en soie avec un drapé élégant. Parfaite pour les occasions spéciales.',
    details: ['100% Soie', 'Nettoyage à sec uniquement', 'Fabriqué en Italie', 'Coupe designer'],
    newArrival: true,
    featured: true
  },
  {
    id: 2,
    name: 'Sac à Main en Cuir',
    brand: 'Cuir Premium',
    price: 890,
    onPromotion: false,
    category: 'femme',
    subcategory: 'sacs',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
    ],
    colors: [
      { name: 'Noir', hex: '#000000', available: true, images: [
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=80',
        'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80'
      ]},
      { name: 'Tan', hex: '#D2B48C', available: true, images: [
        'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&q=80'
      ]},
      { name: 'Marron', hex: '#8B4513', available: true, images: [
        'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=800&q=80'
      ]}
    ],
    sizes: [{ size: 'Taille Unique', stock: 15 }],
    description: 'Sac à main en cuir fait main avec quincaillerie dorée.',
    details: ['Cuir véritable', 'Poches intérieures', 'Bandoulière amovible', 'Housse de protection incluse'],
    newArrival: true,
    featured: true
  },
  {
    id: 3,
    name: 'Baskets Designer',
    brand: 'Sport Luxe',
    price: 650,
    originalPrice: 750,
    discount: 13,
    onPromotion: true,
    promotionStartDate: '2026-01-01',
    promotionEndDate: '2026-06-30',
    category: 'femme',
    subcategory: 'chaussures',
    images: [
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80'
    ],
    colors: [
      { name: 'Blanc', hex: '#FFFFFF', available: true, images: [
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80',
        'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80'
      ]},
      { name: 'Noir', hex: '#000000', available: true, images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
      ]},
      { name: 'Rose', hex: '#FFC0CB', available: true, images: [
        'https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=800&q=80'
      ]}
    ],
    sizes: [
      { size: '36', stock: 2 },
      { size: '37', stock: 5 },
      { size: '38', stock: 8 },
      { size: '39', stock: 6 },
      { size: '40', stock: 4 },
      { size: '41', stock: 2 }
    ],
    description: 'Baskets de designer haut de gamme avec confort supérieur.',
    details: ['Dessus en cuir', 'Semelle en caoutchouc', 'Semelle intérieure rembourrée', 'Fabriqué au Portugal'],
    newArrival: false,
    featured: true
  },
  {
    id: 4,
    name: 'Blazer en Laine',
    brand: 'Excellence Sur Mesure',
    price: 780,
    category: 'homme',
    subcategory: 'vetements',
    images: [
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
      'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800&q=80'
    ],
    colors: [
      { name: 'Marine', hex: '#001f3f', available: true, images: [
        'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80',
        'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=800&q=80'
      ]},
      { name: 'Anthracite', hex: '#36454F', available: true, images: [
        'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'
      ]},
      { name: 'Noir', hex: '#000000', available: false, images: [] }
    ],
    sizes: [
      { size: 'S', stock: 4 },
      { size: 'M', stock: 7 },
      { size: 'L', stock: 5 },
      { size: 'XL', stock: 3 },
      { size: 'XXL', stock: 2 }
    ],
    description: 'Blazer classique en laine avec coupe moderne.',
    details: ['100% Laine', 'Doublure complète', 'Fermeture deux boutons', 'Fabriqué au Royaume-Uni'],
    newArrival: true,
    featured: false
  },
  {
    id: 5,
    name: 'Chaussures Oxford en Cuir',
    brand: 'Chaussures Classiques',
    price: 420,
    category: 'homme',
    subcategory: 'chaussures',
    images: [
      'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80',
      'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80'
    ],
    colors: [
      { name: 'Noir', hex: '#000000', available: true, images: [
        'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80',
        'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80'
      ]},
      { name: 'Marron', hex: '#8B4513', available: true, images: [
        'https://images.unsplash.com/photo-1582897085656-c52139049cbf?w=800&q=80'
      ]}
    ],
    sizes: [
      { size: '40', stock: 3 },
      { size: '41', stock: 6 },
      { size: '42', stock: 8 },
      { size: '43', stock: 5 },
      { size: '44', stock: 4 },
      { size: '45', stock: 2 }
    ],
    description: 'Chaussures Oxford en cuir faites à la main pour le gentleman moderne.',
    details: ['Cuir pleine fleur', 'Semelle en cuir', 'Cousu Goodyear', 'Fabriqué en Italie'],
    newArrival: false,
    featured: true
  },
  {
    id: 6,
    name: 'Pull en Cachemire',
    brand: 'Luxe Doux',
    price: 340,
    category: 'homme',
    subcategory: 'vetements',
    images: [
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80'
    ],
    colors: [
      { name: 'Beige', hex: '#F5F5DC', available: true, images: [
        'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80',
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80'
      ]},
      { name: 'Marine', hex: '#001f3f', available: true, images: [
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80'
      ]},
      { name: 'Gris', hex: '#808080', available: true, images: [
        'https://images.unsplash.com/photo-1620799139834-6b8f844fbe61?w=800&q=80'
      ]}
    ],
    sizes: [
      { size: 'S', stock: 8 },
      { size: 'M', stock: 12 },
      { size: 'L', stock: 10 },
      { size: 'XL', stock: 6 }
    ],
    description: 'Pull ultra-doux en cachemire pour un confort ultime.',
    details: ['100% Cachemire', 'Lavage à la main', 'Poignets côtelés', 'Fabriqué en Écosse'],
    newArrival: true,
    featured: true
  },
  {
    id: 7,
    name: 'Veste en Jean Enfant',
    brand: 'Style Jeunesse',
    price: 85,
    category: 'enfant',
    subcategory: 'garcons',
    images: [
      'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80',
      'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80'
    ],
    colors: [
      { name: 'Jean Bleu', hex: '#1560BD', available: true, images: [
        'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80',
        'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=800&q=80'
      ]},
      { name: 'Jean Noir', hex: '#2C2C2C', available: true, images: [
        'https://images.unsplash.com/photo-1516826957135-700dedea698c?w=800&q=80'
      ]}
    ],
    sizes: [
      { size: '4A', stock: 10 },
      { size: '6A', stock: 12 },
      { size: '8A', stock: 15 },
      { size: '10A', stock: 8 },
      { size: '12A', stock: 5 }
    ],
    description: 'Veste en jean classique pour enfants avec coupe confortable.',
    details: ['100% Coton', 'Lavable en machine', 'Fermeture à boutons', 'Deux poches'],
    newArrival: false,
    featured: false
  }
];

// Coupons de réduction
export const coupons = [
  {
    id: 1,
    code: 'BIENVENUE10',
    description: '10% de réduction pour les nouveaux clients',
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountValue: 10,
    minPurchase: 0,
    maxDiscount: 100,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: 1000,
    usageCount: 45,
    active: true
  },
  {
    id: 2,
    code: 'SOLDES30',
    description: '30€ de réduction sur les commandes de plus de 200€',
    discountType: 'fixed',
    discountValue: 30,
    minPurchase: 200,
    maxDiscount: 30,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: 500,
    usageCount: 123,
    active: true
  },
  {
    id: 3,
    code: 'FIDELITE15',
    description: '15% de réduction pour les clients fidèles',
    discountType: 'percentage',
    discountValue: 15,
    minPurchase: 100,
    maxDiscount: 150,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
    usageLimit: null, // Illimité
    usageCount: 234,
    active: true
  },
  {
    id: 4,
    code: 'EXPIRED50',
    description: '50€ de réduction (Expiré)',
    discountType: 'fixed',
    discountValue: 50,
    minPurchase: 300,
    maxDiscount: 50,
    validFrom: '2024-01-01',
    validUntil: '2024-06-30',
    usageLimit: 100,
    usageCount: 98,
    active: false
  }
];

// Get coupons
export const getCoupons = () => {
  return coupons;
};

// Validate coupon
export const validateCoupon = (code, cartTotal) => {
  const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
  
  if (!coupon) {
    return { valid: false, message: 'Code promo invalide' };
  }
  
  if (!coupon.active) {
    return { valid: false, message: 'Ce code promo est expiré' };
  }
  
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);
  
  if (now < validFrom || now > validUntil) {
    return { valid: false, message: 'Ce code promo n\'est pas valide actuellement' };
  }
  
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: 'Ce code promo a atteint sa limite d\'utilisation' };
  }
  
  if (cartTotal < coupon.minPurchase) {
    return { 
      valid: false, 
      message: `Commande minimum de ${coupon.minPurchase}€ requise` 
    };
  }
  
  let discountAmount = 0;
  if (coupon.discountType === 'percentage') {
    discountAmount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, coupon.maxDiscount);
    }
  } else {
    discountAmount = coupon.discountValue;
  }
  
  return {
    valid: true,
    coupon: coupon,
    discountAmount: discountAmount,
    message: `Code promo appliqué: -${discountAmount.toFixed(2)}€`
  };
};

// Save coupon
export const saveCoupon = (coupon) => {
  const index = coupons.findIndex(c => c.id === coupon.id);
  if (index >= 0) {
    coupons[index] = coupon;
  } else {
    coupon.id = coupons.length + 1;
    coupons.push(coupon);
  }
};

// Attributs personnalisés (au-delà de couleur et taille)
export const customAttributes = [
  {
    id: 1,
    name: 'Matière',
    type: 'select', // select, multiselect, text
    values: ['Coton', 'Soie', 'Laine', 'Polyester', 'Lin', 'Cuir', 'Cachemire', 'Viscose'],
    required: false,
    displayInFilters: true
  },
  {
    id: 2,
    name: 'Style',
    type: 'select',
    values: ['Casual', 'Formel', 'Sport', 'Élégant', 'Décontracté', 'Vintage', 'Moderne'],
    required: false,
    displayInFilters: true
  },
  {
    id: 3,
    name: 'Occasion',
    type: 'multiselect',
    values: ['Quotidien', 'Bureau', 'Soirée', 'Sport', 'Vacances', 'Cérémonie', 'Casual'],
    required: false,
    displayInFilters: true
  },
  {
    id: 4,
    name: 'Saison',
    type: 'select',
    values: ['Printemps', 'Été', 'Automne', 'Hiver', 'Toutes saisons'],
    required: false,
    displayInFilters: true
  },
  {
    id: 5,
    name: 'Entretien',
    type: 'text',
    values: [],
    required: false,
    displayInFilters: false
  }
];

// Get custom attributes
export const getCustomAttributes = () => {
  return customAttributes;
};

// Save custom attribute
export const saveCustomAttribute = (attribute) => {
  const index = customAttributes.findIndex(a => a.id === attribute.id);
  if (index >= 0) {
    customAttributes[index] = attribute;
  } else {
    attribute.id = customAttributes.length + 1;
    customAttributes.push(attribute);
  }
};

export const users = [
  {
    id: 1,
    email: 'admin@bestshop.com',
    password: 'admin123',
    name: 'Administrateur',
    role: 'admin'
  },
  {
    id: 2,
    email: 'user@example.com',
    password: 'user123',
    name: 'Jean Dupont',
    role: 'customer'
  }
];

// Textes configurables du site
export const siteTexts = {
  // Site Identity
  siteName: 'BEST SHOP',
  siteLogo: '', // URL du logo (vide = pas de logo)
  
  // Company Contact Info (used in invoices)
  companyLegalName: 'BEST SHOP SAS',
  companyAddress: '123 Avenue de la Mode',
  companyPostalCode: '75008',
  companyCity: 'Paris',
  companyCountry: 'France',
  companyEmail: 'contact@bestshop.com',
  companyPhone: '+33 1 23 45 67 89',
  companySiret: '123 456 789 00012',
  companyTva: 'FR12345678901',
  companyDescription: 'Mode & Accessoires de Luxe',
  
  // Theme & Styling
  primaryColor: '#000000',
  secondaryColor: '#DC2626', // red-600 for promotions
  backgroundColor: '#FFFFFF',
  textColor: '#000000',
  textSecondaryColor: '#6B7280', // gray-500
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontSize: '16px',
  headingFontSize: '24px',
  buttonRadius: '0px', // 0 = carré, 4px = légèrement arrondi, 9999px = rond
  
  // Header
  topBanner: 'Livraison gratuite pour les commandes de plus de 400€ | Plus de retours gratuits pendant 30 jours',
  searchPlaceholder: 'Que recherchez-vous?',
  
  // Navigation
  signIn: 'Se connecter',
  register: 'S\'inscrire',
  myOrders: 'Mes commandes',
  logout: 'Déconnexion',
  adminDashboard: 'Tableau de bord Admin',
  
  // Home Page
  chooseDepartment: 'Choisissez un rayon',
  newArrivals: 'Nouveautés',
  viewAll: 'Voir tout',
  featuredSelection: 'Sélection en vedette',
  shopNow: 'Acheter maintenant',
  heroTitle: 'La Destination Mondiale du Luxe Moderne',
  heroSubtitle: 'Des meilleures marques de mode de créateurs aux marques émergentes',
  exploreNow: 'Découvrir maintenant',
  
  // Category Page
  home: 'Accueil',
  items: 'articles',
  filters: 'Filtres',
  sortBy: 'Trier par',
  featured: 'En vedette',
  newest: 'Nouveautés',
  priceLowToHigh: 'Prix: Croissant',
  priceHighToLow: 'Prix: Décroissant',
  color: 'Couleur',
  size: 'Taille',
  clearAllFilters: 'Effacer tous les filtres',
  noProductsFound: 'Aucun produit trouvé correspondant à vos critères.',
  
  // Product Detail
  addToCart: 'Ajouter au panier',
  addToWishlist: 'Ajouter à la liste de souhaits',
  productDetails: 'Détails du produit',
  quantity: 'Quantité',
  onlyLeftInStock: 'Il ne reste que {stock} en stock',
  outOfStock: 'Rupture de stock',
  thisSize: 'Cette taille est actuellement en rupture de stock.',
  addedToCart: 'Ajouté au panier',
  productAddedToCart: '{product} a été ajouté à votre panier.',
  
  // Cart
  shoppingCart: 'Panier',
  cartEmpty: 'Votre panier est vide',
  startShopping: 'Commencez vos achats pour ajouter des articles à votre panier',
  continueShopping: 'Continuer vos achats',
  orderSummary: 'Résumé de la commande',
  subtotal: 'Sous-total',
  shipping: 'Livraison',
  free: 'Gratuit',
  spendMoreForFreeShipping: 'Dépensez {amount}€ de plus pour la livraison gratuite',
  total: 'Total',
  proceedToCheckout: 'Passer à la caisse',
  
  // Auth
  welcomeBack: 'Bon retour',
  signInToAccount: 'Connectez-vous à votre compte',
  email: 'Email',
  password: 'Mot de passe',
  dontHaveAccount: 'Vous n\'avez pas de compte?',
  alreadyHaveAccount: 'Vous avez déjà un compte?',
  createAccount: 'Créer un compte',
  joinBestShop: 'Rejoignez Best Shop aujourd\'hui',
  fullName: 'Nom complet',
  confirmPassword: 'Confirmer le mot de passe',
  demoCredentials: 'Identifiants de démonstration:',
  admin: 'Admin',
  user: 'Utilisateur',
  loginSuccessful: 'Connexion réussie',
  welcomeMessage: 'Bienvenue, {name}!',
  loginFailed: 'Échec de la connexion',
  invalidCredentials: 'Email ou mot de passe invalide',
  registrationSuccessful: 'Inscription réussie',
  passwordsDontMatch: 'Les mots de passe ne correspondent pas',
  emailAlreadyExists: 'Cet email existe déjà',
  
  // Footer
  customerService: 'Service Client',
  contactUs: 'Contactez-nous',
  faqs: 'FAQ',
  shippingDelivery: 'Livraison & Expédition',
  returns: 'Retours',
  aboutBestShop: 'À propos de Best Shop',
  aboutUs: 'À propos',
  careers: 'Carrières',
  sustainability: 'Durabilité',
  press: 'Presse',
  legal: 'Légal',
  termsConditions: 'Conditions Générales',
  privacyPolicy: 'Politique de Confidentialité',
  cookiePolicy: 'Politique des Cookies',
  newsletter: 'Newsletter',
  newsletterText: 'Inscrivez-vous pour recevoir des promotions, de nouveaux arrivages et plus encore',
  emailAddress: 'Adresse email',
  allRightsReserved: 'Tous droits réservés',
  
  // Social Media Links (configurable in Site Settings)
  socialFacebook: 'https://facebook.com/bestshop',
  socialInstagram: 'https://instagram.com/bestshop',
  socialTwitter: 'https://twitter.com/bestshop',
  socialLinkedin: '',
  socialYoutube: '',
  socialTiktok: '',
  socialPinterest: '',
  
  // Admin
  adminPanel: 'PANNEAU D\'ADMINISTRATION BEST SHOP',
  dashboard: 'Tableau de bord',
  products: 'Produits',
  categories: 'Catégories',
  attributes: 'Attributs',
  siteSettings: 'Paramètres du Site',
  totalProducts: 'Total Produits',
  totalStock: 'Stock Total',
  inventoryValue: 'Valeur de l\'Inventaire',
  lowStockAlert: 'Alerte Stock Faible',
  itemsLeft: 'articles restants',
  addProduct: 'Ajouter un produit',
  editProduct: 'Modifier le produit',
  addNewProduct: 'Ajouter un nouveau produit',
  searchProducts: 'Rechercher des produits...',
  image: 'Image',
  name: 'Nom',
  brand: 'Marque',
  category: 'Catégorie',
  price: 'Prix',
  stock: 'Stock',
  actions: 'Actions',
  addCategory: 'Ajouter une catégorie',
  editCategory: 'Modifier la catégorie',
  addNewCategory: 'Ajouter une nouvelle catégorie',
  categoriesSubcategories: 'Catégories & Sous-catégories',
  slug: 'Slug',
  subcategories: 'Sous-catégories',
  colors: 'Couleurs',
  sizes: 'Tailles',
  addColor: 'Ajouter une couleur',
  addSize: 'Ajouter une taille',
  aboutAttributes: 'À propos des Attributs',
  attributesDescription: 'Les attributs comme les couleurs et les tailles sont essentiels pour les variations de produits. Lorsque vous ajoutez un nouvel attribut ici, il sera disponible lors de la création ou de la modification de produits.',
  
  // Common
  save: 'Enregistrer',
  cancel: 'Annuler',
  delete: 'Supprimer',
  edit: 'Modifier',
  create: 'Créer',
  update: 'Mettre à jour',
  close: 'Fermer',
  yes: 'Oui',
  no: 'Non',
  loading: 'Chargement...',
  error: 'Erreur',
  success: 'Succès',
  comingSoon: 'Prochainement'
};

// Cart stored in localStorage
export const getCart = () => {
  const cart = localStorage.getItem('bestShopCart');
  return cart ? JSON.parse(cart) : [];
};

export const saveCart = (cartItems) => {
  localStorage.setItem('bestShopCart', JSON.stringify(cartItems));
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('bestShopUser');
  return user ? JSON.parse(user) : null;
};

export const saveCurrentUser = (user) => {
  localStorage.setItem('bestShopUser', JSON.stringify(user));
};

export const logout = () => {
  localStorage.removeItem('bestShopUser');
  localStorage.removeItem('access_token');
  // Legacy cleanup (deprecated keys)
  localStorage.removeItem('userEmail');
  localStorage.removeItem('currentUser');
  // Fire-and-forget backend logout to clear httpOnly cookies
  try {
    const API = process.env.REACT_APP_BACKEND_URL;
    if (API && typeof fetch === 'function') {
      fetch(`${API}/api/users/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    }
  } catch { /* ignore */ }
};

// Site texts management (source of truth = backend /api/settings/texts; localStorage is a fast-read cache)
export const getSiteTexts = () => {
  const customTexts = localStorage.getItem('bestShopTexts');
  return customTexts ? { ...siteTexts, ...JSON.parse(customTexts) } : siteTexts;
};

export const saveSiteTexts = async (texts) => {
  // Persist to backend
  try {
    const API = process.env.REACT_APP_BACKEND_URL;
    const token = localStorage.getItem('access_token');
    await fetch(`${API}/api/settings/texts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(texts)
    });
  } catch { /* non-blocking */ }
  // Update fast-read cache so useSiteTexts reflects changes immediately
  localStorage.setItem('bestShopTexts', JSON.stringify(texts));
  window.dispatchEvent(new Event('storage'));
};

// One-shot sync: fetch texts from backend and update local cache (call on app mount)
export const initSiteTexts = async () => {
  try {
    const API = process.env.REACT_APP_BACKEND_URL;
    const resp = await fetch(`${API}/api/settings/texts`);
    if (!resp.ok) return;
    const data = await resp.json();
    if (data && typeof data === 'object' && Object.keys(data).length > 0) {
      localStorage.setItem('bestShopTexts', JSON.stringify(data));
      window.dispatchEvent(new Event('storage'));
    }
  } catch { /* offline: keep cached */ }
};

// Wishlist/Favoris management
export const getWishlist = () => {
  const wishlist = localStorage.getItem('bestShopWishlist');
  return wishlist ? JSON.parse(wishlist) : [];
};

export const saveWishlist = (wishlist) => {
  localStorage.setItem('bestShopWishlist', JSON.stringify(wishlist));
};

export const addToWishlist = (productId) => {
  const wishlist = getWishlist();
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    saveWishlist(wishlist);
    return true;
  }
  return false;
};

export const removeFromWishlist = (productId) => {
  const wishlist = getWishlist();
  const newWishlist = wishlist.filter(id => id !== productId);
  saveWishlist(newWishlist);
};

export const isInWishlist = (productId) => {
  const wishlist = getWishlist();
  return wishlist.includes(productId);
};
