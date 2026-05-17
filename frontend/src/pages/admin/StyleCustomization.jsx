import React, { useState, useEffect } from 'react';
import { settingsApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Switch } from '../../components/ui/switch';
import { toast } from '../../hooks/use-toast';
import { Save, RotateCcw, Palette, Flame, Image, Loader2, Sparkles, Clock, Eye } from 'lucide-react';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const StyleCustomization = () => {
  const canWrite = useCanWrite('manage_style');
  const [config, setConfig] = useState({
    primaryColor: '#000000',
    secondaryColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    textColor: '#000000',
    textSecondaryColor: '#6B7280',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '16px',
    headingFontSize: '24px',
    buttonRadius: '0px',
    promotionBgColor: '#DC2626',
    promotionBgColorEnd: '#EF4444',
    promotionImageSize: 'large',
    newarrivalsBgColor: '#1E40AF',
    newarrivalsBgColorEnd: '#3B82F6',
    newarrivalsImageSize: 'large',
    maxImageSizeMb: 5,
    // Categories settings
    categoriesPerRow: 3,
    // Recommendations settings
    recommendationsEnabled: true,
    recommendationsBgColor: '#7C3AED',
    recommendationsBgColorEnd: '#6366F1',
    recommendationsImageSize: 'medium',
    recommendationsDisplayType: 'carousel',
    recommendationsTitle: 'Recommandations pour vous',
    recommendationsSubtitle: 'Basé sur votre historique de navigation',
    recommendationsLimit: 8,
    // Recently viewed settings
    recentlyViewedEnabled: true,
    recentlyViewedBgColor: '#374151',
    recentlyViewedBgColorEnd: '#1F2937',
    recentlyViewedTitle: 'Vus récemment',
    recentlyViewedLimit: 6,
    // Top Banner settings
    bannerEnabled: true,
    bannerText: 'Livraison gratuite à partir de 400€ d\'achat',
    bannerBgColor: '#F3F4F6',
    bannerTextColor: '#1F2937',
    bannerAnimation: 'none',
    bannerAnimationSpeed: 30,
    bannerFontSize: 14
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load settings from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const styleSettings = await settingsApi.getStyle();
        const siteSettings = await settingsApi.getSite();
        setConfig(prev => ({
          ...prev,
          primaryColor: styleSettings.primary_color || prev.primaryColor,
          secondaryColor: styleSettings.secondary_color || prev.secondaryColor,
          backgroundColor: styleSettings.background_color || prev.backgroundColor,
          textColor: styleSettings.text_color || prev.textColor,
          promotionBgColor: styleSettings.promotion_bg_color || prev.promotionBgColor,
          promotionBgColorEnd: styleSettings.promotion_bg_color_end || prev.promotionBgColorEnd,
          promotionImageSize: styleSettings.promotion_image_size || prev.promotionImageSize,
          newarrivalsBgColor: styleSettings.newarrivals_bg_color || prev.newarrivalsBgColor,
          newarrivalsBgColorEnd: styleSettings.newarrivals_bg_color_end || prev.newarrivalsBgColorEnd,
          newarrivalsImageSize: styleSettings.newarrivals_image_size || prev.newarrivalsImageSize,
          maxImageSizeMb: styleSettings.max_image_size_mb || prev.maxImageSizeMb,
          // Categories
          categoriesPerRow: siteSettings.categories_per_row || prev.categoriesPerRow,
          // Recommendations
          recommendationsEnabled: styleSettings.recommendations_enabled ?? true,
          recommendationsBgColor: styleSettings.recommendations_bg_color || prev.recommendationsBgColor,
          recommendationsBgColorEnd: styleSettings.recommendations_bg_color_end || prev.recommendationsBgColorEnd,
          recommendationsImageSize: styleSettings.recommendations_image_size || prev.recommendationsImageSize,
          recommendationsDisplayType: styleSettings.recommendations_display_type || prev.recommendationsDisplayType,
          recommendationsTitle: styleSettings.recommendations_title || prev.recommendationsTitle,
          recommendationsSubtitle: styleSettings.recommendations_subtitle || prev.recommendationsSubtitle,
          recommendationsLimit: styleSettings.recommendations_limit || prev.recommendationsLimit,
          // Recently viewed
          recentlyViewedEnabled: styleSettings.recently_viewed_enabled ?? true,
          recentlyViewedBgColor: styleSettings.recently_viewed_bg_color || prev.recentlyViewedBgColor,
          recentlyViewedBgColorEnd: styleSettings.recently_viewed_bg_color_end || prev.recentlyViewedBgColorEnd,
          recentlyViewedTitle: styleSettings.recently_viewed_title || prev.recentlyViewedTitle,
          recentlyViewedLimit: styleSettings.recently_viewed_limit || prev.recentlyViewedLimit,
          // Top Banner
          bannerEnabled: styleSettings.banner_enabled ?? true,
          bannerText: styleSettings.banner_text || prev.bannerText,
          bannerBgColor: styleSettings.banner_bg_color || prev.bannerBgColor,
          bannerTextColor: styleSettings.banner_text_color || prev.bannerTextColor,
          bannerAnimation: styleSettings.banner_animation || prev.bannerAnimation,
          bannerAnimationSpeed: styleSettings.banner_animation_speed || prev.bannerAnimationSpeed,
          bannerFontSize: styleSettings.banner_font_size ?? prev.bannerFontSize
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (key, value) => {
    setConfig({ ...config, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      // Save style settings
      await settingsApi.updateStyle({
        primary_color: config.primaryColor,
        secondary_color: config.secondaryColor,
        background_color: config.backgroundColor,
        text_color: config.textColor,
        accent_color: config.secondaryColor,
        font_family: config.fontFamily,
        promotion_bg_color: config.promotionBgColor,
        promotion_bg_color_end: config.promotionBgColorEnd,
        promotion_image_size: config.promotionImageSize,
        newarrivals_bg_color: config.newarrivalsBgColor,
        newarrivals_bg_color_end: config.newarrivalsBgColorEnd,
        newarrivals_image_size: config.newarrivalsImageSize,
        max_image_size_mb: parseFloat(config.maxImageSizeMb),
        // Recommendations
        recommendations_enabled: config.recommendationsEnabled,
        recommendations_bg_color: config.recommendationsBgColor,
        recommendations_bg_color_end: config.recommendationsBgColorEnd,
        recommendations_image_size: config.recommendationsImageSize,
        recommendations_display_type: config.recommendationsDisplayType,
        recommendations_title: config.recommendationsTitle,
        recommendations_subtitle: config.recommendationsSubtitle,
        recommendations_limit: parseInt(config.recommendationsLimit),
        // Recently viewed
        recently_viewed_enabled: config.recentlyViewedEnabled,
        recently_viewed_bg_color: config.recentlyViewedBgColor,
        recently_viewed_bg_color_end: config.recentlyViewedBgColorEnd,
        recently_viewed_title: config.recentlyViewedTitle,
        recently_viewed_limit: parseInt(config.recentlyViewedLimit),
        // Top Banner
        banner_enabled: config.bannerEnabled,
        banner_text: config.bannerText,
        banner_bg_color: config.bannerBgColor,
        banner_text_color: config.bannerTextColor,
        banner_animation: config.bannerAnimation,
        banner_animation_speed: parseInt(config.bannerAnimationSpeed),
        banner_font_size: parseInt(config.bannerFontSize)
      });

      // Save categories per row to site settings
      await settingsApi.updateSite({
        categories_per_row: config.categoriesPerRow
      });
      
      setHasChanges(false);
      toast({
        title: "Style enregistré",
        description: "Les modifications de style ont été appliquées avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les paramètres",
        variant: "destructive"
      });
    }
  };

  const handleReset = () => {
    if (window.confirm('Réinitialiser tous les styles aux valeurs par défaut?')) {
      setConfig({
        primaryColor: '#000000',
        secondaryColor: '#DC2626',
        backgroundColor: '#FFFFFF',
        textColor: '#000000',
        textSecondaryColor: '#6B7280',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        fontSize: '16px',
        headingFontSize: '24px',
        buttonRadius: '0px',
        promotionBgColor: '#DC2626',
        promotionBgColorEnd: '#EF4444',
        promotionImageSize: 'large',
        newarrivalsBgColor: '#1E40AF',
        newarrivalsBgColorEnd: '#3B82F6',
        newarrivalsImageSize: 'large',
        maxImageSizeMb: 5,
        recommendationsEnabled: true,
        recommendationsBgColor: '#7C3AED',
        recommendationsBgColorEnd: '#6366F1',
        recommendationsImageSize: 'medium',
        recommendationsDisplayType: 'carousel',
        recommendationsTitle: 'Recommandations pour vous',
        recommendationsSubtitle: 'Basé sur votre historique de navigation',
        recommendationsLimit: 8,
        recentlyViewedEnabled: true,
        recentlyViewedBgColor: '#374151',
        recentlyViewedBgColorEnd: '#1F2937',
        recentlyViewedTitle: 'Vus récemment',
        recentlyViewedLimit: 6,
        bannerEnabled: true,
        bannerText: 'Livraison gratuite à partir de 400€ d\'achat',
        bannerBgColor: '#F3F4F6',
        bannerTextColor: '#1F2937',
        bannerAnimation: 'none',
        bannerAnimationSpeed: 30,
        bannerFontSize: 14
      });
      setHasChanges(true);
    }
  };

  const fontFamilies = [
    { name: 'Système par défaut', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Courier New', value: '"Courier New", monospace' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2">Chargement...</span>
      </div>
    );
  }

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light flex items-center">
            <Palette className="w-8 h-8 mr-3" />
            Style & Apparence
          </h1>
          <p className="text-gray-600 mt-2">Personnalisez l'apparence visuelle de votre boutique</p>
        </div>
        {canWrite && (
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleReset} data-testid="style-reset-btn">
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges} data-testid="style-save-btn">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        )}
      </div>

      <fieldset disabled={!canWrite} className={!canWrite ? 'opacity-75 pointer-events-none' : ''}>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bannière Supérieure */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="4" rx="1" />
              </svg>
              Bannière Supérieure
            </CardTitle>
            <CardDescription>Configurez la bannière affichée en haut du site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium">Activer la bannière</Label>
                <p className="text-xs text-gray-500 mt-1">Affiche une bannière en haut de toutes les pages</p>
              </div>
              <Switch
                checked={config.bannerEnabled}
                onCheckedChange={(checked) => handleChange('bannerEnabled', checked)}
              />
            </div>

            {config.bannerEnabled && (
              <>
                {/* Banner Text */}
                <div>
                  <Label htmlFor="bannerText">Texte de la bannière</Label>
                  <Input
                    id="bannerText"
                    type="text"
                    value={config.bannerText}
                    onChange={(e) => handleChange('bannerText', e.target.value)}
                    className="mt-1"
                    placeholder="Livraison gratuite à partir de 400€ d'achat"
                  />
                </div>

                {/* Banner Font Size */}
                <div>
                  <Label htmlFor="bannerFontSize">Taille du texte</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Input
                      id="bannerFontSize"
                      type="range"
                      min="10"
                      max="24"
                      value={config.bannerFontSize}
                      onChange={(e) => handleChange('bannerFontSize', parseInt(e.target.value))}
                      className="flex-1"
                      data-testid="banner-font-size-slider"
                    />
                    <span className="w-16 text-center font-mono font-bold text-sm">{config.bannerFontSize}px</span>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bannerBgColor">Couleur de fond</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="bannerBgColor"
                        type="color"
                        value={config.bannerBgColor}
                        onChange={(e) => handleChange('bannerBgColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={config.bannerBgColor}
                        onChange={(e) => handleChange('bannerBgColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bannerTextColor">Couleur du texte</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="bannerTextColor"
                        type="color"
                        value={config.bannerTextColor}
                        onChange={(e) => handleChange('bannerTextColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={config.bannerTextColor}
                        onChange={(e) => handleChange('bannerTextColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Animation */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bannerAnimation">Animation</Label>
                    <select
                      id="bannerAnimation"
                      value={config.bannerAnimation}
                      onChange={(e) => handleChange('bannerAnimation', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                    >
                      <option value="none">Aucune (statique)</option>
                      <option value="scroll-left">Défilement vers la gauche</option>
                      <option value="scroll-right">Défilement vers la droite</option>
                      <option value="fade">Fondu (pulse)</option>
                    </select>
                  </div>
                  {config.bannerAnimation !== 'none' && (
                    <div>
                      <Label htmlFor="bannerAnimationSpeed">Vitesse d'animation (secondes)</Label>
                      <div className="flex items-center gap-3 mt-1">
                        <Input
                          id="bannerAnimationSpeed"
                          type="range"
                          min="5"
                          max="60"
                          value={config.bannerAnimationSpeed}
                          onChange={(e) => handleChange('bannerAnimationSpeed', parseInt(e.target.value))}
                          className="flex-1"
                        />
                        <span className="w-12 text-center font-mono font-bold">{config.bannerAnimationSpeed}s</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div className="mt-4">
                  <Label className="mb-2 block">Aperçu</Label>
                  <div 
                    className="text-center py-2 px-4 rounded overflow-hidden relative"
                    style={{ 
                      backgroundColor: config.bannerBgColor,
                      color: config.bannerTextColor,
                      fontSize: `${config.bannerFontSize}px`
                    }}
                  >
                    <p 
                      className={`whitespace-nowrap ${
                        config.bannerAnimation === 'scroll-left' ? 'animate-marquee-left' :
                        config.bannerAnimation === 'scroll-right' ? 'animate-marquee-right' :
                        config.bannerAnimation === 'fade' ? 'animate-pulse' : ''
                      }`}
                      style={{
                        animationDuration: config.bannerAnimation !== 'none' ? `${config.bannerAnimationSpeed}s` : undefined
                      }}
                    >
                      {config.bannerText || 'Texte de la bannière'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Couleurs */}
        <Card>
          <CardHeader>
            <CardTitle>Couleurs</CardTitle>
            <CardDescription>Définissez les couleurs principales de votre site</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Couleur primaire</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="primaryColor"
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Boutons, liens, éléments interactifs</p>
              </div>

              <div>
                <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="secondaryColor"
                    type="color"
                    value={config.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.secondaryColor}
                    onChange={(e) => handleChange('secondaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Promotions, accents</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="backgroundColor">Fond</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="backgroundColor"
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.backgroundColor}
                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="textColor">Texte principal</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="textColor"
                    type="color"
                    value={config.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => handleChange('textColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="textSecondaryColor">Texte secondaire</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="textSecondaryColor"
                  type="color"
                  value={config.textSecondaryColor}
                  onChange={(e) => handleChange('textSecondaryColor', e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={config.textSecondaryColor}
                  onChange={(e) => handleChange('textSecondaryColor', e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Descriptions, infos secondaires</p>
            </div>
          </CardContent>
        </Card>

        {/* Typographie */}
        <Card>
          <CardHeader>
            <CardTitle>Typographie</CardTitle>
            <CardDescription>Personnalisez les polices et tailles de texte</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fontFamily">Police de caractères</Label>
              <select
                id="fontFamily"
                value={config.fontFamily}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
              >
                {fontFamilies.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="fontSize">Taille du texte</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="fontSize"
                  type="range"
                  min="12"
                  max="20"
                  value={parseInt(config.fontSize)}
                  onChange={(e) => handleChange('fontSize', `${e.target.value}px`)}
                  className="flex-1"
                />
                <span className="w-16 text-center font-mono">{config.fontSize}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Texte du corps (12-20px)</p>
            </div>

            <div>
              <Label htmlFor="headingFontSize">Taille des titres</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="headingFontSize"
                  type="range"
                  min="20"
                  max="36"
                  value={parseInt(config.headingFontSize)}
                  onChange={(e) => handleChange('headingFontSize', `${e.target.value}px`)}
                  className="flex-1"
                />
                <span className="w-16 text-center font-mono">{config.headingFontSize}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Titres principaux (20-36px)</p>
            </div>
          </CardContent>
        </Card>

        {/* Composants */}
        <Card>
          <CardHeader>
            <CardTitle>Style des composants</CardTitle>
            <CardDescription>Ajustez l'apparence des éléments interactifs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="buttonRadius">Arrondi des boutons</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="buttonRadius"
                  type="range"
                  min="0"
                  max="20"
                  value={parseInt(config.buttonRadius)}
                  onChange={(e) => handleChange('buttonRadius', `${e.target.value}px`)}
                  className="flex-1"
                />
                <span className="w-16 text-center font-mono">{config.buttonRadius}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button 
                  size="sm" 
                  style={{ borderRadius: config.buttonRadius }}
                >
                  Aperçu
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  style={{ borderRadius: config.buttonRadius }}
                >
                  Aperçu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zone Promotion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              Zone Promotions
            </CardTitle>
            <CardDescription>Personnalisez l'apparence de la zone promotions sur la page d'accueil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promotionBgColor">Couleur de fond (début)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="promotionBgColor"
                    type="color"
                    value={config.promotionBgColor}
                    onChange={(e) => handleChange('promotionBgColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.promotionBgColor}
                    onChange={(e) => handleChange('promotionBgColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="promotionBgColorEnd">Couleur de fond (fin)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="promotionBgColorEnd"
                    type="color"
                    value={config.promotionBgColorEnd}
                    onChange={(e) => handleChange('promotionBgColorEnd', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.promotionBgColorEnd}
                    onChange={(e) => handleChange('promotionBgColorEnd', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Image Size Setting */}
            <div>
              <Label htmlFor="promotionImageSize">Taille de l'image du produit</Label>
              <select
                id="promotionImageSize"
                value={config.promotionImageSize}
                onChange={(e) => handleChange('promotionImageSize', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
              >
                <option value="small">Petite (300px)</option>
                <option value="medium">Moyenne (400px)</option>
                <option value="large">Grande (500px)</option>
                <option value="xlarge">Très grande (600px)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">La zone promotion s'adapte automatiquement à la taille de l'image</p>
            </div>

            {/* Preview */}
            <div 
              className="p-4 rounded-lg text-white text-center"
              style={{
                background: `linear-gradient(to right, ${config.promotionBgColor}, ${config.promotionBgColorEnd})`
              }}
            >
              <p className="font-bold text-lg">Aperçu Zone Promotions</p>
              <p className="text-sm opacity-80">Couleur: dégradé • Image: {config.promotionImageSize}</p>
            </div>
          </CardContent>
        </Card>

        {/* Zone Nouveautés */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Zone Nouveautés
            </CardTitle>
            <CardDescription>Personnalisez l'apparence de la zone des nouveaux produits sur la page d'accueil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="newarrivalsBgColor">Couleur de fond (début)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="newarrivalsBgColor"
                    type="color"
                    value={config.newarrivalsBgColor}
                    onChange={(e) => handleChange('newarrivalsBgColor', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.newarrivalsBgColor}
                    onChange={(e) => handleChange('newarrivalsBgColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="newarrivalsBgColorEnd">Couleur de fond (fin)</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="newarrivalsBgColorEnd"
                    type="color"
                    value={config.newarrivalsBgColorEnd}
                    onChange={(e) => handleChange('newarrivalsBgColorEnd', e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={config.newarrivalsBgColorEnd}
                    onChange={(e) => handleChange('newarrivalsBgColorEnd', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Image Size Setting */}
            <div>
              <Label htmlFor="newarrivalsImageSize">Taille de l'image du produit</Label>
              <select
                id="newarrivalsImageSize"
                value={config.newarrivalsImageSize}
                onChange={(e) => handleChange('newarrivalsImageSize', e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
              >
                <option value="small">Petite (300px)</option>
                <option value="medium">Moyenne (400px)</option>
                <option value="large">Grande (500px)</option>
                <option value="xlarge">Très grande (600px)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Affiche les 4 derniers produits ajoutés récemment</p>
            </div>

            {/* Preview */}
            <div 
              className="p-4 rounded-lg text-white text-center"
              style={{
                background: `linear-gradient(to right, ${config.newarrivalsBgColor}, ${config.newarrivalsBgColorEnd})`
              }}
            >
              <p className="font-bold text-lg">Aperçu Zone Nouveautés</p>
              <p className="text-sm opacity-80">Couleur: dégradé • Image: {config.newarrivalsImageSize}</p>
            </div>
          </CardContent>
        </Card>

        {/* Zone Catégories */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Section "Choisissez un rayon"
            </CardTitle>
            <CardDescription>Configurez l'affichage des catégories sur la page d'accueil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Nombre de catégories par ligne</Label>
              <p className="text-sm text-gray-600 mb-3">
                Choisissez combien de catégories afficher côte à côte. Les images s'adapteront automatiquement.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[2, 3, 4, 6].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleChange('categoriesPerRow', num)}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      config.categoriesPerRow === num
                        ? 'border-indigo-600 bg-indigo-50 shadow-md'
                        : 'border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{num}</div>
                      <div className="text-xs text-gray-600 mt-1">par ligne</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <p className="text-sm font-medium mb-2">Aperçu de la disposition :</p>
              <div className={`grid gap-2 ${
                config.categoriesPerRow === 2 ? 'grid-cols-2' :
                config.categoriesPerRow === 3 ? 'grid-cols-3' :
                config.categoriesPerRow === 4 ? 'grid-cols-4' :
                'grid-cols-6'
              }`}>
                {Array.from({ length: config.categoriesPerRow }).map((_, i) => (
                  <div key={i} className="aspect-[3/4] bg-gray-200 rounded flex items-center justify-center">
                    <span className="text-gray-500 text-xs">Cat {i + 1}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Taille des images : {
                  config.categoriesPerRow === 2 ? 'Très grande (aspect 3:4)' :
                  config.categoriesPerRow === 3 ? 'Grande (aspect 3:4)' :
                  config.categoriesPerRow === 4 ? 'Moyenne (aspect 4:5)' :
                  'Petite (carrée)'
                }
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Zone Recommandations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-purple-500" />
              Zone Recommandations Personnalisées
            </CardTitle>
            <CardDescription>Configurez la section des recommandations basées sur l'historique de navigation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium">Activer les recommandations</Label>
                <p className="text-xs text-gray-500 mt-1">Affiche des produits personnalisés sur la page d'accueil</p>
              </div>
              <Switch
                checked={config.recommendationsEnabled}
                onCheckedChange={(checked) => handleChange('recommendationsEnabled', checked)}
              />
            </div>

            {config.recommendationsEnabled && (
              <>
                {/* Title & Subtitle */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="recommendationsTitle">Titre de la section</Label>
                    <Input
                      id="recommendationsTitle"
                      type="text"
                      value={config.recommendationsTitle}
                      onChange={(e) => handleChange('recommendationsTitle', e.target.value)}
                      className="mt-1"
                      placeholder="Recommandations pour vous"
                    />
                  </div>
                  <div>
                    <Label htmlFor="recommendationsSubtitle">Sous-titre</Label>
                    <Input
                      id="recommendationsSubtitle"
                      type="text"
                      value={config.recommendationsSubtitle}
                      onChange={(e) => handleChange('recommendationsSubtitle', e.target.value)}
                      className="mt-1"
                      placeholder="Basé sur votre historique de navigation"
                    />
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recommendationsBgColor">Couleur de fond (début)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="recommendationsBgColor"
                        type="color"
                        value={config.recommendationsBgColor}
                        onChange={(e) => handleChange('recommendationsBgColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={config.recommendationsBgColor}
                        onChange={(e) => handleChange('recommendationsBgColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="recommendationsBgColorEnd">Couleur de fond (fin)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="recommendationsBgColorEnd"
                        type="color"
                        value={config.recommendationsBgColorEnd}
                        onChange={(e) => handleChange('recommendationsBgColorEnd', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={config.recommendationsBgColorEnd}
                        onChange={(e) => handleChange('recommendationsBgColorEnd', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Display Type & Image Size */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recommendationsDisplayType">Type d'affichage</Label>
                    <select
                      id="recommendationsDisplayType"
                      value={config.recommendationsDisplayType}
                      onChange={(e) => handleChange('recommendationsDisplayType', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                    >
                      <option value="carousel">Carrousel (défilement)</option>
                      <option value="grid">Grille (fixe)</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="recommendationsImageSize">Taille des images</Label>
                    <select
                      id="recommendationsImageSize"
                      value={config.recommendationsImageSize}
                      onChange={(e) => handleChange('recommendationsImageSize', e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
                    >
                      <option value="small">Petite (carré)</option>
                      <option value="medium">Moyenne (3:4)</option>
                      <option value="large">Grande (2:3)</option>
                      <option value="xlarge">Très grande (9:16)</option>
                    </select>
                  </div>
                </div>

                {/* Limit */}
                <div>
                  <Label htmlFor="recommendationsLimit">Nombre de produits à afficher</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Input
                      id="recommendationsLimit"
                      type="range"
                      min="4"
                      max="12"
                      value={config.recommendationsLimit}
                      onChange={(e) => handleChange('recommendationsLimit', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono font-bold">{config.recommendationsLimit}</span>
                  </div>
                </div>

                {/* Preview */}
                <div 
                  className="p-4 rounded-lg text-white text-center"
                  style={{
                    background: `linear-gradient(to right, ${config.recommendationsBgColor}, ${config.recommendationsBgColorEnd})`
                  }}
                >
                  <p className="font-bold text-lg">{config.recommendationsTitle}</p>
                  <p className="text-sm opacity-80">{config.recommendationsSubtitle}</p>
                  <p className="text-xs mt-2 opacity-60">
                    {config.recommendationsDisplayType === 'carousel' ? 'Carrousel' : 'Grille'} • 
                    {config.recommendationsLimit} produits • 
                    Image: {config.recommendationsImageSize}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Zone Vus Récemment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              Zone "Vus Récemment"
            </CardTitle>
            <CardDescription>Configurez la section des produits récemment consultés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <Label className="font-medium">Activer "Vus récemment"</Label>
                <p className="text-xs text-gray-500 mt-1">Affiche les derniers produits consultés par le visiteur</p>
              </div>
              <Switch
                checked={config.recentlyViewedEnabled}
                onCheckedChange={(checked) => handleChange('recentlyViewedEnabled', checked)}
              />
            </div>

            {config.recentlyViewedEnabled && (
              <>
                {/* Title */}
                <div>
                  <Label htmlFor="recentlyViewedTitle">Titre de la section</Label>
                  <Input
                    id="recentlyViewedTitle"
                    type="text"
                    value={config.recentlyViewedTitle}
                    onChange={(e) => handleChange('recentlyViewedTitle', e.target.value)}
                    className="mt-1"
                    placeholder="Vus récemment"
                  />
                </div>

                {/* Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="recentlyViewedBgColor">Couleur de fond (début)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="recentlyViewedBgColor"
                        type="color"
                        value={config.recentlyViewedBgColor}
                        onChange={(e) => handleChange('recentlyViewedBgColor', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={config.recentlyViewedBgColor}
                        onChange={(e) => handleChange('recentlyViewedBgColor', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="recentlyViewedBgColorEnd">Couleur de fond (fin)</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="recentlyViewedBgColorEnd"
                        type="color"
                        value={config.recentlyViewedBgColorEnd}
                        onChange={(e) => handleChange('recentlyViewedBgColorEnd', e.target.value)}
                        className="w-20 h-10"
                      />
                      <Input
                        type="text"
                        value={config.recentlyViewedBgColorEnd}
                        onChange={(e) => handleChange('recentlyViewedBgColorEnd', e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Limit */}
                <div>
                  <Label htmlFor="recentlyViewedLimit">Nombre de produits à afficher</Label>
                  <div className="flex items-center gap-3 mt-1">
                    <Input
                      id="recentlyViewedLimit"
                      type="range"
                      min="3"
                      max="8"
                      value={config.recentlyViewedLimit}
                      onChange={(e) => handleChange('recentlyViewedLimit', parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="w-12 text-center font-mono font-bold">{config.recentlyViewedLimit}</span>
                  </div>
                </div>

                {/* Preview */}
                <div 
                  className="p-4 rounded-lg text-white text-center"
                  style={{
                    background: `linear-gradient(to right, ${config.recentlyViewedBgColor}, ${config.recentlyViewedBgColorEnd})`
                  }}
                >
                  <p className="font-bold text-lg">{config.recentlyViewedTitle}</p>
                  <p className="text-xs mt-2 opacity-60">{config.recentlyViewedLimit} produits maximum</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Limite taille images */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5 text-blue-500" />
              Paramètres des Images
            </CardTitle>
            <CardDescription>Configurez les limites de téléchargement d'images</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="maxImageSizeMb">Taille maximale des images (MB)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="maxImageSizeMb"
                  type="range"
                  min="1"
                  max="20"
                  step="0.5"
                  value={config.maxImageSizeMb}
                  onChange={(e) => handleChange('maxImageSizeMb', parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="w-20 text-center font-mono font-bold">{config.maxImageSizeMb} MB</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Les images plus grandes seront rejetées lors du téléchargement. 
                Recommandé: 5 MB pour un bon équilibre qualité/performance.
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Formats acceptés:</strong> JPG, PNG, WebP, GIF
              </p>
              <p className="text-sm text-gray-600 mt-1">
                <strong>Limite actuelle:</strong> {config.maxImageSizeMb} MB par image
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Aperçu */}
        <Card>
          <CardHeader>
            <CardTitle>Aperçu en direct</CardTitle>
            <CardDescription>Visualisez vos modifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="p-6 border rounded"
              style={{
                backgroundColor: config.backgroundColor,
                color: config.textColor,
                fontFamily: config.fontFamily,
                fontSize: config.fontSize
              }}
            >
              <h2 
                className="mb-4 font-bold"
                style={{ 
                  fontSize: config.headingFontSize,
                  color: config.textColor 
                }}
              >
                Titre de démonstration
              </h2>
              <p style={{ color: config.textSecondaryColor }} className="mb-4">
                Ceci est un exemple de texte secondaire pour visualiser le rendu de vos modifications de style.
              </p>
              <div className="flex gap-2">
                <button
                  style={{
                    backgroundColor: config.primaryColor,
                    color: config.backgroundColor,
                    borderRadius: config.buttonRadius,
                    padding: '8px 16px'
                  }}
                >
                  Bouton primaire
                </button>
                <button
                  style={{
                    backgroundColor: config.secondaryColor,
                    color: config.backgroundColor,
                    borderRadius: config.buttonRadius,
                    padding: '8px 16px'
                  }}
                >
                  Promotion
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </fieldset>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg">
          Vous avez des modifications non enregistrées
        </div>
      )}
    </div>
  );
};

export default StyleCustomization;
