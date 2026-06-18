import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

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
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/password-recovery/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/password-recovery/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'primer-acceso',
    loadComponent: () =>
      import('./features/auth/first-login/first-login.component').then(m => m.FirstLoginComponent),
  },
  {
    // Legacy /dashboard: redirige al home real para no romper bookmarks.
    path: 'dashboard',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/ui/shell/patient-shell/patient-shell.component').then(
        m => m.PatientShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/main/dashboard/dashboard.component').then(
            m => m.DashboardComponent,
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
      {
        path: 'estudios',
        loadComponent: () =>
          import('./features/main/estudios/estudios.component').then(
            m => m.EstudiosComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
