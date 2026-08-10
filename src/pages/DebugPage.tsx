import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export default function DebugPage() {
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userWorkouts, setUserWorkouts] = useState<any[]>([]);
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [exercises, setExercises] = useState<any[]>([]);
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setLogs([]); // Clear logs on refresh
        try {
            addLog("Iniciando diagnóstico...");

            // 0. Check User
            const { data: { user: u }, error: authError } = await supabase.auth.getUser();
            if (authError) throw authError;
            setUser(u);
            addLog(`User: ${u?.id || "Nenhum"}`);

            if (u) {
                // Check Role via RPC or metadata
                const { data: roleData, error: roleError } = await supabase.rpc('has_role', { _role: 'admin' });
                if (roleError) addLog(`Erro ao checar role: ${roleError.message}`);
                setIsAdmin(!!roleData);
                addLog(`Is Admin? ${!!roleData}`);
            }

            // 1. Fetch Workouts (System)
            addLog("Buscando 'workouts'...");
            const { data: wData, error: wError } = await supabase
                .from("workouts")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5);

            if (wError) {
                addLog(`Erro workouts: ${wError.message}`);
                throw wError;
            }
            addLog(`Workouts encontrados: ${wData?.length}`);
            setWorkouts(wData || []);

            // 1b. Fetch User Workouts
            addLog("Buscando 'user_workouts'...");
            const { data: uwData, error: uwError } = await supabase
                .from("user_workouts")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(5);

            if (uwError) addLog(`Erro user_workouts: ${uwError.message}`);
            addLog(`User Workouts encontrados: ${uwData?.length}`);
            setUserWorkouts(uwData || []);

            // 2. Fetch Exercises (All recent) - Trying WITHOUT filter first to catch orphans
            addLog("Buscando 'workout_exercises'...");
            const { data: eData, error: eError } = await supabase
                .from("workout_exercises")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(20);

            if (eError) {
                addLog(`Erro workout_exercises: ${eError.message}`);
                throw eError;
            }
            addLog(`Workout Exercises encontrados: ${eData?.length}`);
            setExercises(eData || []);

        } catch (e: any) {
            setError(e);
            addLog(`ERRO FATAL: ${e.message}`);
        } finally {
            setLoading(false);
            addLog("Fim do diagnóstico.");
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="p-8 max-w-6xl mx-auto space-y-8 bg-background min-h-screen text-foreground">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Diagnóstico Avançado v2</h1>
                <Button onClick={fetchData} disabled={loading}>
                    {loading ? "Carregando..." : "Recarregar Dados"}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 border rounded bg-muted/20 p-4 space-y-2">
                    <h3 className="font-bold border-b pb-2">Status do Usuário</h3>
                    <p className="text-sm break-all"><strong>ID:</strong> {user?.id || "Não logado"}</p>
                    <p className="text-sm"><strong>Admin:</strong> <span className={isAdmin ? "text-green-600 font-bold" : "text-red-500"}>{isAdmin ? "SIM" : "NÃO"}</span></p>
                    {error && <p className="text-red-500 font-bold mt-2">ERRO: {error.message}</p>}

                    <div className="mt-4 bg-black/90 p-2 text-green-400 font-mono text-xs h-40 overflow-auto rounded">
                        {logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </div>

                <div className="col-span-2 space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            Tabela: workouts (Sistema)
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{workouts.length} itens</span>
                        </h2>
                        <div className="bg-slate-950 text-slate-200 p-4 rounded overflow-auto h-48 text-xs font-mono border border-slate-800">
                            <pre>{JSON.stringify(workouts, null, 2)}</pre>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            Tabela: user_workouts (Conteúdo do Usuário)
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{userWorkouts.length} itens</span>
                        </h2>
                        <div className="bg-slate-950 text-slate-200 p-4 rounded overflow-auto h-48 text-xs font-mono border border-slate-800">
                            <pre>{JSON.stringify(userWorkouts, null, 2)}</pre>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            Tabela: workout_exercises (Todos Recentes - Limite 20)
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{exercises.length} itens</span>
                        </h2>
                        <p className="text-muted-foreground text-xs">Se esta lista estiver vazia, os exercícios não foram salvos no banco.</p>
                        <div className="bg-slate-950 text-slate-200 p-4 rounded overflow-auto h-64 text-xs font-mono border border-slate-800">
                            <pre>{JSON.stringify(exercises, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
