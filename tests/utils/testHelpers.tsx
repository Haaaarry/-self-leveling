// Custom test utilities and helper functions

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { ReactElement, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';

// Custom render with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  user?: {
    id: string;
    email: string;
    username: string;
    totalPoints: number;
    level: number;
  };
}

export function renderWithProviders(
  ui: ReactElement,
  {
    initialRoute = '/',
    user = {
      id: 'test-user-id',
      email: 'qa-test@example.com',
      username: 'testuser',
      totalPoints: 100,
      level: 1
    },
    ...renderOptions
  }: CustomRenderOptions = {}
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        {/* Add providers here */}
        {/* <AuthProvider mockUser={user}> */}
        {/*   <QueryClientProvider> */}
        {/*     {children} */}
        {/*   </QueryClientProvider> */}
        {/* </AuthProvider> */}
        {children}
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Async utilities
export async function waitForElement(
  callback: () => unknown,
  options?: { timeout?: number; interval?: number }
): Promise<unknown> {
  return waitFor(callback, options);
}

// Form test helpers
export function fillInput(
  container: HTMLElement,
  labelOrPlaceholder: string,
  value: string
): void {
  const input = container.querySelector(
    `input[placeholder="${labelOrPlaceholder}"], input[name="${labelOrPlaceholder}"]`
  ) as HTMLInputElement;
  
  if (input) {
    input.value = value;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Button click helper
export function clickButton(
  container: HTMLElement,
  buttonText: string
): void {
  const button = Array.from(container.querySelectorAll('button')).find(
    btn => btn.textContent?.includes(buttonText)
  );
  
  if (button) {
    button.click();
  }
}

// Assertion helpers
export function expectElementToBeInDocument(element: HTMLElement | null): void {
  expect(element).toBeInTheDocument();
}

export function expectElementToHaveText(
  element: HTMLElement | null,
  text: string
): void {
  expect(element).toHaveTextContent(text);
}

// Error message helpers
export function expectErrorMessage(
  container: HTMLElement,
  expectedMessage: string
): void {
  const errorElement = container.querySelector('[role="alert"], .error, [data-testid="error"]');
  expect(errorElement).toHaveTextContent(expectedMessage);
}

// Loading state helpers
export function expectLoadingState(container: HTMLElement): void {
  const loadingElement = container.querySelector('[role="status"], .loading, [data-testid="loading"]');
  expect(loadingElement).toBeInTheDocument();
}

// Wait for async operation
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock auth token
export function createMockAuthToken(): string {
  return 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test';
}

// Mock localStorage auth
export function mockAuthInStorage(): void {
  localStorage.setItem('authToken', createMockAuthToken());
  localStorage.setItem(
    'user',
    JSON.stringify({
      id: 'test-user-id',
      email: 'qa-test@example.com',
      username: 'testuser',
      totalPoints: 100,
      level: 1
    })
  );
}

// Clear auth from storage
export function clearAuthFromStorage(): void {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}
