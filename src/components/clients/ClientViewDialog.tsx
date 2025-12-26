import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { Client } from '../../types/database';

interface ClientViewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    client: Client | null;
}

const ClientViewDialog: React.FC<ClientViewDialogProps> = ({ open, onOpenChange, client }) => {
    if (!client) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalhes do Cliente</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 sm:col-span-1">
                            <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Nome</h4>
                            <p className="text-slate-900 font-medium">{client.name}</p>
                        </div>
                        {client.company_name && (
                            <div className="col-span-2 sm:col-span-1">
                                <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Razão Social</h4>
                                <p className="text-slate-900">{client.company_name}</p>
                            </div>
                        )}
                        <div className="col-span-2 sm:col-span-1">
                            <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Documento</h4>
                            <p className="text-slate-900">{client.cnpj_cpf || '-'}</p>
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                            <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider">Contato</h4>
                            <p className="text-slate-900">{client.contact}</p>
                        </div>
                    </div>

                    <div className="border-t pt-4 bg-slate-50 p-3 rounded-md -mx-2">
                        <h4 className="font-semibold text-xs text-slate-500 uppercase tracking-wider mb-2">Endereço Completo</h4>
                        <p className="text-slate-900 text-sm">
                            {client.address}, {client.number || 'S/N'}
                        </p>
                        {client.complement && (
                            <p className="text-slate-600 text-sm">Complemento: {client.complement}</p>
                        )}
                        <p className="text-slate-900 text-sm">
                            {client.neighborhood && `${client.neighborhood}`}
                            {client.cep && ` - CEP: ${client.cep}`}
                        </p>
                        {client.state && (
                            <p className="text-slate-900 text-sm">{client.state}</p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ClientViewDialog;
