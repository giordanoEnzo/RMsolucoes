import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Profile } from '../../types/database';
import { User, Mail, Shield, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmployeeViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Profile | null;
}

const EmployeeViewDialog: React.FC<EmployeeViewDialogProps> = ({ open, onOpenChange, employee }) => {
    if (!employee) return null;

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

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin':
                return 'text-red-700 bg-red-50 border-red-200';
            case 'manager':
                return 'text-blue-700 bg-blue-50 border-blue-200';
            default:
                return 'text-green-700 bg-green-50 border-green-200';
        }
    };

    const formatDate = (dateString: string) => {
        try {
            return format(new Date(dateString), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR });
        } catch {
            return '-';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalhes do Funcionário</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                            <User size={32} />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-slate-900">{employee.name}</h3>
                            <div className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${getRoleColor(employee.role)}`}>
                                <Shield size={10} className="mr-1" />
                                {getRoleLabel(employee.role)}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-slate-900">Email</h4>
                                <p className="text-sm text-slate-600 break-all">{employee.email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <Calendar className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-slate-900">Data de Cadastro</h4>
                                <p className="text-sm text-slate-600">{formatDate(employee.created_at)}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <Clock className="h-5 w-5 text-slate-400 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-slate-900">Última Atualização</h4>
                                <p className="text-sm text-slate-600">{formatDate(employee.updated_at)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EmployeeViewDialog;
