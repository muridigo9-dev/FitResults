import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Pipette } from "lucide-react";

interface ColorPickerProps {
  label: string;
  value: string; // HSL format: "168 76% 42%"
  onChange: (value: string) => void;
}

// Convert HSL string to hex
const hslToHex = (hsl: string): string => {
  try {
    const parts = hsl.match(/(\d+\.?\d*)/g);
    if (!parts || parts.length < 3) return "#10b981";
    
    const h = parseFloat(parts[0]);
    const s = parseFloat(parts[1]) / 100;
    const l = parseFloat(parts[2]) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n: number) => {
      const hex = Math.round((n + m) * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return "#10b981";
  }
};

// Convert hex to HSL string
const hexToHsl = (hex: string): string => {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return "168 76% 42%";

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
        case g: h = ((b - r) / d + 2) * 60; break;
        case b: h = ((r - g) / d + 4) * 60; break;
      }
    }

    return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  } catch {
    return "168 76% 42%";
  }
};

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(() => hslToHex(value));
  const [hslInput, setHslInput] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  // Sync hex when value changes externally
  useEffect(() => {
    setHexValue(hslToHex(value));
    setHslInput(value);
  }, [value]);

  const handleHexChange = useCallback((hex: string) => {
    setHexValue(hex);
    const hsl = hexToHsl(hex);
    setHslInput(hsl);
    onChange(hsl);
  }, [onChange]);

  const handleHslInputChange = useCallback((input: string) => {
    setHslInput(input);
    // Try to parse and update
    const parts = input.match(/(\d+\.?\d*)/g);
    if (parts && parts.length >= 3) {
      onChange(input);
      setHexValue(hslToHex(input));
    }
  }, [onChange]);

  return (
    <div className="space-y-2">
      <Label className="capitalize">{label}</Label>
      <div className="flex gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-10 w-10 rounded-lg border border-border shrink-0 cursor-pointer transition-all hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              style={{ backgroundColor: `hsl(${value})` }}
              aria-label={`Selecionar cor para ${label}`}
            />
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Seletor de Cor</Label>
                <div className="relative">
                  <input
                    type="color"
                    value={hexValue}
                    onChange={(e) => handleHexChange(e.target.value)}
                    className="w-full h-32 rounded-lg cursor-pointer border-0"
                    style={{ padding: 0 }}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">HEX</Label>
                <div className="flex gap-2">
                  <Input
                    value={hexValue}
                    onChange={(e) => handleHexChange(e.target.value)}
                    placeholder="#10b981"
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div 
                className="h-8 rounded-lg border border-border"
                style={{ backgroundColor: `hsl(${value})` }}
              />
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1 flex gap-2">
          <Input
            value={hslInput}
            onChange={(e) => handleHslInputChange(e.target.value)}
            placeholder="168 76% 42%"
            className="font-mono text-sm flex-1"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Pipette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-3" align="end">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cores Rápidas</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444",
                    "#14b8a6", "#6366f1", "#ec4899", "#84cc16", "#f97316",
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleHexChange(color)}
                      className="h-6 w-6 rounded border border-border hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      aria-label={`Selecionar ${color}`}
                    />
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
