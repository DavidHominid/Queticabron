import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  LogOut,
  Users,
  Calendar,
  FileText,
  Activity,
  UserPlus,
  ClipboardList,
  LayoutDashboard,
  ChevronLeft,
  Bell,
  Search,
  Heart,
  Stethoscope,
  Settings,
} from 'lucide-react';
import { Card } from './ui/card';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getMenuItems = () => {
    switch (user?.rol) {
      case 'recepcion':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
          { icon: Calendar, label: 'Eventos', path: '/eventos' },
          { icon: ClipboardList, label: 'Triaje Nuevo', path: '/triage' },
          { icon: Users, label: 'Pacientes', path: '/pacientes' },
          { icon: Calendar, label: 'Citas', path: '/citas' },
          { icon: Activity, label: 'Cirugías', path: '/cirugias' },
        ];
      case 'triage':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
          { icon: ClipboardList, label: 'Citas de Hoy', path: '/triage' },
        ];
      case 'medico':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
          { icon: Stethoscope, label: 'Consultas', path: '/medico' },
          { icon: Users, label: 'Pacientes', path: '/pacientes' },
          { icon: Heart, label: 'Cirugías', path: '/cirugias' },
          { icon: UserPlus, label: 'Seguimientos', path: '/seguimientos' },
        ];
      case 'administrador':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
          { icon: Calendar, label: 'Eventos', path: '/eventos' },
          { icon: Calendar, label: 'Gestión Citas', path: '/citas' },
          { icon: Users, label: 'Pacientes', path: '/pacientes' },
          { icon: Users, label: 'Usuarios', path: '/usuarios' },
          { icon: ClipboardList, label: 'Auditoría', path: '/auditoria' },
        ];
      default:
        return [];
    }
  };



  const menuItems = getMenuItems();
  const initials = user?.nombre
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  const roleColors = {
    recepcion: 'bg-blue-500',
    triage: 'bg-green-500',
    medico: 'bg-purple-500',
    administrador: 'bg-orange-500',
  };

  const roleLabels = {
    recepcion: 'Recepción',
    triage: 'Triage',
    medico: 'Médico',
    administrador: 'Administrador',
  };

  const isActive = (path: string) => {
    return window.location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 z-30 flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        {/* Logo */}
        <div className="h-20 flex items-center px-6 border-b border-blue-700/50">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold text-base">Palabras de Esperanza</h1>
                <p className="text-xs text-blue-200">Sistema Médico</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 mx-auto">
              <Heart className="w-5 h-5 text-white" />
            </div>
          )}
        </div>
        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors mb-1 text-left ${
                  isActive(item.path) ? 'bg-white/10' : ''
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="mt-auto p-4 border-t border-blue-700/50">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 mb-3">
              <Avatar className={`w-10 h-10 ${user?.rol ? roleColors[user.rol] : 'bg-gray-500'}`}>
                <AvatarFallback className="text-white text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre}</p>
                <p className="text-xs text-blue-200">{user?.rol ? roleLabels[user.rol] : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <Avatar className={`w-10 h-10 ${user?.rol ? roleColors[user.rol] : 'bg-gray-500'}`}>
                <AvatarFallback className="text-white text-sm">{initials}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start text-white hover:bg-white/10 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {sidebarOpen && 'Cerrar Sesión'}
          </Button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-24 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center border border-gray-200 hover:bg-gray-50"
        >
          <ChevronLeft className={`w-4 h-4 text-gray-600 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="h-full px-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {user?.rol === 'recepcion' && 'Panel de Recepción'}
                {user?.rol === 'triage' && 'Panel de Triage'}
                {user?.rol === 'medico' && 'Panel Médico'}
                {user?.rol === 'administrador' && 'Panel de Administración'}
              </h2>
              <p className="text-sm text-gray-500">
                {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                <Search className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors relative">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}