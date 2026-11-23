<?php

use App\Exceptions\SessaoExpiradaException;
use App\Http\Middleware\AutenticadoNaApi;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias(['api.auth' => AutenticadoNaApi::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Token recusado pela API: limpa a sessão e pede login de novo.
        $exceptions->render(function (SessaoExpiradaException $e, Request $request) {
            $request->session()->forget(['api.token', 'api.usuario', 'api.tenant']);

            return redirect()->route('login')->withErrors(['email' => 'Sua sessão expirou. Entre novamente.']);
        });
    })->create();
