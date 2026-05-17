import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { enrichProduct } from '../mock/mockData';
import { productsApi, categoriesApi } from '../services/api';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import ProductCard from '../components/ProductCard';
import SortMenu from '../components/SortMenu';
import LoadingScreen from '../components/LoadingScreen';
import { tCatName } from '../i18n/entityTranslations';

const CategoryPage = () => {
  const { categorySlug, subcategorySlug, subSubcategorySlug } = useParams();
  const { i18n } = useTranslation();
  const [sortBy, setSortBy] = useState('featured');
  const [filters, setFiltres] = useState({
    colors: [],
    sizes: [],
    priceRange: [0, 1000]
  });
  const [showFiltres, setShowFiltres] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch products and categories from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [productsData, categoriesData] = await Promise.all([
          productsApi.getAll(),
          categoriesApi.getAll()
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortOptions = [
    { value: 'featured', label: 'Nos suggestions' },
    { value: 'newest', label: 'Nouveautés en premier' },
    { value: 'price-asc', label: 'Prix : croissants' },
    { value: 'price-desc', label: 'Prix : décroissants' }
  ];

  const category = categories.find(c => c.slug === categorySlug);
  const subcategory = category?.subcategories.find(s => s.slug === subcategorySlug);
  const subSubcategory = subcategory?.children?.find(s => s.slug === subSubcategorySlug);

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products.map(enrichProduct).filter(p => {
      // Si c'est la sous-catégorie "promotions", afficher uniquement les produits en promo de cette catégorie
      if (subcategorySlug === 'promotions') {
        if (categorySlug === 'all') {
          // Menu global "Promotions" - tous les produits en promo
          return p.onPromotion;
        }
        // Promotions d'une catégorie spécifique
        return p.onPromotion && p.category === categorySlug;
      }
      
      // Filtre normal par catégorie et sous-catégorie
      if (categorySlug === 'all') {
        // Menu global par sous-catégorie (ex: /category/all/nouveautes)
        return subcategorySlug ? p.subcategory === subcategorySlug : true;
      }
      
      // Filter by sub-subcategory if present
      if (subSubcategorySlug) {
        return p.category === categorySlug && p.subcategory === subcategorySlug && p.subSubcategory === subSubcategorySlug;
      }
      
      if (subcategorySlug) {
        return p.category === categorySlug && p.subcategory === subcategorySlug;
      }
      return p.category === categorySlug;
    });

    // Apply color filter
    if (filters.colors.length > 0) {
      filtered = filtered.filter(p =>
        p.colors.some(c => filters.colors.includes(c.name))
      );
    }

    // Apply size filter
    if (filters.sizes.length > 0) {
      filtered = filtered.filter(p =>
        p.sizes.some(s => filters.sizes.includes(s.size))
      );
    }

    // Apply price range filter
    filtered = filtered.filter(p =>
      p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
    );

    // Sort products
    switch (sortBy) {
      case 'price-asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => b.id - a.id);
        break;
      case 'featured':
      default:
        // Featured products first
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return filtered;
  }, [categorySlug, subcategorySlug, subSubcategorySlug, filters, sortBy, products]);

  // Get all available colors and sizes from current products
  const availableColors = [...new Set(products.flatMap(p => p.colors?.map(c => c.name) || []))];
  const availableSizes = [...new Set(products.flatMap(p => p.sizes?.map(s => s.size) || []))];

  const handleColorToggle = (color) => {
    setFiltres(prev => ({
      ...prev,
      colors: prev.colors.includes(color)
        ? prev.colors.filter(c => c !== color)
        : [...prev.colors, color]
    }));
  };

  const handleSizeToggle = (size) => {
    setFiltres(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  if (loading) {
    return <LoadingScreen message="Chargement des produits..." />;
  }

  if (!category) {
    return <div className="container mx-auto px-4 py-12">Catégorie non trouvée</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="hover:opacity-60 transition-opacity">Home</Link>
            <span>/</span>
            <Link to={`/category/${category.slug}`} className="hover:opacity-60 transition-opacity">
              {tCatName(category, i18n.language)}
            </Link>
            {subcategory && (
              <>
                <span>/</span>
                <Link to={`/category/${category.slug}/${subcategory.slug}`} className={`hover:opacity-60 transition-opacity ${!subSubcategory ? 'font-medium' : ''}`}>
                  {tCatName(subcategory, i18n.language)}
                </Link>
              </>
            )}
            {subSubcategory && (
              <>
                <span>/</span>
                <span className="font-medium">{tCatName(subSubcategory, i18n.language)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light mb-2">
            {subcategory ? tCatName(subcategory, i18n.language) : tCatName(category, i18n.language)}
          </h1>
          <p className="text-gray-600">{filteredProducts.length} items</p>
        </div>

        {/* Filtres & Sort Bar */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          <Button
            variant="outline"
            onClick={() => setShowFiltres(!showFiltres)}
            className="flex items-center space-x-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtres</span>
          </Button>

          <SortMenu 
            value={sortBy} 
            onChange={setSortBy}
            options={sortOptions}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filtres Sidebar */}
          {showFiltres && (
            <aside className="w-full lg:w-64 space-y-6">
              {/* Color Filter */}
              <div>
                <h3 className="font-semibold mb-3">Color</h3>
                <div className="space-y-2">
                  {availableColors.map((color) => (
                    <div key={color} className="flex items-center space-x-2">
                      <Checkbox
                        id={`color-${color}`}
                        checked={filters.colors.includes(color)}
                        onCheckedChange={() => handleColorToggle(color)}
                      />
                      <Label htmlFor={`color-${color}`} className="cursor-pointer text-sm">
                        {color}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Size Filter */}
              <div>
                <h3 className="font-semibold mb-3">Size</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`px-3 py-2 text-sm border transition-colors ${
                        filters.sizes.includes(size)
                          ? 'bg-black text-white border-black'
                          : 'border-gray-300 hover:border-black'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Filtres */}
              {(filters.colors.length > 0 || filters.sizes.length > 0) && (
                <Button
                  variant="outline"
                  onClick={() => setFiltres({ colors: [], sizes: [], priceRange: [0, 1000] })}
                  className="w-full"
                >
                  Clear All Filtres
                </Button>
              )}
            </aside>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryPage;