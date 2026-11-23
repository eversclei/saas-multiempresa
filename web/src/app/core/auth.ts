import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injectable, InjectionToken, computed, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { Sessao } from './models';

export const API_URL = new InjectionToken<string>('API_URL', {
  factory: () => 'http://localhost:5080',
});

const CHAVE_SESSAO = 'saas.sessao';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);
  private readonly router = inject(Router);

  private readonly _sessao = signal<Sessao | null>(this.lerSessaoSalva());

  readonly sessao = this._sessao.asReadonly();
  readonly logado = computed(() => this._sessao() !== null);
  readonly ehEquipe = computed(() => {
    const papel = this._sessao()?.usuario.papel;
    return papel === 'Admin' || papel === 'Agente';
  });

  login(tenant: string, email: string, senha: string) {
    return this.http
      .post<Sessao>(`${this.api}/api/auth/login`, { tenant, email, senha })
      .pipe(
        tap((sessao) => {
          localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
          this._sessao.set(sessao);
        }),
      );
  }

  sair(): void {
    localStorage.removeItem(CHAVE_SESSAO);
    this._sessao.set(null);
    this.router.navigate(['/login']);
  }

  private lerSessaoSalva(): Sessao | null {
    try {
      const salva = localStorage.getItem(CHAVE_SESSAO);
      if (!salva) return null;
      const sessao = JSON.parse(salva) as Sessao;
      // Token vencido é descartado já na abertura do app.
      return new Date(sessao.expiraEm) > new Date() ? sessao : null;
    } catch {
      return null;
    }
  }
}

/** Anexa o token JWT e encerra a sessão quando a API responde 401. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.sessao()?.token;
  const autenticada = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(autenticada).pipe(
    catchError((erro: HttpErrorResponse) => {
      if (erro.status === 401 && token) auth.sair();
      return throwError(() => erro);
    }),
  );
};

/** O painel é da equipe (Admin/Agente). Clientes usam o portal. */
export const equipeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.logado() && auth.ehEquipe() ? true : inject(Router).createUrlTree(['/login']);
};
