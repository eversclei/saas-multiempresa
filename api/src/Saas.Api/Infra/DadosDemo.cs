using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Saas.Api.Domain;

namespace Saas.Api.Infra;

/// <summary>Cria duas empresas de demonstração para mostrar o isolamento entre tenants.</summary>
public static class DadosDemo
{
    public const string SenhaPadrao = "Senha@123";

    public static async Task CriarSeVazioAsync(AppDbContext db, IPasswordHasher<Usuario> hasher)
    {
        if (await db.Tenants.AnyAsync())
        {
            return;
        }

        var acme = new Tenant { Nome = "Acme Tecnologia", Slug = "acme" };
        var globex = new Tenant { Nome = "Globex Serviços", Slug = "globex" };
        db.Tenants.AddRange(acme, globex);

        Usuario NovoUsuario(Tenant t, string nome, string email, Papel papel)
        {
            var u = new Usuario { TenantId = t.Id, Nome = nome, Email = email, Papel = papel };
            u.SenhaHash = hasher.HashPassword(u, SenhaPadrao);
            return u;
        }

        var acmeAdmin = NovoUsuario(acme, "Marina Admin", "admin@acme.com", Papel.Admin);
        var acmeAgente = NovoUsuario(acme, "Ana Suporte", "ana@acme.com", Papel.Agente);
        var acmeCliente = NovoUsuario(acme, "Carlos Cliente", "cliente@acme.com", Papel.Cliente);
        var acmeCliente2 = NovoUsuario(acme, "Beatriz Lima", "beatriz@acme.com", Papel.Cliente);
        var globexAdmin = NovoUsuario(globex, "Gustavo Admin", "admin@globex.com", Papel.Admin);
        var globexCliente = NovoUsuario(globex, "Paula Cliente", "cliente@globex.com", Papel.Cliente);
        db.Usuarios.AddRange(acmeAdmin, acmeAgente, acmeCliente, acmeCliente2, globexAdmin, globexCliente);

        Chamado NovoChamado(Tenant t, Usuario cliente, string titulo, string descricao, Prioridade prioridade, int diasAtras) =>
            new()
            {
                TenantId = t.Id,
                ClienteId = cliente.Id,
                Titulo = titulo,
                Descricao = descricao,
                Prioridade = prioridade,
                CriadoEm = DateTime.UtcNow.AddDays(-diasAtras),
                AtualizadoEm = DateTime.UtcNow.AddDays(-diasAtras)
            };

        var c1 = NovoChamado(acme, acmeCliente, "Erro ao emitir nota fiscal", "Ao finalizar a venda, o sistema retorna erro 500 na emissão da NF-e.", Prioridade.Critica, 1);
        var c2 = NovoChamado(acme, acmeCliente, "Relatório de vendas lento", "O relatório mensal demora mais de 2 minutos para carregar.", Prioridade.Alta, 3);
        var c3 = NovoChamado(acme, acmeCliente2, "Dúvida sobre permissões", "Como dar acesso só de leitura para o financeiro?", Prioridade.Baixa, 5);
        var c4 = NovoChamado(acme, acmeCliente2, "Integração com gateway de pagamento", "Pagamentos via Pix não estão atualizando o pedido.", Prioridade.Alta, 0);
        c2.AtribuirResponsavel(acmeAgente);
        c3.AtribuirResponsavel(acmeAgente);
        c3.AlterarStatus(StatusChamado.AguardandoCliente);

        var g1 = NovoChamado(globex, globexCliente, "Acesso bloqueado", "Usuário bloqueado após troca de senha.", Prioridade.Media, 2);

        var nota = c3.Comentar(acmeAgente, "Olá Beatriz! Você pode criar um perfil com permissão só de leitura em Configurações > Perfis. Quer que eu faça para você?", interno: false);
        nota.TenantId = acme.Id;

        db.Chamados.AddRange(c1, c2, c3, c4, g1);
        await db.SaveChangesAsync();
    }
}
