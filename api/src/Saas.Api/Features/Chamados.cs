using Microsoft.EntityFrameworkCore;
using Saas.Api.Domain;
using Saas.Api.Infra;

namespace Saas.Api.Features;

public sealed record PessoaDto(Guid Id, string Nome);

public sealed record ChamadoResumoDto(
    Guid Id, string Titulo, StatusChamado Status, Prioridade Prioridade,
    PessoaDto Cliente, PessoaDto? Responsavel, DateTime CriadoEm, DateTime AtualizadoEm);

public sealed record ComentarioDto(Guid Id, PessoaDto Autor, string Texto, bool Interno, DateTime CriadoEm);

public sealed record ChamadoDetalheDto(
    Guid Id, string Titulo, string Descricao, StatusChamado Status, Prioridade Prioridade,
    PessoaDto Cliente, PessoaDto? Responsavel, DateTime CriadoEm, DateTime AtualizadoEm,
    IReadOnlyList<StatusChamado> ProximosStatus, IReadOnlyList<ComentarioDto> Comentarios);

public sealed record PaginaDto<T>(IReadOnlyList<T> Itens, int Total, int Pagina, int Tamanho);

public sealed record NovoChamadoRequest(string Titulo, string Descricao, Prioridade Prioridade, Guid? ClienteId);
public sealed record AlterarStatusRequest(StatusChamado Status);
public sealed record AtribuirRequest(Guid ResponsavelId);
public sealed record NovoComentarioRequest(string Texto, bool Interno);

public static class ChamadosEndpoints
{
    public static void MapChamados(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/chamados").WithTags("Chamados").RequireAuthorization();

        grupo.MapGet("/", Listar);
        grupo.MapGet("/{id:guid}", Obter);
        grupo.MapPost("/", Criar);
        grupo.MapPatch("/{id:guid}/status", AlterarStatus).RequireAuthorization(Politicas.Equipe);
        grupo.MapPatch("/{id:guid}/responsavel", Atribuir).RequireAuthorization(Politicas.Equipe);
        grupo.MapPost("/{id:guid}/comentarios", Comentar);
    }

    /// <summary>Cliente só enxerga os próprios chamados; a equipe enxerga todos do tenant.</summary>
    private static IQueryable<Chamado> Visiveis(AppDbContext db, IUsuarioAtual atual) =>
        atual.Papel == Papel.Cliente
            ? db.Chamados.Where(c => c.ClienteId == atual.UsuarioId)
            : db.Chamados;

    private static async Task<IResult> Listar(
        AppDbContext db, IUsuarioAtual atual,
        StatusChamado? status, Prioridade? prioridade, string? busca, int pagina = 1, int tamanho = 20)
    {
        pagina = Math.Max(1, pagina);
        tamanho = Math.Clamp(tamanho, 1, 100);

        var query = Visiveis(db, atual).AsNoTracking();
        if (status is not null) query = query.Where(c => c.Status == status);
        if (prioridade is not null) query = query.Where(c => c.Prioridade == prioridade);
        if (!string.IsNullOrWhiteSpace(busca)) query = query.Where(c => c.Titulo.ToLower().Contains(busca.ToLower()));

        var total = await query.CountAsync();
        var itens = await query
            .OrderByDescending(c => c.CriadoEm)
            .Skip((pagina - 1) * tamanho)
            .Take(tamanho)
            .Select(c => new ChamadoResumoDto(
                c.Id, c.Titulo, c.Status, c.Prioridade,
                new PessoaDto(c.Cliente!.Id, c.Cliente.Nome),
                c.Responsavel == null ? null : new PessoaDto(c.Responsavel.Id, c.Responsavel.Nome),
                c.CriadoEm, c.AtualizadoEm))
            .ToListAsync();

        return Results.Ok(new PaginaDto<ChamadoResumoDto>(itens, total, pagina, tamanho));
    }

    private static async Task<IResult> Obter(Guid id, AppDbContext db, IUsuarioAtual atual)
    {
        var chamado = await Visiveis(db, atual).AsNoTracking()
            .Include(c => c.Cliente)
            .Include(c => c.Responsavel)
            .Include(c => c.Comentarios).ThenInclude(m => m.Autor)
            .SingleOrDefaultAsync(c => c.Id == id);

        return chamado is null ? Results.NotFound() : Results.Ok(ParaDetalhe(chamado, atual));
    }

