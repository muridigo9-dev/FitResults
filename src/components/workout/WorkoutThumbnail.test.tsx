import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
    supabase: {
        storage: {
            from: (bucket: string) => ({
                getPublicUrl: (path: string) => ({
                    data: { publicUrl: `https://cdn.test/${bucket}/${path}` },
                }),
            }),
        },
    },
}));

const { WorkoutThumbnail } = await import("./WorkoutThumbnail");

const clip = "https://cdn.test/exercises-media/exercises/a/clip.mp4";

describe("WorkoutThumbnail", () => {
    it("uses the workout's own cover when it has one", () => {
        const { container } = render(
            <WorkoutThumbnail
                workout={{
                    title: "Tai Chi: Fundamentos",
                    imageUrl: "https://cdn.test/workouts-media/cover.png",
                    exercises: [{ imageUrl: clip }],
                }}
            />
        );
        expect(container.querySelector("img")?.getAttribute("src")).toBe(
            "https://cdn.test/workouts-media/cover.png"
        );
    });

    it("resolves a workout cover stored as a path against workouts-media", () => {
        const { container } = render(
            <WorkoutThumbnail workout={{ title: "W", imagePath: "covers/x.png" }} />
        );
        expect(container.querySelector("img")?.getAttribute("src")).toBe(
            "https://cdn.test/workouts-media/covers/x.png"
        );
    });

    it("falls back to the first exercise's clip, rendered as a still frame", () => {
        const { container } = render(
            <WorkoutThumbnail
                workout={{ title: "Tai Chi: Fundamentos", imageUrl: "", exercises: [{ imageUrl: clip }] }}
            />
        );
        const video = container.querySelector("video");
        expect(video).not.toBeNull();
        // #t=0.1 is what makes a non-autoplaying clip paint a frame.
        expect(video?.getAttribute("src")).toBe(`${clip}#t=0.1`);
        expect(video?.hasAttribute("autoplay")).toBe(false);
    });

    it("skips leading exercises that carry no media", () => {
        const { container } = render(
            <WorkoutThumbnail
                workout={{
                    title: "W",
                    exercises: [{ name: "no media" }, { name: "has media", imageUrl: clip }],
                }}
            />
        );
        expect(container.querySelector("video")?.getAttribute("src")).toBe(`${clip}#t=0.1`);
    });

    it("shows the fallback when the workout has no cover and no exercises", () => {
        const { container } = render(<WorkoutThumbnail workout={{ title: "Empty", exercises: [] }} />);
        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("video")).toBeNull();
        expect(container.querySelector("svg")).not.toBeNull(); // the Dumbbell icon
    });

    it("shows the fallback when every exercise is media-less", () => {
        const { container } = render(
            <WorkoutThumbnail workout={{ title: "Seed", exercises: [{ name: "a" }, { name: "b" }] }} />
        );
        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("video")).toBeNull();
    });

    it("does not treat an empty imageUrl as a cover", () => {
        const { container } = render(
            <WorkoutThumbnail workout={{ title: "W", imageUrl: "", exercises: [{ imageUrl: clip }] }} />
        );
        expect(container.querySelector("video")).not.toBeNull();
    });
});
