/**
 * Landing page regression tests.
 *
 * The landing page is the only page a logged-out visitor sees, and it went out
 * blank once: `t()` stringifies a list unless `returnObjects` is set, so the
 * `.map()` over the steps threw and React unmounted the whole tree. A rendered
 * assertion is the only thing that catches that class of failure - the build
 * passes, the types pass, and the strings are all present in the locale files.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { render } from "@/test/test-utils";
import { LANGUAGE_STORAGE_KEY } from "@/i18n";
import LandingPage from "./LandingPage";

const invoke = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}));

vi.mock("@/hooks/useBranding", () => ({
  useGlobalBranding: () => ({ branding: { appName: "MooveBody", logoUrl: null } }),
}));

/** The three prices Stripe actually holds, in the shape `list-plans` returns. */
const stripePlans = [
  { priceId: "price_month", amount: 4.99, currency: "USD", interval: "month", intervalCount: 1, label: null },
  { priceId: "price_quarter", amount: 8.99, currency: "USD", interval: "month", intervalCount: 3, label: null },
  { priceId: "price_year", amount: 24.99, currency: "USD", interval: "month", intervalCount: 12, label: null },
];

beforeEach(() => {
  window.localStorage.clear();
  invoke.mockReset();
  invoke.mockResolvedValue({ data: { plans: stripePlans }, error: null });
});

describe("LandingPage", () => {
  it("renders its sections instead of a blank page", async () => {
    render(<LandingPage />);

    // Every one of these comes from a list in the locale file - the exact
    // lookup that used to throw.
    expect(await screen.findByText("Treine com constância —")).toBeInTheDocument();
    expect(screen.getByText("Como funciona a cobrança?")).toBeInTheDocument();
    expect(
      screen.getByText("Check-in diário: água, sono, treino e refeições")
    ).toBeInTheDocument();
  });

  it("follows the stored language", async () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "en-US");
    render(<LandingPage />);

    expect(await screen.findByText("Build the habit —")).toBeInTheDocument();
    expect(screen.getByText("How does billing work?")).toBeInTheDocument();
    expect(
      screen.getByText("Daily check-in: water, sleep, workouts and meals")
    ).toBeInTheDocument();
    expect(screen.queryByText("Treine com constância —")).not.toBeInTheDocument();
  });

  it("prices the plans from Stripe rather than from the page", async () => {
    render(<LandingPage />);

    // USD, because that is what the checkout charges. A hardcoded "R$ 29,90"
    // is exactly the mismatch this page shipped with. Each amount appears
    // twice per card - once as the price, once in the renewal sentence.
    await waitFor(() => expect(screen.getAllByText(/US\$\s*4,99/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/US\$\s*8,99/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/US\$\s*24,99/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/R\$\s*29,90/)).not.toBeInTheDocument();
  });

  it("survives a pricing lookup that fails", async () => {
    invoke.mockRejectedValue(new Error("stripe down"));
    render(<LandingPage />);

    // The page still has to sell the product even when the prices do not load.
    expect(await screen.findByText("Treine com constância —")).toBeInTheDocument();
  });
});
