import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { Profile } from '../../types/database';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { Button } from '../ui/button';
import { Search, Loader2 } from 'lucide-react';

interface EmployeeSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (employee: Profile) => void;
}

const EmployeeSelectionDialog: React.FC<EmployeeSelectionDialogProps> = ({
    open,
    onOpenChange,
    onSelect,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: employees = [], isLoading } = useQuery({
        queryKey: ['employees_selection'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data as Profile[];
        },
        enabled: open,
    });

    const normalize = (text: string | null | undefined) =>
        (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const filteredEmployees = employees.filter((employee) => {
        const search = normalize(searchTerm);
        return (
            normalize(employee.name).includes(search) ||
            normalize(employee.email).includes(search)
        );
    });

    const handleSelect = (employee: Profile) => {
        onSelect(employee);
        onOpenChange(false);
    };

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'admin': return 'Administrador';
            case 'manager': return 'Gerente';
            case 'worker': return 'Operário';
            default: return role;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Selecionar Funcionário</DialogTitle>
                </DialogHeader>

                <div className="flex items-center space-x-2 my-4">
                    <Search className="text-gray-400" size={20} />
                    <Input
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1"
                        autoFocus
                    />
                </div>

                <div className="overflow-auto flex-1 border rounded-md">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="flex justify-center items-center h-40 text-gray-500">
                            Nenhum funcionário encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 sticky top-0">
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Função</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map((employee) => (
                                    <TableRow key={employee.id} className="hover:bg-slate-50">
                                        <TableCell>
                                            <div className="font-medium">{employee.name}</div>
                                            <div className="text-xs text-gray-500">{employee.email}</div>
                                        </TableCell>
                                        <TableCell>{getRoleLabel(employee.role)}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelect(employee)}
                                                className="w-full"
                                            >
                                                Selecionar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeSelectionDialog;
