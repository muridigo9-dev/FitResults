/**
 * Example Integration: Exercise Form with Unified Visibility
 * 
 * Este arquivo demonstra como integrar o VisibilitySelector
 * em um formulário de exercício existente.
 * 
 * INSTRUÇÕES DE USO:
 * 1. Adicione o state para visibilidade no formulário
 * 2. Adicione o VisibilitySelector ao JSX
 * 3. Salve a configuração junto com os dados do exercício
 */

import { useState } from "react";
import { VisibilitySelector } from "@/components/admin/VisibilitySelector";
import { useUnifiedVisibility, type VisibilityType } from "@/hooks/useUnifiedVisibility";
import type { Exercise } from "@/types/content";

// =====================================================
// EXEMPLO 1: State Management
// =====================================================

interface ExerciseFormData extends Exercise {
    // Adicionar campos de visibilidade
    visibilityType: VisibilityType;
    planIds: string[];
}

export function ExerciseFormExample() {
    const { saveVisibilityConfig, isSavingVisibility } = useUnifiedVisibility();

    // State do formulário
    const [formData, setFormData] = useState<ExerciseFormData>({
        id: '',
        name: '',
        description: '',
        // ... outros campos do exercício

        // Campos de visibilidade
        visibilityType: 'plan_restricted', // Default para exercises
        planIds: []
    });

    // =====================================================
    // EXEMPLO 2: Handler para mudanças de visibilidade
    // =====================================================

    const handleVisibilityChange = (config: { visibilityType: VisibilityType; planIds: string[] }) => {
        setFormData(prev => ({
            ...prev,
            visibilityType: config.visibilityType,
            planIds: config.planIds
        }));
    };

    // =====================================================
    // EXEMPLO 3: Salvar exercício com visibilidade
    // =====================================================

    const handleSave = async () => {
        try {
            // 1. Salvar dados do exercício (lógica existente)
            const exerciseId = await saveExercise(formData);

            // 2. Salvar configuração de visibilidade
            await saveVisibilityConfig({
                entityType: 'exercise',
                entityId: exerciseId,
                config: {
                    visibilityType: formData.visibilityType,
                    planIds: formData.planIds
                }
            });

            console.log('Exercício e visibilidade salvos com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
        }
    };

    // =====================================================
    // EXEMPLO 4: JSX - Adicionar ao formulário
    // =====================================================

    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            {/* Campos existentes do exercício */}
            <div>
                <label>Nome do Exercício</label>
                <input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
            </div>

            {/* ... outros campos ... */}

            {/* NOVO: Seletor de Visibilidade */}
            <VisibilitySelector
                entityType="exercise"
                value={{
                    visibilityType: formData.visibilityType,
                    planIds: formData.planIds
                }}
                onChange={handleVisibilityChange}
                disabled={isSavingVisibility}
            />

            <button type="submit" disabled={isSavingVisibility}>
                Salvar Exercício
            </button>
        </form>
    );
}

// =====================================================
// EXEMPLO 5: Carregar visibilidade existente
// =====================================================

import { useEntityVisibility } from "@/hooks/useUnifiedVisibility";

export function ExerciseEditExample({ exerciseId }: { exerciseId: string }) {
    const { data: visibilityConfig, isLoading } = useEntityVisibility('exercise', exerciseId);

    const [formData, setFormData] = useState<ExerciseFormData>({
        id: exerciseId,
        name: '',
        description: '',
        visibilityType: 'plan_restricted',
        planIds: []
    });

    // Carregar configuração de visibilidade quando disponível
    useEffect(() => {
        if (visibilityConfig) {
            setFormData(prev => ({
                ...prev,
                visibilityType: visibilityConfig.visibilityType,
                planIds: visibilityConfig.planIds
            }));
        }
    }, [visibilityConfig]);

    if (isLoading) {
        return <div>Carregando...</div>;
    }

    return (
        <form>
            {/* Formulário com visibilidade carregada */}
            <VisibilitySelector
                entityType="exercise"
                value={{
                    visibilityType: formData.visibilityType,
                    planIds: formData.planIds
                }}
                onChange={(config) => setFormData(prev => ({ ...prev, ...config }))}
            />
        </form>
    );
}

// =====================================================
// EXEMPLO 6: Versão Compacta (para modals/sidebars)
// =====================================================

import { VisibilitySelectorCompact } from "@/components/admin/VisibilitySelector";

export function QuickEditExample() {
    const [visibility, setVisibility] = useState({
        visibilityType: 'global' as VisibilityType,
        planIds: [] as string[]
    });

    return (
        <div className="space-y-4">
            <h3>Edição Rápida</h3>

            <VisibilitySelectorCompact
                entityType="exercise"
                value={visibility}
                onChange={setVisibility}
            />

            <button onClick={() => console.log('Salvar:', visibility)}>
                Salvar
            </button>
        </div>
    );
}

// =====================================================
// EXEMPLO 7: Integração com useAdminContent (existente)
// =====================================================

