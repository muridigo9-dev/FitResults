import confetti from "canvas-confetti";

export function useConfetti() {
  const fireConfetti = () => {
    // First burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["hsl(142, 76%, 36%)", "hsl(47, 100%, 50%)", "hsl(262, 83%, 58%)", "hsl(199, 89%, 48%)"],
    });

    // Second burst with delay
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["hsl(142, 76%, 36%)", "hsl(47, 100%, 50%)", "hsl(262, 83%, 58%)"],
      });
    }, 150);

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["hsl(142, 76%, 36%)", "hsl(47, 100%, 50%)", "hsl(199, 89%, 48%)"],
      });
    }, 300);
  };

  const fireStars = () => {
    const defaults = {
      spread: 360,
      ticks: 50,
      gravity: 0,
      decay: 0.94,
      startVelocity: 30,
      colors: ["hsl(47, 100%, 50%)", "hsl(36, 100%, 50%)", "hsl(45, 100%, 60%)"],
    };

    confetti({
      ...defaults,
      particleCount: 40,
      scalar: 1.2,
      shapes: ["star"],
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      shapes: ["circle"],
    });
  };

  return { fireConfetti, fireStars };
}
