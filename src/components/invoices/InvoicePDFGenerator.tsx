import React from 'react';
import { Button } from '../ui/button';
import { Download, Phone } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { supabase } from '../../integrations/supabase/client';
import { getInvoiceItems } from '../../utils/invoiceUtils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

const logopath = '/logonum.png';
const assinaturaPath = '/AssinaturaMarcioOficial.png';

interface ExtraItem {
  description: string;
  value?: number;
}

interface ServiceOrderItem {
  id: string;
  service_name: string;
  service_description: string;
  quantity: number;
  unit_price: number;
  sale_value: number;
  created_at: string;
  order_id: string | null;
  service_order_id: string;
}


interface ServiceOrder {
  order_number: string;
  service_description?: string;
  sale_value?: number;
  items?: ServiceOrderItem[];
}

interface Invoice {
  id: string;
  number: string;
  client_name: string;
  start_date: string;
  end_date: string;
  total_value?: number;
  service_orders: ServiceOrder[];
  extras?: ExtraItem[];
}

interface Props {
  invoice: Invoice;
  onClose: () => void;
}

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
};

export const InvoicePDFGenerator: React.FC<Props> = ({ invoice, onClose }) => {
  const [invoiceItems, setInvoiceItems] = React.useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = React.useState(true);
  
  // Estados para condições de pagamento
  const [paymentConditions, setPaymentConditions] = React.useState({
    pix: true,
    transferencia: true,
    dinheiro: true,
    cheque: true,
    cartao: false,
  });
  
  // Estado para observações
  const [observations, setObservations] = React.useState('');

  React.useEffect(() => {
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

  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 15;

    // Buscar itens da fatura se ainda não foram carregados
    let itemsToUse = invoiceItems;
    if (itemsToUse.length === 0) {
      try {
        itemsToUse = await getInvoiceItems(invoice.id);
      } catch (error) {
        console.error('Erro ao buscar itens para PDF:', error);
      }
    }

    // Verificar se temos itens para processar
    if (!itemsToUse || itemsToUse.length === 0) {
      console.warn('Nenhum item encontrado na fatura');
    }

    try {
      const logoBase64 = await loadImageAsBase64(logopath);
      doc.addImage(logoBase64, 'PNG', 20, 10, 30, 30);
    } catch (e) {
      console.warn('Erro ao carregar logo', e);
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RMSoluções', 60, y);
    doc.setFont(undefined, 'normal');
    doc.text('MARCIO JOSE LASTORIA 26654674880 | Email: rmsoldas@hotmail.com', 60, (y += 6));
    doc.text('CNPJ: 19.957.948/0001-68                        | Telefone: +55 (19) 99652-4173', 60, (y += 6));
    doc.text('Avenida Ângelo Franzini, 2438, barracão', 60, (y += 6));
    doc.text('Residencial Bosque de Versalles, Araras-SP', 60, (y += 6));
    doc.text('CEP 13609-391', 60, (y += 6));
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 60, (y += 6));
    y += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RMSoluções - Serralheria / Automação / Caldeiraria Agrícola', 20, y);
    y += 10;

    // Mostrar no título todos os order_numbers separados por vírgula
    doc.setFontSize(16);
    doc.text(
      `Fatura ${invoice.service_orders.map(o => o.order_number).join(', ') || 'N/A'}`,
      pageWidth / 2,
      y,
      { align: 'center' }
    );
    y += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.client_name, 45, y);
    y += 6;
    doc.text(`Período: ${invoice.start_date} a ${invoice.end_date}`, 20, y);
    y += 10;

    // Montar itens da tabela para PDF
    const items: any[] = [];

 
              
        itemsToUse.forEach((item) => {
          const serviceName = item.service_name || 'Serviço';
          const serviceDescription = item.service_description || '';
        
          const descriptionText = serviceDescription
            ? `\n-----------------------------------------------------------------------\n${serviceDescription}`
            : '';
        
          items.push([
            `${serviceName}${descriptionText}`,
            'und.',
            `R$ ${Number(item.unit_price ?? 0).toFixed(2)}`,
            `${item.quantity ?? 1}`,
            `R$ ${Number(item.sale_value ?? 0).toFixed(2)}`
          ]);
        });
        

    // Se não houver itens específicos, usar os dados das ordens de serviço
    if (items.length === 0) {
      invoice.service_orders.forEach((os) => {
        const serviceDescription = os.service_description || "Serviço executado";
        items.push([
          serviceDescription,
          'und.',
          `R$ ${(os.sale_value ?? 0).toFixed(2)}`,
          '1',
          `R$ ${(os.sale_value ?? 0).toFixed(2)}`
        ]);
      });
    }

    // Adicionar extras se existirem
    items.push(
      ...(invoice.extras ?? []).map((extra) => [
        extra.description || 'Extra sem descrição',
        'und.',
        `R$ ${Number(extra.value ?? 0).toFixed(2)}`,
        '1',
        `R$ ${Number(extra.value ?? 0).toFixed(2)}`
      ])
    );

    autoTable(doc, {
      startY: y,
      head: [['Descrição', 'Unidade', 'Preço unitário', 'Qtd.', 'Preço']],
      body: items,
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 95 }, // Coluna de descrição mais larga
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 0) {
          // Garantir que o texto seja processado corretamente
          const cellText = data.cell.text[0];
          
          if (typeof cellText === 'string' && cellText.includes('\n')) {
            const parts = cellText.split('\n');
            data.cell.text = parts;
          }
        }
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold'
      },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    const total = items.reduce((acc, item) => {
      const priceStr = item[4]; // Ex: "R$ 10.00"
      const numericValue = parseFloat(priceStr.replace('R$', '').replace(',', '.').trim());
      return acc + (isNaN(numericValue) ? 0 : numericValue);
    }, 0);

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: R$ ${total.toFixed(2)}`, pageWidth - 20, y, { align: 'right' });
    y += 10;

    // Observações (se houver)
    if (observations.trim() !== '') {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Observações', 20, y);
      y += 6;
      
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      
      // Quebrar texto em múltiplas linhas se necessário
      const obsLines = doc.splitTextToSize(observations, pageWidth - 40);
      doc.text(obsLines, 20, y);
      y += (obsLines.length * 5) + 10;
    }

    // Pagamento e dados bancários
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Pagamento', 20, y);
    y += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    
    // Criar texto de condições de pagamento baseado nas seleções
    const condicoes: string[] = [];
    if (paymentConditions.pix) condicoes.push('PIX');
    if (paymentConditions.transferencia) condicoes.push('transferência bancária');
    if (paymentConditions.dinheiro) condicoes.push('dinheiro');
    if (paymentConditions.cheque) condicoes.push('cheque');
    if (paymentConditions.cartao) condicoes.push('cartão');
    
    if (condicoes.length > 0) {
      const textoCondicoes = condicoes.join(', ').replace(/,([^,]*)$/, ' ou$1');
      doc.text(`Formas de pagamento: ${textoCondicoes}.`, 20, y);
      y += 6;
    }
    
    if (paymentConditions.pix) {
      doc.text('PIX: 19957948000168', 20, y);
      y += 6;
    }
    y += 4;

    doc.setFont(undefined, 'bold');
    doc.text('Dados Bancários', 20, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.text('Banco: Banco do Brasil', 20, y);
    y += 6;
    doc.text('Agência: 0341-7', 20, y);
    y += 6;
    doc.text('Conta: 65.675-5', 20, y);
    y += 6;
    doc.text('Tipo de conta: Corrente', 20, y);
    y += 6;
    doc.text('Titular da conta (CPF/CNPJ): 19.957.948/0001-68', 20, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.text('Agro não pode parar... Indústria não pode parar...', pageWidth / 2, (y += 10), {
      align: 'center',
    });

    doc.setFont(undefined, 'bold');
    doc.text(`Araras, ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, (y += 8), {
      align: 'center',
    });

    try {
      const assinaturaBase64 = await loadImageAsBase64(assinaturaPath);
      const imgWidth = 50;
      const imgHeight = 20;
      const centerX = (pageWidth - imgWidth) / 2;
      doc.addImage(assinaturaBase64, 'PNG', centerX, (y += 5), imgWidth, imgHeight);
    } catch (e) {
      console.warn('Erro ao carregar assinatura', e);
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(50, y + 25, pageWidth - 50, y + 25);

    doc.setFont(undefined, 'bold');
    doc.text('RMSoluções', pageWidth / 2, y + 32, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.text('Márcio Lastoria', pageWidth / 2, y + 38, { align: 'center' });

    return doc;
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = await generatePDF();
      // Criar nome do arquivo com nome do cliente
      const clientName = invoice.client_name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
      const fileName = `fatura_${invoice.number}_${clientName}.pdf`;
      doc.save(fileName);
      toast.success('PDF baixado com sucesso!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const sendPDFViaWhatsApp = async () => {
    try {
      const doc = await generatePDF();
      const blob = doc.output('blob');
      // Criar nome do arquivo com nome do cliente
      const clientName = invoice.client_name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
      const fileName = `faturas/fatura_${invoice.number}_${clientName}.pdf`;

      const { error } = await supabase.storage.from('pdfs').upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('pdfs').getPublicUrl(fileName);
      const url = data?.publicUrl;
      const msg = encodeURIComponent(`Olá ${invoice.client_name}, segue sua fatura: ${url}`);

      // Note: aqui você precisa ajustar para usar o telefone real do cliente
      window.open(`https://wa.me/55${invoice.client_name.replace(/\D/g, '')}?text=${msg}`, '_blank');
      toast.success('Fatura enviada via WhatsApp!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar via WhatsApp');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">
          Fatura: {invoice.service_orders?.map(o => o.order_number).join(', ') ?? 'N/A'}
        </h2>

        <div className="space-y-1 text-sm">
          <p><strong>Cliente:</strong> {invoice.client_name}</p>
          <p><strong>Período:</strong> {invoice.start_date} a {invoice.end_date}</p>
          <p><strong>OSs incluídas:</strong> {invoice.service_orders.length}</p>
          <p><strong>Itens encontrados:</strong> {itemsLoading ? 'Carregando...' : invoiceItems.length}</p>
          <p>
            <strong>Total:</strong> R$ {(
              (invoice.service_orders?.reduce((sum, o) => sum + (o.sale_value ?? 0), 0) ?? 0) +
              (invoice.extras?.reduce((sum, e) => sum + (e.value ?? 0), 0) ?? 0)
            ).toFixed(2)}
          </p>
        </div>

        <div className="mt-6 border-t pt-4">
          <h3 className="font-semibold mb-3 text-sm">Observações</h3>
          <Textarea
            placeholder="Digite aqui observações que aparecerão na fatura..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="min-h-[80px] resize-y"
          />
        </div>

        <div className="mt-4 border-t pt-4">
          <h3 className="font-semibold mb-3 text-sm">Formas de Pagamento</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pix"
                checked={paymentConditions.pix}
                onCheckedChange={(checked) => 
                  setPaymentConditions(prev => ({ ...prev, pix: checked as boolean }))
                }
              />
              <Label htmlFor="pix" className="text-sm cursor-pointer">PIX</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="transferencia"
                checked={paymentConditions.transferencia}
                onCheckedChange={(checked) => 
                  setPaymentConditions(prev => ({ ...prev, transferencia: checked as boolean }))
                }
              />
              <Label htmlFor="transferencia" className="text-sm cursor-pointer">Transferência Bancária</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dinheiro"
                checked={paymentConditions.dinheiro}
                onCheckedChange={(checked) => 
                  setPaymentConditions(prev => ({ ...prev, dinheiro: checked as boolean }))
                }
              />
              <Label htmlFor="dinheiro" className="text-sm cursor-pointer">Dinheiro</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cheque"
                checked={paymentConditions.cheque}
                onCheckedChange={(checked) => 
                  setPaymentConditions(prev => ({ ...prev, cheque: checked as boolean }))
                }
              />
              <Label htmlFor="cheque" className="text-sm cursor-pointer">Cheque</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cartao"
                checked={paymentConditions.cartao}
                onCheckedChange={(checked) => 
                  setPaymentConditions(prev => ({ ...prev, cartao: checked as boolean }))
                }
              />
              <Label htmlFor="cartao" className="text-sm cursor-pointer">Cartão</Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-[#2D3D2C] hover:bg-[#374C36] text-white gap-2">
            <Download size={16} />
            Baixar PDF
          </Button>
          <Button onClick={sendPDFViaWhatsApp} variant="outline">
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};