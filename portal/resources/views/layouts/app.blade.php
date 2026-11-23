<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>@yield('titulo', 'Portal do Cliente') · Atendimento</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet">

    {{-- Material Web: componentes Material 3 oficiais do Google, carregados como módulos ES. --}}
    <script type="importmap">
        { "imports": { "@material/web/": "https://esm.run/@material/web/" } }
    </script>
    <script type="module">
        import '@material/web/all.js';
        import { styles as tipografia } from '@material/web/typography/md-typescale-styles.js';
        document.adoptedStyleSheets.push(tipografia.styleSheet);
    </script>

    <style>
        /* Tokens de cor Material 3 (paleta azul, a mesma do painel Angular). */
        :root {
            --md-sys-color-primary: #0061a4;
            --md-sys-color-on-primary: #ffffff;
            --md-sys-color-primary-container: #d1e4ff;
            --md-sys-color-on-primary-container: #001d36;
            --md-sys-color-secondary-container: #d7e3f7;
            --md-sys-color-on-secondary-container: #101c2b;
            --md-sys-color-tertiary-container: #f2daff;
            --md-sys-color-on-tertiary-container: #251431;
            --md-sys-color-error: #ba1a1a;
            --md-sys-color-error-container: #ffdad6;
            --md-sys-color-on-error-container: #410002;
            --md-sys-color-surface: #f8f9ff;
            --md-sys-color-surface-container-low: #f2f3fa;
            --md-sys-color-surface-container: #eceef4;
            --md-sys-color-surface-container-high: #e6e8ee;
            --md-sys-color-on-surface: #191c20;
            --md-sys-color-on-surface-variant: #43474e;
            --md-sys-color-outline: #73777f;
            --md-sys-color-outline-variant: #c3c7cf;
            --md-ref-typeface-brand: 'Roboto';
            --md-ref-typeface-plain: 'Roboto';
        }

        * { box-sizing: border-box; }
        body { margin: 0; font-family: Roboto, sans-serif; background: var(--md-sys-color-surface); color: var(--md-sys-color-on-surface); }
        a { color: inherit; }
        .barra { display: flex; align-items: center; gap: 12px; padding: 8px 16px; min-height: 64px;
            background: var(--md-sys-color-surface-container); }
        .barra .marca { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .barra .marca md-icon { color: var(--md-sys-color-primary); }
        .barra .espaco { flex: 1; }
        .barra .usuario { color: var(--md-sys-color-on-surface-variant); }
        main { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
        .cartao { background: var(--md-sys-color-surface-container-low); border: 1px solid var(--md-sys-color-outline-variant);
            border-radius: 16px; padding: 24px; }
        .aviso { display: flex; align-items: center; gap: 8px; padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; }
        .aviso.sucesso { background: #c8f2d0; color: #0b3d1a; }
        .aviso.erro { background: var(--md-sys-color-error-container); color: var(--md-sys-color-on-error-container); }
        .cabecalho { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
        .cabecalho h1 { margin: 0; }
        .campo { width: 100%; margin-bottom: 16px; }
        .acoes { display: flex; justify-content: flex-end; gap: 8px; }
        .sutil { color: var(--md-sys-color-on-surface-variant); }
        @media (max-width: 600px) { .barra .usuario { display: none; } }
    </style>
    @stack('estilos')
</head>
<body>
    @if (session('api.usuario'))
        <header class="barra">
            <a href="{{ route('chamados.index') }}" class="marca md-typescale-title-large">
                <md-icon>support_agent</md-icon> {{ session('api.tenant.nome') }}
            </a>
            <span class="espaco"></span>
            <span class="usuario md-typescale-body-medium">{{ session('api.usuario.nome') }}</span>
            <form method="POST" action="{{ route('sair') }}">
                @csrf
                <md-text-button type="submit"><md-icon slot="icon">logout</md-icon>Sair</md-text-button>
            </form>
        </header>
    @endif

    <main>
        @if (session('sucesso'))
            <div class="aviso sucesso" role="status"><md-icon>check_circle</md-icon>{{ session('sucesso') }}</div>
        @endif
        @error('geral')
            <div class="aviso erro" role="alert"><md-icon>error</md-icon>{{ $message }}</div>
        @enderror

        @yield('conteudo')
    </main>
</body>
</html>
