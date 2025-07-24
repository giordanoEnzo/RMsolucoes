import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

interface InventoryItem {
  id: string;
  name: string;
  current_quantity: number;
}

interface MaterialUsed {
  inventory_item_id: string;
  quantity_used: number;
}

interface MaterialSelectorProps {
  taskId: string;
}

export const MaterialSelector: React.FC<MaterialSelectorProps> = ({ taskId }) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [usedMaterials, setUsedMaterials] = useState<MaterialUsed[]>([]);

  // Buscar inventário
  useEffect(() => {
    const fetchInventory = async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, current_quantity');

      if (!error && data) setItems(data);
      else console.error('Erro ao buscar inventário:', error?.message);
    };

    fetchInventory();
  }, []);

  // Buscar materiais já adicionados à tarefa
  useEffect(() => {
    const fetchUsedMaterials = async () => {
      const { data, error } = await supabase
        .from('task_materials') // ou 'task_product_usage'
        .select('inventory_item_id, quantity_used')
        .eq('task_id', taskId);

      if (!error && data) {
        setUsedMaterials(data);
      } else {
        console.error('Erro ao buscar materiais usados:', error?.message);
      }
    };

    if (taskId) {
      fetchUsedMaterials();
    }
  }, [taskId]);

  const handleAddMaterial = async () => {
  if (!selectedItemId || quantity <= 0) return;

  // 1. Buscar item atual (refrescado)
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory_items')
    .select('current_quantity')
    .eq('id', selectedItemId)
    .single();

  if (fetchError || !currentItem) {
    console.error('Erro ao buscar item:', fetchError?.message);
    return;
  }

  if (currentItem.current_quantity < quantity) {
    alert('Quantidade insuficiente em estoque!');
    return;
  }

  // 2. Inserir material usado
  const { error: insertError } = await supabase.from('task_materials').insert({
    task_id: taskId,
    inventory_item_id: selectedItemId,
    quantity_used: quantity,
  });

  if (insertError) {
    console.error('Erro ao adicionar material:', insertError.message);
    return;
  }

  // 3. Atualizar estoque
  const newQuantity = currentItem.current_quantity - quantity;
  const { error: updateError } = await supabase
    .from('inventory_items')
    .update({ current_quantity: newQuantity })
    .eq('id', selectedItemId);

  if (updateError) {
    console.error('Erro ao atualizar o estoque:', updateError.message);
    return;
  }

  // 4. Atualizar UI
  setUsedMaterials([
    ...usedMaterials,
    { inventory_item_id: selectedItemId, quantity_used: quantity },
  ]);
  setItems((prev) =>
    prev.map((item) =>
      item.id === selectedItemId
        ? { ...item, current_quantity: newQuantity }
        : item
    )
  );
  setQuantity(1);
  setSelectedItemId('');
};
  return (
    <div className="space-y-4 p-4 border rounded-xl bg-white shadow-sm">
      <h4 className="font-bold text-lg">Materiais Utilizados</h4>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label>Material</Label>
          <Select onValueChange={(val) => setSelectedItemId(val)} value={selectedItemId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o material" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} (estoque: {item.current_quantity})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-24">
          <Label>Qtd</Label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </div>

        <Button onClick={handleAddMaterial} disabled={!selectedItemId || quantity <= 0}>
          Adicionar
        </Button>
      </div>

      <div className="mt-4">
        <h5 className="font-semibold mb-2">Já adicionados:</h5>
        <ul className="list-disc pl-6 text-sm">
          {usedMaterials.map((mat, idx) => {
            const item = items.find((i) => i.id === mat.inventory_item_id);
            return (
              <li key={idx}>
                {item?.name ?? 'Material desconhecido'} — {mat.quantity_used} unidade(s)
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
