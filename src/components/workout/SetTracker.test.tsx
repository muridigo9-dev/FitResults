import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import type { SessionSet } from "@/types/workout";

vi.mock("@/lib/timerSounds", () => ({
    playCompletionSound: vi.fn(),
    playTickSound: vi.fn(),
    vibrate: vi.fn(),
}));

const { SetTracker } = await import("./SetTracker");

/** The seconds box of the first set row. */
function targetInput() {
    return screen.getAllByPlaceholderText("seg")[0] as HTMLInputElement;
}

const noSets: SessionSet[] = [];

describe("SetTracker, timed exercises", () => {
    it("takes its target from the workout's duration, not from the reps field", () => {
        // A Tai Chi row carries reps = NULL and duration_seconds = 120, so the
        // exercise library's default_reps ("12") is what reaches plannedReps.
        // Reading the target off that field is what showed a 12 second hold
        // under a posture prescribed for two minutes.
        render(
            <SetTracker
                sets={noSets}
                plannedSets={1}
                plannedReps="12"
                plannedDurationSeconds={120}
                executionType="time"
                showWeight={false}
                onCompleteSet={vi.fn()}
            />
        );

        expect(targetInput().value).toBe("120");
    });

    it("falls back to 30s when a timed exercise carries no duration", () => {
        render(
            <SetTracker
                sets={noSets}
                plannedSets={1}
                plannedReps="12"
                executionType="time"
                showWeight={false}
                onCompleteSet={vi.fn()}
            />
        );

        expect(targetInput().value).toBe("30");
    });

    it("counts down and logs the full hold when it reaches zero", () => {
        vi.useFakeTimers();
        const onCompleteSet = vi.fn();

        render(
            <SetTracker
                sets={noSets}
                plannedSets={1}
                plannedReps="12"
                plannedDurationSeconds={3}
                executionType="time"
                showWeight={false}
                onCompleteSet={onCompleteSet}
            />
        );

        // The play button is the only one inside the input's wrapper.
        act(() => {
            screen.getAllByRole("button")[0].click();
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(targetInput().value).toBe("2");

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(onCompleteSet).toHaveBeenCalledTimes(1);
        expect(onCompleteSet).toHaveBeenCalledWith(
            expect.objectContaining({ setNumber: 1, actualReps: 3 })
        );

        vi.useRealTimers();
    });

    it("keeps the reps target for exercises that are counted, not held", () => {
        render(
            <SetTracker
                sets={noSets}
                plannedSets={1}
                plannedReps="15"
                plannedDurationSeconds={120}
                executionType="reps"
                onCompleteSet={vi.fn()}
            />
        );

        expect((screen.getAllByPlaceholderText("reps")[0] as HTMLInputElement).value).toBe("15");
    });

    it("drops the kg column when asked, so a bodyweight hold has no load box", () => {
        const { rerender } = render(
            <SetTracker
                sets={noSets}
                plannedSets={1}
                plannedReps="12"
                plannedDurationSeconds={120}
                executionType="time"
                showWeight={false}
                onCompleteSet={vi.fn()}
            />
        );
        expect(screen.queryByPlaceholderText("kg")).toBeNull();

        rerender(
            <SetTracker
                sets={noSets}
                plannedSets={1}
                plannedReps="12"
                executionType="reps"
                onCompleteSet={vi.fn()}
            />
        );
        expect(screen.queryByPlaceholderText("kg")).not.toBeNull();
    });
});
