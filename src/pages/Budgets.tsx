import React, { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Plus, FileText } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import CreateBudgetDialog from '../components/budgets/CreateBudgetDialog';
import BudgetDetailsDialog from '../components/budgets/BudgetDetailsDialog';
import EditBudgetDialog from '../components/budgets/EditBudgetDialog';
import { BudgetFilters } from '../components/budgets/BudgetFilters';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';
import BudgetsTable from '../components/budgets/BudgetsTable';

const Budgets = () => {
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    clientName: '',
    dateFrom: '',
    dateTo: '',
  });

  const { budgets, isLoading, createOrderFromBudget, isCreatingOrder } = useBudgets(filters);

  const handleCreateOrder = (budgetId: string) => {
    createOrderFromBudget(budgetId);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir orçamento: ' + error.message);
    } else {
      toast.success('Orçamento excluído com sucesso!');
      location.reload();
    }
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      clientName: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Orçamentos</h1>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      <BudgetFilters
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando orçamentos...</p>
        </div>
      ) : (
        <>
          {budgets.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">
                  Nenhum orçamento encontrado
                </h3>
                <p className="text-gray-500 mb-4">
                  {Object.values(filters).some((f) => f)
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Comece criando seu primeiro orçamento.'}
                </p>
                {!Object.values(filters).some((f) => f) && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Orçamento
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <BudgetsTable
              budgets={budgets}
              onView={(budget) => {
                setSelectedBudget(budget);
                setShowDetailsDialog(true);
              }}
              onEdit={(budget) => {
                setSelectedBudget(budget);
                setShowEditDialog(true);
              }}
              onDelete={handleDelete}
              onCreateOrder={handleCreateOrder}
              isCreatingOrder={isCreatingOrder}
            />
          )}
        </>
      )}

      <CreateBudgetDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />

      {selectedBudget && showDetailsDialog && (
        <BudgetDetailsDialog
          budget={selectedBudget}
          onClose={() => {
            setShowDetailsDialog(false);
            setSelectedBudget(null);
          }}
        />
      )}

      {selectedBudget && showEditDialog && (
        <EditBudgetDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) setSelectedBudget(null);
          }}
          budget={selectedBudget}
        />
      )}
    </div>
  );
};

export default Budgets;
