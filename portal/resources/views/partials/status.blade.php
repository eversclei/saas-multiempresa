@php
    $estilos = [
        'Aberto' => ['var(--md-sys-color-secondary-container)', 'var(--md-sys-color-on-secondary-container)', 'fiber_new'],
        'EmAndamento' => ['var(--md-sys-color-primary-container)', 'var(--md-sys-color-on-primary-container)', 'autorenew'],
        'AguardandoCliente' => ['var(--md-sys-color-tertiary-container)', 'var(--md-sys-color-on-tertiary-container)', 'hourglass_top'],
        'Resolvido' => ['#c8f2d0', '#0b3d1a', 'task_alt'],
        'Fechado' => ['var(--md-sys-color-surface-container-high)', 'var(--md-sys-color-on-surface)', 'lock'],
    ];
    [$fundo, $texto, $icone] = $estilos[$status] ?? $estilos['Fechado'];
@endphp
<span class="md-typescale-label-medium"
      style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px 2px 6px;border-radius:999px;white-space:nowrap;background:{{ $fundo }};color:{{ $texto }}">
    <md-icon style="--md-icon-size:16px">{{ $icone }}</md-icon>{{ \App\Http\Controllers\ChamadoController::STATUS[$status] ?? $status }}
</span>
