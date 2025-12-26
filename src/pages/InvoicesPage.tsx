import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, FileText, Eye, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { Invoice } from '../types/database';
import { InvoicePDFGenerator } from '../components/invoices/InvoicePDFGenerator';
import { InvoiceViewDialog } from '../components/invoices/InvoiceViewDialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const months = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

const fetchInvoices = async (filters: {
  clientName: string;
  month: string;
  year: string;
}): Promise<Invoice[]> => {
  const startDate = startOfMonth(new Date(parseInt(filters.year), parseInt(filters.month))).toISOString();
  const endDate = endOfMonth(new Date(parseInt(filters.year), parseInt(filters.month))).toISOString();

  let query = supabase
    .from('invoices')
    .select('*')
    .order('start_date', { ascending: false });

  if (filters.clientName) query = query.ilike('client_name', `%${filters.clientName}%`);

  // Filter by date range of the selected month
  query = query.gte('created_at', startDate);
  query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

const InvoicesPage: React.FC = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // Filters State
  const [clientName, setClientName] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().getMonth().toString());
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  // Generate year options (current year - 5 to current year + 1)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, i) => (currentYear - 5 + i).toString());

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['invoices', clientName, selectedMonth, selectedYear],
    queryFn: () => fetchInvoices({ clientName, month: selectedMonth, year: selectedYear }),
  });

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta fatura?')) return;

    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      alert('Erro ao excluir fatura: ' + error.message);
    } else {
      refetch();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Faturas</h1>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Nome do Cliente</Label>
            <Input
              type="text"
              placeholder="Buscar por cliente..."
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
          <div>
            <Label>Mês</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ano</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Tabela de Faturas */}
      <Card className="shadow-md border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-muted-foreground">
            Lista de Faturas {invoices.length > 0 && `(${invoices.length})`}
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
              Nenhuma fatura encontrada para este período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome do Cliente</TableHead>
                  <TableHead>Número da Fatura</TableHead>
                  <TableHead>Data de Faturamento</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const ordersArray = Array.isArray(invoice.orders) ? invoice.orders : [];
                  const invoiceNumber = ordersArray.map(o => o.order_number).join(', ') || 'N/A';
                  const billingDate = invoice.created_at ? format(parseISO(invoice.created_at), 'dd/MM/yyyy') : '-';

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.client_name}</TableCell>
                      <TableCell>{invoiceNumber}</TableCell>
                      <TableCell>{billingDate}</TableCell>
                      <TableCell className="text-right flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewingInvoice(invoice)}
                          className="border-[#2D3D2C] text-[#2D3D2C] hover:bg-[#2D3D2C] hover:text-white h-8 w-8 p-0"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                          className="bg-[#2D3D2C] hover:bg-[#374C36] text-white h-8 w-8 p-0"
                          title="Gerar PDF"
                        >
                          <FileText size={16} />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="h-8 w-8 p-0"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {viewingInvoice && (
        <InvoiceViewDialog
          invoice={viewingInvoice}
          onClose={() => setViewingInvoice(null)}
          onGeneratePDF={() => {
            setViewingInvoice(null);
            setSelectedInvoice(viewingInvoice);
          }}
        />
      )}

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
            service_orders: (Array.isArray(selectedInvoice.orders) ? selectedInvoice.orders : []).map(
              (order) => ({
                order_number: order.order_number,
                sale_value: order.sale_value,
                total_hours: order.total_hours || order.service_time || 0,
                items: order.items || [],
              })
            ),
            extras: selectedInvoice.extras,
          }}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};

export default InvoicesPage;
