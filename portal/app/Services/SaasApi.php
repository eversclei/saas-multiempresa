<?php

namespace App\Services;

use App\Exceptions\SessaoExpiradaException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

/**
 * Cliente HTTP da API .NET do SaaS. O token JWT do cliente fica na sessão do Laravel,
 * nunca no navegador.
 */
final class SaasApi
{
    public function __construct(private readonly string $baseUrl)
    {
    }

    /**
     * @return array{token: string, expiraEm: string, usuario: array, tenant: array}|null null quando as credenciais são inválidas
     */
    public function login(string $tenant, string $email, string $senha): ?array
    {
        $resposta = $this->http(autenticado: false)->post('/api/auth/login', [
            'tenant' => $tenant,
            'email' => $email,
            'senha' => $senha,
        ]);

        if ($resposta->status() === 401) {
            return null;
        }

        return $resposta->throw()->json();
    }

    /** @return array{itens: array, total: int, pagina: int, tamanho: int} */
    public function chamados(?string $status = null, int $pagina = 1): array
    {
        $query = array_filter(['status' => $status, 'pagina' => $pagina, 'tamanho' => 10]);

        return $this->verificar($this->http()->get('/api/chamados', $query))->json();
    }

    public function chamado(string $id): ?array
    {
        $resposta = $this->http()->get("/api/chamados/{$id}");
        if ($resposta->status() === 404) {
            return null;
        }

        return $this->verificar($resposta)->json();
    }

    /** @return string id do chamado criado */
    public function abrirChamado(string $titulo, string $descricao, string $prioridade): string
    {
        $resposta = $this->http()->post('/api/chamados', compact('titulo', 'descricao', 'prioridade'));

        return $this->verificar($resposta)->json('id');
    }

    public function comentar(string $chamadoId, string $texto): void
    {
        $this->verificar($this->http()->post("/api/chamados/{$chamadoId}/comentarios", [
            'texto' => $texto,
            'interno' => false,
        ]));
    }

    private function http(bool $autenticado = true): PendingRequest
    {
        $request = Http::baseUrl($this->baseUrl)->acceptJson()->timeout(10);

        return $autenticado ? $request->withToken((string) session('api.token')) : $request;
    }

    /** Converte as respostas de erro da API em exceções que o Laravel já sabe exibir. */
    private function verificar(Response $resposta): Response
    {
        if ($resposta->status() === 401) {
            throw new SessaoExpiradaException();
        }

        // ValidationProblem do ASP.NET: { errors: { campo: [mensagens] } }
        if ($resposta->status() === 400 && is_array($resposta->json('errors'))) {
            throw ValidationException::withMessages($resposta->json('errors'));
        }

        // Regra de negócio violada (409) volta para a tela com a mensagem da API.
        if ($resposta->status() === 409) {
            throw ValidationException::withMessages(['geral' => [$resposta->json('detail', 'Operação não permitida.')]]);
        }

        return $resposta->throw();
    }
}
