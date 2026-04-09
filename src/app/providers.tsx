/**
 * App Providers - Root provider component for the application.
 * Wraps all children with necessary context providers.
 */

import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../core/data/query-client';
import { ModalProvider } from '../contexts/modals';
import { ToastProvider } from '../contexts/toast';
import { ReadOnlyProvider } from '../contexts/readonly';
import { ThemeProvider } from '../pages/theme';
import { AuthProvider } from '../contexts/auth/AuthContext';

const modalRegistry = {};

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ReadOnlyProvider>
            <ToastProvider>
              <ModalProvider registry={modalRegistry}>{children}</ModalProvider>
            </ToastProvider>
          </ReadOnlyProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
