using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Saas.Api.Domain;
using Saas.Api.Infra;

namespace Saas.Api.Features;

public static class Politicas
{
    public const string Equipe = "Equipe";
    public const string Admin = "Admin";
}

public sealed record NovoUsuarioRequest(string Nome, string Email, string Senha, Papel Papel);

public sealed record DashboardDto(
    int Total,
    int SemResponsavel,
    int CriadosUltimos7Dias,
    IReadOnlyDictionary<string, int> PorStatus,
    IReadOnlyDictionary<string, int> PorPrioridade);

public static class UsuariosEndpoints
{
    public static void MapUsuarios(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/usuarios").WithTags("Usuários");

        grupo.MapGet("/", async (AppDbContext db, Papel? papel) =>
        {
            var query = db.Usuarios.AsNoTracking().Where(u => u.Ativo);
            if (papel is not null) query = query.Where(u => u.Papel == papel);
            var itens = await query.OrderBy(u => u.Nome)
                .Select(u => new UsuarioDto(u.Id, u.Nome, u.Email, u.Papel))
                .ToListAsync();
            return Results.Ok(itens);
        }).RequireAuthorization(Politicas.Equipe);

        grupo.MapPost("/", async (NovoUsuarioRequest req, AppDbContext db, IPasswordHasher<Usuario> hasher) =>
        {
            var email = req.Email?.Trim().ToLowerInvariant() ?? "";
            var erros = new Dictionary<string, string[]>();
            if (string.IsNullOrWhiteSpace(req.Nome)) erros["nome"] = ["O nome é obrigatório."];
            if (!email.Contains('@')) erros["email"] = ["Informe um e-mail válido."];
            if (req.Senha is null || req.Senha.Length < 8) erros["senha"] = ["A senha deve ter ao menos 8 caracteres."];
            if (await db.Usuarios.AnyAsync(u => u.Email == email)) erros["email"] = ["Já existe um usuário com este e-mail."];
            if (erros.Count > 0) return Results.ValidationProblem(erros);

            var usuario = new Usuario { Nome = req.Nome.Trim(), Email = email, Papel = req.Papel };
            usuario.SenhaHash = hasher.HashPassword(usuario, req.Senha!);
            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync();

            return Results.Created($"/api/usuarios/{usuario.Id}", new UsuarioDto(usuario.Id, usuario.Nome, usuario.Email, usuario.Papel));
        }).RequireAuthorization(Politicas.Admin);
    }
}

public static class DashboardEndpoints
{
    public static void MapDashboard(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/dashboard", async (AppDbContext db) =>
        {
            var chamados = db.Chamados.AsNoTracking();
            var desde = DateTime.UtcNow.AddDays(-7);

            var porStatus = await chamados.GroupBy(c => c.Status)
                .Select(g => new { g.Key, Qtd = g.Count() }).ToListAsync();
            var porPrioridade = await chamados.GroupBy(c => c.Prioridade)
                .Select(g => new { g.Key, Qtd = g.Count() }).ToListAsync();

            return Results.Ok(new DashboardDto(
                Total: await chamados.CountAsync(),
                SemResponsavel: await chamados.CountAsync(c => c.ResponsavelId == null && c.Status != StatusChamado.Fechado),
                CriadosUltimos7Dias: await chamados.CountAsync(c => c.CriadoEm >= desde),
                PorStatus: Enum.GetValues<StatusChamado>().ToDictionary(s => s.ToString(), s => porStatus.FirstOrDefault(x => x.Key == s)?.Qtd ?? 0),
                PorPrioridade: Enum.GetValues<Prioridade>().ToDictionary(p => p.ToString(), p => porPrioridade.FirstOrDefault(x => x.Key == p)?.Qtd ?? 0)));
        }).WithTags("Dashboard").RequireAuthorization(Politicas.Equipe);
    }
}
