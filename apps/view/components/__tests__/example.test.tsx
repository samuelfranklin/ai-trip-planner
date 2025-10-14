import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Example test component
function ExampleComponent() {
  return (
    <div>
      <h1>Hello, Testing!</h1>
      <p>This is an example component for testing.</p>
    </div>
  );
}

describe('ExampleComponent', () => {
  it('renders a heading', () => {
    render(<ExampleComponent />);

    const heading = screen.getByRole('heading', { name: /hello, testing!/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders a paragraph', () => {
    render(<ExampleComponent />);

    const paragraph = screen.getByText(/this is an example component/i);
    expect(paragraph).toBeInTheDocument();
  });
});

describe('Jest Configuration', () => {
  it('should have proper environment setup', () => {
    expect(process.env.NEXT_PUBLIC_API_BASE_URL).toBe('http://localhost:3000');
  });

  it('should support async/await', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
