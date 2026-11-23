import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../core/auth';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
  ],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav #menu [mode]="celular() ? 'over' : 'side'" [opened]="!celular()">
        <div class="marca">
          <mat-icon>support_agent</mat-icon>
          <div>
            <strong>Atendimento</strong>
            <small>{{ auth.sessao()?.tenant?.nome }}</small>
          </div>
        </div>
        <mat-nav-list>
          @for (item of menuItens; track item.rota) {
            <a mat-list-item [routerLink]="item.rota" routerLinkActive #rla="routerLinkActive"
               [routerLinkActiveOptions]="{ exact: item.rota === '/' }" [activated]="rla.isActive"
               (click)="celular() && menu.close()">
              <mat-icon matListItemIcon>{{ item.icone }}</mat-icon>
              <span matListItemTitle>{{ item.rotulo }}</span>
            </a>
          }
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar>
          @if (celular()) {
            <button mat-icon-button (click)="menu.toggle()" aria-label="Abrir menu"><mat-icon>menu</mat-icon></button>
          }
          <span class="espaco"></span>
          <button mat-button [matMenuTriggerFor]="conta">
            <mat-icon>account_circle</mat-icon>
            {{ auth.sessao()?.usuario?.nome }}
          </button>
          <mat-menu #conta="matMenu">
            <div class="conta">
              <strong>{{ auth.sessao()?.usuario?.email }}</strong>
              <small>{{ auth.sessao()?.usuario?.papel }}</small>
            </div>
            <mat-divider />
            <button mat-menu-item (click)="auth.sair()"><mat-icon>logout</mat-icon> Sair</button>
          </mat-menu>
        </mat-toolbar>
        <main class="conteudo">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container { height: 100vh; }
    mat-sidenav { width: 248px; }
    .marca { display: flex; gap: 12px; align-items: center; padding: 20px 16px; }
    .marca mat-icon { color: var(--mat-sys-primary); font-size: 32px; width: 32px; height: 32px; }
    .marca div { display: flex; flex-direction: column; }
    .marca small, .conta small { color: var(--mat-sys-on-surface-variant); }
    .espaco { flex: 1; }
    .conta { display: flex; flex-direction: column; padding: 12px 16px; }
    .conteudo { padding: 24px; max-width: 1280px; margin: 0 auto; }
    @media (max-width: 600px) { .conteudo { padding: 16px; } }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly celular = toSignal(
    inject(BreakpointObserver).observe(Breakpoints.Handset).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly menuItens = [
    { rota: '/', rotulo: 'Dashboard', icone: 'dashboard' },
    { rota: '/chamados', rotulo: 'Chamados', icone: 'confirmation_number' },
  ];
}
