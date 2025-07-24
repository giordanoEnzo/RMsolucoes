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
import NewInvoiceDialog from '@/components/invoices/NewInvoiceDialog';
import { InvoicePDFGenerator } from '@/components/invoices/InvoicePDFGenerator';

const fetchInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

const handleDeleteInvoice = async (id: number, refetch: () => void) => {
  const { error } = await supabase.from('invoices').delete().eq('id', id);

  if (error) {
    alert('Erro ao excluir fatura: ' + error.message);
  } else {
    alert('Fatura excluída com sucesso!');
    refetch(); // Atualiza a lista
  }
};

const InvoicesPage: React.FC = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const {
    data: invoices = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: fetchInvoices,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 ">Faturas</h1>
        <Button onClick={() => setOpenDialog(true)} className="bg-[#2D3D2C] hover:bg-[#374C36] text-white">
          <Plus size={16} />
          Nova Fatura
        </Button>
      </div>

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
          ) : invoices.length > 0 ? (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex justify-between items-center border-b pb-3"
                >
                  <div>
                    <p className="font-semibold">Fatura #{invoice.id}</p>
                    <p className="text-sm text-muted-foreground">
                      Cliente: {invoice.client_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total: R${' '}
                      {(
                        (invoice.orders?.reduce(
                          (sum, o) => sum + (o.sale_value ?? 0),
                          0
                        ) ?? 0) +
                        (invoice.extras?.reduce(
                          (sum, e) => sum + (e.value ?? 0),
                          0
                        ) ?? 0)
                      ).toFixed(2)}{' '}
                      | Tempo: {invoice.total_time?.toFixed(2)}h
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setSelectedInvoice(invoice)}
                      className="bg-[#2D3D2C] hover:bg-[#374C36] text-white"
                    >
                      <FileText size={16} />
                      Gerar PDF
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        window.confirm(
                          'Tem certeza que deseja excluir esta fatura?'
                        ) && handleDeleteInvoice(invoice.id, refetch)
                      }
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-6">
              Nenhuma fatura encontrada.
            </p>
          )}
        </CardContent>
      </Card>

      <NewInvoiceDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        onCreated={refetch}
      />

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
              id: order.id,
              order_number: order.id,
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

export default InvoicesPage;
