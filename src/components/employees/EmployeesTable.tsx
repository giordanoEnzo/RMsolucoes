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
import { Edit, Trash2, Eye, User, Mail, Shield } from 'lucide-react';
import { Profile } from '../../types/database';

interface EmployeesTableProps {
    employees: Profile[];
    onEdit: (employee: Profile) => void;
    onDelete: (employee: Profile) => void;
    onView: (employee: Profile) => void;
    canEdit: (employee: Profile) => boolean;
    canDelete: (employee: Profile) => boolean;
}

const EmployeesTable: React.FC<EmployeesTableProps> = ({
    employees,
    onEdit,
    onDelete,
    onView,
    canEdit,
    canDelete
}) => {
    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'bg-red-100 text-red-800';
            case 'manager':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-green-100 text-green-800';
        }
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin':
                return 'Administrador';
            case 'manager':
                return 'Gerente';
            default:
                return 'Operário';
        }
    };

    return (
        <div className="rounded-md border bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {employees.map((employee) => (
                        <TableRow key={employee.id} className="hover:bg-slate-50 transition-colors">
                            <TableCell>
                                <div className="flex items-center gap-2 font-medium text-slate-800">
                                    <User size={14} className="text-slate-500" />
                                    {employee.name}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <Mail size={14} className="text-slate-400" />
                                    {employee.email}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-slate-400" />
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(employee.role)}`}>
                                        {getRoleLabel(employee.role)}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onView(employee)}
                                        className="h-8 w-8 p-0 hover:text-blue-600 hover:bg-blue-50"
                                        title="Visualizar"
                                    >
                                        <Eye size={16} />
                                    </Button>

                                    {canEdit(employee) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onEdit(employee)}
                                            className="h-8 w-8 p-0 hover:text-orange-600 hover:bg-orange-50"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </Button>
                                    )}

                                    {canDelete(employee) && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onDelete(employee)}
                                            className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default EmployeesTable;
