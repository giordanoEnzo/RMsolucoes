// services/registerInventoryOut.ts
export async function registerInventoryOut(taskId: string, selectedMaterials: { [itemId: string]: number }) {
  const updates = Object.entries(selectedMaterials).map(([itemId, quantity]) => ({
    item_id: itemId,
    quantity,
    movement_type: 'out',
    reason: 'Uso em tarefa',
    related_task_id: taskId,
  }));

  const { error: movementError } = await supabase.from('inventory_movements').insert(updates);
  if (movementError) throw movementError;

  for (const [itemId, quantity] of Object.entries(selectedMaterials)) {
    const { error: updateError } = await supabase.rpc('decrement_inventory_item', {
      item_id_param: itemId,
      quantity_param: quantity,
    });
    if (updateError) throw updateError;
  }
}
