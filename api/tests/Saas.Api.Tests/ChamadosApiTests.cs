using System.Net;
using System.Net.Http.Json;
using Saas.Api.Domain;
using Saas.Api.Features;

namespace Saas.Api.Tests;

public sealed class ChamadosApiTests
{
    private static async Task<PaginaDto<ChamadoResumoDto>> ListarAsync(HttpClient http, string query = "")
    {
        var pagina = await http.GetFromJsonAsync<PaginaDto<ChamadoResumoDto>>($"/api/chamados{query}", ApiFactory.Json);
        return pagina!;
    }

    [Fact]
    public async Task Login_com_senha_errada_retorna_401()
    {
        using var api = new ApiFactory();
        var http = api.CreateClient();

        var resposta = await http.PostAsJsonAsync("/api/auth/login", new LoginRequest("acme", "admin@acme.com", "errada"));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Sem_token_nao_acessa_chamados()
    {
        using var api = new ApiFactory();

        var resposta = await api.CreateClient().GetAsync("/api/chamados");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Empresa_nao_enxerga_chamados_de_outra_empresa()
    {
        using var api = new ApiFactory();
        var acme = await api.ClienteLogadoAsync("acme", "admin@acme.com");
        var globex = await api.ClienteLogadoAsync("globex", "admin@globex.com");

        var chamadosAcme = await ListarAsync(acme);
        var chamadoGlobex = (await ListarAsync(globex)).Itens.Single();

        Assert.Equal(4, chamadosAcme.Total);
        Assert.DoesNotContain(chamadosAcme.Itens, c => c.Id == chamadoGlobex.Id);
        Assert.Equal(HttpStatusCode.NotFound, (await acme.GetAsync($"/api/chamados/{chamadoGlobex.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await acme.PatchAsJsonAsync($"/api/chamados/{chamadoGlobex.Id}/status",
                new AlterarStatusRequest(StatusChamado.EmAndamento), ApiFactory.Json)).StatusCode);
    }

    [Fact]
    public async Task Cliente_ve_apenas_os_proprios_chamados()
    {
        using var api = new ApiFactory();
        var cliente = await api.ClienteLogadoAsync("acme", "cliente@acme.com");

        var pagina = await ListarAsync(cliente);

        Assert.Equal(2, pagina.Total);
        Assert.All(pagina.Itens, c => Assert.Equal("Carlos Cliente", c.Cliente.Nome));
    }

    [Fact]
    public async Task Cliente_nao_pode_alterar_status()
    {
        using var api = new ApiFactory();
        var cliente = await api.ClienteLogadoAsync("acme", "cliente@acme.com");
        var id = (await ListarAsync(cliente)).Itens.First().Id;

        var resposta = await cliente.PatchAsJsonAsync($"/api/chamados/{id}/status",
            new AlterarStatusRequest(StatusChamado.Resolvido), ApiFactory.Json);

        Assert.Equal(HttpStatusCode.Forbidden, resposta.StatusCode);
    }

    [Fact]
    public async Task Cliente_abre_chamado_sempre_em_nome_proprio()
    {
        using var api = new ApiFactory();
        var cliente = await api.ClienteLogadoAsync("acme", "cliente@acme.com");
        var outroCliente = Guid.NewGuid();

        var resposta = await cliente.PostAsJsonAsync("/api/chamados",
            new NovoChamadoRequest("Impressora fiscal sem comunicação", "A impressora parou após atualização.", Prioridade.Alta, outroCliente),
            ApiFactory.Json);

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var pagina = await ListarAsync(cliente);
        Assert.Equal(3, pagina.Total);
        Assert.Contains(pagina.Itens, c => c.Titulo == "Impressora fiscal sem comunicação" && c.Cliente.Nome == "Carlos Cliente");
    }

    [Fact]
    public async Task Transicao_invalida_de_status_retorna_409()
    {
        using var api = new ApiFactory();
        var agente = await api.ClienteLogadoAsync("acme", "ana@acme.com");
        var aberto = (await ListarAsync(agente, "?status=Aberto")).Itens.First();

        var resposta = await agente.PatchAsJsonAsync($"/api/chamados/{aberto.Id}/status",
            new AlterarStatusRequest(StatusChamado.Resolvido), ApiFactory.Json);

        Assert.Equal(HttpStatusCode.Conflict, resposta.StatusCode);
    }

    [Fact]
    public async Task Resposta_do_cliente_devolve_chamado_para_a_equipe_e_nota_interna_fica_oculta()
    {
        using var api = new ApiFactory();
        var agente = await api.ClienteLogadoAsync("acme", "ana@acme.com");
        var cliente = await api.ClienteLogadoAsync("acme", "beatriz@acme.com");
        var aguardando = (await ListarAsync(cliente, "?status=AguardandoCliente")).Itens.Single();

        await agente.PostAsJsonAsync($"/api/chamados/{aguardando.Id}/comentarios", new NovoComentarioRequest("Cliente VIP, priorizar.", true));
        await cliente.PostAsJsonAsync($"/api/chamados/{aguardando.Id}/comentarios", new NovoComentarioRequest("Sim, pode criar por favor.", false));

        var visaoCliente = await cliente.GetFromJsonAsync<ChamadoDetalheDto>($"/api/chamados/{aguardando.Id}", ApiFactory.Json);
        var visaoAgente = await agente.GetFromJsonAsync<ChamadoDetalheDto>($"/api/chamados/{aguardando.Id}", ApiFactory.Json);

        Assert.Equal(StatusChamado.EmAndamento, visaoCliente!.Status);
        Assert.DoesNotContain(visaoCliente.Comentarios, c => c.Interno);
        Assert.Contains(visaoAgente!.Comentarios, c => c.Interno);
    }

    [Fact]
    public async Task Dashboard_e_restrito_a_equipe()
    {
        using var api = new ApiFactory();
        var cliente = await api.ClienteLogadoAsync("acme", "cliente@acme.com");
        var admin = await api.ClienteLogadoAsync("acme", "admin@acme.com");

        Assert.Equal(HttpStatusCode.Forbidden, (await cliente.GetAsync("/api/dashboard")).StatusCode);
        var dashboard = await admin.GetFromJsonAsync<DashboardDto>("/api/dashboard", ApiFactory.Json);
        Assert.Equal(4, dashboard!.Total);
        Assert.Equal(2, dashboard.SemResponsavel);
    }
}
