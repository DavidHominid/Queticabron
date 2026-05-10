import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { PrimeReactProvider } from 'primereact/api';
import { LanguageProvider } from '../context/LanguageContext';

export function RootLayout() {
  return (
    <PrimeReactProvider>
      <LanguageProvider>
        <AuthProvider>
          <DataProvider>
            <Outlet />
          </DataProvider>
        </AuthProvider>
      </LanguageProvider>
    </PrimeReactProvider>
  );
}
