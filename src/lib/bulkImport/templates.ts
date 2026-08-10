// ============================================
// JSON TEMPLATE GENERATORS
// ============================================

import type {
  ImportTemplate,
  ImportChallenge,
  ImportDiet,
  ImportWorkout,
} from "./types";

export const TEMPLATE_VERSION = "1.0";

export function generateChallengeTemplate(): ImportTemplate<ImportChallenge> {
  return {
    version: TEMPLATE_VERSION,
    entity: "challenges",
    on_duplicate: "skip",
    items: [
      {
        external_id: "challenge_example_001",
        name: "Desafio de 7 Dias",
        description: "Um desafio motivacional para iniciar hábitos saudáveis",
        total_days: 7,
        is_active: true,
        days: [
          {
            day_number: 1,
            tasks: [
              {
                title: "Beber 2L de água",
                instruction: "Mantenha-se hidratado ao longo do dia",
                type: "water",
                target: 2000,
                unit: "ml",
              },
              {
                title: "Treino de 30 minutos",
                instruction: "Realize um treino de sua preferência",
                type: "workout",
                target: 30,
                unit: "minutos",
              },
            ],
          },
          {
            day_number: 2,
            tasks: [
              {
                title: "Beber 2L de água",
                instruction: "Mantenha-se hidratado ao longo do dia",
                type: "water",
                target: 2000,
                unit: "ml",
              },
            ],
          },
        ],
      },
    ],
  };
}

export function generateDietTemplate(): ImportTemplate<ImportDiet> {
  return {
    version: TEMPLATE_VERSION,
    entity: "diets",
    on_duplicate: "skip",
    items: [
      {
        external_id: "diet_example_001",
        title: "Frango Grelhado com Legumes",
        description: "Refeição rica em proteínas e baixa em carboidratos",
        image_url: "https://example.com/image.jpg",
        category: "almoco",
        calories: 450,
        protein: 35,
        carbs: 25,
        fat: 15,
        is_active: true,
        ingredients: [
          { name: "Peito de frango", quantity: "200", unit: "g" },
          { name: "Brócolis", quantity: "100", unit: "g" },
          { name: "Cenoura", quantity: "50", unit: "g" },
          { name: "Azeite de oliva", quantity: "1", unit: "colher de sopa" },
        ],
        preparation: [
          { order: 1, description: "Tempere o frango com sal e pimenta" },
          { order: 2, description: "Grelhe o frango em fogo médio por 7 minutos de cada lado" },
          { order: 3, description: "Cozinhe os legumes no vapor por 5 minutos" },
          { order: 4, description: "Sirva o frango com os legumes e regue com azeite" },
        ],
      },
    ],
  };
}

export function generateWorkoutTemplate(): ImportTemplate<ImportWorkout> {
  return {
    version: TEMPLATE_VERSION,
    entity: "workouts",
    on_duplicate: "skip",
    items: [
      {
        external_id: "workout_example_001",
        title: "Treino de Força - Peito e Tríceps",
        description: "Treino focado em hipertrofia para peito e tríceps",
        image_url: "https://example.com/workout.jpg",
        category: "strength",
        is_active: true,
        exercises: [
          {
            name: "Supino Reto com Barra",
            description: "Deite no banco e empurre a barra para cima",
            sets: 4,
            reps: 10,
            rest_seconds: 90,
            order: 1,
          },
          {
            name: "Supino Inclinado com Halteres",
            description: "No banco inclinado, empurre os halteres para cima",
            sets: 3,
            reps: 12,
            rest_seconds: 60,
            order: 2,
          },
          {
            name: "Tríceps Pulley",
            description: "Puxe a corda para baixo mantendo os cotovelos fixos",
            sets: 3,
            reps: 15,
            rest_seconds: 45,
            order: 3,
          },
        ],
      },
    ],
  };
}

export function downloadJSON(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
