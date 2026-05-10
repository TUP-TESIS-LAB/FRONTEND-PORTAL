// Forma del JSON de configuración por tenant
export interface TenantConfig {
  id: string;
  shortName: string;
  fullName: string;
  tagline?: string;

  logo: {
    color: string;
    white: string;
    mark:  string;
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
