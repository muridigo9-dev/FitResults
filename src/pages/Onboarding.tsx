import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOnboarding, OnboardingFormData } from "@/hooks/useOnboarding";
import { useUserMetrics } from "@/contexts/UserMetricsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { User, Target, Sparkles, CheckCircle2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { DatePickerHybrid } from "@/components/ui/date-picker-hybrid";
import { useI18n } from "@/hooks/useI18n";
import { availableLanguages } from "@/i18n";

const ACTIVITY_LEVELS = [
    { value: "sedentary", labelKey: "activity_sedentary", descKey: "activity_sedentary_desc", multiplier: 1.2 },
    { value: "light", labelKey: "activity_light", descKey: "activity_light_desc", multiplier: 1.375 },
    { value: "moderate", labelKey: "activity_moderate", descKey: "activity_moderate_desc", multiplier: 1.55 },
    { value: "active", labelKey: "activity_active", descKey: "activity_active_desc", multiplier: 1.725 },
    { value: "very_active", labelKey: "activity_very_active", descKey: "activity_very_active_desc", multiplier: 1.9 },
];

const FITNESS_GOALS = [
    { value: "lose_weight", labelKey: "fitnessGoal_lose_weight", icon: "🔥", descKey: "fitnessGoal_lose_weight_desc" },
    { value: "gain_muscle", labelKey: "fitnessGoal_gain_muscle", icon: "💪", descKey: "fitnessGoal_gain_muscle_desc" },
    { value: "maintain", labelKey: "fitnessGoal_maintain", icon: "⚖️", descKey: "fitnessGoal_maintain_desc" },
];

