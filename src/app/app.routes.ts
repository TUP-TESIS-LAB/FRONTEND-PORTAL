import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./shared/ui/shell/patient-shell/patient-shell.component').then(
        m => m.PatientShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/main/patient-placeholder.component').then(
            m => m.PatientPlaceholderComponent,
          ),
      },
      {
        path: 'familia',
        loadComponent: () =>
          import('./features/main/familia/familia.component').then(
            m => m.FamiliaComponent,
          ),
      },
      {
        path: 'perfil',
        loadComponent: () =>
          import('./features/main/perfil/perfil.component').then(
            m => m.PerfilComponent,
          ),
      },
      {
        path: 'turnos',
        loadComponent: () =>
          import('./features/main/turnos/turnos.component').then(
            m => m.TurnosComponent,
          ),
      },
      {
        path: 'turnos/sacar',
        loadComponent: () =>
          import('./features/main/turnos/sacar/sacar-turno.component').then(
            m => m.SacarTurnoComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
