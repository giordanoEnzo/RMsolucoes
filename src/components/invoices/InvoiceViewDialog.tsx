import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { FileText, Download, X, Calendar, User, DollarSign, Clock, Package, Loader2 } from 'lucide-react';
import { Invoice } from '../../types/database';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getInvoiceItems, InvoiceItem } from '../../utils/invoiceUtils';

interface InvoiceViewDialogProps {
  invoice: Invoice;
  onClose: () => void;
  onGeneratePDF: () => void;
}

export const InvoiceViewDialog: React.FC<InvoiceViewDialogProps> = ({
  invoice,
  onClose,
  onGeneratePDF,
}) => {
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);

  const ordersArray = Array.isArray(invoice.orders) ? invoice.orders : [];
  const extrasArray = Array.isArray(invoice.extras) ? invoice.extras : [];

  const totalValue = ordersArray.reduce((sum, o) => sum + (o.sale_value ?? 0), 0) +
    extrasArray.reduce((sum, e) => sum + (e.value ?? 0), 0);

  // Buscar itens da fatura
  useEffect(() => {
    const loadItems = async () => {
      setItemsLoading(true);
      try {
        const items = await getInvoiceItems(invoice.id);
        setInvoiceItems(items);
      } catch (error) {
        console.error('Erro ao carregar itens:', error);
      } finally {
        setItemsLoading(false);
      }
    };

    loadItems();
  }, [invoice.id]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#2D3D2C]" />
            <h2 className="text-2xl font-bold text-gray-900">
              Fatura {ordersArray.map(o => o.order_number).join(', ') || 'N/A'}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Informações do Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Cliente:</span>
                <span>{invoice.client_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Período:</span>
                <span>
                  {format(new Date(invoice.start_date), 'dd/MM/yyyy', { locale: ptBR })} a{' '}
                  {format(new Date(invoice.end_date), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Data de Emissão:</span>
                <span>
                  {format(new Date(invoice.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Financeiro */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Valor dos Serviços</div>
                  <div className="text-lg font-bold text-[#2D3D2C]">
                    R$ {ordersArray.reduce((sum, o) => sum + (o.sale_value ?? 0), 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">Extras</div>
                  <div className="text-lg font-bold text-[#2D3D2C]">
                    R$ {extrasArray.reduce((sum, e) => sum + (e.value ?? 0), 0).toFixed(2)}
                  </div>
                </div>
                <div className="text-center p-3 bg-[#2D3D2C] text-white rounded-lg">
                  <div className="text-sm">Total</div>
                  <div className="text-xl font-bold">
                    R$ {totalValue.toFixed(2)}
                  </div>
                </div>
              </div>
              
              {invoice.total_time && (
                <div className="flex items-center gap-2 pt-2">
                  <Clock className="h-4 w-4" />
                  <span className="font-medium">Tempo Total:</span>
                  <Badge variant="secondary">
                    {invoice.total_time.toFixed(2)} horas
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ordens de Serviço */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Ordens de Serviço ({ordersArray.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordersArray.map((order, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">OS #{order.order_number}</h4>
                        {order.service_description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {order.service_description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline">
                        R$ {(order.sale_value ?? 0).toFixed(2)}
                      </Badge>
                    </div>
                    
                    {order.total_hours && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>{order.total_hours.toFixed(2)} horas</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Itens Detalhados */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Itens Detalhados
                {itemsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span className="text-gray-600">Carregando itens...</span>
                </div>
              ) : invoiceItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum item detalhado encontrado</p>
                  <p className="text-sm">Os valores estão consolidados nas ordens de serviço acima</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoiceItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {item.service_name}
                          </h4>
                          {item.service_description && (
                            <div className="mt-2">
                              <Separator className="my-2" />
                              <p className="text-sm text-gray-700 leading-relaxed">
                                {item.service_description}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <Badge variant="outline" className="mb-1">
                            R$ {(item.sale_value ?? 0).toFixed(2)}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {item.quantity}x R$ {(item.unit_price ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extras */}
          {extrasArray.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  Itens Extras ({extrasArray.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {extrasArray.map((extra, index) => (
                    <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                      <span>{extra.description}</span>
                      <Badge variant="outline">
                        R$ {(extra.value ?? 0).toFixed(2)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button 
            onClick={onGeneratePDF}
            className="bg-[#2D3D2C] hover:bg-[#374C36] text-white gap-2"
          >
            <Download className="h-4 w-4" />
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
