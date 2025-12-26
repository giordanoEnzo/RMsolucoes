import React from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FileText, Trash2, Edit, ShoppingCart } from 'lucide-react';
import { Budget, BudgetItem } from '../../types/database';
import { BudgetPDFGenerator } from './BudgetPDFGenerator';

interface BudgetsTableProps {
    budgets: (Budget & { budget_items: BudgetItem[] })[];
    onView: (budget: (Budget & { budget_items: BudgetItem[] })) => void;
    onEdit: (budget: (Budget & { budget_items: BudgetItem[] })) => void;
    onDelete: (id: string) => void;
    onCreateOrder: (id: string) => void;
    isCreatingOrder: boolean;
}

const BudgetsTable: React.FC<BudgetsTableProps> = ({
    budgets,
    onView,
    onEdit,
    onDelete,
    onCreateOrder,
    isCreatingOrder
}) => {
    const getStatusColor = (status: string) => {
        const colors: { [key: string]: string } = {
            'draft': 'bg-gray-100 text-gray-800',
            'sent': 'bg-blue-100 text-blue-800',
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800',
            'expired': 'bg-orange-100 text-orange-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusLabel = (status: string) => {
        const labels: { [key: string]: string } = {
            'draft': 'Rascunho',
            'sent': 'Enviado',
            'approved': 'Aprovado',
            'rejected': 'Rejeitado',
            'expired': 'Expirado',
        };
        return labels[status] || status;
    };

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Número / Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valores / Datas</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {budgets.map((budget) => (
                        <TableRow key={budget.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-bold text-slate-800">{budget.budget_number}</span>
                                    <span className="text-sm text-slate-600 truncate max-w-[200px]" title={budget.client_name}>
                                        {budget.client_name}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <Badge className={`${getStatusColor(budget.status)} whitespace-nowrap`}>
                                    {getStatusLabel(budget.status)}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <p className="text-sm text-slate-600 line-clamp-2 max-w-[250px]" title={budget.description}>
                                    {budget.description}
                                </p>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col text-sm">
                                    <span className="font-semibold text-green-600">
                                        R$ {budget.total_value.toFixed(2)}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Criado em: {new Date(budget.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                    {budget.valid_until && (
                                        <span className="text-xs text-slate-500">
                                            Válido até: {new Date(new Date(budget.valid_until).getTime() + 12 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-1 flex-wrap max-w-[300px] ml-auto">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onView(budget)}
                                        className="h-8 w-8 p-0 hover:text-blue-600 hover:bg-blue-50"
                                        title="Visualizar"
                                    >
                                        <FileText size={16} />
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        disabled={isCreatingOrder || ['approved', 'rejected', 'expired'].includes(budget.status)}
                                        onClick={() => onEdit(budget)}
                                        className="h-8 w-8 p-0 hover:text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                                        title="Editar"
                                    >
                                        <Edit size={16} />
                                    </Button>

                                    {/* Using BudgetPDFGenerator directly, might need styling adjustments */}
                                    <div className="scale-90 origin-right">
                                        <BudgetPDFGenerator budget={budget} />
                                    </div>

                                    {budget.status === 'sent' && (
                                        <Button
                                            size="sm"
                                            onClick={() => onCreateOrder(budget.id)}
                                            disabled={isCreatingOrder}
                                            className="h-8 px-2 bg-green-600 hover:bg-green-700 text-white text-xs ml-1"
                                            title="Criar Ordem de Serviço"
                                        >
                                            <ShoppingCart size={14} className="mr-1" />
                                            Criar OS
                                        </Button>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onDelete(budget.id)}
                                        className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                                        title="Excluir"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default BudgetsTable;
