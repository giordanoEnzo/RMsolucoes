import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../integrations/supabase/client';
import { InventoryItem } from '../../types/database';
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

interface MaterialSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (item: InventoryItem) => void;
}

const MaterialSelectionDialog: React.FC<MaterialSelectionDialogProps> = ({
    open,
    onOpenChange,
    onSelect,
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: items = [], isLoading } = useQuery({
        queryKey: ['inventory_selection'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('inventory_items')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data as InventoryItem[];
        },
        enabled: open,
    });

    const normalize = (text: string | null | undefined) =>
        (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

    const filteredItems = items.filter((item) => {
        const search = normalize(searchTerm);
        return normalize(item.name).includes(search);
    });

    const handleSelect = (item: InventoryItem) => {
        onSelect(item);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Selecionar Material</DialogTitle>
                </DialogHeader>

                <div className="flex items-center space-x-2 my-4">
                    <Search className="text-gray-400" size={20} />
                    <Input
                        placeholder="Buscar material por nome..."
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
                    ) : filteredItems.length === 0 ? (
                        <div className="flex justify-center items-center h-40 text-gray-500">
                            Nenhum material encontrado.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 sticky top-0">
                                    <TableHead>Nome</TableHead>
                                    <TableHead className="text-right">Estoque Atual</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50">
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell className="text-right">{item.current_quantity}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                onClick={() => handleSelect(item)}
                                                className="w-full"
                                                disabled={item.current_quantity <= 0}
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

export default MaterialSelectionDialog;