    private static async Task<IResult> Criar(NovoChamadoRequest req, AppDbContext db, IUsuarioAtual atual)
    {
        var erros = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(req.Titulo) || req.Titulo.Trim().Length is < 5 or > 150)
            erros["titulo"] = ["O título deve ter entre 5 e 150 caracteres."];
        if (string.IsNullOrWhiteSpace(req.Descricao))
            erros["descricao"] = ["A descrição é obrigatória."];

        // Cliente abre chamado para si mesmo; a equipe abre em nome de um cliente do tenant.
        var clienteId = atual.Papel == Papel.Cliente ? atual.UsuarioId : req.ClienteId;
        var clienteValido = clienteId is not null &&
            await db.Usuarios.AnyAsync(u => u.Id == clienteId && u.Papel == Papel.Cliente && u.Ativo);
        if (!clienteValido)
            erros["clienteId"] = ["Informe um cliente válido desta empresa."];

        if (erros.Count > 0) return Results.ValidationProblem(erros);

        var chamado = new Chamado
        {
            Titulo = req.Titulo.Trim(),
            Descricao = req.Descricao.Trim(),
            Prioridade = req.Prioridade == 0 ? Prioridade.Media : req.Prioridade,
            ClienteId = clienteId!.Value
        };
        db.Chamados.Add(chamado);
        await db.SaveChangesAsync();

        return Results.Created($"/api/chamados/{chamado.Id}", new { chamado.Id });
    }

    private static async Task<IResult> AlterarStatus(Guid id, AlterarStatusRequest req, AppDbContext db)
    {
        var chamado = await db.Chamados.SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null) return Results.NotFound();

        chamado.AlterarStatus(req.Status);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> Atribuir(Guid id, AtribuirRequest req, AppDbContext db)
    {
        var chamado = await db.Chamados.SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null) return Results.NotFound();

        var responsavel = await db.Usuarios.SingleOrDefaultAsync(u => u.Id == req.ResponsavelId && u.Ativo);
        if (responsavel is null)
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["responsavelId"] = ["Responsável não encontrado."] });

        chamado.AtribuirResponsavel(responsavel);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<IResult> Comentar(Guid id, NovoComentarioRequest req, AppDbContext db, IUsuarioAtual atual)
    {
        if (string.IsNullOrWhiteSpace(req.Texto))
            return Results.ValidationProblem(new Dictionary<string, string[]> { ["texto"] = ["O comentário não pode ser vazio."] });

        var chamado = await Visiveis(db, atual).SingleOrDefaultAsync(c => c.Id == id);
        if (chamado is null) return Results.NotFound();

        var autor = await db.Usuarios.SingleAsync(u => u.Id == atual.UsuarioId);
        var comentario = chamado.Comentar(autor, req.Texto.Trim(), req.Interno);
        db.Comentarios.Add(comentario);
        await db.SaveChangesAsync();

        return Results.Created($"/api/chamados/{id}", new { comentario.Id });
    }

    private static ChamadoDetalheDto ParaDetalhe(Chamado c, IUsuarioAtual atual)
    {
        var podeVerInterno = atual.Papel != Papel.Cliente;
        var comentarios = c.Comentarios
            .Where(m => podeVerInterno || !m.Interno)
            .OrderBy(m => m.CriadoEm)
            .Select(m => new ComentarioDto(m.Id, new PessoaDto(m.AutorId, m.Autor?.Nome ?? ""), m.Texto, m.Interno, m.CriadoEm))
            .ToList();

        var proximos = Enum.GetValues<StatusChamado>().Where(c.PodeIrPara).ToList();

        return new ChamadoDetalheDto(
            c.Id, c.Titulo, c.Descricao, c.Status, c.Prioridade,
            new PessoaDto(c.ClienteId, c.Cliente?.Nome ?? ""),
            c.Responsavel is null ? null : new PessoaDto(c.Responsavel.Id, c.Responsavel.Nome),
            c.CriadoEm, c.AtualizadoEm,
            podeVerInterno ? proximos : [],
            comentarios);
    }
}
