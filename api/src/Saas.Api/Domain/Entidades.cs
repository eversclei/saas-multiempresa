namespace Saas.Api.Domain;

/// <summary>Marca entidades isoladas por empresa (tenant). O filtro global do EF garante o isolamento.</summary>
public interface IPertenceAoTenant
{
    Guid TenantId { get; set; }
}

public sealed class Tenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public required string Nome { get; set; }
    public required string Slug { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}

public enum Papel
{
    Admin = 1,
    Agente = 2,
    Cliente = 3
}

public sealed class Usuario : IPertenceAoTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Nome { get; set; }
    public required string Email { get; set; }
    public string SenhaHash { get; set; } = "";
    public Papel Papel { get; set; }
    public bool Ativo { get; set; } = true;

    public bool EhEquipe => Papel is Papel.Admin or Papel.Agente;
}

public enum StatusChamado
{
    Aberto = 1,
    EmAndamento = 2,
    AguardandoCliente = 3,
    Resolvido = 4,
    Fechado = 5
}

public enum Prioridade
{
    Baixa = 1,
    Media = 2,
    Alta = 3,
    Critica = 4
}

public sealed class Chamado : IPertenceAoTenant
{
    // Transições permitidas. "Fechado" é estado final: depois dele, só abrindo um novo chamado.
    private static readonly Dictionary<StatusChamado, StatusChamado[]> Transicoes = new()
    {
        [StatusChamado.Aberto] = [StatusChamado.EmAndamento, StatusChamado.Fechado],
        [StatusChamado.EmAndamento] = [StatusChamado.AguardandoCliente, StatusChamado.Resolvido],
        [StatusChamado.AguardandoCliente] = [StatusChamado.EmAndamento, StatusChamado.Resolvido],
        [StatusChamado.Resolvido] = [StatusChamado.Fechado, StatusChamado.EmAndamento],
        [StatusChamado.Fechado] = []
    };

    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public required string Titulo { get; set; }
    public required string Descricao { get; set; }
    public StatusChamado Status { get; private set; } = StatusChamado.Aberto;
    public Prioridade Prioridade { get; set; } = Prioridade.Media;
    public Guid ClienteId { get; set; }
    public Usuario? Cliente { get; set; }
    public Guid? ResponsavelId { get; set; }
    public Usuario? Responsavel { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
    public DateTime AtualizadoEm { get; set; } = DateTime.UtcNow;
    public List<Comentario> Comentarios { get; set; } = [];

    public bool PodeIrPara(StatusChamado novo) => Transicoes[Status].Contains(novo);

    public void AlterarStatus(StatusChamado novo)
    {
        if (!PodeIrPara(novo))
        {
            throw new RegraDeNegocioException($"Não é possível mudar o chamado de {Status} para {novo}.");
        }

        Status = novo;
        AtualizadoEm = DateTime.UtcNow;
    }

    public void AtribuirResponsavel(Usuario responsavel)
    {
        if (!responsavel.EhEquipe)
        {
            throw new RegraDeNegocioException("O responsável precisa ser da equipe (Admin ou Agente).");
        }

        ResponsavelId = responsavel.Id;
        if (Status == StatusChamado.Aberto)
        {
            Status = StatusChamado.EmAndamento;
        }

        AtualizadoEm = DateTime.UtcNow;
    }

    public Comentario Comentar(Usuario autor, string texto, bool interno)
    {
        if (Status == StatusChamado.Fechado)
        {
            throw new RegraDeNegocioException("Chamado fechado não aceita comentários.");
        }

        var comentario = new Comentario
        {
            ChamadoId = Id,
            AutorId = autor.Id,
            Texto = texto,
            // Cliente nunca escreve nota interna.
            Interno = interno && autor.EhEquipe
        };
        Comentarios.Add(comentario);

        // Resposta do cliente devolve o chamado para a fila da equipe.
        if (!autor.EhEquipe && Status == StatusChamado.AguardandoCliente)
        {
            Status = StatusChamado.EmAndamento;
        }

        AtualizadoEm = DateTime.UtcNow;
        return comentario;
    }
}

public sealed class Comentario : IPertenceAoTenant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public Guid ChamadoId { get; set; }
    public Guid AutorId { get; set; }
    public Usuario? Autor { get; set; }
    public required string Texto { get; set; }
    public bool Interno { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}

public sealed class RegraDeNegocioException(string mensagem) : Exception(mensagem);
