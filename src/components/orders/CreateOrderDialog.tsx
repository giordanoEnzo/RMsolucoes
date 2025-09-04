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
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CreateOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateOrderDialog: React.FC<CreateOrderDialogProps> = ({ open, onOpenChange }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    client_id: '',
    client_name: '',
    client_contact: '',
    client_address: '',
    service_description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    assigned_worker_id: '',

  });

  const [items, setItems] = useState<any[]>([{
    service_name: '',
    service_description: '',
    quantity: 1,
    unit_price: 0,
    sale_value: 0,
  }]);

  const [newServiceData, setNewServiceData] = useState({ name: '', default_price: 0 });
  const [isCreatingServiceIndex, setIsCreatingServiceIndex] = useState<number | null>(null);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [editServiceIndex, setEditServiceIndex] = useState<number | null>(null);
  const [editServiceData, setEditServiceData] = useState<{ id: string; name: string; default_price: number } | null>(null);


  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('services').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('id, name').eq('role', 'worker');
      if (error) throw error;
      return data;
    }
  });

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

  const handleServiceSelect = (index: number, name: string) => {
    const service = services.find(s => s.name === name);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      service_name: name,
      unit_price: service?.default_price || 0,
      sale_value: (service?.default_price || 0) * (newItems[index].quantity || 1),
    };
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].sale_value = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0);
    }
    setItems(newItems);
  };

  const handleCreateService = async (index: number) => {
    if (!newServiceData.name || newServiceData.default_price <= 0) {
      toast.error('Preencha o nome e o preço do novo serviço.');
      return;
    }

    const { data: newService, error } = await supabase.from('services').insert({
      name: newServiceData.name,
      default_price: newServiceData.default_price,
    }).select().single();

    if (error || !newService) {
      toast.error('Erro ao criar serviço.');
      return;
    }

    // Atualiza o item no formulário com o novo serviço
    updateItem(index, 'service_name', newService.name);
    updateItem(index, 'unit_price', newService.default_price);
    updateItem(index, 'sale_value', newService.default_price * items[index].quantity);

    // Limpa o estado de criação
    setNewServiceData({ name: '', default_price: 0 });
    setIsCreatingServiceIndex(null);
    toast.success('Serviço criado com sucesso!');
  };


  const addItem = () => {
    setItems([
      ...items,
      { service_name: '', service_description: '', quantity: 1, unit_price: 0, sale_value: 0 },
    ]);
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.sale_value || 0), 0);
  };

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      let clientId = orderData.client_id;

      if (!clientId) {
        const { data: newClient, error } = await supabase.from('clients').insert({
          name: orderData.client_name,
          contact: orderData.client_contact,
          address: orderData.client_address,


        }).select().single();

        if (error || !newClient) throw error;
        clientId = newClient.id;
      }

      const { data: orderNumber, error: numError } = await supabase.rpc('generate_order_number');
      if (numError) throw numError;




      const { data: order, error: orderError } = await supabase.from('service_orders').insert({
        order_number: orderNumber,
        client_id: clientId,
        client_name: orderData.client_name,
        client_contact: orderData.client_contact,
        client_address: orderData.client_address,
        service_description: orderData.service_description,
        sale_value: orderData.sale_value,
        created_by: profile?.id,
        urgency: orderData.urgency,
        assigned_worker_id: orderData.assigned_worker_id || null,
        status: 'pendente',
      }).select().single();

      if (orderError) throw orderError;

      if (orderData.items?.length > 0) {
        const { error: itemsError } = await supabase.from('service_order_items').insert(
          orderData.items.map((item: any) => ({
            order_id: order.id,
            service_name: item.service_name,
            service_description: item.service_description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            sale_value: item.sale_value,
          }))
        );
        if (itemsError) throw itemsError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Ordem criada com sucesso!');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error('Erro: ' + err.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate({
      ...formData,
      sale_value: getTotalValue(),
      items,
    });
  };

  useEffect(() => {
    if (!open) {
      setFormData({
        client_id: '',
        client_name: '',
        client_contact: '',
        client_address: '',
        service_description: '',
        urgency: 'medium',
        assigned_worker_id: '',
        deadline: '',
      });
      setItems([{
        service_name: '',
        service_description: '',
        quantity: 1,
        unit_price: 0,
        sale_value: 0,
      }]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Ordem de Serviço</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cliente e prazo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select onValueChange={handleClientSelect}>
                <SelectTrigger><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_client">+ Novo Cliente</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo de Conclusão</Label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
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
              value={formData.service_description}
              onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
              className="max-h-40 overflow-y-auto"
            />
          </div>

          {/* Itens da ordem de serviço */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Itens de Serviço</Label>
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
                      <Textarea
                        placeholder="Descreva o serviço"
                        value={item.service_name}
                        onChange={(e) => updateItem(index, 'service_name', e.target.value)}
                        className="min-h-[80px]"
                      />


                      {editServiceData && (
                        <Dialog open={editServiceIndex !== null} onOpenChange={() => setEditServiceIndex(null)}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Editar Serviço</DialogTitle>
                            </DialogHeader>


                            <div className="space-y-2">
                              <Label htmlFor="service-name">Nome</Label>
                              <textarea
                                id="service-name"
                                value={editServiceData.name}
                                onChange={(e) =>
                                  setEditServiceData({ ...editServiceData, name: e.target.value })
                                }
                                placeholder="Digite o nome do serviço"
                                className="w-full min-h-[80px] resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>

                            <div className="flex justify-end">
                              <Button
                                onClick={async () => {
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
                                    updateItem(editServiceIndex, 'unit_price', editServiceData.default_price);
                                    updateItem(editServiceIndex, 'sale_value', editServiceData.default_price * items[editServiceIndex].quantity);
                                  }

                                  toast.success('Serviço atualizado com sucesso!');
                                  setEditServiceIndex(null);
                                }}
                              >
                                Salvar
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}


                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          const selected = services.find(s => s.name === item.service_name);
                          if (selected) {
                            setEditServiceIndex(index);
                            setEditServiceData(selected);
                          }
                        }}
                      >
                        Editar Serviço
                      </Button>


                      {isCreatingServiceIndex === index && (
                        <div className="mt-3 space-y-2">
                          <Label>Nome do novo serviço</Label>
                          <Textarea
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
                      <Textarea
                        value={item.service_description || ''}
                        onChange={(e) => updateItem(index, 'service_description', e.target.value)}
                        className="max-h-40 overflow-y-auto"

                      />
                    </div>
                  </div>

                  <div className={`${(profile?.role === 'manager' || profile?.role === 'worker') ? 'hidden' : 'grid grid-cols-3 gap-4'}`}>
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
                        value={item.sale_value || 0}
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Campos adicionais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Urgência</Label>
              <Select
                value={formData.urgency}
                onValueChange={(v: 'low' | 'medium' | 'high') => setFormData({ ...formData, urgency: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Operário Atribuído</Label>
              <Select
                value={formData.assigned_worker_id}
                onValueChange={(v) => setFormData({ ...formData, assigned_worker_id: v })}
              >
                <SelectTrigger><SelectValue placeholder="Selecione um operário" /></SelectTrigger>
                <SelectContent>
                  {workers.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <span className={`${(profile?.role === 'manager' || profile?.role === 'worker') ? 'hidden' : 'grid grid-cols-3 gap-4'}`}>
              Total: R$ {getTotalValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? 'Criando...' : 'Criar Ordem'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrderDialog;
