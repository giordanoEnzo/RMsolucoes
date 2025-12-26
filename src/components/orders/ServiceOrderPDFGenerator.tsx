import React, { useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { ServiceOrder } from '../../types/database';
import { supabase } from '../../integrations/supabase/client';

const logopath = '/logonum.png';
const assinaturaPath = '/AssinaturaMarcioOficial.png';

interface Props {
    order: ServiceOrder;
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

export const ServiceOrderPDFGenerator: React.FC<Props> = ({ order, onClose }) => {

    useEffect(() => {
        const generate = async () => {
            await handleDownloadPDF();
        };
        generate();
    }, []); // Executa ao montar

    const generatePDF = async () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        let y = 15;

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

        // Header da Ordem de Serviço
        doc.setFontSize(16);
        doc.text(`Ordem de Serviço: ${order.order_number}`, pageWidth / 2, y, { align: 'center' });
        y += 10;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Cliente:', 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(order.client_name, 45, y);
        y += 6;

        if (order.client_contact) {
            doc.text(`Contato: ${order.client_contact}`, 20, y);
            y += 6;
        }

        if (order.client_address) {
            doc.text(`Endereço: ${order.client_address}`, 20, y);
            y += 6;
        }



        y += 10;

        // Detalhes do Serviço Principal
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Descrição Geral:', 20, y);
        y += 6;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        const splitDescription = doc.splitTextToSize(order.service_description || 'Sem descrição', pageWidth - 40);
        doc.text(splitDescription, 20, y);

        y += (splitDescription.length * 6) + 10;

        // --- Seção de Itens da OS ---
        try {
            const { data: items } = await supabase
                .from('service_order_items')
                .select('*')
                .eq('order_id', order.id);

            if (items && items.length > 0) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Itens do Serviço:', 20, y);
                y += 4; // Ajuste para tabela

                const tableBody = items.map((item) => [
                    item.service_name + (item.service_description ? ` - ${item.service_description}` : ''),
                    item.quantity.toString()
                ]);

                autoTable(doc, {
                    startY: y,
                    head: [['Item / Serviço', 'Qtd']],
                    body: tableBody,
                    styles: { fontSize: 10, cellPadding: 3 },
                    columnStyles: {
                        0: { cellWidth: 150 }, // Coluna de descrição larga
                        1: { cellWidth: 20, halign: 'center' }, // Qtd centralizada
                    },
                    headStyles: {
                        fillColor: [45, 61, 44], // #2D3D2C aproximado
                        textColor: 255,
                        fontStyle: 'bold'
                    },
                });

                // Atualizar Y após a tabela
                y = (doc as any).lastAutoTable.finalY + 10;
            }
        } catch (err) {
            console.error('Erro ao buscar itens para PDF', err);
        }
        // ----------------------------

        // Datas importantes (re-verificar se cabe na página ou precisa de nova página - simplificado aqui)
        if (order.opening_date) {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal'); // Reset font weight
            doc.text(`Data de Abertura: ${new Date(order.opening_date).toLocaleDateString('pt-BR')}`, 20, y);
            y += 6;
        }

        if (order.deadline) {
            doc.text(`Prazo de Entrega: ${new Date(order.deadline).toLocaleDateString('pt-BR')}`, 20, y);
            y += 6;
        }

        y += 20; // Espaço para assinatura

        // Verificação de quebra de página para assinaturas
        if (y > 250) {
            doc.addPage();
            y = 40;
        }

        // Rodapé de assinatura
        doc.setFontSize(10);
        doc.line(20, y, pageWidth / 2 - 10, y); // Linha assinatura cliente
        doc.line(pageWidth / 2 + 10, y, pageWidth - 20, y); // Linha assinatura responsável

        doc.text('Assinatura do Cliente', 20 + ((pageWidth / 2 - 30) / 2) - 15, y + 5);
        doc.text('Responsável Técnico', pageWidth / 2 + 10 + ((pageWidth / 2 - 30) / 2) - 15, y + 5);

        return doc;
    };

    const handleDownloadPDF = async () => {
        try {
            const doc = await generatePDF();
            const clientName = order.client_name.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_');
            const fileName = `OS_${order.order_number}_${clientName}.pdf`;
            doc.save(fileName);
            toast.success('PDF gerado com sucesso!');
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Erro ao gerar PDF');
            onClose(); // Fechar mesmo com erro para não travar
        }
    };

    return null; // Não renderiza nada visualmente
};
