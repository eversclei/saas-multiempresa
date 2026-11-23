<?php

namespace App\Http\Controllers;

use App\Services\SaasApi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

final class AuthController extends Controller
{
    public function formulario(): View|RedirectResponse
    {
        return session()->has('api.token')
            ? redirect()->route('chamados.index')
            : view('auth.login');
    }

    public function entrar(Request $request, SaasApi $api): RedirectResponse
    {
        $dados = $request->validate([
            'tenant' => ['required', 'string', 'max:60'],
            'email' => ['required', 'email'],
            'senha' => ['required', 'string'],
        ], [], ['tenant' => 'empresa']);

        $sessao = $api->login($dados['tenant'], $dados['email'], $dados['senha']);

        if ($sessao === null) {
            return back()->withInput($request->only('tenant', 'email'))
                ->withErrors(['email' => 'E-mail, senha ou empresa inválidos.']);
        }

        if ($sessao['usuario']['papel'] !== 'Cliente') {
            return back()->withInput($request->only('tenant', 'email'))
                ->withErrors(['email' => 'Este portal é para clientes. A equipe usa o painel de atendimento.']);
        }

        $request->session()->regenerate();
        $request->session()->put([
            'api.token' => $sessao['token'],
            'api.usuario' => $sessao['usuario'],
            'api.tenant' => $sessao['tenant'],
        ]);

        return redirect()->route('chamados.index');
    }

    public function sair(Request $request): RedirectResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
