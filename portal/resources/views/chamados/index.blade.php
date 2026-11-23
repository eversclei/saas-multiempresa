@extends('layouts.app')

@section('titulo', 'Meus chamados')

@push('estilos')
    <style>
        .filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
        md-list { border-radius: 16px; border: 1px solid var(--md-sys-color-outline-variant); overflow: hidden; padding: 0;
            --md-list-container-color: var(--md-sys-color-surface-container-low); }
        .paginacao { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 16px; }
        .vazio { text-align: center; padding: 48px 16px; }
        .vazio md-icon { --md-icon-size: 48px; color: var(--md-sys-color-outline); }
    </style>
@endpush

@section('conteudo')
    <div class="cabecalho">
        <h1 class="md-typescale-headline-medium">Meus chamados</h1>
        <md-filled-button href="{{ route('chamados.create') }}">
            <md-icon slot="icon">add</md-icon>Abrir chamado
        </md-filled-button>
    </div>

    <nav class="filtros" aria-label="Filtrar por status">
        @if ($statusAtual === null)
            <md-filled-tonal-button href="{{ route('chamados.index') }}">Todos</md-filled-tonal-button>
        @else
            <md-outlined-button href="{{ route('chamados.index') }}">Todos</md-outlined-button>
        @endif
        @foreach (\App\Http\Controllers\ChamadoController::STATUS as $chave => $rotulo)
            @if ($statusAtual === $chave)
                <md-filled-tonal-button href="{{ route('chamados.index', ['status' => $chave]) }}">{{ $rotulo }}</md-filled-tonal-button>
            @else
                <md-outlined-button href="{{ route('chamados.index', ['status' => $chave]) }}">{{ $rotulo }}</md-outlined-button>
            @endif
        @endforeach
    </nav>

    @if (count($resultado['itens']) === 0)
        <div class="cartao vazio">
            <md-icon>inbox</md-icon>
            <p class="md-typescale-body-large">Nenhum chamado por aqui.</p>
        </div>
    @else
        <md-list>
            @foreach ($resultado['itens'] as $chamado)
                <md-list-item type="link" href="{{ route('chamados.show', $chamado['id']) }}">
                    <md-icon slot="start">confirmation_number</md-icon>
                    <div slot="headline">{{ $chamado['titulo'] }}</div>
                    <div slot="supporting-text">
                        Aberto em {{ \Illuminate\Support\Carbon::parse($chamado['criadoEm'])->setTimezone('America/Sao_Paulo')->format('d/m/Y H:i') }}
                        · {{ $chamado['responsavel']['nome'] ?? 'Aguardando atendente' }}
                    </div>
                    <div slot="end">@include('partials.status', ['status' => $chamado['status']])</div>
                </md-list-item>
                @if (! $loop->last)
                    <md-divider></md-divider>
                @endif
            @endforeach
        </md-list>

        @php $ultimaPagina = max(1, (int) ceil($resultado['total'] / $resultado['tamanho'])); @endphp
        @if ($ultimaPagina > 1)
            <div class="paginacao">
                <md-outlined-icon-button href="{{ route('chamados.index', array_filter(['status' => $statusAtual, 'pagina' => $pagina - 1])) }}"
                    @if ($pagina <= 1) disabled @endif aria-label="Página anterior">
                    <md-icon>chevron_left</md-icon>
                </md-outlined-icon-button>
                <span class="md-typescale-body-medium">Página {{ $pagina }} de {{ $ultimaPagina }}</span>
                <md-outlined-icon-button href="{{ route('chamados.index', array_filter(['status' => $statusAtual, 'pagina' => $pagina + 1])) }}"
                    @if ($pagina >= $ultimaPagina) disabled @endif aria-label="Próxima página">
                    <md-icon>chevron_right</md-icon>
                </md-outlined-icon-button>
            </div>
        @endif
    @endif
@endsection
