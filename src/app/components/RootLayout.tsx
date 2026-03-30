import { Outlet } from 'react-router';
import { AuthProvider } from '../context/AuthContext';
import { DataProvider } from '../context/DataContext';
import { PrimeReactProvider } from 'primereact/api';

export function RootLayout() {
  return (
    <PrimeReactProvider>
      <AuthProvider>
        <DataProvider>
          <Outlet />
        </DataProvider>
      </AuthProvider>
    </PrimeReactProvider>
  );
}
