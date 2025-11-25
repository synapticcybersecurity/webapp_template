# Testing Guide

This document covers the testing setup and best practices for the webapp template.

## Test Framework

We use **Vitest** for both backend and frontend testing. Vitest is a modern, fast test framework with excellent TypeScript and ES modules support.

## Running Tests

### Run All Tests

```bash
# From root directory - runs all tests
npm test

# Run specific workspace tests
npm run test:backend
npm run test:frontend
```

### Watch Mode

```bash
# Backend tests in watch mode
cd apps/backend
npm run test:watch

# Frontend tests in watch mode
cd apps/frontend
npm run test:watch
```

### Coverage Reports

```bash
# Generate coverage for all workspaces
npm run test:coverage

# Backend coverage only
cd apps/backend
npm run test:coverage

# Frontend coverage only
cd apps/frontend
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory in each workspace.

### UI Mode (Frontend Only)

Vitest provides an interactive UI for running and debugging tests:

```bash
cd apps/frontend
npm run test:ui
```

This opens a browser interface at http://localhost:51204 where you can:
- View test files and results
- Filter and search tests
- View test execution time
- Debug individual tests

## Backend Testing

### Test Structure

Backend tests are located in `apps/backend/src/__tests__/` with the following structure:

```
src/
└── __tests__/
    ├── setup.ts              # Global test setup
    ├── utils/
    │   └── errors.test.ts    # Utility tests
    ├── middleware/
    │   └── auth.test.ts      # Middleware tests
    └── controllers/
        └── user.test.ts      # Controller tests
```

### Writing Backend Tests

Example test for a utility function:

```typescript
import { describe, it, expect } from 'vitest';
import { BadRequestError } from '../../utils/errors.js';

describe('BadRequestError', () => {
  it('should create 400 error', () => {
    const error = new BadRequestError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.statusCode).toBe(400);
  });
});
```

### Testing Middleware

Example middleware test with mocks:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireRole } from '../../middleware/auth.middleware.js';

describe('requireRole Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: { id: 'test-user', role: 'user' },
    };
    mockResponse = {};
    nextFunction = vi.fn();
  });

  it('should allow user with correct role', () => {
    mockRequest.user!.role = 'admin';
    const middleware = requireRole('admin');

    middleware(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(nextFunction).toHaveBeenCalledWith();
  });
});
```

### Testing API Endpoints

For integration tests with actual HTTP requests, use `supertest`:

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../index.js';

describe('GET /api/users/me', () => {
  it('should return current user', async () => {
    const response = await request(app)
      .get('/api/users/me')
      .set('Cookie', 'session=test-session');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});
```

### Database Testing

For tests that require database access:

1. Use a separate test database
2. Set `TEST_DATABASE_URL` environment variable
3. Run migrations before tests
4. Clean up after tests

```typescript
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../config/database.js';

beforeAll(async () => {
  // Run migrations
  // await execSync('npx prisma migrate deploy');
});

beforeEach(async () => {
  // Clean up database before each test
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

## Frontend Testing

### Test Structure

Frontend tests are located in `apps/frontend/src/__tests__/`:

```
src/
└── __tests__/
    ├── setup.ts                    # Global test setup
    ├── components/
    │   └── Button.test.tsx         # Component tests
    ├── hooks/
    │   └── useAuth.test.ts         # Hook tests
    └── pages/
        └── LoginPage.test.tsx      # Page tests
```

### Testing Components

We use **React Testing Library** for component testing. It encourages testing from the user's perspective.

Example component test:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/ui/button';

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Hooks

Example custom hook test:

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';

describe('useAuth Hook', () => {
  it('should return user when authenticated', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
```

### Testing Pages

Example page test with routing:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '../../pages/auth/LoginPage';

describe('LoginPage', () => {
  it('renders login form', () => {
    const queryClient = new QueryClient();

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <LoginPage />
        </QueryClientProvider>
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});
```

### Mocking API Calls

Use Vitest's `vi.mock()` to mock API calls:

```typescript
import { vi } from 'vitest';
import * as api from '../../lib/api';

vi.mock('../../lib/api', () => ({
  userAPI: {
    getCurrentUser: vi.fn(() =>
      Promise.resolve({
        data: {
          data: { id: '1', email: 'test@example.com', role: 'user' },
        },
      })
    ),
  },
}));
```

## Best Practices

### General

1. **Write tests first** - Follow TDD when possible
2. **Keep tests simple** - One assertion per test when practical
3. **Use descriptive names** - Test names should describe what they test
4. **Arrange-Act-Assert** - Structure tests clearly
5. **Don't test implementation details** - Test behavior, not internals
6. **Mock external dependencies** - Database, APIs, third-party services

### Naming Conventions

```typescript
// Good test names
describe('UserController', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should throw ValidationError for invalid email', () => {});
    it('should throw ConflictError for duplicate email', () => {});
  });
});

// Bad test names
describe('UserController', () => {
  it('test1', () => {});
  it('works', () => {});
  it('should not fail', () => {});
});
```

### Test Organization

```typescript
describe('Component/Function Name', () => {
  // Setup
  beforeEach(() => {
    // Reset state, mocks, etc.
  });

  // Group related tests
  describe('specific feature/method', () => {
    it('should handle success case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = myFunction(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });

  // Cleanup
  afterEach(() => {
    vi.clearAllMocks();
  });
});
```

### What to Test

**DO test:**
- ✅ Business logic and calculations
- ✅ Error handling and edge cases
- ✅ User interactions (clicks, form submissions)
- ✅ API integrations
- ✅ State management
- ✅ Conditional rendering
- ✅ Authorization and permissions

**DON'T test:**
- ❌ Third-party library internals
- ❌ Implementation details
- ❌ Static content
- ❌ CSS styles (use visual regression testing instead)
- ❌ Framework code (React, Express, etc.)

### Coverage Goals

- **Minimum**: 70% overall coverage
- **Target**: 80%+ overall coverage
- **Critical code**: 100% coverage
  - Authentication logic
  - Payment processing
  - Data validation
  - Authorization checks

To check coverage:

```bash
npm run test:coverage

# View HTML report
open apps/backend/coverage/index.html
open apps/frontend/coverage/index.html
```

## Debugging Tests

### VS Code

Add this to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test:watch"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Browser DevTools

For frontend tests:

```bash
npm run test:ui
```

Then use browser DevTools to debug.

### Console Output

Add `console.log` statements or use Vitest's `debug` utility:

```typescript
import { debug } from '@testing-library/react';

render(<Component />);
debug(); // Prints DOM to console
```

## Continuous Integration

Tests should run automatically on CI/CD:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Common Issues

### Tests Timing Out

Increase timeout for slow tests:

```typescript
it('should handle slow operation', async () => {
  // Test code
}, 10000); // 10 second timeout
```

### Database Connection Issues

Ensure test database is configured:

```bash
# Set in .env.test or CI environment
TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/test_db"
```

### Module Resolution Errors

Check path aliases in `vitest.config.ts`:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

### React Testing Library Warnings

Wrap async operations in `act()` or use Testing Library utilities:

```typescript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro/)
- [Kent C. Dodds - Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

Happy Testing! 🧪