export default function Onboarding() {
    const navigate = useNavigate();
    const { t, setLanguage, language } = useI18n();
    const { completeOnboarding, isSubmitting, userName } = useOnboarding();

    // We don't rely on context for immediate calculations to avoid sync delay
    const { updateProfile, saveProfile } = useUserMetrics();

    const [step, setStep] = useState(0); // Start at 0 for Language Selection
    const [showSuccess, setShowSuccess] = useState(false);
    const [formData, setFormData] = useState<Partial<OnboardingFormData>>({
        gender: "male",
        activityLevel: "moderate",
        fitnessGoal: "maintain",
    });

    // Internal date state for the DatePicker
    const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);

    // Sync DatePicker with formData
    useEffect(() => {
        if (birthDate) {
            setFormData(prev => ({ ...prev, birthDate: birthDate.toISOString() }));
        }
    }, [birthDate]);

    // Pre-populate name if available from profile or auth
    useEffect(() => {
        if (userName && !formData.name) {
            setFormData(prev => ({ ...prev, name: userName }));
        }
    }, [userName, formData.name]);

    const updateFormData = <K extends keyof OnboardingFormData>(field: K, value: OnboardingFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const progress = ((step + 1) / 3) * 100;

    const canProceed = () => {
        if (step === 0) return true; // Always can proceed from language selection once selected (handled by click)
        if (step === 1) {
            return (
                formData.name &&
                formData.name.length >= 3 &&
                birthDate &&
                formData.gender &&
                formData.height &&
                formData.height >= 100 &&
                formData.height <= 250 &&
                formData.currentWeight &&
                formData.currentWeight >= 30 &&
                formData.currentWeight <= 300
            );
        }
        if (step === 2) {
            return formData.activityLevel && formData.fitnessGoal;
        }
        return false;
    };

    const handleNext = () => {
        if (canProceed()) {
            setStep(step + 1);
        }
    };

    const handleLanguageSelect = (langCode: any) => {
        setLanguage(langCode);
        setStep(1);
    };

    const handleSubmit = async () => {
        if (!canProceed()) return;

        try {
            // First show success based on local data
            setShowSuccess(true);

            // Then perform async saving in background
            await completeOnboarding(formData as OnboardingFormData);
        } catch (error) {
            console.error("Onboarding error:", error);
            toast.error(t("states.error"));
            setShowSuccess(false);
        }
    };

    const handleFinish = () => {
        navigate("/dashboard");
    };

    // Calculate metrics strictly from State (not Context) for instant feedback
    const calculateMetrics = () => {
        if (!formData.height || !formData.currentWeight || !birthDate || !formData.gender || !formData.activityLevel) {
            return { bmi: 0, bmr: 0, tdee: 0, age: 0 };
        }

        // 1. Age
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        // 2. BMI
        const heightM = formData.height / 100;
        const bmi = formData.currentWeight / (heightM * heightM);

        // 3. BMR (Mifflin-St Jeor)
        let bmr = (10 * formData.currentWeight) + (6.25 * formData.height) - (5 * age);
        if (formData.gender === 'male') {
            bmr += 5;
        } else {
            bmr -= 161;
        }

        // 4. TDEE
        const activity = ACTIVITY_LEVELS.find(l => l.value === formData.activityLevel);
        const multiplier = activity ? activity.multiplier : 1.2;
        const tdee = bmr * multiplier;

        return { bmi, bmr, tdee, age };
    };

    const calculateProjection = (tdee: number) => {
        if (!formData.currentWeight || !formData.goalWeight || formData.fitnessGoal === 'maintain') return null;

        const isWeightLoss = formData.fitnessGoal === 'lose_weight';
        const diff = Math.abs(formData.currentWeight - formData.goalWeight);

        // Calories needed to gain/lose that diff (approx 7700 kcal per kg of fat)
        const totalCaloriesNeeded = diff * 7700;

        // Recommended sustainable deficit/surplus
        const dailyChange = 500;

        // Days to reach goal
        const days = Math.ceil(totalCaloriesNeeded / dailyChange);
        const weeks = Math.ceil(days / 7);
        const months = (weeks / 4.3).toFixed(1);

        const targetCalories = isWeightLoss ? tdee - dailyChange : tdee + dailyChange;

        return {
            days,
            weeks,
            months,
            dailyChange,
            targetCalories,
            type: isWeightLoss ? 'deficit' : 'surplus'
        };
    };

    // Success Dialog (Etapa 3)
    const SuccessDialog = () => {
        const { bmi, bmr, tdee } = calculateMetrics();
        const projection = calculateProjection(tdee);

        return (
            <Dialog open={showSuccess} onOpenChange={(open) => !open && handleFinish()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="flex items-center justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-500" />
                            </div>
                        </div>
                        <DialogTitle className="text-center text-2xl">
                            {t("dashboard.welcome")} {formData.name?.split(" ")[0]}! 🎉
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {t("onboarding.profileCreated")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                            <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                📊 {t("health.tabMetrics")}
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">{t("onboarding.currentWeight")}</p>
                                    <p className="text-lg font-bold">{formData.currentWeight} kg</p>
                                </div>
                                {formData.goalWeight && (
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">{t("onboarding.goalWeight")}</p>
                                        <p className="text-lg font-bold">{formData.goalWeight} kg</p>
                                    </div>
                                )}
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">{t("health.bmi")}</p>
                                    <p className="text-lg font-bold">{bmi.toFixed(1)}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">{t("health.bmr")}</p>
                                    <p className="text-lg font-bold">{Math.round(bmr)} kcal</p>
                                </div>
                            </div>

                            <div className="pt-2 border-t">
                                <p className="text-xs text-muted-foreground mb-1">{t("health.tdee")}</p>
                                <p className="text-2xl font-black text-primary">{Math.round(tdee)} kcal/{t("common.day")}</p>
                            </div>
                        </div>

                        {projection && (
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold mb-1">{t("onboarding.progressEstimate")}</p>
                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                {t("onboarding.projectionDescription", {
                                                    type: t(`onboarding.${projection.type}`),
                                                    dailyChange: projection.dailyChange,
                                                    targetCalories: Math.round(projection.targetCalories),
                                                    weeks: projection.weeks,
                                                    months: projection.months
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {!projection && (
                            <Card className="bg-primary/5 border-primary/20">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold mb-1">{t("onboarding.maintenance")}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {t("onboarding.maintenanceMessage", { calories: Math.round(tdee) })}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <Button onClick={handleFinish} className="w-full" size="lg">
                        {t("onboarding.startJourney")} 🚀
                    </Button>
                </DialogContent>
            </Dialog>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">
                        {step === 0 ? t("onboarding.selectLanguage") : t("dashboard.welcome")} 👋
                    </h1>
                    <p className="text-muted-foreground">
                        {step === 0 && t("onboarding.chooseLanguageDescription")}
                        {step === 1 && t("onboarding.step1Title")}
                        {step === 2 && t("onboarding.step2Title")}
                    </p>
                </div>

                {/* Progress */}
                {step > 0 && (
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t("checkin.step")} {step} {t("checkin.of")} 2</span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                    </div>
                )}

                {/* Form Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            {step === 0 && <><Globe className="h-5 w-5" /> {t("profile.language")}</>}
                            {step === 1 && <><User className="h-5 w-5" /> {t("profile.personalInfo")}</>}
                            {step === 2 && <><Target className="h-5 w-5" /> {t("onboarding.yourGoals")}</>}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">

                        {/* Step 0: Language Selection */}
                        {step === 0 && (
                            <div className="grid gap-3">
                                {availableLanguages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => handleLanguageSelect(lang.code)}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all hover:bg-muted/50",
                                            language === lang.code ? "border-primary bg-primary/5" : "border-muted"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{lang.flag}</span>
                                            <div className="text-left">
                                                <p className="font-semibold text-foreground">{lang.nativeName}</p>
                                                <p className="text-xs text-muted-foreground">{lang.name}</p>
                                            </div>
                                        </div>
                                        {language === lang.code && (
                                            <CheckCircle2 className="h-5 w-5 text-primary" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Step 1: Basic Info */}
                        {step === 1 && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="name">{t("profile.name")} *</Label>
                                    <Input
                                        id="name"
                                        placeholder={t("profile.name")}
                                        value={formData.name || ""}
                                        onChange={(e) => updateFormData("name", e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2 flex flex-col">
                                        <Label htmlFor="birthDate">{t("profile.dateOfBirth")} *</Label>
                                        <DatePickerHybrid
                                            date={birthDate}
                                            setDate={setBirthDate}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>{t("profile.gender")} *</Label>
                                        <Select
                                            value={formData.gender}
                                            onValueChange={(value: "male" | "female") => updateFormData("gender", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">{t("profile.male")}</SelectItem>
                                                <SelectItem value="female">{t("profile.female")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="height">{t("onboarding.height")} (cm) *</Label>
                                        <Input
                                            id="height"
                                            type="number"
                                            placeholder="170"
                                            value={formData.height || ""}
                                            onChange={(e) => updateFormData("height", Number(e.target.value))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="currentWeight">{t("checkin.weight")} (kg) *</Label>
                                        <Input
                                            id="currentWeight"
                                            type="number"
                                            step="0.1"
                                            placeholder="70"
                                            value={formData.currentWeight || ""}
                                            onChange={(e) => updateFormData("currentWeight", Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                {/* Show BMI preview if data is complete */}
                                {formData.height && formData.currentWeight && formData.height >= 100 && formData.currentWeight >= 30 && (
                                    <Card className="bg-primary/5 border-primary/20">
                                        <CardContent className="pt-4">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground mb-1">{t("onboarding.currentBMI")}</p>
                                                <p className="text-3xl font-bold text-primary">
                                                    {(formData.currentWeight / Math.pow(formData.height / 100, 2)).toFixed(1)}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </>
                        )}

                        {/* Step 2: Goals */}
                        {step === 2 && (
                            <>
                                <div className="space-y-2">
                                    <Label>{t("onboarding.activityLevel")} *</Label>
                                    <RadioGroup
                                        value={formData.activityLevel}
                                        onValueChange={(value: any) => updateFormData("activityLevel", value)}
                                        className="space-y-2"
                                    >
                                        {ACTIVITY_LEVELS.map((level) => (
                                            <div key={level.value} className="relative">
                                                <RadioGroupItem
                                                    value={level.value}
                                                    id={level.value}
                                                    className="peer sr-only"
                                                />
                                                <Label
                                                    htmlFor={level.value}
                                                    className={cn(
                                                        "flex items-center justify-between rounded-lg border-2 p-3 cursor-pointer transition-all w-full",
                                                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                                    )}
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">
                                                            {t(`onboarding.${level.labelKey}`)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {t(`onboarding.${level.descKey}`)}
                                                        </p>
                                                    </div>
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("onboarding.mainGoal")} *</Label>
                                    <RadioGroup
                                        value={formData.fitnessGoal}
                                        onValueChange={(value: any) => updateFormData("fitnessGoal", value)}
                                        className="grid grid-cols-3 gap-2"
                                    >
                                        {FITNESS_GOALS.map((goal) => (
                                            <div key={goal.value} className="relative h-full">
                                                <RadioGroupItem
                                                    value={goal.value}
                                                    id={goal.value}
                                                    className="peer sr-only"
                                                />
                                                <Label
                                                    htmlFor={goal.value}
                                                    className={cn(
                                                        "flex flex-col items-center justify-center rounded-lg border-2 p-3 cursor-pointer transition-all h-24 w-full",
                                                        "hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                                                    )}
                                                >
                                                    <span className="text-2xl mb-1">{goal.icon}</span>
                                                    <span className="text-xs font-medium text-center">{t(`onboarding.${goal.labelKey}`)}</span>
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="goalWeight">{t("onboarding.goalWeight")} ({t("checkin.optional")})</Label>
                                    <Input
                                        id="goalWeight"
                                        type="number"
                                        step="0.1"
                                        placeholder="65"
                                        value={formData.goalWeight || ""}
                                        onChange={(e) => updateFormData("goalWeight", e.target.value ? Number(e.target.value) : undefined)}
                                    />
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Navigation */}
                {step > 0 && (
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
                            {t("actions.back")}
                        </Button>

                        {step < 2 ? (
                            <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                                {t("actions.continue")}
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting} className="flex-1">
                                {isSubmitting ? t("states.saving") : t("actions.continue")}
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <SuccessDialog />
        </div>
    );
}
