// services/saveTaskMaterialUsage.ts
export async function saveTaskMaterialUsage(taskId: string, selectedMaterials: { [itemId: string]: number }) {
  const updates = Object.entries(selectedMaterials).map(([itemId, quantity]) => ({
    task_id: taskId,
    product_id: itemId,
    quantity,
  }));

  const { error } = await supabase.from('task_product_usage').insert(updates);
  if (error) throw error;
}
