# Testing Strategy

## Quick Start

```bash
# Unit tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# All tests
npm run test:all
```

## Test Structure

```
├── src/
│   ├── **/*.test.ts       # Unit tests (co-located with source)
│   ├── hooks/*.test.tsx   # Hook tests with React Testing Library
│   ├── lib/**/*.test.ts   # Utility and calculator tests
│   └── test/
│       ├── setup.ts              # Vitest setup
│       ├── integration-setup.ts  # Integration test setup
│       ├── test-utils.tsx        # Testing utilities
│       ├── mocks/
│       │   └── supabase.ts       # Supabase mock
│       ├── auth-flows.test.ts    # Auth flow tests
│       ├── rls-security.test.ts  # RLS and security tests
│       └── stripe-webhook.test.ts # Stripe webhook tests
└── e2e/
    ├── auth.spec.ts         # Authentication E2E tests
    ├── checkout.spec.ts     # Checkout flow E2E tests
    ├── dashboard.spec.ts    # Dashboard E2E tests
    └── feature-flags.spec.ts # Feature flag E2E tests
```

## Test Users

The following test users are automatically created during deployment:

| Email | Role | Description |
|-------|------|-------------|
| `admin@admin.com` | `admin` | Full system access |
| `user@test.com` | `user` | Standard user access |
| `gym@test.com` | `academy_admin` | Academy/gym admin |
| `pt@test.com` | `personal_trainer` | Personal trainer |
| `content@test.com` | `content_creator` | Content creator |

**Default Password:** `Temp@123` (must be changed on first login)

### User Creation Process

1. Users are created via GitHub Actions during deploy (Auth API)
2. Migration `20260101000041_provision_test_users.sql` provisions profiles and roles
3. No emails are sent during user creation
4. All users have `must_change_password: true` in metadata

## Coverage Requirements

Unit tests require minimum coverage:

- **Statements**: 60%
- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%

## Test Categories

### Unit Tests (`npm run test`)

- **Calculators**: Body metrics, macros, metabolism
- **Utilities**: Date formatting, sanitization, helpers
- **Hooks**: User role, feature flags, auth state
- **Validators**: Email, password, form validation

### Integration Tests

- **RLS Policies**: Access control verification
- **Auth Flows**: Login, signup, password reset
- **Webhooks**: Stripe event handling

### E2E Tests (`npm run test:e2e`)

- **Auth**: Login, logout, protected routes
- **Dashboard**: User dashboard access
- **Checkout**: Payment flow
- **Feature Flags**: Dynamic feature toggling

## CI/CD Pipeline

### GitHub Actions (`.github/workflows/ci-tests.yml`)

1. **Install**: Dependencies installation
2. **Lint**: ESLint code quality check
3. **Test**: Unit and integration tests
4. **Build**: Production build verification

### Deploy Pipeline (`.github/workflows/db-main.yml`)

1. **Create Test Users**: Auth API (no emails)
2. **Apply Migrations**: Database schema + user provisioning
3. **Deploy Edge Functions**: All Supabase functions

## Running Locally

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers (first time)
npx playwright install
```

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- src/lib/calculators/macros.test.ts

# Run tests matching pattern
npm run test -- --grep "password"

# Watch mode
npm run test:watch
```

### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser UI
npm run test:e2e:ui

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Debug mode
npx playwright test --debug
```

## Adding New Tests

### Unit Test Example

```typescript
// src/lib/myFeature.test.ts
import { describe, it, expect } from "vitest";
import { myFunction } from "./myFeature";

describe("myFunction", () => {
  it("should return expected result", () => {
    expect(myFunction("input")).toBe("expected");
  });
});
```

### Hook Test Example

```tsx
// src/hooks/useMyHook.test.tsx
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useMyHook } from "./useMyHook";
import { TestWrapper } from "@/test/test-utils";

describe("useMyHook", () => {
  it("should return expected value", () => {
    const { result } = renderHook(() => useMyHook(), {
      wrapper: TestWrapper,
    });
    
    expect(result.current.value).toBe("expected");
  });
});
```

### E2E Test Example

```typescript
// e2e/myFeature.spec.ts
import { test, expect } from "@playwright/test";

test.describe("My Feature", () => {
  test("should work as expected", async ({ page }) => {
    await page.goto("/my-page");
    await page.click("button");
    await expect(page.locator("h1")).toContainText("Success");
  });
});
```

## Best Practices

1. **Co-locate tests** with source files when possible
2. **Use descriptive names** for test cases
3. **Mock external dependencies** (Supabase, Stripe)
4. **Test edge cases** and error states
5. **Keep tests independent** - no shared state
6. **Use test IDs** for E2E selectors when needed

## Troubleshooting

### Tests failing locally but passing in CI

- Check Node version matches CI (18.x+)
- Clear cache: `npm run test -- --clearCache`

### E2E tests timing out

- Increase timeout in playwright.config.ts
- Check if app is running on expected port

### Supabase mock issues

- Ensure mock is imported before tested code
- Check mock implementation in `src/test/mocks/supabase.ts`
