import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { ServiceOrder, OrderStatus, Urgency } from '@/types/database';
import { useServiceOrders, useWorkers } from '@/hooks/useServiceOrders';
import OnHoldReasonDialog from './OnHoldReasonDialog';
import { useServiceOrderCalls } from '@/hooks/useServiceOrderCalls';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ServiceOrder & { assigned_worker?: { name: string } };
}

const EditOrderDialog: React.FC<EditOrderDialogProps> = ({ open, onOpenChange, order }) => {
  const { updateOrder, isUpdating } = useServiceOrders();
  const { workers } = useWorkers();
  const { createCall } = useServiceOrderCalls();
  const { user, profile } = useAuth();
  const isWorker = profile?.role === 'worker';
  


  const [formData, setFormData] = useState({
    client_name: '',
    client_contact: '',
    client_address: '',
    service_description: '',
    sale_value: '',
    status: 'pending' as OrderStatus,
    urgency: 'medium' as Urgency,
    assigned_worker_id: '',
    deadline: '',
  });

  const [serviceItems, setServiceItems] = useState<any[]>([]);
  const [showOnHoldDialog, setShowOnHoldDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<OrderStatus | null>(null);

  // Serviços disponíveis
  const [services, setServices] = useState<{ id: string; name: string; default_price: number }[]>([]);

  // Item temporário para adicionar com confirmação
  const [draftItem, setDraftItem] = useState<any | null>(null);

  // Carrega serviços ao abrir o diálogo
  useEffect(() => {
    if (open) {
      supabase
        .from('services')
        .select('*')
        .order('name')
        .then(({ data, error }) => {
          if (error) {
            console.error('Erro ao buscar serviços:', error);
            toast.error('Erro ao carregar serviços');
          } else {
            setServices(data || []);
          }
        });
    }
  }, [open]);

  useEffect(() => {
    if (order) {
      setFormData({
        client_name: order.client_name || '',
        client_contact: order.client_contact || '',
        client_address: order.client_address || '',
        service_description: order.service_description || '',
        sale_value: order.sale_value?.toString() || '',
        status: order.status,
        urgency: order.urgency,
        assigned_worker_id: order.assigned_worker_id || 'unassigned',
        deadline: order.deadline || '',
      });

      const fetchItems = async () => {
        const { data, error } = await supabase
          .from('service_order_items')
          .select('*')
          .eq('order_id', order.id);
        if (error) console.error(error);
        else setServiceItems(data || []);
      };
      fetchItems();
    }
  }, [order]);

  useEffect(() => {
    const total = serviceItems.reduce((acc, item) => acc + (item.sale_value || 0), 0);
    setFormData((prev) => ({ ...prev, sale_value: total.toFixed(2) }));
  }, [serviceItems]);

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...serviceItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unit_price') {
      updated[index].sale_value = (updated[index].quantity || 0) * (updated[index].unit_price || 0);
    }
    setServiceItems(updated);
  };

  const removeItem = (index: number) => {
    const updated = [...serviceItems];
    updated.splice(index, 1);
    setServiceItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updateData = {
      id: order.id,
      ...formData,
      sale_value: parseFloat(formData.sale_value),
      assigned_worker_id:
        formData.assigned_worker_id === 'unassigned' ? null : formData.assigned_worker_id,
      deadline: formData.deadline || null,
    };

    await updateOrder(updateData);

    await supabase.from('service_order_items').delete().eq('order_id', order.id);
    const { error: insertError } = await supabase.from('service_order_items').insert(
      serviceItems.map((item) => ({
        order_id: order.id,
        service_name: item.service_name,
        service_description: item.service_description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        sale_value: item.sale_value,
      }))
    );

    if (insertError) {
      toast.error('Erro ao salvar itens!');
      console.error(insertError);
    }

    onOpenChange(false);
  };

  const handleServiceChange = (index: number, selectedServiceName: string) => {
    const selectedService = services.find(service => service.name === selectedServiceName);
    if (!selectedService) return;

    const updated = [...serviceItems];
    updated[index] = {
      ...updated[index],
      service_name: selectedService.name,
      service_description: '', // pode ajustar se quiser
      unit_price: selectedService.default_price || 0,
      sale_value: (updated[index].quantity || 1) * (selectedService.default_price || 0),
    };

    setServiceItems(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ordem - {order?.order_number}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campos principais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nome do Cliente</Label>
              <Input
                value={formData.client_name}
                onChange={(e) => setFormData((p) => ({ ...p, client_name: e.target.value }))}
                disabled={isWorker}
              />
            </div>
            <div>
              <Label>Contato</Label>
              <Input
                value={formData.client_contact}
                onChange={(e) => setFormData((p) => ({ ...p, client_contact: e.target.value }))}
                disabled={isWorker}
              />
            </div>
            <div className="col-span-2">
              <Label>Endereço</Label>
              <Input
                value={formData.client_address}
                onChange={(e) => setFormData((p) => ({ ...p, client_address: e.target.value }))}
                disabled={isWorker}
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.service_description}
              onChange={(e) => setFormData((p) => ({ ...p, service_description: e.target.value }))}
              disabled={isWorker}
            />
          </div>

          {/* Itens de serviço */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <Label>Itens de Serviço</Label>
              <Button type="button" onClick={() => setDraftItem({
                service_order_id: order.id,
                service_name: '',
                service_description: '',
                quantity: 1,
                unit_price: 0,
                sale_value: 0,
              })} variant="outline" size="sm">
                <Plus size={16} /> Adicionar Item
              </Button>
            </div>

            <div className="space-y-4">
              {/* Lista de itens existentes */}
              {serviceItems.map((item, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Serviço</Label>
                      <Select
                        value={item.service_name}
                        onValueChange={(value) => handleServiceChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.name}>
                              {service.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={item.service_description}
                        onChange={(e) => updateItem(index, 'service_description', e.target.value)}
                      />
                    </div>
                  </div>

                 
                  <div className={`${(profile?.role === 'manager' || profile?.role === 'worker') ? 'hidden' : 'grid grid-cols-3 gap-4'}`}>
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Preço Unitário</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input type="number" readOnly value={item.sale_value || 0} />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      Remover Item
                    </Button>
                  </div>
                </div>
              ))}

              {/* Item temporário para confirmar antes de adicionar */}
              {draftItem && (
                <div className="border rounded-lg p-4 space-y-4 bg-muted">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Serviço</Label>
                      <Select
                        value={draftItem.service_name}
                        onValueChange={(value) => {
                          const selected = services.find((s) => s.name === value);
                          if (selected) {
                            setDraftItem((prev) => ({
                              ...prev,
                              service_name: selected.name,
                              unit_price: selected.default_price,
                              sale_value: (prev.quantity || 1) * selected.default_price,
                            }));
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((s) => (
                            <SelectItem key={s.id} value={s.name}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        value={draftItem.service_description}
                        onChange={(e) =>
                          setDraftItem((prev) => ({ ...prev, service_description: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className={`${(profile?.role === 'manager' || profile?.role === 'worker') ? 'hidden' : 'grid grid-cols-3 gap-4'}`}>
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draftItem.quantity}
                        onChange={(e) => {
                          const qty = parseInt(e.target.value) || 1;
                          setDraftItem((prev) => ({
                            ...prev,
                            quantity: qty,
                            sale_value: qty * prev.unit_price,
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Preço Unitário</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={draftItem.unit_price}
                        onChange={(e) => {
                          const price = parseFloat(e.target.value) || 0;
                          setDraftItem((prev) => ({
                            ...prev,
                            unit_price: price,
                            sale_value: price * prev.quantity,
                          }));
                        }}
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <Input readOnly value={draftItem.sale_value.toFixed(2)} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDraftItem(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setServiceItems([...serviceItems, draftItem]);
                        setDraftItem(null);
                      }}
                      disabled={!draftItem.service_name}
                    >
                      Confirmar Item
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Urgência, status, trabalhador */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => {
                  if (value === 'on_hold') {
                    setPendingStatus(value as OrderStatus);
                    setShowOnHoldDialog(true);
                  } else {
                    setFormData((prev) => ({ ...prev, status: value as OrderStatus }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['worker', 'manager'].includes(profile?.role || '') ? (
                    <SelectItem value="on_hold">Em Espera</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="on_hold">Em Espera</SelectItem>
                      <SelectItem value="stopped">Paralisado</SelectItem>
                      <SelectItem value="quality_control">Controle de Qualidade</SelectItem>
                      <SelectItem value="ready_for_pickup">Aguardando Retirada</SelectItem>
                      <SelectItem value="awaiting_installation">Aguardando Instalação</SelectItem>
                      <SelectItem value="to_invoice">Faturar</SelectItem>
                      <SelectItem value="completed">Finalizado</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </>
                  )}
                </SelectContent>

              </Select>
            </div>
            <div>
              <Label>Urgência</Label>
              <Select
                value={formData.urgency}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, urgency: value as Urgency }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Colaborador</Label>
              <Select
                value={formData.assigned_worker_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, assigned_worker_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar colaborador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Não atribuído</SelectItem>
                  {workers.map((worker) => (
                    <SelectItem key={worker.id} value={worker.id}>
                      {worker.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>

        <OnHoldReasonDialog
          open={showOnHoldDialog}
          onOpenChange={setShowOnHoldDialog}
          serviceOrderId={order.id}
          onReasonSubmitted={async (reason) => {
            if (pendingStatus && reason) {
              setFormData((prev) => ({ ...prev, status: pendingStatus }));
              setPendingStatus(null);
              try {
                await createCall({ service_order_id: order.id, reason, created_by: user?.id || '' });
                toast.success('Chamado criado com sucesso');
              } catch (err) {
                toast.error('Erro ao criar chamado');
                console.error(err);
              }
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default EditOrderDialog;
