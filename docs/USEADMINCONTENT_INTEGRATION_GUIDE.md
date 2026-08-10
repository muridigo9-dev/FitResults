/**
 * Integration Guide: useAdminContent.ts
 * 
 * Este arquivo documenta as mudanças necessárias no hook useAdminContent
 * para integrar o sistema unificado de visibilidade.
 * 
 * IMPORTANTE: Este é um guia de referência. As mudanças reais devem ser
 * aplicadas gradualmente no arquivo original.
 */

// =====================================================
// PASSO 1: Adicionar Import do Hook Unificado
// =====================================================

import { useUnifiedVisibility } from "./useUnifiedVisibility";

// =====================================================
// PASSO 2: Atualizar Queries de Exercises
// =====================================================

// ANTES:
async function fetchLibraryExercises() {
  const { data, error } = await (supabase as any)
    .from("exercises")
    .select(`
      *,
      exercise_muscle_groups(muscle_group_id),
      exercise_plans(plan_id)
    `)
    .order("name", { ascending: true });

  return (data || []).map(ex => ({
    // ... campos existentes
    planIds: (ex.exercise_plans || []).map((ep: any) => ep.plan_id)
  }));
}

// DEPOIS:
async function fetchLibraryExercises() {
  const { data, error } = await (supabase as any)
    .from("exercises")
    .select(`
      *,
      exercise_muscle_groups(muscle_group_id),
      exercise_plans(plan_id)
    `)
    .eq('is_active', true)  // Adicionar filtro de ativos
    .order("name", { ascending: true });

  return (data || []).map(ex => ({
    // ... campos existentes
    visibilityType: ex.visibility_type || 'plan_restricted',  // NOVO
    planIds: (ex.exercise_plans || []).map((ep: any) => ep.plan_id)
  }));
}

// =====================================================
// PASSO 3: Atualizar saveExercise para Incluir Visibilidade
// =====================================================

// ANTES:
const saveExerciseMutation = useMutation({
  mutationFn: async (exercise: Exercise) => {
    // Salvar exercício
    const { data: savedExercise } = await supabase
      .from('exercises')
      .upsert({
        id: exercise.id,
        name: exercise.name,
        // ... outros campos
      })
      .select()
      .single();

    // Salvar relações de planos (lógica antiga)
    await (supabase as any).from("exercise_plans").delete().eq("exercise_id", exerciseId);
    
    if (exercise.planIds && exercise.planIds.length > 0) {
      const relations = exercise.planIds.map(planId => ({
        exercise_id: exerciseId,
        plan_id: planId
      }));
      await (supabase as any).from("exercise_plans").insert(relations);
    }
  }
});

// DEPOIS (usando hook unificado):
const { saveVisibilityConfig } = useUnifiedVisibility();

const saveExerciseMutation = useMutation({
  mutationFn: async (exercise: Exercise & { visibilityType?: string; planIds?: string[] }) => {
    // 1. Salvar exercício (incluir visibility_type)
    const { data: savedExercise } = await supabase
      .from('exercises')
      .upsert({
        id: exercise.id,
        name: exercise.name,
        visibility_type: exercise.visibilityType || 'plan_restricted',  // NOVO
        // ... outros campos
      })
      .select()
      .single();

    // 2. Salvar visibilidade usando hook unificado
    if (exercise.visibilityType && savedExercise) {
      await saveVisibilityConfig({
        entityType: 'exercise',
        entityId: savedExercise.id,
        config: {
          visibilityType: exercise.visibilityType as any,
          planIds: exercise.planIds || []
        }
      });
    }

    return savedExercise;
  }
});

// =====================================================
// PASSO 4: Adicionar Suporte para Outros Domínios
// =====================================================

