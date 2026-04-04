import { ReactNode, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
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
  Heart,
  Stethoscope,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { registrosAuditoria, isInitialized } = useData();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(() => localStorage.getItem('notif_last_seen') || '');
  const notifRef = useRef<HTMLDivElement>(null);

  const recientes = [...registrosAuditoria]
    .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime())
    .slice(0, 10);

  const unread = recientes.filter((r) => !lastSeen || new Date(r.fechaHora).toISOString() > lastSeen).length;

  const handleOpenNotif = () => {
    setNotifOpen((prev) => {
      if (!prev) {
        const now = new Date().toISOString();
        setLastSeen(now);
        localStorage.setItem('notif_last_seen', now);
      }
      return !prev;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          { icon: Users, label: 'Pacientes', path: '/pacientes' },
          { icon: Calendar, label: 'Citas', path: '/citas' },
          { icon: Activity, label: 'Cirugías', path: '/cirugias' },
        ];
      case 'triage':
        return [
          { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
          { icon: ClipboardList, label: 'Triages Pendientes', path: '/triage' },
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

  const accionColor = (accion: string) => {
    if (accion.toLowerCase().includes('error') || accion.toLowerCase().includes('fallo')) return 'bg-red-100 text-red-700';
    if (accion.toLowerCase().includes('login') || accion.toLowerCase().includes('acceso')) return 'bg-yellow-100 text-yellow-700';
    if (accion.toLowerCase().includes('crear') || accion.toLowerCase().includes('registro') || accion.toLowerCase().includes('nuevo')) return 'bg-green-100 text-green-700';
    if (accion.toLowerCase().includes('actualiz') || accion.toLowerCase().includes('editar')) return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white transition-all duration-300 z-30 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'
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
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white/10 transition-colors mb-1 text-left ${isActive(item.path) ? 'bg-white/10' : ''
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
              <Avatar className={`w-10 h-10 ${user?.rol ? roleColors[user.rol as keyof typeof roleColors] : 'bg-gray-500'}`}>
                <AvatarFallback className="text-white text-sm">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre}</p>
                <p className="text-xs text-blue-200">{user?.rol ? roleLabels[user.rol as keyof typeof roleLabels] : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <Avatar className={`w-10 h-10 ${user?.rol ? roleColors[user.rol as keyof typeof roleColors] : 'bg-gray-500'}`}>
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
                {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleOpenNotif}
                  className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-gray-600" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
                        <p className="text-xs text-gray-500">Últimas acciones en el sistema</p>
                      </div>
                      <button
                        onClick={() => { navigate('/auditoria'); setNotifOpen(false); }}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Ver todo
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                      {recientes.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm">Sin actividad reciente</div>
                      ) : (
                        recientes.map((r) => (
                          <div key={r.id} className="p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FileText className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-gray-900 truncate">{r.nombreUsuario}</span>
                                  <Badge className={`text-[10px] px-1.5 py-0 ${accionColor(r.accion)}`}>{r.accion}</Badge>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{r.detalles}</p>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                  {new Date(r.fechaHora).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-8 relative min-h-[calc(100vh-80px)]">
          {!isInitialized ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-gray-50/50 backdrop-blur-sm z-50">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-blue-100 rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                <Activity className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-gray-800">Sincronizando Sistema...</h2>
              <p className="text-gray-500 text-sm mt-2">Cargando datos de forma segura</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
