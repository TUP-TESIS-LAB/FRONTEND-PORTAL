// Forma del JSON de configuración por tenant
export interface TenantConfig {
  id: string;
  shortName: string;
  fullName: string;
  tagline?: string;

  // null = el tenant no tiene ese logo configurado → la UI cae al chip de
  // iniciales (ui-brand-mark). Nunca apuntar a assets de otro tenant.
  logo: {
    color: string | null;
    white: string | null;
    mark:  string | null;
  };

  colors: {
    primary:   string;
    secondary: string;
    accent:    string;
  };

  contact: {
    helpPhone?: string;
    helpEmail?: string;
    address?:  string;
  };
}
