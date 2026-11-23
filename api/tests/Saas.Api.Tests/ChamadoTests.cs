using Saas.Api.Domain;

namespace Saas.Api.Tests;

/// <summary>Testes de unidade das regras do domínio, sem banco nem HTTP.</summary>
public sealed class ChamadoTests
{
    private static Chamado NovoChamado() => new() { Titulo = "Teste", Descricao = "Descrição" };
    private static Usuario Agente() => new() { Nome = "Ana", Email = "ana@x.com", Papel = Papel.Agente };
    private static Usuario Cliente() => new() { Nome = "Carlos", Email = "c@x.com", Papel = Papel.Cliente };

    [Theory]
    [InlineData(StatusChamado.Aberto, StatusChamado.Resolvido)]
    [InlineData(StatusChamado.Aberto, StatusChamado.AguardandoCliente)]
    public void Nao_permite_pular_etapas(StatusChamado de, StatusChamado para)
    {
        var chamado = NovoChamado();
        Assert.Equal(de, chamado.Status);

        Assert.Throws<RegraDeNegocioException>(() => chamado.AlterarStatus(para));
    }

    [Fact]
    public void Chamado_fechado_e_estado_final()
    {
        var chamado = NovoChamado();
        chamado.AlterarStatus(StatusChamado.Fechado);

        Assert.All(Enum.GetValues<StatusChamado>(), s => Assert.False(chamado.PodeIrPara(s)));
        Assert.Throws<RegraDeNegocioException>(() => chamado.Comentar(Agente(), "oi", interno: false));
    }

    [Fact]
    public void Atribuir_responsavel_coloca_chamado_em_andamento()
    {
        var chamado = NovoChamado();

        chamado.AtribuirResponsavel(Agente());

        Assert.Equal(StatusChamado.EmAndamento, chamado.Status);
    }

    [Fact]
    public void Cliente_nao_pode_ser_responsavel_nem_escrever_nota_interna()
    {
        var chamado = NovoChamado();

        Assert.Throws<RegraDeNegocioException>(() => chamado.AtribuirResponsavel(Cliente()));
        Assert.False(chamado.Comentar(Cliente(), "nota", interno: true).Interno);
    }
}
