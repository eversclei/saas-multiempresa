<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Testa o portal com a API .NET simulada (Http::fake). */
class PortalTest extends TestCase
{
    private const API = 'http://api.teste';

    private const ID = '3f2b9d1e-8c4a-4e6b-9a7d-1c2e3f4a5b6c';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.saas_api.url' => self::API]);
    }

    private function sessaoDeCliente(): array
    {
        return [
            'api' => [
                'token' => 'jwt-de-teste',
                'usuario' => ['id' => 'u1', 'nome' => 'Carlos Cliente', 'email' => 'cliente@acme.com', 'papel' => 'Cliente'],
                'tenant' => ['nome' => 'Acme Tecnologia', 'slug' => 'acme'],
            ],
        ];
    }

    private function respostaLogin(string $papel): array
    {
        return [
            'token' => 'jwt-novo',
            'expiraEm' => now()->addHour()->toIso8601String(),
            'usuario' => ['id' => 'u1', 'nome' => 'Carlos Cliente', 'email' => 'cliente@acme.com', 'papel' => $papel],
            'tenant' => ['nome' => 'Acme Tecnologia', 'slug' => 'acme'],
        ];
    }

    public function test_visitante_sem_sessao_vai_para_o_login(): void
    {
        $this->get('/chamados')->assertRedirect('/login');
    }

    public function test_cliente_entra_e_o_token_fica_na_sessao(): void
    {
        Http::fake([self::API.'/api/auth/login' => Http::response($this->respostaLogin('Cliente'))]);

        $this->post('/login', ['tenant' => 'acme', 'email' => 'cliente@acme.com', 'senha' => 'Senha@123'])
            ->assertRedirect('/chamados')
            ->assertSessionHas('api.token', 'jwt-novo');
    }

    public function test_credenciais_invalidas_mostram_erro(): void
    {
        Http::fake([self::API.'/api/auth/login' => Http::response(['title' => 'Credenciais inválidas.'], 401)]);

        $this->from('/login')
            ->post('/login', ['tenant' => 'acme', 'email' => 'cliente@acme.com', 'senha' => 'errada'])
            ->assertRedirect('/login')
            ->assertSessionHasErrors('email')
            ->assertSessionMissing('api.token');
    }

    public function test_equipe_nao_entra_no_portal_do_cliente(): void
    {
        Http::fake([self::API.'/api/auth/login' => Http::response($this->respostaLogin('Agente'))]);

        $this->from('/login')
            ->post('/login', ['tenant' => 'acme', 'email' => 'ana@acme.com', 'senha' => 'Senha@123'])
            ->assertSessionHasErrors('email')
            ->assertSessionMissing('api.token');
    }

    public function test_lista_os_chamados_do_cliente_enviando_o_token(): void
    {
        Http::fake([self::API.'/api/chamados*' => Http::response([
            'itens' => [[
                'id' => self::ID, 'titulo' => 'Erro ao emitir nota fiscal', 'status' => 'Aberto', 'prioridade' => 'Critica',
                'cliente' => ['id' => 'u1', 'nome' => 'Carlos Cliente'], 'responsavel' => null,
                'criadoEm' => '2026-11-20T12:00:00Z', 'atualizadoEm' => '2026-11-20T12:00:00Z',
            ]],
            'total' => 1, 'pagina' => 1, 'tamanho' => 10,
        ])]);

        $this->withSession($this->sessaoDeCliente())
            ->get('/chamados')
            ->assertOk()
            ->assertSee('Erro ao emitir nota fiscal')
            ->assertSee('Aguardando atendente');

        Http::assertSent(fn (Request $r) => $r->hasHeader('Authorization', 'Bearer jwt-de-teste'));
    }

    public function test_abrir_chamado_valida_os_campos_antes_de_chamar_a_api(): void
    {
        Http::fake();

        $this->withSession($this->sessaoDeCliente())
            ->post('/chamados', ['titulo' => 'Oi', 'descricao' => '', 'prioridade' => 'Urgentissima'])
            ->assertSessionHasErrors(['titulo', 'descricao', 'prioridade']);

        Http::assertNothingSent();
    }

    public function test_abrir_chamado_redireciona_para_o_detalhe(): void
    {
        Http::fake([self::API.'/api/chamados' => Http::response(['id' => self::ID], 201)]);

        $this->withSession($this->sessaoDeCliente())
            ->post('/chamados', ['titulo' => 'Impressora sem comunicação', 'descricao' => 'Parou após a atualização.', 'prioridade' => 'Alta'])
            ->assertRedirect('/chamados/'.self::ID)
            ->assertSessionHas('sucesso');
    }

    public function test_token_expirado_derruba_a_sessao(): void
    {
        Http::fake([self::API.'/api/chamados*' => Http::response(null, 401)]);

        $this->withSession($this->sessaoDeCliente())
            ->get('/chamados')
            ->assertRedirect('/login')
            ->assertSessionMissing('api.token');
    }

    public function test_regra_de_negocio_da_api_volta_como_mensagem(): void
    {
        Http::fake([self::API.'/api/chamados/'.self::ID.'/comentarios' => Http::response(
            ['detail' => 'Chamado fechado não aceita comentários.'], 409,
        )]);

        $this->withSession($this->sessaoDeCliente())
            ->from('/chamados/'.self::ID)
            ->post('/chamados/'.self::ID.'/comentarios', ['texto' => 'Alguma novidade?'])
            ->assertSessionHasErrors(['geral' => 'Chamado fechado não aceita comentários.']);
    }
}
