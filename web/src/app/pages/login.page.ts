import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth';
import { mensagemDeErro } from '../core/chamados.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
  ],
  template: `
    <main class="fundo">
      <mat-card appearance="outlined" class="cartao">
        @if (enviando()) {
          <mat-progress-bar mode="indeterminate" />
        }
        <mat-card-header>
          <mat-icon mat-card-avatar class="logo">support_agent</mat-icon>
          <mat-card-title>Central de Atendimento</mat-card-title>
          <mat-card-subtitle>Painel da equipe</mat-card-subtitle>
        </mat-card-header>

        <form [formGroup]="form" (ngSubmit)="entrar()">
          <mat-card-content>
            <mat-form-field appearance="outline">
              <mat-label>Empresa</mat-label>
              <mat-icon matPrefix>domain</mat-icon>
              <input matInput formControlName="tenant" autocomplete="organization" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>E-mail</mat-label>
              <mat-icon matPrefix>mail</mat-icon>
              <input matInput type="email" formControlName="email" autocomplete="username" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <mat-icon matPrefix>lock</mat-icon>
              <input matInput [type]="mostrarSenha() ? 'text' : 'password'" formControlName="senha" autocomplete="current-password" />
              <button mat-icon-button matSuffix type="button" (click)="mostrarSenha.set(!mostrarSenha())"
                      [attr.aria-label]="mostrarSenha() ? 'Ocultar senha' : 'Mostrar senha'">
                <mat-icon>{{ mostrarSenha() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            @if (erro()) {
              <p class="erro" role="alert"><mat-icon>error</mat-icon> {{ erro() }}</p>
            }

            <p class="dica">Acessos de demonstração (senha <strong>Senha&#64;123</strong>):</p>
            <mat-chip-set aria-label="Acessos de demonstração">
              @for (demo of demos; track demo.email) {
                <mat-chip (click)="preencher(demo.tenant, demo.email)">{{ demo.rotulo }}</mat-chip>
              }
            </mat-chip-set>
          </mat-card-content>

          <mat-card-actions align="end">
            <button mat-flat-button type="submit" [disabled]="form.invalid || enviando()">Entrar</button>
          </mat-card-actions>
        </form>
      </mat-card>
    </main>
  `,
  styles: `
    .fundo { min-height: 100vh; display: grid; place-items: center; padding: 16px;
      background: linear-gradient(135deg, var(--mat-sys-primary-container), var(--mat-sys-surface)); }
    .cartao { width: min(420px, 100%); overflow: hidden; }
    .logo { color: var(--mat-sys-primary); font-size: 40px; width: 40px; height: 40px; }
    form mat-form-field { width: 100%; }
    mat-card-content { padding-top: 16px; }
    .erro { display: flex; gap: 8px; align-items: center; color: var(--mat-sys-error); margin: 0 0 12px; }
    .dica { font: var(--mat-sys-body-small); color: var(--mat-sys-on-surface-variant); }
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly mostrarSenha = signal(false);

  protected readonly demos = [
    { rotulo: 'Admin Acme', tenant: 'acme', email: 'admin@acme.com' },
    { rotulo: 'Agente Acme', tenant: 'acme', email: 'ana@acme.com' },
    { rotulo: 'Admin Globex', tenant: 'globex', email: 'admin@globex.com' },
  ];

  protected readonly form = inject(FormBuilder).nonNullable.group({
    tenant: ['acme', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    senha: ['', Validators.required],
  });

  protected preencher(tenant: string, email: string): void {
    this.form.setValue({ tenant, email, senha: 'Senha@123' });
  }

  protected entrar(): void {
    const { tenant, email, senha } = this.form.getRawValue();
    this.enviando.set(true);
    this.erro.set(null);

    this.auth.login(tenant, email, senha).subscribe({
      next: () => {
        this.enviando.set(false);
        if (this.auth.ehEquipe()) {
          this.router.navigate(['/']);
        } else {
          this.erro.set('Este painel é da equipe. Clientes acessam pelo portal do cliente.');
          this.auth.sair();
        }
      },
      error: (e) => {
        this.enviando.set(false);
        this.erro.set(e.status === 0 ? 'API indisponível. Verifique se ela está rodando.' : mensagemDeErro(e));
      },
    });
  }
}
