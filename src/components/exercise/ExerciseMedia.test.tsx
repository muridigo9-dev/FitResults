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

const { ExerciseMedia } = await import("./ExerciseMedia");

// The clips live in image_path, which is where the uploader writes them.
const exercise = { name: "Postura Wu Ji", imagePath: "exercises/a/clip.mp4" };
const clip = "https://cdn.test/exercises-media/exercises/a/clip.mp4";

describe("ExerciseMedia playback", () => {
    it("shows a still frame by default, so a card is never blank", () => {
        const { container } = render(<ExerciseMedia exercise={exercise} />);
        const video = container.querySelector("video")!;

        expect(video.getAttribute("src")).toBe(`${clip}#t=0.1`);
        expect(video.autoplay).toBe(false);
        expect(video.loop).toBe(true);
    });

    it("stops looping when it is given native controls", () => {
        const { container } = render(<ExerciseMedia exercise={exercise} controls />);
        const video = container.querySelector("video")!;

        expect(video.controls).toBe(true);
        expect(video.loop).toBe(false);
        expect(video.autoplay).toBe(false);
    });

    it("can autoplay on repeat with controls, which the demo player needs", () => {
        // The old props hard-coupled loop and autoplay to `controls`, so this
        // combination was unreachable - the reason the instructions clip played
        // through once and stopped.
        const { container } = render(
            <ExerciseMedia exercise={exercise} controls autoPlay loop />
        );
        const video = container.querySelector("video")!;

        expect(video.controls).toBe(true);
        expect(video.autoplay).toBe(true);
        expect(video.loop).toBe(true);
        // Autoplay is only granted to muted video, and an autoplaying clip must
        // not be waiting on a seek fragment.
        expect(video.muted).toBe(true);
        expect(video.getAttribute("src")).toBe(clip);
    });

    it("only pulls the whole clip when told to", () => {
        const { container, rerender } = render(<ExerciseMedia exercise={exercise} />);
        expect(container.querySelector("video")!.getAttribute("preload")).toBe("metadata");

        rerender(<ExerciseMedia exercise={exercise} preload="auto" />);
        expect(container.querySelector("video")!.getAttribute("preload")).toBe("auto");
    });

    it("renders the fallback when the exercise has no media at all", () => {
        const { container, getByText } = render(
            <ExerciseMedia exercise={{ name: "No media" }} fallback={<p>sem vídeo</p>} />
        );

        expect(container.querySelector("video")).toBeNull();
        expect(getByText("sem vídeo")).toBeTruthy();
    });
});
