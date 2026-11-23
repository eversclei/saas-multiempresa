@extends('layouts.app')

@section('titulo', 'Entrar')

@push('estilos')
    <style>
        main { min-height: 100vh; display: grid; place-items: center; }
        .login { width: min(420px, 100%); }
        .login header { display: flex; gap: 12px; align-items: center; margin-bottom: 24px; }
        .login header md-icon { --md-icon-size: 40px; color: var(--md-sys-color-primary); }
        .login h1, .login p { margin: 0; }
    </style>
@endpush

@section('conteudo')
    <div class="cartao login">
        <header>
            <md-icon>support_agent</md-icon>
            <div>
                <h1 class="md-typescale-title-large">Portal do Cliente</h1>
                <p class="md-typescale-body-medium sutil">Acompanhe seus chamados de suporte</p>
            </div>
        </header>

        <form method="POST" action="{{ route('login.entrar') }}">
            @csrf
            <md-outlined-text-field class="campo" label="Empresa" name="tenant" required
                value="{{ old('tenant', 'acme') }}"
                @error('tenant') error error-text="{{ $message }}" @enderror>
                <md-icon slot="leading-icon">domain</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field class="campo" label="E-mail" name="email" type="email" required autocomplete="username"
                value="{{ old('email') }}"
                @error('email') error error-text="{{ $message }}" @enderror>
                <md-icon slot="leading-icon">mail</md-icon>
            </md-outlined-text-field>

            <md-outlined-text-field class="campo" label="Senha" name="senha" type="password" required autocomplete="current-password"
                @error('senha') error error-text="{{ $message }}" @enderror>
                <md-icon slot="leading-icon">lock</md-icon>
            </md-outlined-text-field>

            <p class="md-typescale-body-small sutil">
                Demonstração: <strong>cliente@acme.com</strong> ou <strong>beatriz@acme.com</strong>, senha <strong>Senha@123</strong>.
            </p>

            <div class="acoes">
                <md-filled-button type="submit">Entrar</md-filled-button>
            </div>
        </form>
    </div>
@endsection
