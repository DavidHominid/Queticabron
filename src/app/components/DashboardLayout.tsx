import { ReactNode, useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { AppLogo } from './AppLogo';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
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
  SlidersHorizontal,
  Languages,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { now, nowIso } from '../utils/clock';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const { registrosAuditoria, isInitialized } = useData();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const raw = localStorage.getItem('sidebar_open');
    if (raw === null) return true;
    return raw === '1';
  });
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
        const ts = nowIso();
        setLastSeen(ts);
        localStorage.setItem('notif_last_seen', ts);
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
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
          { icon: Calendar, label: t('nav.eventos'), path: '/eventos' },
          { icon: Users, label: t('nav.pacientes'), path: '/pacientes' },
          { icon: Calendar, label: t('nav.citas'), path: '/citas' },
          { icon: Activity, label: t('nav.cirugias'), path: '/cirugias' },
          { icon: UserPlus, label: t('nav.seguimientos'), path: '/seguimientos' },
        ];
      case 'triage':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
          { icon: ClipboardList, label: t('nav.triage'), path: '/triage' },
        ];
      case 'medico':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
          { icon: Stethoscope, label: t('nav.consultas'), path: '/medico' },
          { icon: Users, label: t('nav.pacientes'), path: '/pacientes' },
          { icon: Heart, label: t('nav.cirugias'), path: '/cirugias' },
          { icon: UserPlus, label: t('nav.seguimientos'), path: '/seguimientos' },
        ];
      case 'administrador':
        return [
          { icon: LayoutDashboard, label: t('nav.dashboard'), path: '/dashboard' },
          { icon: Calendar, label: t('nav.eventos'), path: '/eventos' },
          { icon: Calendar, label: t('nav.citas'), path: '/citas' },
          { icon: Users, label: t('nav.pacientes'), path: '/pacientes' },
          { icon: Users, label: t('nav.usuarios'), path: '/usuarios' },
          { icon: SlidersHorizontal, label: t('nav.variables'), path: '/variables' },
          { icon: ClipboardList, label: t('nav.auditoria'), path: '/auditoria' },
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

  const roleAvatarStyle = (rol: string) => {
    if (rol === 'recepcion') return { className: 'bg-primary text-primary-foreground' };
    if (rol === 'triage') return { className: 'bg-secondary text-secondary-foreground' };
    if (rol === 'medico') return { className: 'bg-accent text-accent-foreground' };
    if (rol === 'administrador') return { className: 'bg-primary text-primary-foreground' };
    return { className: 'bg-muted text-foreground' };
  };

  const roleLabels = {
    recepcion: 'Recepción',
    triage: 'Triage',
    medico: 'Médico',
    administrador: 'Administrador',
  };

  useEffect(() => {
    localStorage.setItem('sidebar_open', sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  const accionBadgeStyle = (accion: string) => {
    const acc = String(accion || '').toLowerCase();
    if (!acc) return { variant: 'outline' as const, className: 'bg-background' };
    if (acc.includes('error') || acc.includes('fallo')) return { variant: 'destructive' as const, className: '' };
    if (acc.includes('login') || acc.includes('acceso')) return { variant: 'secondary' as const, className: '' };
    if (acc.includes('crear') || acc.includes('registro') || acc.includes('nuevo')) return { variant: 'default' as const, className: '' };
    if (acc.includes('actualiz') || acc.includes('editar')) return { variant: 'outline' as const, className: 'bg-background' };
    return { variant: 'outline' as const, className: 'bg-background' };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={`fixed left-0 top-0 z-30 flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}
      >
        {/* Logo */}
        <div className={`flex h-20 items-center border-b border-sidebar-border ${sidebarOpen ? 'px-6' : 'px-4'}`}>
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent">
                <AppLogo className="w-6 h-6" inverted alt="Logo" />
              </div>
              <div>
                <h1 className="font-semibold text-base">Palabras de Esperanza</h1>
                <p className="text-xs text-sidebar-foreground/70">Sistema Médico</p>
              </div>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-sidebar-border bg-sidebar-accent">
                  <AppLogo className="h-6 w-6" inverted alt="Logo" />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10}>
                Palabras de Esperanza
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {/* Navigation */}
        <nav aria-label="Navegación principal" className="mt-6 flex-1 overflow-y-auto px-3">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const link = (
              <NavLink
                to={item.path}
                aria-label={!sidebarOpen ? item.label : undefined}
                className={({ isActive }) =>
                  `mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/90 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                  } ${sidebarOpen ? '' : 'justify-center px-2'}`
                }
              >
                <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                {sidebarOpen ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            );

            if (sidebarOpen) return <div key={item.path || index}>{link}</div>;

            return (
              <Tooltip key={item.path || index}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}

          {isInitialized ? null : (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/70">{t('common.loading')}</div>
          )}
        </nav>

        {/* User Info */}
        <div className="mt-auto p-4 border-t border-sidebar-border">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={`${user?.rol ? roleAvatarStyle(user.rol).className : roleAvatarStyle('').className} text-sm`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.nombre}</p>
                <p className="text-xs text-sidebar-foreground/70">{user?.rol ? roleLabels[user.rol as keyof typeof roleLabels] : ''}</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center mb-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className={`${user?.rol ? roleAvatarStyle(user.rol).className : roleAvatarStyle('').className} text-sm`}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
          )}
          <Button
            variant="ghost"
            aria-label={!sidebarOpen ? 'Cerrar sesión' : undefined}
            className={`w-full hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground text-sidebar-foreground ${
              sidebarOpen ? 'justify-start' : 'justify-center px-0'
            }`}
            onClick={handleLogout}
          >
            <LogOut className={`h-4 w-4 ${sidebarOpen ? 'mr-2' : ''}`} />
            {sidebarOpen && t('nav.logout')}
          </Button>
        </div>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          type="button"
          aria-label={sidebarOpen ? 'Colapsar sidebar' : 'Expandir sidebar'}
          aria-controls="app-sidebar"
          aria-expanded={sidebarOpen}
          className="absolute -right-3 top-24 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card shadow-lg hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <ChevronLeft className={`w-4 h-4 text-muted-foreground transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Header */}
        <header className="h-20 bg-card border-b border-border sticky top-0 z-20">
          <div className="h-full px-8 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                {user?.rol === 'recepcion' && t('panel.recepcion')}
                {user?.rol === 'triage' && t('panel.triage')}
                {user?.rol === 'medico' && t('panel.medico')}
                {user?.rol === 'administrador' && t('panel.admin')}
              </h2>
              <p className="text-sm text-muted-foreground uppercase">
                {now().toLocaleDateString(language === 'es' ? 'es-MX' : 'en-US', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric',
                  weekday: 'long'
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Language Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleLanguage}
                    className="w-11 h-11 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors text-muted-foreground hover:text-secondary relative group"
                    aria-label={t('lang.toggle')}
                  >
                    <Languages className="w-5 h-5 transition-transform group-hover:scale-110" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground shadow-sm">
                      {language.toUpperCase()}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {t('lang.toggle')}
                </TooltipContent>
              </Tooltip>

              {/* Notifications */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={handleOpenNotif}
                  className="w-11 h-11 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors relative"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unread > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 top-12 w-96 bg-card rounded-2xl shadow-[0_8px_24px_rgba(1,106,103,0.08)] border border-border z-50">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{t('notif.recent')}</h3>
                        <p className="text-xs text-muted-foreground">{t('notif.last_actions')}</p>
                      </div>
                      <button
                        onClick={() => { navigate('/auditoria'); setNotifOpen(false); }}
                        className="text-xs text-secondary hover:underline font-medium"
                      >
                        {t('notif.view_all')}
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto divide-y divide-border">
                      {recientes.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground text-sm">Sin actividad reciente</div>
                      ) : (
                        recientes.map((r) => (
                          <div key={r.id} className="p-3 hover:bg-accent transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                                <FileText className="w-4 h-4 text-secondary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium text-foreground truncate">{r.nombreUsuario}</span>
                                  <Badge
                                    variant={accionBadgeStyle(r.accion).variant}
                                    className={`text-[10px] px-1.5 py-0 ${accionBadgeStyle(r.accion).className}`}
                                  >
                                    {r.accion}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.detalles}</p>
                                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
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
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-background/70 backdrop-blur-sm z-50">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-accent rounded-full animate-ping opacity-75"></div>
                <div className="absolute inset-0 border-4 border-secondary rounded-full border-t-transparent animate-spin"></div>
                <Activity className="w-8 h-8 text-secondary animate-pulse" />
              </div>
              <h2 className="mt-6 text-xl font-semibold text-foreground">Sincronizando Sistema...</h2>
              <p className="text-muted-foreground text-sm mt-2">Cargando datos de forma segura</p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
