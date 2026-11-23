<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Só deixa passar quem tem token da API na sessão. */
final class AutenticadoNaApi
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('api.token')) {
            return redirect()->route('login');
        }

        return $next($request);
    }
}
