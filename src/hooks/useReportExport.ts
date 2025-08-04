
import { useCallback } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ReportData {
  ordersStats?: {
    totalOrders: number;
    totalRevenue: number;
    chartData: Array<{ status: string; count: number }>;
  };
  employeesCount?: number;
  inventoryStats?: {
    totalItems: number;
    lowStockItems: number;
    totalQuantity: number;
  };
}

export const useReportExport = () => {
  const exportToExcel = useCallback((data: ReportData, dateRange: string) => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Resumo geral
      const summaryData = [
        ['Relatório de Dados do Sistema'],
        ['Período:', dateRange === 'current_month' ? 'Mês Atual' : 
                   dateRange === 'last_month' ? 'Mês Passado' :
                   dateRange === 'current_week' ? 'Esta Semana' :
                   dateRange === 'last_week' ? 'Semana Passada' :
                   'Período selecionado'],
        ['Data de Geração:', new Date().toLocaleDateString('pt-BR')],
        [],
        ['RESUMO GERAL'],
        ['Total de Ordens:', data.ordersStats?.totalOrders || 0],
        ['Receita Total:', `R$ ${data.ordersStats?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`],
        ['Total de Funcionários:', data.employeesCount || 0],
        ['Itens em Estoque:', data.inventoryStats?.totalItems || 0],
        ['Itens com Estoque Baixo:', data.inventoryStats?.lowStockItems || 0],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

      // Status das ordens
      if (data.ordersStats?.chartData) {
        const statusData = [
          ['Status das Ordens de Serviço'],
          [],
          ['Status', 'Quantidade'],
          ...data.ordersStats.chartData.map(item => [item.status, item.count])
        ];
        
        const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
        XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status das Ordens');
      }

      // Salvar arquivo
      const fileName = `relatorio_${dateRange}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Relatório Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar relatório Excel');
    }
  }, []);

  const exportToPDF = useCallback(async (elementId: string, fileName: string) => {
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        toast.error('Elemento não encontrado para exportação');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 10;

      // Adicionar título
      pdf.setFontSize(16);
      pdf.text('Relatório do Sistema', pdfWidth / 2, 20, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pdfWidth / 2, 30, { align: 'center' });
      
      // Adicionar imagem
      pdf.addImage(imgData, 'PNG', imgX, 40, imgWidth * ratio, imgHeight * ratio);
      
      pdf.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Relatório PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório PDF');
    }
  }, []);

  const exportServiceOrdersToCSV = useCallback(async (dateRange?: { from: Date; to: Date }) => {
    try {
      // Buscar todas as ordens de serviço com dados relacionados
      let query = supabase
        .from('service_orders')
        .select(`
          *,
          assigned_worker:profiles!assigned_worker_id(name),
          created_by_user:profiles!created_by(name),
          service_order_items(*)
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros de data se fornecidos
      if (dateRange?.from) {
        query = query.gte('created_at', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('created_at', dateRange.to.toISOString());
      }

      const { data: serviceOrders, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar ordens de serviço:', error);
        toast.error('Erro ao buscar dados das ordens de serviço');
        return;
      }

      if (!serviceOrders || serviceOrders.length === 0) {
        toast.warning('Nenhuma ordem de serviço encontrada para o período selecionado');
        return;
      }

      // Função para formatar status
      const formatStatus = (status: string) => {
        const statusMap: Record<string, string> = {
          'pending': 'Pendente',
          'production': 'Em Produção',
          'on_hold': 'Em Espera',
          'stopped': 'Paralisado',
          'quality_control': 'Controle de Qualidade',
          'ready_for_pickup': 'Aguardando Retirada',
          'awaiting_installation': 'Aguardando Instalação',
          'to_invoice': 'Para Faturar',
          'completed': 'Finalizado',
          'cancelled': 'Cancelado'
        };
        return statusMap[status] || status;
      };

      // Função para formatar urgência
      const formatUrgency = (urgency: string) => {
        const urgencyMap: Record<string, string> = {
          'low': 'Baixa',
          'medium': 'Média',
          'high': 'Alta'
        };
        return urgencyMap[urgency] || urgency;
      };

      // Função para formatar data
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('pt-BR');
      };

      // Preparar dados para CSV
      const csvData = serviceOrders.map(order => {
        // Calcular total de itens
        const totalItems = order.service_order_items?.length || 0;
        const itemsValue = order.service_order_items?.reduce((sum, item) => sum + (item.sale_value || 0), 0) || 0;

        return {
          'Número da OS': order.order_number,
          'Cliente': order.client_name,
          'Contato': order.client_contact,
          'Endereço': order.client_address,
          'Descrição do Serviço': order.service_description,
          'Status': formatStatus(order.status),
          'Urgência': formatUrgency(order.urgency),
          'Valor da Venda': order.sale_value ? `R$ ${order.sale_value.toFixed(2)}` : 'R$ 0,00',
          'Operário Responsável': order.assigned_worker?.name || 'Não atribuído',
          'Criado por': order.created_by_user?.name || 'Sistema',
          'Data de Abertura': formatDate(order.opening_date),
          'Prazo': order.deadline ? formatDate(order.deadline) : 'Não definido',
          'Data de Criação': formatDate(order.created_at),
          'Última Atualização': formatDate(order.updated_at),
          'Total de Itens': totalItems,
          'Valor dos Itens': `R$ ${itemsValue.toFixed(2)}`,
          'ID da OS': order.id,
          'ID do Cliente': order.client_id || 'Não informado',
          'ID do Operário': order.assigned_worker_id || 'Não atribuído'
        };
      });

      // Converter para CSV
      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(';'),
        ...csvData.map(row => headers.map(header => {
          const value = row[header as keyof typeof row];
          // Escapar aspas e quebras de linha
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(';'))
      ].join('\n');

      // Criar e baixar arquivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const dateRangeText = dateRange 
        ? `${formatDate(dateRange.from.toISOString())}_a_${formatDate(dateRange.to.toISOString())}`
        : 'todas';
      
      link.download = `ordens_servico_${dateRangeText}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Relatório CSV exportado com sucesso! ${serviceOrders.length} ordens de serviço.`);
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar relatório CSV');
    }
  }, []);

  return {
    exportToExcel,
    exportToPDF,
    exportServiceOrdersToCSV
  };
};
