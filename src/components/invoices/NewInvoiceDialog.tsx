import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClients } from '@/hooks/useClients';
import { useServiceOrdersForInvoice } from '@/hooks/useServiceOrdersForInvoice';
import { createInvoice } from '@/services/invoiceService';
import { toast } from 'sonner';

interface ExtraItem {
  description: string;
  value: number;
}

interface NewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const NewInvoiceDialog: React.FC<NewInvoiceDialogProps> = ({
  open,
  onOpenChange,
  onCreated,
}) => {
  const [clientId, setClientId] = useState('');
  const [extras, setExtras] = useState<ExtraItem[]>([{ description: '', value: 0 }]);

  const { clients } = useClients();
  const client = clients.find((c) => c.id === clientId);

  const shouldFetchOrders = !!clientId;
  const {
    serviceOrders,
    totalValue,
    totalTime,
  } = useServiceOrdersForInvoice(clientId); // ⬅️ Atualize esse hook para aceitar apenas clientId

  const handleAddExtra = () => {
    setExtras([...extras, { description: '', value: 0 }]);
  };

  const handleExtraChange = (
    index: number,
    field: keyof ExtraItem,
    value: string
  ) => {
    const updated = [...extras];
    updated[index] = {
      ...updated[index],
      [field]: field === 'value' ? parseFloat(value) || 0 : value,
    };
    setExtras(updated);
  };

  const handleCreateInvoice = async () => {
    if (!clientId) {
      toast.warning('Selecione um cliente.');
      return;
    }

    if (serviceOrders.length === 0) {
      toast.warning('Nenhuma OS disponível para faturar.');
      return;
    }

    const response = await createInvoice({
      client_id: clientId,
      client_name: client?.name || 'Cliente',
      orders: serviceOrders.map((os) => ({
        id: os.id,
        order_number: os.order_number,
        sale_value: os.sale_value,
        total_hours: os.total_hours,
      })),
      extras,
      total_value: totalValue + extras.reduce((acc, e) => acc + e.value, 0),

      total_time: totalTime,
    });

    if (response?.error) {
      toast.error('Erro ao criar fatura: ' + response.error.message);
    } else {
      toast.success('Fatura criada com sucesso!');
      onOpenChange(false);
      onCreated?.();
      setClientId('');
      setExtras([{ description: '', value: 0 }]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Criar Nova Fatura</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente */}
          <div>
            <Label>Cliente</Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Selecione</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* OS Selecionadas */}
          <div>
            <Label>Ordens de Serviço</Label>
            {!shouldFetchOrders ? (
              <p className="text-sm text-muted-foreground">
                Selecione o cliente para listar OSs.
              </p>
            ) : serviceOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma OS encontrada para o cliente.
              </p>
            ) : (
              <>
                {serviceOrders.map((os) => (
                  <div key={os.id} className="border rounded p-2 my-2">
                    <p className="font-medium">OS {os.order_number}</p>
                    <p>Valor: R$ {os.sale_value.toFixed(2)}</p>
                    <p>Tempo: {os.total_hours.toFixed(2)}h</p>
                  </div>
                ))}
                <p className="font-semibold mt-2">
                  Total: R$ {totalValue.toFixed(2)} | {totalTime.toFixed(2)}h
                </p>
              </>
            )}
          </div>
          
          {/* Botão de Salvar */}
          <div className="pt-4 flex justify-end">
            <Button onClick={handleCreateInvoice}>Salvar Fatura</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewInvoiceDialog;
