// src/components/invoices/InvoicePDFGenerator.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const logopath = '/logonum.png';
const assinaturaPath = '/AssinaturaMarcioOficial.png';

interface ExtraItem {
  description: string;
  value?: number;
}

interface ServiceOrder {
  id: string;
  order_number: string;
  sale_value?: number;
  total_hours?: number;
}

interface Invoice {
  id: string;
  number: string;
  client_name: string;
  start_date: string;
  end_date: string;
  total_value?: number;
  total_hours?: number;
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
  const generatePDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let y = 15;

    try {
      const logoBase64 = await loadImageAsBase64(logopath);
      doc.addImage(logoBase64, 'PNG', 20, y, 30, 30);
    } catch (e) {
      console.warn('Erro ao carregar o logo', e);
    }

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('RMSoluções', 60, y);
    doc.setFont(undefined, 'normal');
    doc.text('MARCIO JOSE LASTORIA 26654674880 | Email: rmsoldas@hotmail.com', 60, y += 6);
    doc.text('CNPJ: 19.957.948/0001-68                        | Telefone: +55 (19) 99652-4173', 60, y += 6);
    doc.text('Avenida Ângelo Franzini, 2438, barracão', 60, y += 6);
    doc.text('Residencial Bosque de Versalles, Araras-SP', 60, y += 6);
    doc.text('CEP 13609-391', 60, y += 6);
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 60, y += 6);
    y += 10;

    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`Fatura ${invoice.number}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Cliente:', 20, y);
    doc.setFont(undefined, 'normal');
    doc.text(invoice.client_name, 45, y);
    y += 6;
    doc.text(`Período: ${invoice.start_date} a ${invoice.end_date}`, 20, y);
    y += 10;

    // Tabela de OS
    const osRows = invoice.service_orders.map((os) => [
      `#${os.order_number}`,
      `R$ ${(os.sale_value ?? 0).toFixed(2)}`,
      `${(os.total_hours ?? 0).toFixed(2)}h`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['OS', 'Valor (R$)', 'Horas']],
      body: osRows,
      styles: { fontSize: 10 },
    });

    y = doc.lastAutoTable.finalY + 10;

    // Tabela de Extras
    if (invoice.extras && invoice.extras.length > 0) {
      doc.setFont(undefined, 'bold');
      doc.text('Valores Extras:', 20, y);
      y += 4;

      const extrasRows = invoice.extras.map((extra) => [
        extra.description,
        `R$ ${(extra.value ?? 0).toFixed(2)}`
      ]);

      autoTable(doc, {  
        startY: y,
        head: [['Descrição', 'Valor (R$)']],
        body: extrasRows,
        styles: { fontSize: 10 },
      });

      y = doc.lastAutoTable.finalY + 10;
    }

    const subtotalOS = invoice.service_orders.reduce((acc, os) => acc + (os.sale_value ?? 0), 0);
    const totalExtras = (invoice.extras ?? []).reduce((acc, e) => acc + (e.value ?? 0), 0);

    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`Subtotal OS: R$ ${subtotalOS.toFixed(2)}`, 20, y);
    y += 6;
    doc.text(`Extras: R$ ${totalExtras.toFixed(2)}`, 20, y);
    y += 6;
    const totalGeral = subtotalOS + totalExtras;
doc.text(`Total Geral: R$ ${totalGeral.toFixed(2)}`, 20, y);
y += 10;
    
            doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Pagamento', 20, y);
        y += 10;

        doc.setFont(undefined, 'bold');
        doc.text('Meios de pagamento', 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        doc.text('Transferência bancária, dinheiro, cheque ou pix.', 20, y);
        y += 8;

      doc.setFont(undefined, 'bold');
      doc.text('PIX', 20, y);
      y +=6;
      doc.setFont(undefined, 'normal');
      doc.text('19957948000168', 20, y);
      y += 8;

      doc.setFont(undefined, 'bold');
      doc.text('Dados bancários', 20, y);
      y += 6;

      doc.setFont(undefined, 'normal');
      doc.text('Banco: Banco do Brasil', 20, y);
      y += 5;
      doc.text('Agência: 0341-7', 20, y);
      y += 5;
      doc.text('Conta: 65.675-5', 20, y);
      y += 5;
      doc.text('Tipo de conta: Corrente', 20, y);
      y += 5;
      doc.text('Titular da conta (CPF/CNPJ): 19.957.948/0001-68', 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('Agro não pode parar... Indústria não pode parar...', pageWidth / 2, y, { align: 'center' });
      y += 10;

    try {
      const assinaturaBase64 = await loadImageAsBase64(assinaturaPath);
      const imgWidth = 50;
      const imgHeight = 20;
      const centerX = (pageWidth - imgWidth) / 2;
      doc.addImage(assinaturaBase64, 'PNG', centerX, y, imgWidth, imgHeight);
      y += imgHeight + 8;
    } catch (e) {
      console.warn('Erro ao carregar assinatura', e);
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(50, y, pageWidth - 50, y);
    doc.setFont(undefined, 'bold');
    doc.text('RMSoluções', pageWidth / 2, y + 7, { align: 'center' });
    doc.text('Márcio Lastoria', pageWidth / 2, y + 14, { align: 'center' });

    return doc;
  };

  const handleDownloadPDF = async () => {
    try {
      const doc = await generatePDF();
      doc.save(`fatura_${invoice.number}.pdf`);
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
      const fileName = `faturas/fatura_${invoice.number}.pdf`;

      const { error } = await supabase.storage.from('pdfs').upload(fileName, blob, {
        contentType: 'application/pdf',
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('pdfs').getPublicUrl(fileName);
      const url = data?.publicUrl;
      const phone = invoice.client_name.replace(/\D/g, '');
      const msg = encodeURIComponent(`Olá ${invoice.client_name}, segue sua fatura: ${url}`);

      window.open(`https://wa.me/55${phone}?text=${msg}`, '_blank');
      toast.success('Fatura enviada via WhatsApp!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar via WhatsApp');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Fatura #{invoice.number}</h2>

        <div className="space-y-1 text-sm">
          <p><strong>Cliente:</strong> {invoice.client_name}</p>
          <p><strong>Período:</strong> {invoice.start_date} a {invoice.end_date}</p>
          <p><strong>OSs incluídas:</strong> {invoice.service_orders.length}</p>
          <p><strong>Total:</strong> R$ {(invoice.total_value ?? 0).toFixed(2)}</p>
          <p><strong>Horas totais:</strong> {(invoice.total_hours ?? 0).toFixed(2)}h</p>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="bg-[#2D3D2C] hover:bg-[#374C36] text-white gap-2 transition-colors duration-200"
          >
            <Download size={16} />
            Baixar PDF
          </Button>
         <Button onClick={sendPDFViaWhatsApp} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};
