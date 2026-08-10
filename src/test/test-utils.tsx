/**
 * Test Utilities
 * 
 * Provides custom render functions and utilities for testing React components.
 */
import React, { ReactElement, ReactNode } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster } from "@/components/ui/sonner";

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

interface WrapperProps {
  children: ReactNode;
}

// All providers wrapper for tests
function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster />
          </LanguageProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function with all providers
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from "@testing-library/react";
export { customRender as render };

// Mock user for testing
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  created_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: { full_name: "Test User" },
  aud: "authenticated",
  role: "authenticated",
};

export const mockAdminUser = {
  ...mockUser,
  id: "admin-user-id",
  email: "admin@example.com",
  user_metadata: { full_name: "Admin User" },
};

// Mock profile
export const mockProfile = {
  id: mockUser.id,
  email: mockUser.email,
  full_name: "Test User",
  subscription_status: "active",
  account_status: "active",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Wait utility
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));
