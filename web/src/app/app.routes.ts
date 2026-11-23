import { Routes } from '@angular/router';
import { equipeGuard } from './core/auth';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage), title: 'Entrar' },
  {
    path: '',
    canActivate: [equipeGuard],
    loadComponent: () => import('./pages/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./pages/dashboard.page').then((m) => m.DashboardPage), title: 'Dashboard' },
      { path: 'chamados', loadComponent: () => import('./pages/chamados.page').then((m) => m.ChamadosPage), title: 'Chamados' },
      { path: 'chamados/:id', loadComponent: () => import('./pages/chamado.page').then((m) => m.ChamadoPage), title: 'Chamado' },
    ],
  },
  { path: '**', redirectTo: '' },
];
