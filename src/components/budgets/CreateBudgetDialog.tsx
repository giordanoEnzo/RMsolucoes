import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Client, Service, BudgetItem } from '@/types/database';

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateBudgetDialog: React.FC<CreateBudgetDialogProps> = ({ open, onOpenChange }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_contact: '',
    client_address: '',
    description: '',
    valid_until: '',
  });

  const [items, setItems] = useState<Partial<BudgetItem>[]>([{
    service_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total_price: 0,
  }]);

  const [isCreatingServiceIndex, setIsCreatingServiceIndex] = useState<number | null>(null);
  const [newServiceData, setNewServiceData] = useState({ name: '', default_price: 0 });

  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const handleCreateService = async (index: number) => {
    try {
      const { data: newService, error } = await supabase
        .from('services')
        .insert({
          name: newServiceData.name,
          default_price: newServiceData.default_price,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        service_name: newService.name,
        unit_price: newService.default_price,
        total_price: newService.default_price * (updatedItems[index].quantity || 1),
      };
      setItems(updatedItems);

      setNewServiceData({ name: '', default_price: 0 });
      setIsCreatingServiceIndex(null);
      toast.success('Serviço criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } catch (error: any) {
      toast.error('Erro ao criar serviço: ' + error.message);
    }
  };

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
  });

  const { data: services = [] } = useQuery({
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

  const createBudgetMutation = useMutation({
    mutationFn: async (budgetData: any) => {
      const { data: budgetNumber, error: numberError } = await supabase.rpc('generate_budget_number');
      if (numberError) throw numberError;

      const { data: budget, error: budgetError } = await supabase
        .from('budgets')
        .insert({
          budget_number: budgetNumber,
          client_id: budgetData.client_id || null,
          client_name: budgetData.client_name,
          client_contact: budgetData.client_contact,
          client_address: budgetData.client_address,
          description: budgetData.description,
          valid_until: budgetData.valid_until || null,
          total_value: budgetData.total_value,
          created_by: profile?.id,
          status: 'pendente',
        })
        .select()
        .single();

      if (budgetError) throw budgetError;

      if (budgetData.items?.length > 0) {
        const { error: itemsError } = await supabase
          .from('budget_items')
          .insert(budgetData.items.map((item: any) => ({
            budget_id: budget.id,
            service_name: item.service_name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })));
        if (itemsError) throw itemsError;
      }

      return budget;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('Orçamento criado com sucesso!');
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('Erro ao criar orçamento: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      client_id: '',
      client_name: '',
      client_contact: '',
      client_address: '',
      description: '',
      valid_until: '',
    });
    setItems([{
      service_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const handleClientSelect = (clientId: string) => {
    if (clientId === 'new_client') {
      setIsCreatingClient(true);
      setFormData(prev => ({
        ...prev,
        client_id: '',
        client_name: '',
        client_contact: '',
        client_address: '',
      }));
    } else {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        setFormData({
          ...formData,
          client_id: clientId,
          client_name: client.name,
          client_contact: client.contact,
          client_address: client.address,
        });
      }
    }
  };

  const handleServiceSelect = (index: number, serviceName: string) => {
    const service = services.find(s => s.name === serviceName);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      service_name: serviceName,
      unit_price: service?.default_price || 0,
      total_price: (service?.default_price || 0) * (newItems[index].quantity || 1),
    };
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].total_price = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      service_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      total_price: 0,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  };

  const handleCreateClient = async () => {
    try {
      const { data: newClient } = await supabase
        .from('clients')
        .insert({
          name: formData.client_name,
          contact: formData.client_contact,
          address: formData.client_address,
        })
        .select()
        .single();

      setFormData({
        ...formData,
        client_id: newClient.id,
        client_name: newClient.name,
        client_contact: newClient.contact,
        client_address: newClient.address,
      });

      setIsCreatingClient(false);
      toast.success('Cliente criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar cliente: ' + error.message);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const budgetData = {
      ...formData,
      total_value: getTotalValue(),
      items: items.filter(item => item.service_name),
    };
    createBudgetMutation.mutate(budgetData);
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente e validade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select onValueChange={handleClientSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_client">+ Cadastrar novo cliente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Válido até</Label>
              <Input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
              />
            </div>
          </div>

          {/* Dados do cliente */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Contato</Label>
              <Input
                value={formData.client_contact}
                onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Endereço</Label>
            <Input
              value={formData.client_address}
              onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
            />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Itens do orçamento */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Itens do Orçamento</Label>
              <Button type="button" onClick={addItem} variant="outline" size="sm">
                <Plus size={16} /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Serviço</Label>
                      <Select
                        onValueChange={(value) => {
                          if (value === 'new_service') {
                            setIsCreatingServiceIndex(index);
                            updateItem(index, 'service_name', '');
                          } else {
                            handleServiceSelect(index, value);
                            setIsCreatingServiceIndex(null);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new_service">+ Cadastrar novo serviço</SelectItem>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.name}>{service.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {isCreatingServiceIndex === index && (
                        <div className="mt-3 space-y-2">
                          <Label>Nome do novo serviço</Label>
                          <Input
                            value={newServiceData.name}
                            onChange={(e) => setNewServiceData({ ...newServiceData, name: e.target.value })}
                          />
                          <Label>Preço</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newServiceData.default_price}
                            onChange={(e) => setNewServiceData({ ...newServiceData, default_price: parseFloat(e.target.value) })}
                          />
                          <Button type="button" size="sm" onClick={() => handleCreateService(index)}>Salvar Serviço</Button>
                        </div>
                      )}
                    </div>

                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={item.description || ''}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity || 1}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Preço Unitário</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price || 0}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input
                        type="number"
                        readOnly
                        value={item.total_price || 0}
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-lg font-bold">
              Total: R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createBudgetMutation.isPending}>
                {createBudgetMutation.isPending ? 'Criando...' : 'Criar Orçamento'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBudgetDialog;
