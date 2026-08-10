# Diet Plan Import/Export Specification (JSON V1.0)

## Overview
Format for backing up and sharing complete Diet Plans, including their scheduling (days/meals) and dish compositions.

## JSON Template

```json
{
  "schema_version": "1.0",
  "exported_at": "2026-01-17T22:00:00Z",
  "data": [
    {
      "title": "Protocolo Perda de Peso - Semana 1",
      "description": "Foco em Low Carb",
      "access_level": "global",
      "days": [
        {
          "name": "Segunda a Sexta",
          "order_index": 0,
          "meals": [
            {
              "name": "Café da Manhã",
              "time_suggestion": "07:30",
              "order_index": 0,
              "items": [
                {
                  "dish_name": "Ovos Mexidos", // Key for linking
                  "portion_scale": 1.0,
                  "quantity_override": "3 ovos grandes",
                  "is_optional": false,
                  // Embedded details allows recreation of the dish if missing
                  "dish_details": {
                      "description": "...",
                      "ingredients": [...]
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Import Logic (`import_diet_plans`)
1. **Plan deduplication**: Skips if title matches existing plan.
2. **Deep Creation**:
   - Creates Plan header.
   - Iterates Days -> Creates Days.
   - Iterates Meals -> Creates Meals.
   - Iterates Items -> Resolves Dishes.
3. **Dish Resolution**:
   - Tries to find dish by `dish_name`.
   - If not found: Creates a **Stub Dish** (name + description only) to ensure the plan structure is valid. 
   - *Note*: Full ingredient recreation from `dish_details` inside a plan import is currently partial. Ideally, use `import_dishes` first for full fidelity.
