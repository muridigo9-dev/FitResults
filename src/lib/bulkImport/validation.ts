// ============================================
// JSON VALIDATION
// ============================================

import type {
  EntityType,
  ImportTemplate,
  ImportChallenge,
  ImportDiet,
  ImportWorkout,
  ValidationResult,
  ValidationError,
  DuplicateStrategy,
} from "./types";

const VALID_TASK_TYPES = ["water", "workout", "meal", "habit"];
const VALID_DUPLICATE_STRATEGIES: DuplicateStrategy[] = ["skip", "update", "error"];

function validateBaseStructure(
  data: unknown,
  expectedEntity: EntityType
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== "object") {
    errors.push({ field: "root", message: "JSON inválido ou vazio" });
    return errors;
  }

  const template = data as Record<string, unknown>;

  if (typeof template.version !== "string") {
    errors.push({ field: "version", message: "Campo 'version' é obrigatório e deve ser string" });
  }

  if (template.entity !== expectedEntity) {
    errors.push({
      field: "entity",
      message: `Campo 'entity' deve ser '${expectedEntity}', recebido: '${template.entity}'`,
    });
  }

  if (template.on_duplicate !== undefined) {
    if (!VALID_DUPLICATE_STRATEGIES.includes(template.on_duplicate as DuplicateStrategy)) {
      errors.push({
        field: "on_duplicate",
        message: `Valor inválido para 'on_duplicate'. Use: ${VALID_DUPLICATE_STRATEGIES.join(", ")}`,
      });
    }
  }

  if (!Array.isArray(template.items)) {
    errors.push({ field: "items", message: "Campo 'items' deve ser um array" });
  } else if (template.items.length === 0) {
    errors.push({ field: "items", message: "Array 'items' não pode estar vazio" });
  }

  return errors;
}

function validateChallenge(
  item: ImportChallenge,
  index: number
): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `items[${index}]`;

  if (!item.external_id || typeof item.external_id !== "string") {
    errors.push({ field: `${prefix}.external_id`, message: "Campo 'external_id' é obrigatório", itemIndex: index });
  }

  if (!item.name || typeof item.name !== "string") {
    errors.push({ field: `${prefix}.name`, message: "Campo 'name' é obrigatório", itemIndex: index });
  }

  if (typeof item.total_days !== "number" || item.total_days < 1) {
    errors.push({ field: `${prefix}.total_days`, message: "Campo 'total_days' deve ser número >= 1", itemIndex: index });
  }

  if (!Array.isArray(item.days)) {
    errors.push({ field: `${prefix}.days`, message: "Campo 'days' deve ser um array", itemIndex: index });
  } else {
    item.days.forEach((day, dayIndex) => {
      if (typeof day.day_number !== "number") {
        errors.push({
          field: `${prefix}.days[${dayIndex}].day_number`,
          message: "Campo 'day_number' deve ser número",
          itemIndex: index,
        });
      }

      if (!Array.isArray(day.tasks)) {
        errors.push({
          field: `${prefix}.days[${dayIndex}].tasks`,
          message: "Campo 'tasks' deve ser um array",
          itemIndex: index,
        });
      } else {
        day.tasks.forEach((task, taskIndex) => {
          if (!task.title) {
            errors.push({
              field: `${prefix}.days[${dayIndex}].tasks[${taskIndex}].title`,
              message: "Campo 'title' é obrigatório na task",
              itemIndex: index,
            });
          }
          if (!VALID_TASK_TYPES.includes(task.type)) {
            errors.push({
              field: `${prefix}.days[${dayIndex}].tasks[${taskIndex}].type`,
              message: `Tipo inválido. Use: ${VALID_TASK_TYPES.join(", ")}`,
              itemIndex: index,
            });
          }
        });
      }
    });
  }

  return errors;
}

