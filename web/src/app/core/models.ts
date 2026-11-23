export type Papel = 'Admin' | 'Agente' | 'Cliente';
export type StatusChamado = 'Aberto' | 'EmAndamento' | 'AguardandoCliente' | 'Resolvido' | 'Fechado';
export type Prioridade = 'Baixa' | 'Media' | 'Alta' | 'Critica';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
}

export interface Sessao {
  token: string;
  expiraEm: string;
  usuario: Usuario;
  tenant: { nome: string; slug: string };
}

export interface Pessoa {
  id: string;
  nome: string;
}

export interface ChamadoResumo {
  id: string;
  titulo: string;
  status: StatusChamado;
  prioridade: Prioridade;
  cliente: Pessoa;
  responsavel: Pessoa | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Comentario {
  id: string;
  autor: Pessoa;
  texto: string;
  interno: boolean;
  criadoEm: string;
}

export interface ChamadoDetalhe extends ChamadoResumo {
  descricao: string;
  proximosStatus: StatusChamado[];
  comentarios: Comentario[];
}

export interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

export interface Dashboard {
  total: number;
  semResponsavel: number;
  criadosUltimos7Dias: number;
  porStatus: Record<StatusChamado, number>;
  porPrioridade: Record<Prioridade, number>;
}

export const STATUS: Record<StatusChamado, { rotulo: string; icone: string }> = {
  Aberto: { rotulo: 'Aberto', icone: 'fiber_new' },
  EmAndamento: { rotulo: 'Em andamento', icone: 'autorenew' },
  AguardandoCliente: { rotulo: 'Aguardando cliente', icone: 'hourglass_top' },
  Resolvido: { rotulo: 'Resolvido', icone: 'task_alt' },
  Fechado: { rotulo: 'Fechado', icone: 'lock' },
};

export const PRIORIDADES: Record<Prioridade, { rotulo: string; icone: string }> = {
  Baixa: { rotulo: 'Baixa', icone: 'keyboard_double_arrow_down' },
  Media: { rotulo: 'Média', icone: 'drag_handle' },
  Alta: { rotulo: 'Alta', icone: 'keyboard_arrow_up' },
  Critica: { rotulo: 'Crítica', icone: 'priority_high' },
};
