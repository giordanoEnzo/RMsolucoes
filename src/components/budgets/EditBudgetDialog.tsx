import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Service } from '../../types/database';



interface BudgetItem {
  id?: number;
  service_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface EditBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: any;
}

const EditBudgetDialog: React.FC<EditBudgetDialogProps> = ({
  open,
  onOpenChange,
  budget,
}) => {
  const queryClient = useQueryClient();

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Service[];
    },
  });


  const [userRole, setUserRole] = useState<string | null>(null);

  // Estados para edição do serviço
  const [editServiceIndex, setEditServiceIndex] = useState<number | null>(null);
  const [editServiceData, setEditServiceData] = useState<{ id: string; name: string; default_price: number } | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      if (userId) {
        const { data, error } = await supabase
          .from('profiles') // ajuste o nome da tabela se for diferente
          .select('role')
          .eq('id', userId)
          .single();

        if (!error && data?.role) {
          setUserRole(data.role);
        }
      }
    };

    fetchUserRole();
  }, []);

  const [formData, setFormData] = useState({
    client_name: '',
    client_contact: '',
    client_address: '',
    description: '',
    valid_until: '',
    status: 'pendente',
  });

  const [items, setItems] = useState<BudgetItem[]>([]);

  useEffect(() => {
    if (budget && open) {
      setFormData({
        client_name: budget.client_name || '',
        client_contact: budget.client_contact || '',
        client_address: budget.client_address || '',
        description: budget.description || '',
        valid_until: budget.valid_until?.split('T')[0] || '',
        status: budget.status || 'pendente',
      });

      supabase
        .from('budget_items')
        .select('*')
        .eq('budget_id', budget.id)
        .then(({ data, error }) => {
          if (error) {
            toast.error('Erro ao carregar itens: ' + error.message);
            setItems([]);
          } else {
            setItems(
              (data || []).map((item: any) => ({
                id: item.id,
                service_name: item.service_name,
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total_price: item.total_price,
              }))
            );
          }
        });
    } else {
      setFormData({
        client_name: '',
        client_contact: '',
        client_address: '',
        description: '',
        valid_until: '',
        status: 'pendente',
      });
      setItems([]);
    }
  }, [budget, open]);

  const handleItemChange = (index: number, field: keyof BudgetItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      const qty = Number(newItems[index].quantity) || 0;
      const price = Number(newItems[index].unit_price) || 0;
      newItems[index].total_price = qty * price;
    }

    setItems(newItems);
  };

  const handleServiceSelect = (index: number, serviceName: string) => {
    const service = services.find((s) => s.name === serviceName);
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      service_name: serviceName,
      unit_price: service?.default_price || 0,
      total_price: (service?.default_price || 0) * (updatedItems[index].quantity || 1),
    };
    setItems(updatedItems);
  };


  const handleAddItem = () => {
    setItems([
      ...items,
      {
        service_name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total_price: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const getTotalValue = () => {
    return items.reduce((acc, item) => acc + (item.total_price || 0), 0);
  };

  const updateBudget = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('budgets')
        .update({
          client_name: formData.client_name,
          client_contact: formData.client_contact,
          client_address: formData.client_address,
          description: formData.description,
          valid_until: formData.valid_until,
          status: formData.status,
          total_value: getTotalValue(),
        })
        .eq('id', budget.id);
      if (error) throw error;

      await supabase.from('budget_items').delete().eq('budget_id', budget.id);

      const itemsToInsert = items.map((item) => ({
        budget_id: budget.id,
        service_name: item.service_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: insError } = await supabase
        .from('budget_items')
        .insert(itemsToInsert);
      if (insError) throw insError;
    },
    onSuccess: () => {
      toast.success('Orçamento atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar orçamento: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateBudget.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>Nome do Cliente</Label>
            <Input
              value={formData.client_name}
              onChange={(e) =>
                setFormData({ ...formData, client_name: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label>Contato</Label>
            <Input
              value={formData.client_contact}
              onChange={(e) =>
                setFormData({ ...formData, client_contact: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label>Endereço</Label>
            <Input
              value={formData.client_address}
              onChange={(e) =>
                setFormData({ ...formData, client_address: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
          </div>

          <div>
            <Label>Válido até</Label>
            <Input
              type="date"
              value={formData.valid_until}
              onChange={(e) =>
                setFormData({ ...formData, valid_until: e.target.value })
              }
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                setFormData({ ...formData, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="reprovado">Reprovado</SelectItem>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <SelectItem value="sent">Enviado</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Itens do orçamento */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Itens do Orçamento</Label>
              <Button
                type="button"
                onClick={handleAddItem}
                variant="outline"
                size="sm"
              >
                <Plus size={16} /> Adicionar Item
              </Button>
            </div>

            {items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum item adicionado.
              </p>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id ?? index}
                  className="border rounded-lg p-4 space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <Button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      variant="ghost"
                      size="sm"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Serviço</Label>
                      <Textarea
  placeholder="Digite o nome do serviço"
  value={item.service_name}
  onChange={(e) =>
    handleItemChange(index, 'service_name', e.target.value)
  }
/>

                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        className="min-h-[60px]"
                        value={item.description || ''}
                        onChange={(e) =>
                          handleItemChange(index, 'description', e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', Number(e.target.value))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Preço Unitário</Label>
                      <Input
                        type="number"
                        step={0.01}
                        min={0}
                        value={item.unit_price}
                        onChange={(e) =>
                          handleItemChange(index, 'unit_price', Number(e.target.value))
                        }
                        required
                      />
                    </div>

                    <div>
                      <Label>Total</Label>
                      <Input
                        type="number"
                        step={0.01}
                        value={item.total_price}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Dialog open={editServiceIndex !== null} onOpenChange={() => setEditServiceIndex(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Serviço</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <Label htmlFor="service-name">Nome</Label>
                <Textarea
                  id="service-name"
                  value={editServiceData?.name || ''}
                  onChange={(e) =>
                    setEditServiceData(prev => prev ? { ...prev, name: e.target.value } : null)
                  }
                />

                <Label htmlFor="service-price">Preço padrão</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="service-price"
                  value={editServiceData?.default_price ?? ''}
                  onChange={(e) =>
                    setEditServiceData(prev => prev ? { ...prev, default_price: parseFloat(e.target.value) } : null)
                  }
                />

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={async () => {
                      if (!editServiceData) return;

                      const { error } = await supabase
                        .from('services')
                        .update({
                          name: editServiceData.name,
                          default_price: editServiceData.default_price,
                        })
                        .eq('id', editServiceData.id);

                      if (error) {
                        toast.error('Erro ao atualizar serviço.');
                        return;
                      }

                      const updatedServices = services.map((s) =>
                        s.id === editServiceData.id ? { ...s, ...editServiceData } : s
                      );

                      queryClient.setQueryData(['services'], updatedServices);

                      if (editServiceIndex !== null) {
                        handleItemChange(editServiceIndex, 'unit_price', editServiceData.default_price);
                        handleItemChange(
                          editServiceIndex,
                          'total_price',
                          editServiceData.default_price * items[editServiceIndex].quantity
                        );
                      }

                      toast.success('Serviço atualizado com sucesso!');
                      setEditServiceIndex(null);
                    }}
                  >
                    Salvar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>


          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-lg font-bold">
              Total: R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={updateBudget.isPending}>
                {updateBudget.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBudgetDialog;
