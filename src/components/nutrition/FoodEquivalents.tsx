/**
 * FoodEquivalents Component
 * 
 * Shows macro targets converted to practical food examples.
 * Educational section to help users understand their nutrition.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beef, Wheat, Droplets, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FoodEquivalentsProps {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

// Food database with macro content per 100g
const FOODS = {
  protein: [
    { name: "Frango grelhado", per100g: 31, emoji: "🍗" },
    { name: "Ovo inteiro", per100g: 13, emoji: "🥚", unitGrams: 50 },
    { name: "Whey Protein", per100g: 80, emoji: "🥤", unitGrams: 30, unitName: "dose" },
    { name: "Carne bovina magra", per100g: 26, emoji: "🥩" },
    { name: "Peixe (tilápia)", per100g: 26, emoji: "🐟" },
    { name: "Queijo cottage", per100g: 11, emoji: "🧀" },
  ],
  carbs: [
    { name: "Arroz branco cozido", per100g: 28, emoji: "🍚" },
    { name: "Batata doce", per100g: 20, emoji: "🍠" },
    { name: "Pão integral", per100g: 41, emoji: "🍞", unitGrams: 50, unitName: "fatia" },
    { name: "Banana", per100g: 23, emoji: "🍌", unitGrams: 120, unitName: "unidade" },
    { name: "Aveia", per100g: 66, emoji: "🥣" },
    { name: "Macarrão cozido", per100g: 25, emoji: "🍝" },
  ],
  fat: [
    { name: "Azeite de oliva", per100g: 100, emoji: "🫒", unitGrams: 13, unitName: "colher" },
    { name: "Abacate", per100g: 15, emoji: "🥑" },
    { name: "Castanha de caju", per100g: 44, emoji: "🥜" },
    { name: "Amendoim", per100g: 49, emoji: "🥜" },
    { name: "Ovo (gema)", per100g: 27, emoji: "🍳" },
    { name: "Pasta de amendoim", per100g: 50, emoji: "🥜", unitGrams: 32, unitName: "colher" },
  ],
};

const MACRO_CONFIG = {
  protein: { 
    icon: Beef, 
    label: "Proteína", 
    color: "text-habit-workout",
    bg: "bg-habit-workout/10",
  },
  carbs: { 
    icon: Wheat, 
    label: "Carboidratos", 
    color: "text-habit-meals",
    bg: "bg-habit-meals/10",
  },
  fat: { 
    icon: Droplets, 
    label: "Gorduras", 
    color: "text-habit-water",
    bg: "bg-habit-water/10",
  },
};

function MacroFoodSection({ 
  type, 
  targetGrams,
}: { 
  type: "protein" | "carbs" | "fat";
  targetGrams: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = MACRO_CONFIG[type];
  const Icon = config.icon;
  const foods = FOODS[type];
  
  // Show first 3 or all when expanded
  const displayFoods = expanded ? foods : foods.slice(0, 3);

  const calculateEquivalent = (food: typeof foods[0]) => {
    const gramsNeeded = (targetGrams / food.per100g) * 100;
    
    if (food.unitGrams && food.unitName) {
      const units = Math.round(gramsNeeded / food.unitGrams);
      return { text: `${units} ${food.unitName}${units > 1 ? 's' : ''}`, grams: gramsNeeded };
    }
    
    return { text: `${Math.round(gramsNeeded)}g`, grams: gramsNeeded };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", config.bg)}>
          <Icon className={cn("h-4 w-4", config.color)} />
        </div>
        <span className="font-medium text-sm">{config.label}</span>
        <Badge variant="secondary" className="ml-auto text-xs">
          {Math.round(targetGrams)}g/dia
        </Badge>
      </div>
      
      <div className="grid gap-1.5">
        {displayFoods.map((food, i) => {
          const equivalent = calculateEquivalent(food);
          return (
            <div 
              key={i} 
              className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/50"
            >
              <span className="text-sm flex items-center gap-2">
                <span>{food.emoji}</span>
                <span className="text-muted-foreground">{food.name}</span>
              </span>
              <span className="text-sm font-medium">{equivalent.text}</span>
            </div>
          );
        })}
      </div>
      
      {foods.length > 3 && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full h-7 text-xs text-muted-foreground"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Ver menos
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Ver mais opções
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function FoodEquivalents({ proteinGrams, carbsGrams, fatGrams }: FoodEquivalentsProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          🍽️ O que isso significa na prática?
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Exemplos de como atingir suas metas com alimentos comuns
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <MacroFoodSection type="protein" targetGrams={proteinGrams} />
        <MacroFoodSection type="carbs" targetGrams={carbsGrams} />
        <MacroFoodSection type="fat" targetGrams={fatGrams} />
        
        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t border-border">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            Valores aproximados para fins educacionais. 
            Consulte a tabela nutricional dos alimentos para valores exatos.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