// Workouts
const saveWorkoutMutation = useMutation({
  mutationFn: async (workout: Workout & { visibilityType?: string; planIds?: string[] }) => {
    // 1. Salvar workout
    const { data: savedWorkout } = await supabase
      .from('workouts')
      .upsert({
        id: workout.id,
        title: workout.title,
        visibility_type: workout.visibilityType || 'global',  // NOVO
        // ... outros campos
      })
      .select()
      .single();

    // 2. Salvar visibilidade
    if (workout.visibilityType && savedWorkout) {
      await saveVisibilityConfig({
        entityType: 'workout',
        entityId: savedWorkout.id,
        config: {
          visibilityType: workout.visibilityType as any,
          planIds: workout.planIds || []
        }
      });
    }

    return savedWorkout;
  }
});

// Dishes
const saveDishMutation = useMutation({
  mutationFn: async (dish: Dish & { visibilityType?: string; planIds?: string[] }) => {
    // 1. Salvar dish
    const { data: savedDish } = await supabase
      .from('dishes')
      .upsert({
        id: dish.id,
        title: dish.title,
        visibility_type: dish.visibilityType || 'global',  // NOVO
        // ... outros campos
      })
      .select()
      .single();

    // 2. Salvar visibilidade
    if (dish.visibilityType && savedDish) {
      await saveVisibilityConfig({
        entityType: 'dish',
        entityId: savedDish.id,
        config: {
          visibilityType: dish.visibilityType as any,
          planIds: dish.planIds || []
        }
      });
    }

    return savedDish;
  }
});

// Diet Plans
const saveDietPlanMutation = useMutation({
  mutationFn: async (dietPlan: DietPlan & { visibilityType?: string; planIds?: string[] }) => {
    // 1. Salvar diet plan
    const { data: savedDietPlan } = await supabase
      .from('diet_plans')
      .upsert({
        id: dietPlan.id,
        title: dietPlan.title,
        visibility_type: dietPlan.visibilityType || 'global',  // NOVO
        // ... outros campos
      })
      .select()
      .single();

    // 2. Salvar visibilidade
    if (dietPlan.visibilityType && savedDietPlan) {
      await saveVisibilityConfig({
        entityType: 'diet_plan',
        entityId: savedDietPlan.id,
        config: {
          visibilityType: dietPlan.visibilityType as any,
          planIds: dietPlan.planIds || []
        }
      });
    }

    return savedDietPlan;
  }
});

// Challenges
const saveChallengeMutation = useMutation({
  mutationFn: async (challenge: Challenge & { visibilityType?: string; planIds?: string[] }) => {
    // 1. Salvar challenge
    const { data: savedChallenge } = await supabase
      .from('challenges')
      .upsert({
        id: challenge.id,
        title: challenge.title,
        visibility_type: challenge.visibilityType || 'global',  // NOVO
        // ... outros campos
      })
      .select()
      .single();

    // 2. Salvar visibilidade
    if (challenge.visibilityType && savedChallenge) {
      await saveVisibilityConfig({
        entityType: 'challenge',
        entityId: savedChallenge.id,
        config: {
          visibilityType: challenge.visibilityType as any,
          planIds: challenge.planIds || []
        }
      });
    }

    return savedChallenge;
  }
});

// =====================================================
// PASSO 5: Atualizar Tipos TypeScript
// =====================================================

// Adicionar aos tipos existentes:
interface Exercise {
  id: string;
  name: string;
  // ... campos existentes
  
  // NOVOS CAMPOS
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  planIds?: string[];
}

interface Workout {
  id: string;
  title: string;
  // ... campos existentes
  
  // NOVOS CAMPOS
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  planIds?: string[];
}

interface Dish {
  id: string;
  title: string;
  // ... campos existentes
  
  // NOVOS CAMPOS
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  planIds?: string[];
}

interface DietPlan {
  id: string;
  title: string;
  // ... campos existentes
  
  // NOVOS CAMPOS
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  planIds?: string[];
}

interface Challenge {
  id: string;
  title: string;
  // ... campos existentes
  
  // NOVOS CAMPOS
  visibilityType?: 'global' | 'academy' | 'private' | 'plan_restricted';
  planIds?: string[];
}

