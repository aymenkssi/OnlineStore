import React, { useState } from 'react';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Trash2, AlertCircle, Lock } from 'lucide-react';
import { settingsApi } from '../services/api';

/**
 * Composant réutilisable pour confirmation de suppression avec code
 * 
 * @param {boolean} open - État d'ouverture du dialogue
 * @param {function} onOpenChange - Fonction pour fermer le dialogue
 * @param {function} onConfirm - Fonction appelée après confirmation du code
 * @param {string} title - Titre de l'élément à supprimer
 * @param {object} itemInfo - Informations de l'élément à afficher
 * @param {string} warningMessage - Message d'avertissement personnalisé
 */
export const DeleteConfirmationDialog = ({ 
  open, 
  onOpenChange, 
  onConfirm, 
  title = "cet élément",
  itemInfo = {},
  warningMessage = "Cette action est irréversible"
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setError('');
    setLoading(true);

    try {
      // Vérifier le code
      const result = await settingsApi.verifyDeletionCode(code);
      
      if (result.valid) {
        // Code correct, procéder à la suppression
        await onConfirm(code);  // ✅ Passer le code à onConfirm
        setCode('');
        onOpenChange(false);
      } else {
        setError('Code incorrect. Veuillez réessayer.');
      }
    } catch (err) {
      setError('Erreur lors de la vérification du code');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-4">
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Supprimer {title}</h3>
              <p className="text-sm text-gray-600">{warningMessage}</p>
            </div>
          </div>

          {/* Informations de l'élément */}
          {Object.keys(itemInfo).length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              {Object.entries(itemInfo).map(([key, value]) => (
                <p key={key} className="text-sm">
                  <span className="font-medium">{key} :</span> {value}
                </p>
              ))}
            </div>
          )}

          {/* Avertissement */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              <strong>Attention :</strong> Cette action supprimera définitivement cet élément de la base de données.
            </p>
          </div>

          {/* Code de confirmation */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Lock className="w-4 h-4" />
              Code de confirmation requis
            </label>
            <Input
              type="password"
              placeholder="Entrez le code de confirmation"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && code) {
                  handleConfirm();
                }
              }}
              className={error ? 'border-red-500' : ''}
              disabled={loading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {error}
              </p>
            )}
            <p className="text-xs text-gray-500">
              Le code de confirmation peut être configuré dans la section "Gestion des Administrateurs"
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={!code || loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Vérification...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
