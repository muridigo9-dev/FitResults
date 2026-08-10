import { Plus, Utensils, Dumbbell, Trophy, Calculator, FileText, Target, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { ADMIN_ROUTES } from "@/config/routes";
import { useI18n } from "@/hooks/useI18n";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function QuickActionFAB() {
    const navigate = useNavigate();
    const { t } = useI18n();

    return (
        <div className="fixed bottom-6 right-6 z-50">
            <DropdownMenu>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon"
                                    className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    <Plus className="h-8 w-8" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p>{t("actions.quickAction")}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <DropdownMenuContent align="end" className="w-56" sideOffset={10}>
                    <DropdownMenuLabel>Criar Novo...</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {/* Nutrition Group */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Utensils className="h-4 w-4 mr-2" />
                            <span>Nutrição</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_INGREDIENTS + "?create=true")}>
                                <Apple className="h-4 w-4 mr-2" />
                                <span>Ingrediente</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_DISHES + "?create=true")}>
                                <Utensils className="h-4 w-4 mr-2" />
                                <span>Prato</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_DIET_PLANS + "?create=true")}>
                                <FileText className="h-4 w-4 mr-2" />
                                <span>Plano Alimentar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_MACROS + "?create=true")}>
                                <Calculator className="h-4 w-4 mr-2" />
                                <span>Template de Macro</span>
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    {/* Fitness Group */}
                    <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                            <Dumbbell className="h-4 w-4 mr-2" />
                            <span>Fitness</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_EXERCISES + "?create=true")}>
                                <Dumbbell className="h-4 w-4 mr-2" />
                                <span>Exercício</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_WORKOUTS + "?create=true")}>
                                <FileText className="h-4 w-4 mr-2" />
                                <span>Plano de Treino</span>
                            </DropdownMenuItem>
                        </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSeparator />

                    {/* Gamification */}
                    <DropdownMenuItem onClick={() => navigate(ADMIN_ROUTES.CONTENT_CHALLENGES + "?create=true")}>
                        <Target className="h-4 w-4 mr-2 text-accent" />
                        <span>Desafio</span>
                    </DropdownMenuItem>

                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
