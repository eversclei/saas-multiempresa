using System.Security.Claims;
using Saas.Api.Domain;

namespace Saas.Api.Infra;

public interface IUsuarioAtual
{
    Guid? TenantId { get; }
    Guid? UsuarioId { get; }
    Papel? Papel { get; }
}

public static class ClaimsSaas
{
    public const string Tenant = "tenant_id";
    public const string Sub = "sub";
    public const string Papel = "role";
    public const string Nome = "name";
}

/// <summary>Lê tenant, usuário e papel das claims do JWT da requisição atual.</summary>
public sealed class UsuarioAtualHttp(IHttpContextAccessor accessor) : IUsuarioAtual
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public Guid? TenantId => LerGuid(ClaimsSaas.Tenant);
    public Guid? UsuarioId => LerGuid(ClaimsSaas.Sub);

    public Papel? Papel =>
        Enum.TryParse<Papel>(Principal?.FindFirstValue(ClaimsSaas.Papel), out var papel) ? papel : null;

    private Guid? LerGuid(string tipo) =>
        Guid.TryParse(Principal?.FindFirstValue(tipo), out var id) ? id : null;
}
