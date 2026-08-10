// ============================================
// HABITS BULK IMPORT/EXPORT
// ============================================

import { supabase } from "@/integrations/supabase/client";
import type {
  ImportTemplate,
  ImportResult,
  ImportItemResult,
  DuplicateStrategy,
} from "./types";

export const HABITS_TEMPLATE_VERSION = "1.0";

// Habit import schema
export interface ImportHabit {
  external_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unit: string;
  default_goal: number;
  is_active: boolean;
  display_order: number;
}

/**
 * Generate habit template for download
 */
export function generateHabitTemplate(): ImportTemplate<ImportHabit> {
  return {
    version: HABITS_TEMPLATE_VERSION,
    entity: "habits" as any,
    on_duplicate: "skip",
    items: [
      {
        external_id: "habit_water_001",
        name: "Beber Água",
        description: "Acompanhe sua hidratação diária",
        icon: "Droplets",
        color: "water",
        unit: "copos",
        default_goal: 8,
        is_active: true,
        display_order: 1,
      },
      {
        external_id: "habit_sleep_001",
        name: "Horas de Sono",
        description: "Registre suas horas de sono",
        icon: "Moon",
        color: "sleep",
        unit: "horas",
        default_goal: 8,
        is_active: true,
        display_order: 2,
      },
      {
        external_id: "habit_workout_001",
        name: "Treino",
        description: "Acompanhe seus treinos diários",
        icon: "Dumbbell",
        color: "workout",
        unit: "minutos",
        default_goal: 30,
        is_active: true,
        display_order: 3,
      },
      {
        external_id: "habit_meals_001",
        name: "Refeições Saudáveis",
        description: "Registre suas refeições saudáveis",
        icon: "Utensils",
        color: "meals",
        unit: "refeições",
        default_goal: 5,
        is_active: true,
        display_order: 4,
      },
    ],
  };
}

/**
 * Import habits from JSON
 */
export async function importHabits(
  template: ImportTemplate<ImportHabit>
): Promise<ImportResult> {
  const strategy = template.on_duplicate || "skip";
  const results: ImportItemResult[] = [];

  for (const item of template.items) {
    try {
      // Check for existing by external_id or name
      const { data: existing } = await (supabase as any)
        .from("habits")
        .select("id, name")
        .or(`external_id.eq.${item.external_id},name.eq.${item.name}`)
        .eq("content_origin", "system")
        .maybeSingle();

      if (existing) {
        if (strategy === "skip") {
          results.push({ external_id: item.external_id, status: "skipped", reason: "duplicate" });
          continue;
        } else if (strategy === "error") {
          results.push({ external_id: item.external_id, status: "error", reason: "duplicate exists" });
          continue;
        }
        // strategy === "update"
        await updateHabit(existing.id, item);
        results.push({ external_id: item.external_id, status: "updated" });
      } else {
        await insertHabit(item);
        results.push({ external_id: item.external_id, status: "inserted" });
      }
    } catch (error) {
      results.push({
        external_id: item.external_id,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return summarizeResults(results);
}

async function insertHabit(item: ImportHabit): Promise<void> {
  const { error } = await (supabase as any)
    .from("habits")
    .insert({
      external_id: item.external_id,
      name: item.name,
      description: item.description,
      icon: item.icon,
      color: item.color,
      unit: item.unit,
      default_goal: item.default_goal,
      is_active: item.is_active,
      display_order: item.display_order,
      content_origin: "system",
    });

  if (error) throw error;
}

async function updateHabit(id: string, item: ImportHabit): Promise<void> {
  const { error } = await (supabase as any)
    .from("habits")
    .update({
      name: item.name,
      description: item.description,
      icon: item.icon,
      color: item.color,
      unit: item.unit,
      default_goal: item.default_goal,
      is_active: item.is_active,
      display_order: item.display_order,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Export habits to JSON
 */
export async function exportHabits(): Promise<ImportTemplate<ImportHabit>> {
  const { data: habits, error } = await (supabase as any)
    .from("habits")
    .select("*")
    .eq("content_origin", "system")
    .order("display_order", { ascending: true });

  if (error) throw error;

  const items: ImportHabit[] = (habits || []).map((h: any) => ({
    external_id: h.external_id || `habit_${h.id}`,
    name: h.name,
    description: h.description || "",
    icon: h.icon,
    color: h.color,
    unit: h.unit,
    default_goal: h.default_goal,
    is_active: h.is_active,
    display_order: h.display_order,
  }));

  return {
    version: HABITS_TEMPLATE_VERSION,
    entity: "habits" as any,
    on_duplicate: "skip",
    items,
  };
}

/**
 * Validate habit import template
 */
export function validateHabitTemplate(template: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!template.version) {
    errors.push("Campo 'version' é obrigatório");
  }

  if (!template.items || !Array.isArray(template.items)) {
    errors.push("Campo 'items' deve ser um array");
    return { isValid: false, errors };
  }

  template.items.forEach((item: any, index: number) => {
    if (!item.external_id) {
      errors.push(`Item ${index + 1}: 'external_id' é obrigatório`);
    }
    if (!item.name) {
      errors.push(`Item ${index + 1}: 'name' é obrigatório`);
    }
    if (!item.unit) {
      errors.push(`Item ${index + 1}: 'unit' é obrigatório`);
    }
    if (typeof item.default_goal !== "number" || item.default_goal <= 0) {
      errors.push(`Item ${index + 1}: 'default_goal' deve ser um número positivo`);
    }
  });

  return { isValid: errors.length === 0, errors };
}

function summarizeResults(results: ImportItemResult[]): ImportResult {
  return {
    total_items: results.length,
    inserted: results.filter((r) => r.status === "inserted").length,
    updated: results.filter((r) => r.status === "updated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };
}
