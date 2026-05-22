import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { PrimeReactProvider } from 'primereact/api';
import { LanguageProvider } from '../context/LanguageContext';
import { Toaster } from './ui/sonner';

export function RootLayout() {
  return (
    <PrimeReactProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <Outlet />
            <Toaster richColors position="top-center" />
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </PrimeReactProvider>
  );
}
