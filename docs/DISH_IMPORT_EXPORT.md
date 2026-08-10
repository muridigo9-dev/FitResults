# Dish Import/Export Specification (JSON V1.0)

## Overview
This document describes the JSON format used for backing up and restoring Dishes (Pratos) and their Ingredients.

## JSON Template

```json
{
  "schema_version": "1.0",
  "exported_at": "2026-01-17T21:00:00Z",
  "data": [
    {
      "name": "Frango Assado com Batata",
      "description": "Prato proteico para almoço",
      "visibility_type": "global",
      "ingredients": [
        {
          "name": "Peito de Frango", // Crucial: Used for matching existing ingredients
          "quantity": 200,
          "metric_unit": "g"
        },
        {
          "name": "Batata Inglesa",
          "quantity": 150,
          "metric_unit": "g"
        }
      ]
    }
  ]
}
```

## Logic

### Import Flow (RPC: `import_dishes`)
1. **Validation**: Checks `schema_version`.
2. **Dish Check**:
   - Searches for existing dish by `name` (case-insensitive).
   - If exists: Skips (logs warning).
   - If new: Creates the dish record.
3. **Ingredient Resolution**:
   - Iterates through `ingredients` list.
   - Searches for ingredient by `name` (case-insensitive).
   - **Auto-Create**: If ingredient not found, it is automatically created with default values (`unit: 'g'`, `ref: 100`).
   - Links ingredient to dish in `dish_ingredients` table.

### Export Flow (RPC: `export_dishes`)
- Aggregates all dishes (optionally filtered).
- Includes full ingredient list with quantities.
- Generates standard JSON format.
