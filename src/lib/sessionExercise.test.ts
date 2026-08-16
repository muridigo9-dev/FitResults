import { describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        storage: {
            from: () => ({
                getPublicUrl: (path: string) => ({
                    data: { publicUrl: `https://cdn.test/exercises-media/${path}` },
                }),
            }),
        },
    },
}));

const { mapSessionExercise, readPlanSnapshot } = await import("./sessionExercise");

/** A row shaped like `exercises(*)` comes back from PostgREST: snake_case. */
const row = {
    id: "ex-1",
    name: "Postura Preparatória do Tai Chi",
    name_en: "Tai Chi Preparatory Stance",
    description: "Base do Tai Chi",
    instructions: "1. Fique em pé...",
    instructions_en: "1. Stand upright...",
    image_path: "exercises/33bd/clip.mp4",
    image_url: null,
    gif_url: null,
    video_url: null,
    default_sets: 3,
    default_reps: "12",
    default_rest_seconds: 60,
    equipment: null,
    difficulty: null,
    is_compound: null,
};

const snapshot = {
    snapshot: {
        sets: 3,
        reps: null,
        reps_list: null,
        reps_mode: "fixed",
        rest_seconds: 20,
        execution_type: "time",
        duration_seconds: 40,
        superset_id: null,
    },
};

describe("readPlanSnapshot", () => {
    it("returns the snapshot when present", () => {
        expect(readPlanSnapshot(snapshot).duration_seconds).toBe(40);
    });

    it("tolerates missing, null and malformed metadata", () => {
        expect(readPlanSnapshot(undefined)).toEqual({});
        expect(readPlanSnapshot(null)).toEqual({});
        expect(readPlanSnapshot({})).toEqual({});
        expect(readPlanSnapshot({ snapshot: "nope" })).toEqual({});
    });
});

describe("mapSessionExercise", () => {
    it("returns undefined without a row", () => {
        expect(mapSessionExercise(null, snapshot, "pt-BR")).toBeUndefined();
    });

    it("exposes media in camelCase so the instructions panel can render it", () => {
        const ex = mapSessionExercise(row, snapshot, "pt-BR")!;
        // The regression: these were all undefined when the row was spread raw.
        expect(ex.imagePath).toBe("exercises/33bd/clip.mp4");
        expect(ex.imageUrl).toBe("https://cdn.test/exercises-media/exercises/33bd/clip.mp4");
    });

    it("prefers an explicit image_url over resolving the storage path", () => {
        const ex = mapSessionExercise({ ...row, image_url: "https://cdn.test/a.png" }, snapshot, "pt-BR")!;
        expect(ex.imageUrl).toBe("https://cdn.test/a.png");
    });

    it("lays the workout's plan over the library defaults", () => {
        const ex = mapSessionExercise(row, snapshot, "pt-BR")!;
        expect(ex.executionType).toBe("time");
        expect(ex.durationSeconds).toBe(40);
        expect(ex.restSeconds).toBe(20);
        expect(ex.defaultRestSeconds).toBe(20);
        expect(ex.defaultSets).toBe(3);
    });

    it("falls back to the library defaults when there is no snapshot", () => {
        const ex = mapSessionExercise(row, undefined, "pt-BR")!;
        expect(ex.executionType).toBe("reps");
        expect(ex.defaultReps).toBe("12");
        expect(ex.defaultRestSeconds).toBe(60);
        expect(ex.defaultSets).toBe(3);
    });

    it("localises name and instructions", () => {
        const pt = mapSessionExercise(row, snapshot, "pt-BR")!;
        const en = mapSessionExercise(row, snapshot, "en-US")!;
        expect(pt.name).toBe("Postura Preparatória do Tai Chi");
        expect(en.name).toBe("Tai Chi Preparatory Stance");
        expect(en.instructions).toBe("1. Stand upright...");
    });

    it("keeps rest 0 and sets 0 from the snapshot instead of falling through", () => {
        const zeroed = { snapshot: { sets: 0, rest_seconds: 0, execution_type: "reps" } };
        const ex = mapSessionExercise(row, zeroed, "pt-BR")!;
        expect(ex.defaultSets).toBe(0);
        expect(ex.defaultRestSeconds).toBe(0);
    });

    it("defaults equipment and difficulty rather than leaving them null", () => {
        const ex = mapSessionExercise(row, snapshot, "pt-BR")!;
        expect(ex.equipment).toBe("none");
        expect(ex.difficulty).toBe("intermediate");
        expect(ex.isCompound).toBe(false);
    });

    it("reads supersetId from the snapshot", () => {
        const ex = mapSessionExercise(row, { snapshot: { superset_id: "ss-9" } }, "pt-BR")!;
        expect(ex.supersetId).toBe("ss-9");
    });

    /**
     * Shape copied from a real production row. `image_url` comes back as an
     * empty string rather than null, which must not win over the storage path
     * or the clip disappears again.
     */
    it("resolves the clip when image_url is an empty string", () => {
        const production = {
            id: "fb4373f5-0024-41db-a7c2-9b46edf99102",
            name: "Abertura",
            name_en: "Opening",
            instructions: "1. Comece com os pés paralelos...",
            image_path: "exercises/fb4373f5-0024-41db-a7c2-9b46edf99102/1786639309975-06w6zv.mp4",
            image_url: "",
            gif_url: null,
            video_url: null,
            default_sets: 3,
            default_reps: "12",
            default_rest_seconds: 60,
            equipment: "none",
            difficulty: "intermediate",
            is_compound: false,
        };
        const meta = {
            snapshot: {
                reps: "10", sets: 3, reps_list: null, reps_mode: "fixed",
                superset_id: null, rest_seconds: 20,
                execution_type: "reps", duration_seconds: null,
            },
        };

        const ex = mapSessionExercise(production, meta, "pt-BR")!;
        expect(ex.imageUrl).toBe(
            "https://cdn.test/exercises-media/exercises/fb4373f5-0024-41db-a7c2-9b46edf99102/1786639309975-06w6zv.mp4"
        );
        // The workout asked for 10 reps and 20s rest, not the library's 12/60.
        expect(ex.defaultReps).toBe("10");
        expect(ex.defaultRestSeconds).toBe(20);
        expect(ex.executionType).toBe("reps");
    });
});
