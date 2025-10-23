import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeInventory } from '../hooks/useRealtimeInventory';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '../components/ui/dialog';
import { Package, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  name: string;
  current_quantity: number;
  purchase_price?: number;
  created_at: string;
  updated_at: string;
}

const Inventory = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  useRealtimeInventory();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    current_quantity: 0,
    purchase_price: 0,
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as InventoryItem[];
    },
    enabled: !!profile,
  });

  const filteredItems = useMemo(() => {
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const createItemMutation = useMutation({
    mutationFn: async (itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert(itemData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item criado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao criar item: ' + error.message);
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InventoryItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item atualizado com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar item: ' + error.message);
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item excluído com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir item: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: '', current_quantity: 0, purchase_price: 0 });
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, ...formData });
    } else {
      createItemMutation.mutate(formData);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      current_quantity: item.current_quantity,
      purchase_price: item.purchase_price ?? 0,
    });
    setIsDialogOpen(true);
  };

  if (!profile) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Carregando...</h2>
      </div>
    );
  }

  const canManage = ['admin', 'manager'].includes(profile.role);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Estoque</h1>
          <p className="text-gray-600 mt-1">Controle de itens em estoque - Atualizações em tempo real</p>
        </div>
        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Editar Item' : 'Novo Item'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Item</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    value={formData.current_quantity}
                    onChange={(e) => setFormData({ ...formData, current_quantity: parseInt(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="purchase_price">Valor Pago na Compra</Label>
                  <Input
                    id="purchase_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingItem ? 'Atualizar' : 'Criar'} Item
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Buscar por nome do item..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando itens...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-gray-500" />
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                  {item.current_quantity <= 10 && (
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="text-2xl font-bold text-blue-600">{item.current_quantity}</div>
                  <div className="text-sm text-gray-500">unidades em estoque</div>
                  <div className="text-sm text-gray-700">
                    Valor pago: R$ {item.purchase_price?.toFixed(2) ?? '0.00'}
                  </div>
                  {item.current_quantity <= 10 && (
                    <div className="text-sm text-orange-600 font-medium">⚠️ Estoque baixo</div>
                  )}
                </div>
                {canManage && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(item)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteItemMutation.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Inventory;
