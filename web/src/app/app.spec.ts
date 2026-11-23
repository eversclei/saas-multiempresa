import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './core/auth';
import { Sessao } from './core/models';

function sessao(papel: 'Admin' | 'Cliente'): Sessao {
  return {
    token: 'token-falso',
    expiraEm: new Date(Date.now() + 60_000).toISOString(),
    usuario: { id: '1', nome: 'Ana', email: 'ana@acme.com', papel },
    tenant: { nome: 'Acme', slug: 'acme' },
  };
}

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'login', children: [] }]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('guarda a sessão após o login e reconhece a equipe', () => {
    const auth = TestBed.inject(AuthService);

    auth.login('acme', 'ana@acme.com', 'Senha@123').subscribe();
    const req = http.expectOne('http://localhost:5080/api/auth/login');
    expect(req.request.body).toEqual({ tenant: 'acme', email: 'ana@acme.com', senha: 'Senha@123' });
    req.flush(sessao('Admin'));

    expect(auth.logado()).toBe(true);
    expect(auth.ehEquipe()).toBe(true);
    expect(localStorage.getItem('saas.sessao')).toContain('token-falso');
  });

  it('cliente não é considerado equipe', () => {
    const auth = TestBed.inject(AuthService);

    auth.login('acme', 'cliente@acme.com', 'x').subscribe();
    http.expectOne('http://localhost:5080/api/auth/login').flush(sessao('Cliente'));

    expect(auth.ehEquipe()).toBe(false);
  });

  it('descarta sessão salva com token vencido', () => {
    const vencida = { ...sessao('Admin'), expiraEm: new Date(Date.now() - 1000).toISOString() };
    localStorage.setItem('saas.sessao', JSON.stringify(vencida));

    expect(TestBed.inject(AuthService).logado()).toBe(false);
  });

  it('sair limpa a sessão', () => {
    localStorage.setItem('saas.sessao', JSON.stringify(sessao('Admin')));
    const auth = TestBed.inject(AuthService);

    auth.sair();

    expect(auth.logado()).toBe(false);
    expect(localStorage.getItem('saas.sessao')).toBeNull();
  });
});
