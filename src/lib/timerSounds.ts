/**
 * The cue that tells a student a hold or a rest is over without them having to
 * watch the screen.
 *
 * Synthesised rather than shipped as an audio file: these are two short sine
 * tones, and a WebAudio oscillator costs nothing to download. Lived in
 * RestTimer until the set tracker grew a countdown of its own and needed the
 * same two sounds.
 */

interface Tone {
    frequency: number;
    /** Seconds. */
    duration: number;
    gain: number;
}

function playTone({ frequency, duration, gain }: Tone) {
    try {
        const AudioCtor =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtor) return;

        const context = new AudioCtor();
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(gain, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + duration);
    } catch {
        // Audio is a nicety. A blocked or unsupported context must never be the
        // reason a set fails to be logged.
    }
}

/** Sounds once when a countdown reaches zero. */
export function playCompletionSound() {
    playTone({ frequency: 880, duration: 0.5, gain: 0.3 });
}

/** Sounds on each of the last few seconds of a countdown. */
export function playTickSound() {
    playTone({ frequency: 440, duration: 0.1, gain: 0.2 });
}

/** Buzzes the device where the browser allows it. */
export function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(pattern);
    }
}
