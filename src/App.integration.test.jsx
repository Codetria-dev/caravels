import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: null,
    session: null,
    loading: false,
    signInWithGoogle: vi.fn(),
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signOut: vi.fn(),
    isAuthenticated: false,
    isConfigured: false,
  }),
}));

vi.mock('./components/AuthModal', () => ({
  default: () => null,
}));

vi.mock('./hooks/useMapData', () => ({
  useMapData: () => ({
    loading: false,
    locations: [
      { id: 'region-1', label: 'Europe', lat: 54.526, lng: 15.2551, type: 'region' },
    ],
    countriesIndex: [
      {
        id: 1,
        name: 'Germany',
        lowerName: 'germany',
        searchTerms: ['germany'],
        lat: 51.1657,
        lng: 10.4515,
        type: 'country',
      },
    ],
  }),
}));

vi.mock('./components/GlobeSection', () => ({
  default: ({ selectedLocation }) => (
    <div data-testid="globe-selected">
      {selectedLocation && typeof selectedLocation === 'object'
        ? selectedLocation.name
        : selectedLocation || 'none'}
    </div>
  ),
}));

vi.mock('./components/ContextPanel', () => ({
  default: ({ selectedLocation }) => (
    <div data-testid="context-selected">
      {selectedLocation && typeof selectedLocation === 'object'
        ? selectedLocation.name
        : selectedLocation || 'none'}
    </div>
  ),
}));

vi.mock('./components/TrendingTopics', () => ({
  default: ({ onTopicSelect }) => <div data-testid="trending" />,
}));

describe('App Integration - Search to Globe', () => {
  it('propagates search selection to GlobeSection and ContextPanel', async () => {
    render(<App />);

    const input = screen.getByPlaceholderText('search.placeholder');
    fireEvent.change(input, { target: { value: 'germ' } });

    await waitFor(() => {
      expect(screen.getByText('Germany')).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Germany'));

    await waitFor(() => {
      expect(screen.getByTestId('globe-selected')).toHaveTextContent('Germany');
      expect(screen.getByTestId('context-selected')).toHaveTextContent('Germany');
    });
  });
});
