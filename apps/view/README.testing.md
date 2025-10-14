# Testing Guide

This project uses Jest and React Testing Library for unit testing.

## Testing Stack

- **Jest** (v30.2.0): JavaScript testing framework
- **React Testing Library** (v16.3.0): React component testing utilities
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions
- **@testing-library/user-event**: User interaction simulation
- **jest-environment-jsdom**: DOM environment for testing React components

## Running Tests

### Basic Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode (interactive)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

### Jest CLI Options

```bash
# Run specific test file
pnpm test components/chat/__tests__/message-bubble.test.tsx

# Run tests matching pattern
pnpm test --testNamePattern="should render"

# Update snapshots
pnpm test -u

# Run tests with verbose output
pnpm test --verbose
```

## Project Structure

```
/components
  ├── __tests__/           # Component tests
  │   └── example.test.tsx
  ├── chat/
  │   └── __tests__/       # Chat component tests
  └── ui/
      └── __tests__/       # UI component tests

/hooks
  └── __tests__/           # Hook tests

/lib
  └── __tests__/           # Utility function tests
      └── parseAgentResponse.test.ts

jest.config.ts             # Jest configuration
jest.setup.ts              # Test setup and globals
```

## Configuration Files

### `jest.config.ts`

Main Jest configuration:
- Test environment: `jsdom` (for React components)
- Module name mapper: `@/*` alias support
- Coverage collection from `app/`, `components/`, `hooks/`, `lib/`
- Setup file: `jest.setup.ts`

### `jest.setup.ts`

Global test setup:
- Imports `@testing-library/jest-dom` for custom matchers
- Mocks Next.js router (`useRouter`, `useSearchParams`, `usePathname`)
- Sets environment variables for tests
- Suppresses common console warnings during tests

## Writing Tests

### Basic Test Structure

```tsx
// components/__tests__/MyComponent.test.tsx
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render successfully', () => {
    render(<MyComponent />);

    const heading = screen.getByRole('heading', { name: /my component/i });
    expect(heading).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Button } from '../Button';

describe('Button', () => {
  it('should call onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Async Components

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AsyncComponent } from '../AsyncComponent';

describe('AsyncComponent', () => {
  it('should load and display data', async () => {
    render(<AsyncComponent />);

    // Wait for async operations
    await waitFor(() => {
      expect(screen.getByText(/loaded data/i)).toBeInTheDocument();
    });
  });
});
```

### Testing Hooks

```tsx
// hooks/__tests__/useMyHook.test.ts
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

describe('useMyHook', () => {
  it('should update value', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.setValue('new value');
    });

    expect(result.current.value).toBe('new value');
  });
});
```

### Mocking Functions

```tsx
// Mock a function
const mockFn = jest.fn();
mockFn.mockReturnValue('mocked value');

// Mock a module
jest.mock('../api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'test' })),
}));

// Clear mocks
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Testing with Custom Data Attributes

This project uses `data-test-id` for test targeting:

```tsx
// Component
<button data-test-id="submit-button">Submit</button>

// Test
const button = screen.getByTestId('submit-button');
expect(button).toBeInTheDocument();
```

## Common Testing Patterns

### Query Priority

Use queries in this order (from most to least preferred):

1. **getByRole**: Most accessible queries
   ```tsx
   screen.getByRole('button', { name: /submit/i })
   ```

2. **getByLabelText**: Forms and inputs
   ```tsx
   screen.getByLabelText(/username/i)
   ```

3. **getByPlaceholderText**: Input placeholders
   ```tsx
   screen.getByPlaceholderText(/enter your name/i)
   ```

4. **getByText**: Non-interactive text content
   ```tsx
   screen.getByText(/welcome/i)
   ```

5. **getByTestId**: Last resort when semantic queries don't work
   ```tsx
   screen.getByTestId('custom-element')
   ```

### Assertions

Common assertions with `@testing-library/jest-dom`:

```tsx
expect(element).toBeInTheDocument();
expect(element).toBeVisible();
expect(element).toHaveTextContent('text');
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveClass('class-name');
expect(element).toBeDisabled();
expect(element).toBeEnabled();
expect(input).toHaveValue('value');
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory:

```bash
# Generate and view coverage
pnpm test:coverage

# Open HTML report in browser
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Currently, the project collects coverage from:
- `app/**/*.{js,jsx,ts,tsx}`
- `components/**/*.{js,jsx,ts,tsx}`
- `hooks/**/*.{js,jsx,ts,tsx}`
- `lib/**/*.{js,jsx,ts,tsx}`

Excluding:
- `**/*.d.ts` (type definitions)
- `**/node_modules/**`
- `**/.next/**`
- `**/coverage/**`
- `**/dist/**`

## Best Practices

1. **Test behavior, not implementation**: Focus on what users see and do
2. **Keep tests simple**: One assertion per test when possible
3. **Use descriptive test names**: "should render error message when API fails"
4. **Arrange-Act-Assert**: Organize tests with clear setup, action, and verification
5. **Mock external dependencies**: Isolate units under test
6. **Clean up after tests**: Use `afterEach` to reset mocks and state
7. **Avoid testing implementation details**: Don't test internal state or private methods

## Debugging Tests

### Debug Output

```tsx
import { render, screen } from '@testing-library/react';

// Print component HTML
const { debug } = render(<MyComponent />);
debug();

// Print specific element
debug(screen.getByRole('button'));
```

### VS Code Integration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)
- [Common Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