// =====================================================
// PASSO 6: Atualizar Queries de Listagem
// =====================================================

// ANTES:
const { data: exercises } = await supabase
  .from('exercises')
  .select('*')
  .order('name');

// DEPOIS (RLS cuida da visibilidade automaticamente):
const { data: exercises } = await supabase
  .from('exercises')
  .select(`
    *,
    exercise_plans(plan_id)
  `)
  .eq('is_active', true)
  .order('name');

// Usuário só verá exercícios que tem permissão!

// =====================================================
// PASSO 7: Remover Lógica Manual de Visibilidade
// =====================================================

// ANTES (lógica manual no frontend):
const visibleExercises = exercises.filter(ex => {
  if (!ex.planIds || ex.planIds.length === 0) return true;
  return userPlanIds.some(planId => ex.planIds.includes(planId));
});

// DEPOIS (RLS cuida disso):
// Simplesmente use os dados retornados pela query
const visibleExercises = exercises; // Já filtrado pelo RLS!

// =====================================================
// PASSO 8: Atualizar Formulários Admin
// =====================================================

// Adicionar VisibilitySelector aos formulários:

import { VisibilitySelector } from "@/components/admin/VisibilitySelector";

function ExerciseForm({ exercise }: { exercise?: Exercise }) {
  const [formData, setFormData] = useState({
    ...exercise,
    visibilityType: exercise?.visibilityType || 'plan_restricted',
    planIds: exercise?.planIds || []
  });

  return (
    <form>
      {/* Campos existentes */}
      
      {/* NOVO: Seletor de Visibilidade */}
      <VisibilitySelector
        entityType="exercise"
        value={{
          visibilityType: formData.visibilityType,
          planIds: formData.planIds
        }}
        onChange={(config) => setFormData(prev => ({
          ...prev,
          visibilityType: config.visibilityType,
          planIds: config.planIds
        }))}
      />
      
      <button type="submit">Salvar</button>
    </form>
  );
}

// =====================================================
// RESUMO DE MUDANÇAS NO useAdminContent.ts
// =====================================================

/**
 * MUDANÇAS NECESSÁRIAS:
 * 
 * 1. ✅ Importar useUnifiedVisibility
 * 2. ✅ Adicionar visibilityType e planIds aos tipos
 * 3. ✅ Atualizar queries para incluir visibility_type
 * 4. ✅ Atualizar saveExercise para usar saveVisibilityConfig
 * 5. ✅ Aplicar mesmo padrão para workouts, dishes, diet_plans, challenges
 * 6. ✅ Remover lógica manual de filtragem (RLS cuida)
 * 7. ✅ Atualizar formulários para incluir VisibilitySelector
 * 
 * BENEFÍCIOS:
 * - Código mais limpo e centralizado
 * - Segurança automática via RLS
 * - Menos bugs de visibilidade
 * - Fácil manutenção
 */

// =====================================================
// EXEMPLO COMPLETO: Hook Atualizado
// =====================================================

export function useAdminContent() {
  const { saveVisibilityConfig } = useUnifiedVisibility();
  
  // Exercises
  const saveExercise = async (exercise: Exercise & { visibilityType?: string; planIds?: string[] }) => {
    // 1. Salvar dados principais
    const { data: saved } = await supabase
      .from('exercises')
      .upsert({
        ...exercise,
        visibility_type: exercise.visibilityType || 'plan_restricted'
      })
      .select()
      .single();
    
    // 2. Salvar visibilidade
    if (saved && exercise.visibilityType) {
      await saveVisibilityConfig({
        entityType: 'exercise',
        entityId: saved.id,
        config: {
          visibilityType: exercise.visibilityType as any,
          planIds: exercise.planIds || []
        }
      });
    }
    
    return saved;
  };
  
  // Repetir padrão para outros domínios...
  
  return {
    saveExercise,
    // ... outros métodos
  };
}
