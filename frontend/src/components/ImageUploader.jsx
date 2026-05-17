import React, { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Upload, X, Link, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ImageUploader = ({ images = [], onChange, maxImages = 5, singleMode = false }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Upload files to backend
  const uploadToServer = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_URL}/api/upload/image`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Erreur lors de l\'upload');
      }

      const data = await response.json();
      // Return the full URL
      return `${API_URL}${data.url}`;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    
    const maxToAdd = singleMode ? 1 : maxImages - images.length;
    if (files.length > maxToAdd) {
      toast({
        title: "Limite atteinte",
        description: `Vous ne pouvez ${singleMode ? 'télécharger qu\'une seule image' : `ajouter que ${maxToAdd} image(s) de plus`}`,
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls = [];

      for (const file of files) {
        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "Fichier trop volumineux",
            description: `${file.name} dépasse 5MB`,
            variant: "destructive"
          });
          continue;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Type invalide",
            description: `${file.name} n'est pas une image valide`,
            variant: "destructive"
          });
          continue;
        }

        // Upload to server
        const url = await uploadToServer(file);
        uploadedUrls.push(url);
      }

      if (uploadedUrls.length > 0) {
        if (singleMode) {
          onChange(uploadedUrls[0]); // Return single URL string
        } else {
          onChange([...images, ...uploadedUrls]); // Return array of URLs
        }
        toast({
          title: "Upload réussi",
          description: `${uploadedUrls.length} image(s) téléchargée(s)`
        });
      }
    } catch (error) {
      toast({
        title: "Erreur d'upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) return;

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      toast({
        title: "URL invalide",
        description: "Veuillez entrer une URL valide",
        variant: "destructive"
      });
      return;
    }

    if (singleMode) {
      onChange(urlInput.trim());
    } else {
      if (images.length >= maxImages) {
        toast({
          title: "Limite atteinte",
          description: `Maximum ${maxImages} images`,
          variant: "destructive"
        });
        return;
      }
      onChange([...images, urlInput.trim()]);
    }

    setUrlInput('');
    setShowUrlInput(false);
    toast({
      title: "Image ajoutée",
      description: "L'image via URL a été ajoutée"
    });
  };

  const removeImage = (index) => {
    if (singleMode) {
      onChange('');
    } else {
      const newImages = images.filter((_, i) => i !== index);
      onChange(newImages);
    }
  };

  // For single mode, convert to array for consistent rendering
  const imageList = singleMode 
    ? (images ? [images] : []) 
    : (images || []);

  const canAddMore = singleMode ? !images : images.length < maxImages;

  return (
    <div className="space-y-3">
      {/* Images Preview */}
      {imageList.length > 0 && imageList[0] && (
        <div className={singleMode ? "relative w-32 h-32" : "grid grid-cols-3 gap-3"}>
          {imageList.map((image, index) => (
            image && (
              <div key={`${image}-${index}`} className={`relative group ${singleMode ? 'w-full h-full' : 'aspect-square'}`}>
                <img
                  src={image}
                  alt={`Aperçu ${index + 1}`}
                  className="w-full h-full object-cover rounded border border-gray-200"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/150?text=Image+Error';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )
          ))}
        </div>
      )}

      {/* URL Input Modal */}
      {showUrlInput && (
        <div className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg border">
          <Input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
          />
          <Button type="button" size="sm" onClick={handleUrlSubmit}>
            Ajouter
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setShowUrlInput(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Action Buttons */}
      {canAddMore && !showUrlInput && (
        <div className="flex gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={!singleMode}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Upload en cours...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {singleMode ? 'Télécharger' : `Télécharger (${imageList.length}/${maxImages})`}
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(true)}
            disabled={uploading}
          >
            <Link className="w-4 h-4 mr-2" />
            Via URL
          </Button>
        </div>
      )}

      <p className="text-xs text-gray-500">
        <ImageIcon className="w-3 h-3 inline mr-1" />
        Formats: JPG, PNG, WEBP, GIF • Max: 5MB par image
      </p>
    </div>
  );
};

export default ImageUploader;
