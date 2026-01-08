import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Edit, Trash2, Package, AlertTriangle } from 'lucide-react';
import { InventoryItem } from '../../types/database';
import { TablePagination } from '../ui/TablePagination';

interface InventoryTableProps {
    items: InventoryItem[];
    onEdit: (item: InventoryItem) => void;
    onDelete: (id: string) => void;
    canManage: boolean;
}

const InventoryTable: React.FC<InventoryTableProps> = ({
    items,
    onEdit,
    onDelete,
    canManage
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const totalPages = Math.ceil(items.length / itemsPerPage);

    const currentItems = items.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-4">
            <div className="rounded-md border bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead>Item</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Valor de Compra</TableHead>
                            {canManage && <TableHead className="text-right">Ações</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {currentItems.map((item) => (
                            <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell>
                                    <div className="flex items-center gap-2 font-medium text-slate-800">
                                        <Package size={14} className="text-slate-500" />
                                        {item.name}
                                        {item.current_quantity <= (item.min_stock ?? 10) && (
                                            <div className="flex items-center text-orange-600 text-xs ml-2" title="Estoque baixo">
                                                <AlertTriangle size={12} className="mr-1" />
                                                Baixo
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className={`font-bold ${item.current_quantity <= (item.min_stock ?? 10) ? 'text-orange-600' : 'text-blue-600'}`}>
                                            {item.current_quantity}
                                        </span>
                                        <span className="text-xs text-slate-500">unidades</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-slate-700">
                                        R$ {item.purchase_price?.toFixed(2) ?? '0.00'}
                                    </div>
                                </TableCell>
                                {canManage && (
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onEdit(item)}
                                                className="h-8 w-8 p-0 hover:text-orange-600 hover:bg-orange-50"
                                                title="Editar"
                                            >
                                                <Edit size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onDelete(item.id)}
                                                className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};

export default InventoryTable;
