import { motion } from "framer-motion";
import { Settings, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { useI18n } from "@/hooks/useI18n";
import { GoalsConfigDrawer } from "./GoalsConfigDrawer";

interface DashboardHeaderProps {
    userName: string;
    streak: number;
    onOpenGoals: () => void;
}

export function DashboardHeader({ userName, streak, onOpenGoals }: DashboardHeaderProps) {
    const { t } = useI18n();
    const hour = new Date().getHours();

    const getTimeGreeting = () => {
        if (hour < 12) return "Bom dia";
        if (hour < 18) return "Boa tarde";
        return "Boa noite";
    };

    const getTranslatedGreeting = () => {
        const key = hour < 12 ? "dashboard.goodMorning" : hour < 18 ? "dashboard.goodAfternoon" : "dashboard.goodEvening";
        const trans = t(key);
        // Fallback if translation returns key
        return trans === key ? getTimeGreeting() : trans;
    };

    return (
        <div className="flex justify-between items-start mb-6">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="text-2xl font-bold tracking-tight">
                    {getTranslatedGreeting()}, <span className="text-primary">{userName}</span> 👋
                </h1>
                <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/20">
                        <Flame className="w-3 h-3 fill-current" />
                        <span className="font-bold">{streak} {t("dashboard.daysStreak") || "dias"}</span>
                    </div>
                    <span className="text-xs">{t("dashboard.consistent")}</span>
                </div>
            </motion.div>

            <Button variant="ghost" size="icon" onClick={onOpenGoals} className="rounded-full">
                <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
        </div>
    );
}