export function IntegrationWithExistingHook() {
    // Assumindo que você tem um hook useAdminContent existente
    // const { exercises, saveExercise } = useAdminContent();

    const { saveVisibilityConfig } = useUnifiedVisibility();

    const handleSaveExerciseWithVisibility = async (
        exerciseData: Exercise,
        visibilityConfig: { visibilityType: VisibilityType; planIds: string[] }
    ) => {
        // 1. Salvar exercício (hook existente)
        // const savedExercise = await saveExercise(exerciseData);

        // 2. Salvar visibilidade (novo hook)
        await saveVisibilityConfig({
            entityType: 'exercise',
            entityId: exerciseData.id,
            config: visibilityConfig
        });
    };

    return null; // Exemplo conceitual
}

// =====================================================
// EXEMPLO 8: Validação antes de salvar
// =====================================================

export function ValidationExample() {
    const [formData, setFormData] = useState<ExerciseFormData>({
        id: '',
        name: '',
        description: '',
        visibilityType: 'plan_restricted',
        planIds: []
    });

    const validateVisibility = (): boolean => {
        // Se for plan_restricted e não tiver planos, avisar usuário
        if (formData.visibilityType === 'plan_restricted' && formData.planIds.length === 0) {
            const confirmed = window.confirm(
                'Nenhum plano selecionado. O exercício será visível para TODOS. Continuar?'
            );
            return confirmed;
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateVisibility()) {
            return;
        }

        // Prosseguir com salvamento...
    };

    return null; // Exemplo conceitual
}

// =====================================================
// EXEMPLO 9: Buscar apenas entidades visíveis
// =====================================================

export function VisibleExercisesListExample() {
    const { useVisibleEntities } = useUnifiedVisibility();
    const { data: exercises, isLoading } = useVisibleEntities('exercise');

    if (isLoading) return <div>Carregando...</div>;

    return (
        <div>
            <h2>Exercícios Visíveis para Você</h2>
            {exercises?.map((exercise: any) => (
                <div key={exercise.id}>
                    <h3>{exercise.name}</h3>
                    <p>Visibilidade: {exercise.visibility_type}</p>
                    {exercise.exercise_plans?.length > 0 && (
                        <p>Planos: {exercise.exercise_plans.length}</p>
                    )}
                </div>
            ))}
        </div>
    );
}

// =====================================================
// EXEMPLO 10: Aplicar em outros domínios
// =====================================================

// Para Workouts:
export function WorkoutFormExample() {
    return (
        <VisibilitySelector
            entityType="workout"  // Mudar apenas o tipo!
            value={{ visibilityType: 'global', planIds: [] }}
            onChange={(config) => console.log('Workout visibility:', config)}
        />
    );
}

// Para Dishes:
export function DishFormExample() {
    return (
        <VisibilitySelector
            entityType="dish"  // Mudar apenas o tipo!
            value={{ visibilityType: 'global', planIds: [] }}
            onChange={(config) => console.log('Dish visibility:', config)}
        />
    );
}

// Para Diet Plans:
export function DietPlanFormExample() {
    return (
        <VisibilitySelector
            entityType="diet_plan"  // Mudar apenas o tipo!
            value={{ visibilityType: 'global', planIds: [] }}
            onChange={(config) => console.log('Diet plan visibility:', config)}
        />
    );
}

// Para Challenges:
export function ChallengeFormExample() {
    return (
        <VisibilitySelector
            entityType="challenge"  // Mudar apenas o tipo!
            value={{ visibilityType: 'global', planIds: [] }}
            onChange={(config) => console.log('Challenge visibility:', config)}
        />
    );
}

// =====================================================
// RESUMO DE INTEGRAÇÃO
// =====================================================

/**
 * PASSOS PARA INTEGRAR EM QUALQUER FORMULÁRIO:
 * 
 * 1. Importar:
 *    import { VisibilitySelector } from "@/components/admin/VisibilitySelector";
 *    import { useUnifiedVisibility } from "@/hooks/useUnifiedVisibility";
 * 
 * 2. Adicionar state:
 *    const [visibility, setVisibility] = useState({
 *      visibilityType: 'global',
 *      planIds: []
 *    });
 * 
 * 3. Adicionar ao JSX:
 *    <VisibilitySelector
 *      entityType="exercise" // ou workout, dish, diet_plan, challenge
 *      value={visibility}
 *      onChange={setVisibility}
 *    />
 * 
 * 4. Salvar junto com entidade:
 *    const { saveVisibilityConfig } = useUnifiedVisibility();
 *    await saveVisibilityConfig({
 *      entityType: 'exercise',
 *      entityId: savedEntityId,
 *      config: visibility
 *    });
 * 
 * PRONTO! O sistema RLS cuida do resto automaticamente.
 */

// Mock function para exemplo compilar
function saveExercise(data: any): Promise<string> {
    return Promise.resolve('exercise-id-123');
}

// Import necessário
import { useEffect } from "react";
