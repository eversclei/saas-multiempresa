<?php

namespace App\Http\Controllers;

use App\Services\SaasApi;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

final class ChamadoController extends Controller
{
    public const PRIORIDADES = ['Baixa' => 'Baixa', 'Media' => 'Média', 'Alta' => 'Alta', 'Critica' => 'Crítica'];

    public const STATUS = [
        'Aberto' => 'Aberto',
        'EmAndamento' => 'Em andamento',
        'AguardandoCliente' => 'Aguardando você',
        'Resolvido' => 'Resolvido',
        'Fechado' => 'Fechado',
    ];

    public function __construct(private readonly SaasApi $api)
    {
    }

    public function index(Request $request): View
    {
        $status = $request->query('status');
        $status = array_key_exists((string) $status, self::STATUS) ? $status : null;
        $pagina = max(1, (int) $request->query('pagina', 1));

        return view('chamados.index', [
            'resultado' => $this->api->chamados($status, $pagina),
            'statusAtual' => $status,
            'pagina' => $pagina,
        ]);
    }

    public function show(string $id): View
    {
        $chamado = $this->api->chamado($id) ?? abort(404);

        return view('chamados.show', ['chamado' => $chamado]);
    }

    public function create(): View
    {
        return view('chamados.create');
    }

    public function store(Request $request): RedirectResponse
    {
        $dados = $request->validate([
            'titulo' => ['required', 'string', 'min:5', 'max:150'],
            'descricao' => ['required', 'string', 'max:4000'],
            'prioridade' => ['required', Rule::in(array_keys(self::PRIORIDADES))],
        ]);

        $id = $this->api->abrirChamado($dados['titulo'], $dados['descricao'], $dados['prioridade']);

        return redirect()->route('chamados.show', $id)->with('sucesso', 'Chamado aberto! Nossa equipe já foi avisada.');
    }

    public function comentar(Request $request, string $id): RedirectResponse
    {
        $dados = $request->validate(['texto' => ['required', 'string', 'max:4000']]);

        $this->api->comentar($id, $dados['texto']);

        return redirect()->route('chamados.show', $id)->with('sucesso', 'Resposta enviada.');
    }
}
