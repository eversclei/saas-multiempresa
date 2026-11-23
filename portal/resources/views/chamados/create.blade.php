@extends('layouts.app')

@section('titulo', 'Abrir chamado')

@section('conteudo')
    <md-text-button href="{{ route('chamados.index') }}"><md-icon slot="icon">arrow_back</md-icon>Meus chamados</md-text-button>

    <form method="POST" action="{{ route('chamados.store') }}" class="cartao" style="margin-top: 8px">
        @csrf
        <h1 class="md-typescale-headline-small" style="margin-top: 0">Abrir chamado</h1>

        <md-outlined-text-field class="campo" label="Título" name="titulo" required minlength="5" maxlength="150"
            supporting-text="Resuma o problema em uma frase"
            value="{{ old('titulo') }}"
            @error('titulo') error error-text="{{ $message }}" @enderror></md-outlined-text-field>

        <md-outlined-select class="campo" label="Prioridade" name="prioridade" required
            @error('prioridade') error error-text="{{ $message }}" @enderror>
            @foreach (\App\Http\Controllers\ChamadoController::PRIORIDADES as $valor => $rotulo)
                <md-select-option value="{{ $valor }}" @selected(old('prioridade', 'Media') === $valor)>
                    <div slot="headline">{{ $rotulo }}</div>
                </md-select-option>
            @endforeach
        </md-outlined-select>

        <md-outlined-text-field class="campo" type="textarea" rows="6" label="Descrição" name="descricao" required
            supporting-text="O que aconteceu, quando e qual mensagem apareceu"
            value="{{ old('descricao') }}"
            @error('descricao') error error-text="{{ $message }}" @enderror></md-outlined-text-field>

        <div class="acoes">
            <md-text-button href="{{ route('chamados.index') }}">Cancelar</md-text-button>
            <md-filled-button type="submit">Abrir chamado</md-filled-button>
        </div>
    </form>
@endsection
