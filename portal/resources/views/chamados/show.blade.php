@extends('layouts.app')

@section('titulo', $chamado['titulo'])

@push('estilos')
    <style>
        .conversa { display: flex; flex-direction: column; gap: 12px; margin: 24px 0; }
        .mensagem { padding: 16px; border-radius: 16px; background: var(--md-sys-color-surface-container-low);
            border: 1px solid var(--md-sys-color-outline-variant); max-width: 85%; }
        .mensagem.minha { align-self: flex-end; background: var(--md-sys-color-primary-container); color: var(--md-sys-color-on-primary-container); border: none; }
        .mensagem p { margin: 8px 0 0; white-space: pre-line; }
        .meta { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin-top: 8px; }
        .descricao { white-space: pre-line; }
    </style>
@endpush

@section('conteudo')
    @php
        $fmt = fn ($data) => \Illuminate\Support\Carbon::parse($data)->setTimezone('America/Sao_Paulo')->format('d/m/Y H:i');
        $euId = session('api.usuario.id');
    @endphp

    <md-text-button href="{{ route('chamados.index') }}"><md-icon slot="icon">arrow_back</md-icon>Meus chamados</md-text-button>

    <article class="cartao" style="margin-top: 8px">
        <h1 class="md-typescale-headline-small" style="margin: 0">{{ $chamado['titulo'] }}</h1>
        <div class="meta md-typescale-body-medium sutil">
            @include('partials.status', ['status' => $chamado['status']])
            <span>Prioridade: {{ \App\Http\Controllers\ChamadoController::PRIORIDADES[$chamado['prioridade']] ?? $chamado['prioridade'] }}</span>
            <span>Aberto em {{ $fmt($chamado['criadoEm']) }}</span>
            <span>Atendente: {{ $chamado['responsavel']['nome'] ?? 'a definir' }}</span>
        </div>
        <p class="descricao md-typescale-body-large">{{ $chamado['descricao'] }}</p>
    </article>

    <section class="conversa" aria-label="Conversa">
        @forelse ($chamado['comentarios'] as $comentario)
            <div class="mensagem {{ $comentario['autor']['id'] === $euId ? 'minha' : '' }}">
                <strong class="md-typescale-title-small">{{ $comentario['autor']['nome'] }}</strong>
                <span class="md-typescale-body-small sutil"> · {{ $fmt($comentario['criadoEm']) }}</span>
                <p class="md-typescale-body-medium">{{ $comentario['texto'] }}</p>
            </div>
        @empty
            <p class="sutil md-typescale-body-medium">Ainda não há respostas. Avisaremos por aqui.</p>
        @endforelse
    </section>

    @if ($chamado['status'] !== 'Fechado')
        <form method="POST" action="{{ route('chamados.comentar', $chamado['id']) }}" class="cartao">
            @csrf
            <md-outlined-text-field class="campo" type="textarea" rows="4" name="texto" label="Sua resposta" required
                value="{{ old('texto') }}"
                @error('texto') error error-text="{{ $message }}" @enderror></md-outlined-text-field>
            <div class="acoes">
                <md-filled-button type="submit"><md-icon slot="icon">send</md-icon>Enviar resposta</md-filled-button>
            </div>
        </form>
    @else
        <p class="sutil md-typescale-body-medium">Este chamado foi fechado. Se precisar, abra um novo chamado.</p>
    @endif
@endsection
