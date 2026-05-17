import React, { useState, useEffect, useCallback } from 'react';
import { returnsApi } from '../../services/api';
import { formatPrice } from '../../hooks/usePaymentSettings';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
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
import { DeleteConfirmationDialog } from '../../components/DeleteConfirmationDialog';
import { 
  RotateCcw, 
  Search, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  Package, 
  CreditCard,
  Eye,
  MessageSquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  PackagePlus,
  Trash2
} from 'lucide-react';

// Return status constants
const RETURN_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SHIPPED: 'shipped',
  RECEIVED: 'received',
  REFUNDED: 'refunded'
};

const AdminReturns = () => {
  const canWrite = useCanWrite('manage_returns');
  const [returns, setReturns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [restocking, setRestocking] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, completed: 0 });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 10;

  const loadReturns = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const statusParam = filterStatus !== 'all' ? filterStatus : undefined;
      const response = await returnsApi.getAll({ limit: itemsPerPage, skip, status: statusParam });
      
      setReturns(response.items || []);
      setTotalItems(response.total || 0);
      setHasMore(response.has_more || false);
      
      // Load stats
      const statsResponse = await returnsApi.getStats();
      setStats({
        total: statsResponse.total_returns || 0,
        pending: statsResponse.pending || 0,
        approved: statsResponse.approved || 0,
        inProgress: statsResponse.in_progress || 0,
        completed: statsResponse.completed || 0,
        rejected: statsResponse.rejected || 0
      });
    } catch (error) {
      console.error('Error loading returns:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les retours",
        variant: "destructive"
      });
    }
    setLoading(false);
  }, [currentPage, filterStatus]);

  useEffect(() => {
    loadReturns();
  }, [loadReturns]);

  const getStatusInfo = (status) => {
    switch (status) {
      case RETURN_STATUS.PENDING:
        return { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case RETURN_STATUS.APPROVED:
        return { label: 'Approuvée', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case RETURN_STATUS.REJECTED:
        return { label: 'Refusée', color: 'bg-red-100 text-red-800', icon: XCircle };
      case RETURN_STATUS.SHIPPED:
        return { label: 'En transit', color: 'bg-blue-100 text-blue-800', icon: Truck };
      case RETURN_STATUS.RECEIVED:
        return { label: 'Reçu', color: 'bg-purple-100 text-purple-800', icon: Package };
      case RETURN_STATUS.REFUNDED:
        return { label: 'Remboursé', color: 'bg-green-100 text-green-800', icon: CreditCard };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    }
  };

  const filteredReturns = returns.filter(ret => {
    const retId = ret.id || ret.return_number || '';
    const orderId = ret.order_id || ret.orderId || '';
    const customerEmail = ret.customer_email || ret.customer?.email || '';
    
    const matchesSearch = 
      retId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleStatusUpdate = async (returnId, newStatus, additionalData = {}) => {
    try {
      if (newStatus === RETURN_STATUS.APPROVED) {
        await returnsApi.approve(returnId);
      } else if (newStatus === RETURN_STATUS.REJECTED) {
        await returnsApi.reject(returnId, additionalData.admin_notes);
      } else if (newStatus === RETURN_STATUS.REFUNDED) {
        await returnsApi.complete(returnId);
      } else {
        await returnsApi.update(returnId, { status: newStatus, ...additionalData });
      }
      loadReturns();
      toast({
        title: "Statut mis à jour",
        description: `Le retour a été mis à jour avec succès.`
      });
      if (selectedReturn?.id === returnId) {
        setSelectedReturn({ ...selectedReturn, status: newStatus, ...additionalData });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive"
      });
    }
  };

  const handleRestock = async (returnId) => {
    setRestocking(true);
    try {
      const result = await returnsApi.restock(returnId);
      loadReturns();
      
      const restockedCount = (result.restocked_items || []).filter(i => i.status === 'restocked').length;
      toast({
        title: "Stock réintégré",
        description: `${restockedCount} article(s) réintégré(s) dans l'inventaire.`
      });
      
      if (selectedReturn?.id === returnId) {
        setSelectedReturn({ ...selectedReturn, restocked: true });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de réintégrer le stock",
        variant: "destructive"
      });
    }
    setRestocking(false);
  };

  const handleDeleteReturn = async () => {
    if (!deleteTarget) return;
    try {
      await returnsApi.delete(deleteTarget.id);
      toast({
        title: "Retour supprimé",
        description: `La demande de retour ${deleteTarget.return_number || deleteTarget.id} a été supprimée.`
      });
      loadReturns();
      // Close detail dialog if the deleted return was being viewed
      if (selectedReturn?.id === deleteTarget.id) {
        setIsDetailOpen(false);
        setSelectedReturn(null);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le retour",
        variant: "destructive"
      });
    }
  };

  const openDeleteDialog = (ret) => {
    setDeleteTarget(ret);
    setIsDeleteOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const openDetail = (ret) => {
    setSelectedReturn(ret);
    setAdminNotes(ret.adminNotes || '');
    setIsDetailOpen(true);
  };

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Gestion des Retours</h1>
          <p className="text-gray-600 mt-2">Suivez et gérez les demandes de retour des clients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'all' ? 'ring-2 ring-black' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          <CardContent className="pt-6 text-center">
            <RotateCcw className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === RETURN_STATUS.PENDING ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setFilterStatus(RETURN_STATUS.PENDING)}
        >
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-sm text-gray-600">En attente</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === RETURN_STATUS.APPROVED ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilterStatus(RETURN_STATUS.APPROVED)}
        >
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-sm text-gray-600">Approuvées</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === RETURN_STATUS.SHIPPED ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFilterStatus(RETURN_STATUS.SHIPPED)}
        >
          <CardContent className="pt-6 text-center">
            <Truck className="w-8 h-8 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-sm text-gray-600">En cours</p>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === RETURN_STATUS.REFUNDED ? 'ring-2 ring-purple-500' : ''}`}
          onClick={() => setFilterStatus(RETURN_STATUS.REFUNDED)}
        >
          <CardContent className="pt-6 text-center">
            <CreditCard className="w-8 h-8 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
            <p className="text-sm text-gray-600">Remboursés</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Rechercher par n° retour, commande ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Returns List */}
      <Card>
        <CardHeader>
          <CardTitle>Demandes de retour ({filteredReturns.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReturns.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune demande de retour</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">N° Retour</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Commande</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Motif</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Montant</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReturns.map((ret) => {
                    const statusInfo = getStatusInfo(ret.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <tr key={ret.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <p className="font-mono text-sm font-medium">{ret.return_number || ret.id}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-sm">
                            {ret.customer_name || `${ret.customer?.firstName || ''} ${ret.customer?.lastName || ''}`}
                          </p>
                          <p className="text-xs text-gray-500">{ret.customer_email || ret.customer?.email}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-mono text-sm">{ret.order_id || ret.orderId}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm truncate max-w-[150px]">{ret.reason}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-semibold text-green-600">{formatPrice(ret.refund_amount || ret.refundAmount || 0)}</p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm">{formatDate(ret.created_at || ret.createdAt)}</p>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                          {ret.restocked && (
                            <span className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              <PackagePlus className="w-3 h-3" />
                              Restocké
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDetail(ret)}
                              data-testid={`view-return-${ret.id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {canWrite && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(ret)}
                              data-testid={`delete-return-${ret.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Détails de la demande de retour</DialogTitle>
          </DialogHeader>
          
          {selectedReturn && (
            <div className="space-y-6">
              {/* Return Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">N° de retour</p>
                  <p className="font-mono font-semibold">{selectedReturn.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">N° de commande</p>
                  <p className="font-mono">{selectedReturn.orderId}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date de demande</p>
                  <p>{formatDate(selectedReturn.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut actuel</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(selectedReturn.status).color}`}>
                    {getStatusInfo(selectedReturn.status).label}
                  </span>
                </div>
              </div>

              {/* Return Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Suivi de la demande de retour</h3>
                {(() => {
                  const steps = [
                    { key: 'pending', label: 'Demande envoyée', icon: Clock },
                    { key: 'approved', label: 'Demande approuvée', icon: CheckCircle },
                    { key: 'shipped', label: 'Article envoyé (client)', icon: Truck },
                    { key: 'received', label: 'Article reçu', icon: Package },
                    { key: 'completed', label: 'Remboursement effectué', icon: CreditCard },
                  ];
                  const statusOrder = { pending: 0, approved: 1, shipped: 2, received: 3, completed: 4, refunded: 4 };
                  const currentStep = statusOrder[selectedReturn.status] ?? 0;
                  const isRejected = selectedReturn.status === 'rejected';

                  if (isRejected) {
                    return (
                      <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                          <XCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-red-800">Demande refusée</p>
                          {selectedReturn.admin_notes && <p className="text-sm text-red-600">Motif : {selectedReturn.admin_notes}</p>}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-0" data-testid="admin-return-timeline">
                      {steps.map((step, idx) => {
                        const isActive = idx <= currentStep;
                        const isCurrent = idx === currentStep;
                        const StepIcon = step.icon;
                        return (
                          <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center min-w-[90px]">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                isCurrent ? 'bg-orange-500 text-white ring-4 ring-orange-200' :
                                isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                              }`}>
                                <StepIcon className="w-4 h-4" />
                              </div>
                              <span className={`text-xs mt-1.5 text-center leading-tight ${
                                isCurrent ? 'font-semibold text-orange-700' :
                                isActive ? 'font-medium text-green-700' : 'text-gray-400'
                              }`}>
                                {step.label}
                              </span>
                            </div>
                            {idx < steps.length - 1 && (
                              <div className={`flex-1 h-0.5 mt-[-18px] min-w-[20px] ${
                                idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                              }`} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Customer Info */}
              <div>
                <h3 className="font-semibold mb-2">Client</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="font-medium">{selectedReturn.customer?.firstName} {selectedReturn.customer?.lastName}</p>
                  <p className="text-sm text-gray-600">{selectedReturn.customer?.email}</p>
                  <p className="text-sm text-gray-600">{selectedReturn.customer?.phone}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Articles à retourner</h3>
                <div className="space-y-2">
                  {selectedReturn.items.map((item, idx) => (
                    <div key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}-${idx}`} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                      {item.image ? (
                        <img 
                          src={item.image} 
                          alt={item.name}
                          className="w-16 h-20 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs text-center px-1">Pas d'image</span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.color} / {item.size}</p>
                        <p className="text-sm">Qté: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <h3 className="font-semibold mb-2">Motif du retour</h3>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-yellow-800">{selectedReturn.reason}</p>
                  {selectedReturn.description && (
                    <p className="text-sm text-yellow-700 mt-2">{selectedReturn.description}</p>
                  )}
                </div>
              </div>

              {/* Refund Amount */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-green-800">Montant du remboursement</p>
                  <p className="text-2xl font-bold text-green-800">{formatPrice(selectedReturn.refund_amount || selectedReturn.refundAmount)}</p>
                </div>
              </div>

              {/* Restock Status */}
              {selectedReturn.restocked && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200" data-testid="restock-status">
                  <div className="flex items-center gap-2">
                    <PackagePlus className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-800">Stock réintégré</p>
                  </div>
                  <p className="text-sm text-blue-600 mt-1">
                    Les articles ont été réintégrés dans l'inventaire
                    {selectedReturn.restocked_at && ` le ${formatDate(selectedReturn.restocked_at)}`}
                  </p>
                </div>
              )}

              {/* Restock Action */}
              {!selectedReturn.restocked && (selectedReturn.status === 'approved' || selectedReturn.status === 'completed' || selectedReturn.status === RETURN_STATUS.RECEIVED || selectedReturn.status === RETURN_STATUS.REFUNDED) && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200" data-testid="restock-action">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <PackagePlus className="w-5 h-5 text-amber-600" />
                        <p className="font-semibold text-amber-800">Réintégrer au stock</p>
                      </div>
                      <div className="mt-2 space-y-1">
                        {selectedReturn.items.map((item, idx) => (
                          <p key={`${item.product_id || item.name}-${idx}`} className="text-sm text-amber-700">
                            +{item.quantity} x {item.name}
                          </p>
                        ))}
                      </div>
                    </div>
                    {canWrite && (
                    <Button
                      onClick={() => handleRestock(selectedReturn.id)}
                      disabled={restocking}
                      className="bg-amber-600 hover:bg-amber-700"
                      data-testid="restock-btn"
                    >
                      {restocking ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <PackagePlus className="w-4 h-4 mr-2" />
                      )}
                      {restocking ? 'En cours...' : 'Réintégrer'}
                    </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Notes internes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Ajouter des notes pour le suivi interne..."
                  className="mt-2"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                {selectedReturn.status === RETURN_STATUS.PENDING && (
                  <>{canWrite && (
                    <Button
                      onClick={() => handleStatusUpdate(selectedReturn.id, RETURN_STATUS.APPROVED)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approuver
                    </Button>
                  )}
                  {canWrite && (
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusUpdate(selectedReturn.id, RETURN_STATUS.REJECTED)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Refuser
                    </Button>
                  )}
                  </>
                )}
                
                {selectedReturn.status === RETURN_STATUS.APPROVED && (
                  <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                    <Clock className="w-4 h-4" />
                    En attente de l'envoi par le client
                  </div>
                )}
                
                {selectedReturn.status === RETURN_STATUS.SHIPPED && canWrite && (
                  <Button
                    onClick={() => handleStatusUpdate(selectedReturn.id, RETURN_STATUS.RECEIVED)}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Colis reçu
                  </Button>
                )}
                
                {selectedReturn.status === RETURN_STATUS.RECEIVED && canWrite && (
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={() => handleStatusUpdate(selectedReturn.id, RETURN_STATUS.REFUNDED)}
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Confirmer remboursement
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDeleteReturn}
        title={`la demande de retour`}
        itemInfo={deleteTarget ? {
          "N° Retour": deleteTarget.return_number || deleteTarget.id,
          "Client": deleteTarget.customer_name || deleteTarget.customer_email,
          "Montant": formatPrice(deleteTarget.refund_amount || 0),
          "Statut": getStatusInfo(deleteTarget.status).label
        } : {}}
        warningMessage="Cette suppression est irréversible"
      />
    </div>
  );
};

export default AdminReturns;