function validateDiet(item: ImportDiet, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `items[${index}]`;

  if (!item.external_id || typeof item.external_id !== "string") {
    errors.push({ field: `${prefix}.external_id`, message: "Campo 'external_id' é obrigatório", itemIndex: index });
  }

  if (!item.title || typeof item.title !== "string") {
    errors.push({ field: `${prefix}.title`, message: "Campo 'title' é obrigatório", itemIndex: index });
  }

  if (typeof item.calories !== "number" || item.calories < 0) {
    errors.push({ field: `${prefix}.calories`, message: "Campo 'calories' deve ser número >= 0", itemIndex: index });
  }

  if (typeof item.protein !== "number" || item.protein < 0) {
    errors.push({ field: `${prefix}.protein`, message: "Campo 'protein' deve ser número >= 0", itemIndex: index });
  }

  if (typeof item.carbs !== "number" || item.carbs < 0) {
    errors.push({ field: `${prefix}.carbs`, message: "Campo 'carbs' deve ser número >= 0", itemIndex: index });
  }

  if (typeof item.fat !== "number" || item.fat < 0) {
    errors.push({ field: `${prefix}.fat`, message: "Campo 'fat' deve ser número >= 0", itemIndex: index });
  }

  if (!Array.isArray(item.ingredients)) {
    errors.push({ field: `${prefix}.ingredients`, message: "Campo 'ingredients' deve ser um array", itemIndex: index });
  } else {
    item.ingredients.forEach((ing, ingIndex) => {
      if (!ing.name) {
        errors.push({
          field: `${prefix}.ingredients[${ingIndex}].name`,
          message: "Campo 'name' é obrigatório no ingrediente",
          itemIndex: index,
        });
      }
    });
  }

  if (!Array.isArray(item.preparation)) {
    errors.push({ field: `${prefix}.preparation`, message: "Campo 'preparation' deve ser um array", itemIndex: index });
  }

  return errors;
}

function validateWorkout(item: ImportWorkout, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const prefix = `items[${index}]`;

  if (!item.external_id || typeof item.external_id !== "string") {
    errors.push({ field: `${prefix}.external_id`, message: "Campo 'external_id' é obrigatório", itemIndex: index });
  }

  if (!item.title || typeof item.title !== "string") {
    errors.push({ field: `${prefix}.title`, message: "Campo 'title' é obrigatório", itemIndex: index });
  }

  if (!Array.isArray(item.exercises)) {
    errors.push({ field: `${prefix}.exercises`, message: "Campo 'exercises' deve ser um array", itemIndex: index });
  } else {
    item.exercises.forEach((ex, exIndex) => {
      if (!ex.name) {
        errors.push({
          field: `${prefix}.exercises[${exIndex}].name`,
          message: "Campo 'name' é obrigatório no exercício",
          itemIndex: index,
        });
      }
      if (typeof ex.sets !== "number" || ex.sets < 1) {
        errors.push({
          field: `${prefix}.exercises[${exIndex}].sets`,
          message: "Campo 'sets' deve ser número >= 1",
          itemIndex: index,
        });
      }
      if (typeof ex.reps !== "number" || ex.reps < 1) {
        errors.push({
          field: `${prefix}.exercises[${exIndex}].reps`,
          message: "Campo 'reps' deve ser número >= 1",
          itemIndex: index,
        });
      }
    });
  }

  return errors;
}

export function validateChallengeTemplate(
  data: unknown
): ValidationResult {
  const baseErrors = validateBaseStructure(data, "challenges");
  if (baseErrors.length > 0) {
    return { isValid: false, errors: baseErrors };
  }

  const template = data as ImportTemplate<ImportChallenge>;
  const itemErrors = template.items.flatMap((item, index) =>
    validateChallenge(item, index)
  );

  return {
    isValid: itemErrors.length === 0,
    errors: itemErrors,
  };
}

export function validateDietTemplate(data: unknown): ValidationResult {
  const baseErrors = validateBaseStructure(data, "diets");
  if (baseErrors.length > 0) {
    return { isValid: false, errors: baseErrors };
  }

  const template = data as ImportTemplate<ImportDiet>;
  const itemErrors = template.items.flatMap((item, index) =>
    validateDiet(item, index)
  );

  return {
    isValid: itemErrors.length === 0,
    errors: itemErrors,
  };
}

export function validateWorkoutTemplate(data: unknown): ValidationResult {
  const baseErrors = validateBaseStructure(data, "workouts");
  if (baseErrors.length > 0) {
    return { isValid: false, errors: baseErrors };
  }

  const template = data as ImportTemplate<ImportWorkout>;
  const itemErrors = template.items.flatMap((item, index) =>
    validateWorkout(item, index)
  );

  return {
    isValid: itemErrors.length === 0,
    errors: itemErrors,
  };
}
