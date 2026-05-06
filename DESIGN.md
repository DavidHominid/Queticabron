---
name: Nueva Esperanza
description: Gestión de eventos y citas médicas para un centro comunitario
colors:
  pearl-aqua: "#79c9c5"
  blue-green: "#4796b7"
  soft-peach: "#ffe2af"
  vibrant-coral: "#f96e5b"
  deep-teal: "#016a67"
  deep-blue: "#006685"
  background: "#f9f9f9"
  foreground: "#1a1c1c"
  surface: "#ffffff"
  surface-tint: "#f1fbfa"
  muted: "#eeeeee"
  muted-foreground: "#3e4948"
  border: "#bec9c7"
  outline: "#6e7978"
  destructive: "#dc2626"
  accent-foreground: "#005452"
  ring: "#79c9c5"
  on-primary: "#ffffff"
  sidebar: "#006685"
  sidebar-foreground: "#ffffff"
  chart-1: "#016a67"
  chart-2: "#4796b7"
  chart-3: "#f96e5b"
  chart-4: "#ba1a1a"
  chart-5: "#aa3527"
typography:
  display:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "48px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.35
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, Liberation Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.pearl-aqua}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-primary-hover:
    backgroundColor: "{colors.pearl-aqua}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-secondary:
    backgroundColor: "{colors.blue-green}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.blue-green}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 16px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Nueva Esperanza

## 1. Overview

**Creative North Star: "Cuidado Comunitario"**

Una interfaz serena y humana para operar jornadas clínicas con claridad. El diseño mantiene una calidez sobria, con superficies limpias y señales de estado consistentes, evitando dramatismo visual. La prioridad es operar rápido, con pocos errores, y con confianza en lo que cambia cada acción.

Rechaza lo genérico y lo estridente: no estética SaaS corporativa, no alarmismo clínico, no gradientes decorativos. El color existe para orientar decisiones (estado, prioridad, confirmación), no para ornamentar.

**Key Characteristics:**
- Serenidad por ritmo y espacios, no por vacío
- Color por estado y acciones primarias
- Tipografía limpia, jerarquía clara, lectura cómoda
- Componentes consistentes, foco visible y accesibilidad AA

## 2. Colors

La paleta combina acuáticos confiables con un coral cálido para acciones y estados críticos, más un durazno suave para estados de transición.

### Primary
- **Pearl Aqua** ({colors.pearl-aqua}): acciones primarias, estados “listo/ok”, resaltados suaves.

### Secondary
- **Blue Green** ({colors.blue-green}): acciones secundarias, navegación y elementos de soporte.

### Tertiary
- **Vibrant Coral** ({colors.vibrant-coral}): advertencias operativas, atención, estados críticos no destructivos.
- **Soft Peach** ({colors.soft-peach}): transición y proceso (triage/en curso), marcadores suaves.

### Neutral
- **Background** ({colors.background}): fondo general.
- **Surface** ({colors.surface}): tarjetas, modales, paneles.
- **Surface Tint** ({colors.surface-tint}): estados “hoy”, selección suave, hover ambiental.
- **Border** ({colors.border}): contornos y separadores.
- **Outline** ({colors.outline}): texto secundario y estados neutros.

### Named Rules
**The Status-First Rule.** Los acentos se reservan para estados y acciones. Evitar usar colores fuertes para decoración.

## 3. Typography

**Body/Display Font:** Inter (con fallbacks del sistema).

### Hierarchy
- **Display** (700, 48px, 1.2): títulos de página y encabezados principales.
- **Headline** (600, 24px, 1.3): secciones y tarjetas principales.
- **Title** (600, 18px, 1.35): subtítulos, encabezados de paneles, tablas/listas.
- **Body** (400, 16px, 1.5): contenido general.
- **Label** (500, 13px, 1.4): labels de formularios y microcopy.

### Named Rules
**The Clear Labels Rule.** Labels siempre visibles y cercanos al control, sin depender solo de placeholder.

## 4. Elevation

La elevación es ambiental y ligera. Las superficies se separan por borde y un shadow suave con tinte acuático. La profundidad no debe sentirse “pesada” ni producir ruido.

### Shadow Vocabulary
- **Ambient Card** (`0 2px 8px rgba(121,201,197,0.06)`): tarjetas principales y contenedores.

### Named Rules
**The Light-By-Default Rule.** Sombras suaves, sin stacking de tarjetas ni sombras fuertes.

## 5. Components

### Buttons
- **Altura mínima**: 44px.
- **Primary**: pearl-aqua con texto blanco; hover baja intensidad sin cambiar de hue.
- **Secondary**: blue-green para acciones secundarias y navegación activa.
- **Outline**: fondo surface, borde y texto blue-green; hover con surface-tint.
- **Ghost**: sin borde; hover con surface-tint.
- **Destructive**: rojo solo para acciones irreversibles.

### Cards
- **Forma**: esquinas amplias (16px) en contenedores principales.
- **Separación**: borde + shadow ambiental, sin acentos laterales.

### Inputs / Selects
- **Altura**: 44px.
- **Foco**: ring visible en pearl-aqua, sin depender solo del color del borde.
- **Errores**: usar destructive solo cuando el campo esté inválido, con mensaje claro.

### Badges (Estados)
- Usar la paleta de estados: peach para proceso, coral para atención, aquas para confirmación.
- Nunca comunicar estado solo por color; incluir texto de estado.

### Calendars (FullCalendar)
- Resaltar “hoy” con surface-tint.
- Eventos por estado con colores consistentes a badges.
- Evitar saturación; preferir fondos con texto legible y borde coherente.
- Regla operativa: el día de la cita no se vuelve a abrir cupo tras cancelar; en días futuros sí.

## 6. Do's and Don'ts

- Do: usar tokens (`var(--primary)`, `var(--secondary)`, `--brand-*`) en vez de hex hardcodeado.
- Do: mantener acciones disponibles según contexto (día de cita vs días futuros).
- Do: preferir superficies limpias con bordes y sombras ambientales ligeras.
- Don't: usar gradientes decorativos o texto con gradiente.
- Don't: usar acentos laterales tipo `border-left` grueso para “decorar” tarjetas/listas.
- Don't: depender solo de color para estados o validación.

