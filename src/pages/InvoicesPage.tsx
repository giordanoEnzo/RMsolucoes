import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Invoice } from '@/types/database';
//import NewInvoiceDialog from '@/components/invoices/NewInvoiceDialog';
import { InvoicePDFGenerator } from '@/components/invoices/InvoicePDFGenerator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const fetchInvoices = async (filters: {
  clientId: string;
  startDate: string;
  endDate: string;
}): Promise<Invoice[]> => {
  let query = supabase
    .from('invoices')
    .select('*')
    .order('start_date', { ascending: false });

  if (filters.clientId)
    query = query.eq('client_id', filters.clientId);

  if (filters.startDate)
    query = query.gte('start_date', filters.startDate);

  if (filters.endDate)
    query = query.lte('start_date', filters.endDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

const groupInvoicesByClientAndMonth = (invoices: Invoice[]) => {
  const groups: Record<string, Record<string, Invoice[]>> = {};

  invoices.forEach((invoice) => {
    const client = invoice.client_name || 'Sem Cliente';
    const date = new Date(invoice.start_date || invoice.created_at || '');
    const month = format(date, 'MMMM yyyy', { locale: ptBR });

    if (!groups[client]) groups[client] = {};
    if (!groups[client][month]) groups[client][month] = [];

    groups[client][month].push(invoice);
  });

  return groups;
};

const InvoicesPage: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    clientId: '',
    startDate: '',
    endDate: '',
  });

  const { clients = [] } = useClients();

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['invoices', appliedFilters],
    queryFn: () => fetchInvoices(appliedFilters),
  });

  const grouped = groupInvoicesByClientAndMonth(invoices);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Faturas</h1>
        
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Cliente</Label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <Button className="mt-4" onClick={() => setAppliedFilters({ clientId, startDate, endDate })}>
          Aplicar Filtros
        </Button>
      </Card>

      {/* Lista Agrupada */}
      <Card className="shadow-md border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-muted-foreground">
            Lista de Faturas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10 text-gray-500">
              <Loader2 className="animate-spin mr-2" size={20} />
              Carregando faturas...
            </div>
          ) : invoices.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhuma fatura encontrada.
            </p>
          ) : (
            Object.entries(grouped).map(([clientName, months]) => (
              <div key={clientName} className="mb-6">
                <h2 className="text-xl font-bold mb-2">{clientName}</h2>

                {Object.entries(months).map(([month, invoices]) => (
                  <div key={month} className="mb-4 ml-4">
                    <h3 className="text-md font-semibold text-muted-foreground mb-2">{month}</h3>

                    <div className="space-y-3">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="flex justify-between items-center border-b pb-2"
                        >
                          <div>
                            <p className="font-semibold">
                              Fatura {invoice.orders?.map(o => o.order_number).join(', ') ?? 'N/A'}</p>
                            <p className="text-sm text-muted-foreground">
                              Total: R$ {
                                ((invoice.orders?.reduce((sum, o) => sum + (o.sale_value ?? 0), 0) ?? 0) +
                                 (invoice.extras?.reduce((sum, e) => sum + (e.value ?? 0), 0) ?? 0)).toFixed(2)
                              } | Tempo: {invoice.total_time?.toFixed(2)}h
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setSelectedInvoice(invoice)}
                              className="bg-[#2D3D2C] hover:bg-[#374C36] text-white"
                            >
                              <FileText size={16} /> Gerar PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                window.confirm('Tem certeza que deseja excluir esta fatura?') &&
                                handleDeleteInvoice(invoice.id, refetch)
                              }
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      

      {selectedInvoice && (
        <InvoicePDFGenerator
          invoice={{
            id: selectedInvoice.id,
            number: selectedInvoice.id,
            client_name: selectedInvoice.client_name,
            start_date: selectedInvoice.start_date ?? '',
            end_date: selectedInvoice.end_date ?? '',
            total_value: selectedInvoice.total_value,
            total_hours: selectedInvoice.total_time || 0,
            service_orders: selectedInvoice.orders.map((order) => ({
              order: order.id,
              order_number: order.order_number,
              sale_value: order.sale_value,
              total_hours: order.service_time,
            })),
            extras: selectedInvoice.extras,
          }}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

const handleDeleteInvoice = async (id: number, refetch: () => void) => {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) {
    alert('Erro ao excluir fatura: ' + error.message);
  } else {
    alert('Fatura excluída com sucesso!');
    refetch();
  }
};

export default InvoicesPage;
