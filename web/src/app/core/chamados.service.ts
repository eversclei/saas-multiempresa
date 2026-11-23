import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { API_URL } from './auth';
import {
  ChamadoDetalhe,
  ChamadoResumo,
  Dashboard,
  Pagina,
  Papel,
  Prioridade,
  StatusChamado,
  Usuario,
} from './models';

export interface FiltroChamados {
  status?: StatusChamado | null;
  prioridade?: Prioridade | null;
  busca?: string | null;
  pagina: number;
  tamanho: number;
}

export interface NovoChamado {
  titulo: string;
  descricao: string;
  prioridade: Prioridade;
  clienteId: string;
}

@Injectable({ providedIn: 'root' })
export class ChamadosService {
  private readonly http = inject(HttpClient);
  private readonly api = inject(API_URL);

  listar(filtro: FiltroChamados) {
    let params = new HttpParams().set('pagina', filtro.pagina).set('tamanho', filtro.tamanho);
    if (filtro.status) params = params.set('status', filtro.status);
    if (filtro.prioridade) params = params.set('prioridade', filtro.prioridade);
    if (filtro.busca?.trim()) params = params.set('busca', filtro.busca.trim());
    return this.http.get<Pagina<ChamadoResumo>>(`${this.api}/api/chamados`, { params });
  }

  obter(id: string) {
    return this.http.get<ChamadoDetalhe>(`${this.api}/api/chamados/${id}`);
  }

  criar(chamado: NovoChamado) {
    return this.http.post<{ id: string }>(`${this.api}/api/chamados`, chamado);
  }

  alterarStatus(id: string, status: StatusChamado) {
    return this.http.patch<void>(`${this.api}/api/chamados/${id}/status`, { status });
  }

  atribuir(id: string, responsavelId: string) {
    return this.http.patch<void>(`${this.api}/api/chamados/${id}/responsavel`, { responsavelId });
  }

  comentar(id: string, texto: string, interno: boolean) {
    return this.http.post<{ id: string }>(`${this.api}/api/chamados/${id}/comentarios`, { texto, interno });
  }

  dashboard() {
    return this.http.get<Dashboard>(`${this.api}/api/dashboard`);
  }

  usuarios(papel?: Papel) {
    const params = papel ? new HttpParams().set('papel', papel) : undefined;
    return this.http.get<Usuario[]>(`${this.api}/api/usuarios`, { params });
  }
}

/** Extrai a mensagem de um ProblemDetails da API. */
export function mensagemDeErro(erro: unknown): string {
  const corpo = (erro as { error?: { detail?: string; title?: string; errors?: Record<string, string[]> } })?.error;
  const primeiraValidacao = corpo?.errors ? Object.values(corpo.errors)[0]?.[0] : undefined;
  return primeiraValidacao ?? corpo?.detail ?? corpo?.title ?? 'Não foi possível concluir a operação.';
}
