
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { useRealtimeReports } from '../hooks/useRealtimeReports';
import { useDateRange } from '../hooks/useDateRange';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FileText, TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import EmployeeReports from '../components/reports/EmployeeReports';

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
import ServiceReports from '../components/reports/ServiceReports';
import DateRangeFilter from '../components/reports/DateRangeFilter';
import ReportExportButtons from '../components/reports/ReportExportButtons';
import CSVExportInfo from '../components/reports/CSVExportInfo';
import { useReportExport } from '../hooks/useReportExport';

const Reports = () => {
  const { profile } = useAuth();
  const [dateRange, setDateRange] = useState('current_month');
  const [showCSVDetails, setShowCSVDetails] = useState(false);
  const { startDate, endDate } = useDateRange(dateRange);
  const { exportServiceOrdersToCSV } = useReportExport();

  useRealtimeReports();

  const { data: ordersStats } = useQuery({
    queryKey: ['orders-stats', dateRange],
    queryFn: async () => {
      let query = supabase
        .from('service_orders')
        .select('status, sale_value, created_at');

      if (startDate && endDate) {
        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const statusCount = data.reduce((acc: Record<string, number>, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {});

      const totalRevenue = data
        .filter(order => order.sale_value)
        .reduce((sum, order) => sum + (order.sale_value || 0), 0);

      return {
        totalOrders: data.length,
        statusCount,
        totalRevenue,
        chartData: Object.entries(statusCount).map(([status, count]) => {
          const statusLabels: Record<string, string> = {
            'pending': 'Pendente',
            'in_progress': 'Em Produção',
            'production': 'Em Produção',
            'on_hold': 'Em Espera',
            'stopped': 'Paralisado',
            'quality_control': 'Controle de Qualidade',
            'ready_for_pickup': 'Aguardando Retirada',
            'awaiting_installation': 'Aguardando Instalação',
            'to_invoice': 'Faturar',
            'invoiced': 'Faturada',
            'completed': 'Finalizado',
            'cancelled': 'Cancelado',
            'delivered': 'Entregue',
            'received': 'Recebida'
          };

          return {
            status: statusLabels[status] || status,
            count: count as number
          };
        })
      };
    },
    enabled: !!profile,
  });

  const { data: employeesCount } = useQuery({
    queryKey: ['employees-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile && ['admin', 'manager'].includes(profile.role),
  });

  const { data: inventoryStats } = useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('current_quantity');

      if (error) throw error;

      const totalItems = data.length;
      const lowStockItems = data.filter(item => item.current_quantity <= 10).length;
      const totalQuantity = data.reduce((sum, item) => sum + item.current_quantity, 0);

      return {
        totalItems,
        lowStockItems,
        totalQuantity
      };
    },
    enabled: !!profile,
  });

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Carregando...</h2>
        </div>
      </div>
    );
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  // Preparar dados para exportação
  const exportData = {
    ordersStats,
    employeesCount,
    inventoryStats
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600 mt-1">Visualize estatísticas e dados do sistema - Dados em tempo real</p>
      </div>

      {/* Date Range Filter */}
      <DateRangeFilter value={dateRange} onValueChange={setDateRange} />




      {/* Wrapper div with ID for PDF export */}
      <div id="reports-content">
        {/* Cards de Estatísticas Gerais */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ordersStats?.totalOrders || 0}</div>
              <p className="text-xs text-muted-foreground">
                {dateRange === 'current_month' ? 'Este mês' :
                  dateRange === 'last_month' ? 'Mês passado' :
                    dateRange === 'current_week' ? 'Esta semana' :
                      dateRange === 'last_week' ? 'Semana passada' :
                        'Período selecionado'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {ordersStats?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </div>
              <p className="text-xs text-muted-foreground">
                {dateRange === 'current_month' ? 'Este mês' :
                  dateRange === 'last_month' ? 'Mês passado' :
                    dateRange === 'current_week' ? 'Esta semana' :
                      dateRange === 'last_week' ? 'Semana passada' :
                        'Período selecionado'}
              </p>
            </CardContent>
          </Card>

          {['admin', 'manager'].includes(profile.role) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funcionários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employeesCount || 0}</div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Itens em Estoque</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inventoryStats?.totalItems || 0}</div>
              {inventoryStats && inventoryStats.lowStockItems > 0 && (
                <p className="text-xs text-orange-600 mt-1">
                  {inventoryStats.lowStockItems} com estoque baixo
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Seção de Exportação de Dados */}
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exportação de Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Relatórios em CSV</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Exporte dados completos das ordens de serviço em formato CSV para análise externa.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportServiceOrdersToCSV()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    📊 Exportar Todas as OS
                  </button>
                  <button
                    onClick={() => exportServiceOrdersToCSV({ from: startDate, to: endDate })}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    📅 Exportar OS do Período
                  </button>
                </div>
                <CSVExportInfo showDetails={showCSVDetails} />
                <button
                  onClick={() => setShowCSVDetails(!showCSVDetails)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {showCSVDetails ? 'Ocultar detalhes dos campos' : 'Ver detalhes dos campos incluídos'}
                </button>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">Relatórios em Excel</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Relatórios resumidos e gráficos em formato Excel.
                </p>
                <ReportExportButtons
                  data={{
                    ordersStats,
                    employeesCount,
                    inventoryStats
                  }}
                  dateRange={dateRange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs para diferentes tipos de relatório */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="employees">Funcionários</TabsTrigger>
            <TabsTrigger value="services">Serviços</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Gráficos da Visão Geral */}
            <div className="grid gap-6 lg:grid-cols-2">
              {ordersStats?.chartData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status das Ordens de Serviço</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ordersStats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {ordersStats?.chartData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={ordersStats.chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ status, count }) => `${status}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {ordersStats.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="employees">
            <EmployeeReports />
          </TabsContent>

          <TabsContent value="services">
            <ServiceReports />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
