export interface NavItem {
  id: string;
  icon: string;         // clase pi sin prefijo 'pi ': 'pi-home', 'pi-calendar'
  label: string;
  route: string;
  badge?: number;
  exactMatch?: boolean; // usa { exact: true } en routerLinkActiveOptions
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface WizardStep {
  id: string;
  label: string;
}

// Subconjunto de User usado en componentes UI. El modelo de dominio completo
// vive en core/models/user.model.ts cuando se implemente auth.
export interface UserSummary {
  iniciales: string;
  nombre: string;
  apellido: string;
  dni: string;
}
