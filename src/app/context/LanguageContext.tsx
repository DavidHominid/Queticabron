import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  es: {
    'nav.dashboard': 'Dashboard',
    'nav.eventos': 'Eventos',
    'nav.pacientes': 'Pacientes',
    'nav.citas': 'Citas',
    'nav.cirugias': 'Cirugías',
    'nav.triage': 'Triages Pendientes',
    'nav.consultas': 'Consultas',
    'nav.seguimientos': 'Seguimientos',
    'nav.usuarios': 'Usuarios',
    'nav.variables': 'Variables',
    'nav.auditoria': 'Auditoría',
    'nav.logout': 'Cerrar Sesión',
    'panel.recepcion': 'Panel de Recepción',
    'panel.triage': 'Panel de Triage',
    'panel.medico': 'Panel Médico',
    'panel.admin': 'Panel de Administración',
    'notif.recent': 'Actividad Reciente',
    'notif.view_all': 'Ver todo',
    'notif.no_activity': 'Sin actividad reciente',
    'notif.last_actions': 'Últimas acciones en el sistema',
    'lang.toggle': 'Cambiar a Inglés',
    'common.loading': 'Cargando…',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.eventos': 'Events',
    'nav.pacientes': 'Patients',
    'nav.citas': 'Appointments',
    'nav.cirugias': 'Surgeries',
    'nav.triage': 'Pending Triages',
    'nav.consultas': 'Consultations',
    'nav.seguimientos': 'Follow-ups',
    'nav.usuarios': 'Users',
    'nav.variables': 'Variables',
    'nav.auditoria': 'Audit',
    'nav.logout': 'Logout',
    'panel.recepcion': 'Reception Panel',
    'panel.triage': 'Triage Panel',
    'panel.medico': 'Medical Panel',
    'panel.admin': 'Admin Panel',
    'notif.recent': 'Recent Activity',
    'notif.view_all': 'View all',
    'notif.no_activity': 'No recent activity',
    'notif.last_actions': 'Latest system actions',
    'lang.toggle': 'Switch to Spanish',
    'common.loading': 'Loading…',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'es';
  });

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const next = prev === 'es' ? 'en' : 'es';
      localStorage.setItem('app_language', next);
      return next;
    });
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
