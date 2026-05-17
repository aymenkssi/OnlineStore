import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Edit, Trash2, Save, X, Settings, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { attributesApi } from '../../services/api';

// Default attributes used as fallback while loading from backend
const defaultAttributes = {
  colors: [
    { name: 'Noir', hex: '#000000' },
    { name: 'Blanc', hex: '#FFFFFF' },
    { name: 'Rouge', hex: '#FF0000' },
    { name: 'Bleu', hex: '#0000FF' },
    { name: 'Vert', hex: '#008000' },
  ],
  sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  brands: [],
  customAttributes: []
};

const AdminAttributes = () => {
  const { t: i18nT } = useTranslation();
  const canWrite = useCanWrite('manage_attributes');
  const [attributes, setAttributes] = useState(defaultAttributes);
  const [loaded, setLoaded] = useState(false);
  const [isColorDialogOpen, setIsColorDialogOpen] = useState(false);
  const [isSizeDialogOpen, setIsSizeDialogOpen] = useState(false);
  const [isBrandDialogOpen, setIsBrandDialogOpen] = useState(false);
  const [isCustomAttrDialogOpen, setIsCustomAttrDialogOpen] = useState(false);
  const [isAddValueDialogOpen, setIsAddValueDialogOpen] = useState(false);
  
  const [newColor, setNewColor] = useState({ name: '', hex: '#000000' });
  const [newSize, setNewSize] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newCustomAttr, setNewCustomAttr] = useState({ name: '', type: 'text', values: [] });
  const [selectedAttrIndex, setSelectedAttrIndex] = useState(null);
  const [newAttrValue, setNewAttrValue] = useState('');

  // Load attributes from backend on mount
  useEffect(() => {
    const fetchAttributes = async () => {
      try {
        const data = await attributesApi.getAll();
        setAttributes({
          colors: data.colors || [],
          sizes: data.sizes || [],
          brands: data.brands || [],
          customAttributes: data.customAttributes || []
        });
      } catch (e) {
        toast({ title: 'Erreur', description: 'Impossible de charger les attributs', variant: 'destructive' });
      } finally {
        setLoaded(true);
      }
    };
    fetchAttributes();
  }, []);

  // Persist to backend whenever attributes change (after initial load)
  useEffect(() => {
    if (!loaded) return;
    attributesApi.update(attributes).catch(() => {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder les attributs', variant: 'destructive' });
    });
  }, [attributes, loaded]);

  // Add color
  const handleAddColor = () => {
    if (!newColor.name.trim()) {
      toast({ title: "Erreur", description: "Le nom de la couleur est requis", variant: "destructive" });
      return;
    }
    setAttributes(prev => ({
      ...prev,
      colors: [...prev.colors, { ...newColor }]
    }));
    setNewColor({ name: '', hex: '#000000' });
    setIsColorDialogOpen(false);
    toast({ title: "Succès", description: "Couleur ajoutée avec succès" });
  };

  // Delete color
  const handleDeleteColor = (index) => {
    setAttributes(prev => ({
      ...prev,
      colors: prev.colors.filter((_, i) => i !== index)
    }));
    toast({ title: "Supprimé", description: "Couleur supprimée" });
  };

  // Add size
  const handleAddSize = () => {
    if (!newSize.trim()) {
      toast({ title: "Erreur", description: "La taille est requise", variant: "destructive" });
      return;
    }
    if (attributes.sizes.includes(newSize.toUpperCase())) {
      toast({ title: "Erreur", description: "Cette taille existe déjà", variant: "destructive" });
      return;
    }
    setAttributes(prev => ({
      ...prev,
      sizes: [...prev.sizes, newSize.toUpperCase()]
    }));
    setNewSize('');
    setIsSizeDialogOpen(false);
    toast({ title: "Succès", description: "Taille ajoutée avec succès" });
  };

  // Delete size
  const handleDeleteSize = (index) => {
    setAttributes(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
    toast({ title: "Supprimé", description: "Taille supprimée" });
  };

  // Add brand
  const handleAddBrand = () => {
    if (!newBrand.trim()) {
      toast({ title: "Erreur", description: "Le nom de la marque est requis", variant: "destructive" });
      return;
    }
    if (attributes.brands.some(b => b.toLowerCase() === newBrand.trim().toLowerCase())) {
      toast({ title: "Erreur", description: "Cette marque existe déjà", variant: "destructive" });
      return;
    }
    setAttributes(prev => ({
      ...prev,
      brands: [...prev.brands, newBrand.trim()].sort()
    }));
    setNewBrand('');
    setIsBrandDialogOpen(false);
    toast({ title: "Succès", description: "Marque ajoutée avec succès" });
  };

  // Delete brand
  const handleDeleteBrand = (index) => {
    setAttributes(prev => ({
      ...prev,
      brands: prev.brands.filter((_, i) => i !== index)
    }));
    toast({ title: "Supprimé", description: "Marque supprimée" });
  };

  // Add custom attribute
  const handleAddCustomAttribute = () => {
    if (!newCustomAttr.name.trim()) {
      toast({ title: "Erreur", description: "Le nom de l'attribut est requis", variant: "destructive" });
      return;
    }
    if (attributes.customAttributes.some(a => a.name.toLowerCase() === newCustomAttr.name.toLowerCase())) {
      toast({ title: "Erreur", description: "Cet attribut existe déjà", variant: "destructive" });
      return;
    }
    setAttributes(prev => ({
      ...prev,
      customAttributes: [...prev.customAttributes, { ...newCustomAttr, values: [] }]
    }));
    setNewCustomAttr({ name: '', type: 'text', values: [] });
    setIsCustomAttrDialogOpen(false);
    toast({ title: "Succès", description: "Attribut personnalisé créé avec succès" });
  };

  // Delete custom attribute
  const handleDeleteCustomAttribute = (index) => {
    setAttributes(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.filter((_, i) => i !== index)
    }));
    toast({ title: "Supprimé", description: "Attribut supprimé" });
  };

  // Add value to custom attribute
  const handleAddValueToAttribute = () => {
    if (!newAttrValue.trim()) {
      toast({ title: "Erreur", description: "La valeur est requise", variant: "destructive" });
      return;
    }
    setAttributes(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.map((attr, i) => 
        i === selectedAttrIndex 
          ? { ...attr, values: [...attr.values, newAttrValue.trim()] }
          : attr
      )
    }));
    setNewAttrValue('');
    setIsAddValueDialogOpen(false);
    toast({ title: "Succès", description: "Valeur ajoutée" });
  };

  // Delete value from custom attribute
  const handleDeleteValueFromAttribute = (attrIndex, valueIndex) => {
    setAttributes(prev => ({
      ...prev,
      customAttributes: prev.customAttributes.map((attr, i) => 
        i === attrIndex 
          ? { ...attr, values: attr.values.filter((_, vi) => vi !== valueIndex) }
          : attr
      )
    }));
  };

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">{i18nT('adminLayout.attributes')}</h1>
          <p className="text-gray-600 mt-2">Gérez les couleurs, tailles et attributs personnalisés</p>
        </div>
        {canWrite && (
        <Button onClick={() => setIsCustomAttrDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel Attribut
        </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Couleurs</CardTitle>
              <CardDescription>{attributes.colors.length} couleurs</CardDescription>
            </div>
            {canWrite && (
            <Button size="sm" onClick={() => setIsColorDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {attributes.colors.map((color, index) => (
                <div
                  key={color.hex || color.name || `color-row-${index}`}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded border border-gray-300 shadow-sm"
                      style={{ backgroundColor: color.hex }}
                    />
                    <div>
                      <p className="font-medium">{color.name}</p>
                      <p className="text-xs text-gray-500">{color.hex}</p>
                    </div>
                  </div>
                  {canWrite && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteColor(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sizes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Tailles</CardTitle>
              <CardDescription>{attributes.sizes.length} tailles</CardDescription>
            </div>
            {canWrite && (
            <Button size="sm" onClick={() => setIsSizeDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {attributes.sizes.map((size, index) => (
                <div
                  key={size}
                  className="group relative border border-gray-200 rounded px-4 py-2 hover:bg-gray-50"
                >
                  <span className="font-semibold">{size}</span>
                  {canWrite && (
                  <button
                    onClick={() => handleDeleteSize(index)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Brands */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Marques
              </CardTitle>
              <CardDescription>{attributes.brands.length} marques</CardDescription>
            </div>
            {canWrite && (
            <Button size="sm" onClick={() => setIsBrandDialogOpen(true)} data-testid="add-brand-btn">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {attributes.brands.map((brand, index) => (
                <div
                  key={brand}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                  data-testid={`brand-item-${index}`}
                >
                  <span className="font-medium">{brand}</span>
                  {canWrite && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteBrand(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    data-testid={`delete-brand-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  )}
                </div>
              ))}
              {attributes.brands.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Aucune marque configurée</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Attributes */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Attributs Personnalisés
        </h2>
        
        {attributes.customAttributes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Settings className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Aucun attribut personnalisé</p>
              {canWrite && (
              <Button variant="outline" onClick={() => setIsCustomAttrDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer un attribut
              </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attributes.customAttributes.map((attr, attrIndex) => (
              <Card key={attr.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-lg">{attr.name}</CardTitle>
                    <CardDescription>
                      Type: {attr.type === 'text' ? 'Texte' : attr.type === 'number' ? 'Nombre' : 'Liste'}
                    </CardDescription>
                  </div>
                  {canWrite && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDeleteCustomAttribute(attrIndex)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{attr.values.length} valeurs</span>
                      {canWrite && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedAttrIndex(attrIndex);
                          setIsAddValueDialogOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Valeur
                      </Button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {attr.values.map((value, valueIndex) => (
                        <span 
                          key={`${attr.name}-${value}`}
                          className="group relative bg-gray-100 px-2 py-1 rounded text-sm"
                        >
                          {value}
                          {canWrite && (
                          <button
                            onClick={() => handleDeleteValueFromAttribute(attrIndex, valueIndex)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center"
                          >
                            <X className="w-2 h-2" />
                          </button>
                          )}
                        </span>
                      ))}
                      {attr.values.length === 0 && (
                        <span className="text-gray-400 text-sm italic">Aucune valeur</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>À propos des attributs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Les attributs comme les couleurs et les tailles sont essentiels pour les variations de produits. 
            Vous pouvez créer des attributs personnalisés (ex: Matière, Marque, Style, etc.) selon vos besoins.
            Ces attributs seront disponibles lors de la création ou modification de produits.
          </p>
        </CardContent>
      </Card>

      {/* Add Color Dialog */}
      <Dialog open={isColorDialogOpen} onOpenChange={setIsColorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une couleur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="colorName">Nom de la couleur</Label>
              <Input
                id="colorName"
                value={newColor.name}
                onChange={(e) => setNewColor(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Bleu Marine"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="colorHex">Code couleur</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={newColor.hex}
                  onChange={(e) => setNewColor(prev => ({ ...prev, hex: e.target.value }))}
                  className="w-16 h-10 p-1"
                />
                <Input
                  id="colorHex"
                  value={newColor.hex}
                  onChange={(e) => setNewColor(prev => ({ ...prev, hex: e.target.value }))}
                  placeholder="#000000"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            
            <Button variant="outline" onClick={() => setIsColorDialogOpen(false)}>
              Annuler
            </Button>
            {canWrite && (
            <Button onClick={handleAddColor}>
              Ajouter
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Size Dialog */}
      <Dialog open={isSizeDialogOpen} onOpenChange={setIsSizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une taille</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="sizeName">Taille</Label>
              <Input
                id="sizeName"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                placeholder="Ex: XXL, 42, 44..."
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddSize()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSizeDialogOpen(false)}>
              Annuler
            </Button>
            {canWrite && (
            <Button onClick={handleAddSize}>
              Ajouter
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Brand Dialog */}
      <Dialog open={isBrandDialogOpen} onOpenChange={setIsBrandDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une marque</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="brandName">Nom de la marque</Label>
              <Input
                id="brandName"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="Ex: Nike, Zara, Gucci..."
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddBrand()}
                data-testid="brand-name-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBrandDialogOpen(false)}>
              Annuler
            </Button>
            {canWrite && (
            <Button onClick={handleAddBrand} data-testid="submit-brand-btn">
              Ajouter
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Attribute Dialog */}
      <Dialog open={isCustomAttrDialogOpen} onOpenChange={setIsCustomAttrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un nouvel attribut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="attrName">Nom de l'attribut</Label>
              <Input
                id="attrName"
                value={newCustomAttr.name}
                onChange={(e) => setNewCustomAttr(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Matière, Style, Collection..."
                className="mt-1"
              />
            </div>
            <div>
              <Label>Type d'attribut</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                {[
                  { value: 'text', label: 'Texte' },
                  { value: 'number', label: 'Nombre' },
                  { value: 'select', label: 'Liste' }
                ].map((type) => (
                  
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNewCustomAttr(prev => ({ ...prev, type: type.value }))}
                    className={`p-3 border rounded text-sm transition-all ${
                      newCustomAttr.type === type.value
                        ? 'border-black bg-black text-white'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {type.label}
                  </button>
                  
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomAttrDialogOpen(false)}>
              Annuler
            </Button>
            {canWrite && (
            <Button onClick={handleAddCustomAttribute}>
              Créer
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Value to Attribute Dialog */}
      <Dialog open={isAddValueDialogOpen} onOpenChange={setIsAddValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ajouter une valeur à "{selectedAttrIndex !== null ? attributes.customAttributes[selectedAttrIndex]?.name : ''}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="attrValue">Valeur</Label>
              <Input
                id="attrValue"
                value={newAttrValue}
                onChange={(e) => setNewAttrValue(e.target.value)}
                placeholder="Entrez une valeur..."
                className="mt-1"
                onKeyDown={(e) => e.key === 'Enter' && handleAddValueToAttribute()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddValueDialogOpen(false)}>
              Annuler
            </Button>
            
            <Button onClick={handleAddValueToAttribute}>
              Ajouter
            </Button>
          
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAttributes;
