import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend
} from 'recharts';
import {
    TrendingUp,
    ThumbsUp,
    ThumbsDown,
    Target,
    Activity,
    History,
    AlertTriangle,
    Flame
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const mockLoadEvolution = [
    { date: '01/01', load: 40 },
    { date: '08/01', load: 42 },
    { date: '15/01', load: 42 },
    { date: '22/01', load: 45 },
    { date: '29/01', load: 48 },
    { date: '05/02', load: 50 },
];

const mockSentiments = [
    { name: 'Likes', count: 12, fill: '#10b981' },
    { name: 'Neutros', count: 5, fill: '#94a3b8' },
    { name: 'Dislikes', count: 2, fill: '#ef4444' },
];

export function StudentPerformanceMonitor({ studentId }: { studentId: string }) {
    // In a real app, use useQuery to fetch this data from get_student_workout_stats

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Treinos Realizados</p>
                                <h3 className="text-3xl font-bold mt-1">24</h3>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-sm text-success">
                            <TrendingUp className="h-4 w-4" />
                            <span>+12% vs mês anterior</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Aderência ao Plano</p>
                                <h3 className="text-3xl font-bold mt-1">92%</h3>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center">
                                <Target className="h-5 w-5 text-success" />
                            </div>
                        </div>
                        <Progress value={92} className="h-1.5 mt-4" />
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Streak Atual</p>
                                <h3 className="text-3xl font-bold mt-1">5 dias</h3>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-warning/20 flex items-center justify-center">
                                <Flame className="h-5 w-5 text-warning" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">Recorde: 15 dias</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Média de RPE</p>
                                <h3 className="text-3xl font-bold mt-1">7.5</h3>
                            </div>
                            <div className="h-10 w-10 rounded-xl bg-info/20 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-info" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">Intensidade Moderada/Alta</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Load Evolution Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Evolução de Carga (kg) - Supino Reto
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={mockLoadEvolution}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}kg`} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="load"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 8, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Sentiment Analysis */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Feedback por Exercício</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={mockSentiments}>
                                    <XAxis dataKey="name" hide />
                                    <Tooltip cursor={{ fill: 'transparent' }} />
                                    <Bar dataKey="count" radius={[10, 10, 10, 10]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full space-y-3 mt-4">
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <ThumbsUp className="h-4 w-4 text-success" />
                                    <span>Favoritos</span>
                                </div>
                                <span className="font-bold">12</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    <span>Dificuldades</span>
                                </div>
                                <span className="font-bold">2</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed History Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        Histórico Recente
                    </CardTitle>
                    <Button variant="outline" size="sm">Ver tudo</Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-muted/20 group hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                        {i === 1 ? 'A' : i === 2 ? 'B' : 'C'}
                                    </div>
                                    <div>
                                        <h4 className="font-bold">Treino de {i === 1 ? 'Peito' : i === 2 ? 'Costas' : 'Pernas'}</h4>
                                        <p className="text-xs text-muted-foreground">Concluído em 15/02/2026 • 52 min</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right hidden md:block">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Carga Total</p>
                                        <p className="font-mono font-bold text-lg">2.450 kg</p>
                                    </div>
                                    <Badge variant="soft" className="bg-success/10 text-success">9/9 Executado</Badge>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function Progress({ value, className }: { value: number, className?: string }) {
    return (
        <div className={cn("w-full bg-muted rounded-full overflow-hidden", className)}>
            <div
                className="h-full bg-primary transition-all duration-1000"
                style={{ width: `${value}%` }}
            />
        </div>
    );
}
