using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using Saas.Api.Domain;
using Saas.Api.Infra;

namespace Saas.Api.Features;

public sealed class JwtOptions
{
    public string Emissor { get; set; } = "saas-multiempresa";
    public string Publico { get; set; } = "saas-multiempresa";
    public string Chave { get; set; } = "";
    public int ExpiracaoMinutos { get; set; } = 480;

    public SymmetricSecurityKey ChaveDeAssinatura() => new(Encoding.UTF8.GetBytes(Chave));
}

public sealed record LoginRequest(string Tenant, string Email, string Senha);
public sealed record UsuarioDto(Guid Id, string Nome, string Email, Papel Papel);
public sealed record TenantDto(string Nome, string Slug);
public sealed record LoginResponse(string Token, DateTime ExpiraEm, UsuarioDto Usuario, TenantDto Tenant);

public static class AuthEndpoints
{
    public static void MapAuth(this IEndpointRouteBuilder app)
    {
        var grupo = app.MapGroup("/api/auth").WithTags("Autenticação");

        grupo.MapPost("/login", Login).AllowAnonymous();
        grupo.MapGet("/me", Me).RequireAuthorization();
    }

    private static async Task<IResult> Login(LoginRequest req, AppDbContext db, IPasswordHasher<Usuario> hasher, JwtOptions jwt)
    {
        var slug = req.Tenant.Trim().ToLowerInvariant();
        var email = req.Email.Trim().ToLowerInvariant();

        var tenant = await db.Tenants.SingleOrDefaultAsync(t => t.Slug == slug);
        // Login acontece antes de existir tenant no contexto, então o filtro global é ignorado aqui de forma explícita.
        var usuario = tenant is null
            ? null
            : await db.Usuarios.IgnoreQueryFilters()
                .SingleOrDefaultAsync(u => u.TenantId == tenant.Id && u.Email == email && u.Ativo);

        // Mesma resposta para tenant, e-mail ou senha errados: não revela o que existe.
        if (tenant is null || usuario is null ||
            hasher.VerifyHashedPassword(usuario, usuario.SenhaHash, req.Senha) == PasswordVerificationResult.Failed)
        {
            return Results.Problem("Credenciais inválidas.", statusCode: StatusCodes.Status401Unauthorized);
        }

        var expiraEm = DateTime.UtcNow.AddMinutes(jwt.ExpiracaoMinutos);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = jwt.Emissor,
            Audience = jwt.Publico,
            Expires = expiraEm,
            SigningCredentials = new SigningCredentials(jwt.ChaveDeAssinatura(), SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimsSaas.Sub, usuario.Id.ToString()),
                new Claim(ClaimsSaas.Tenant, tenant.Id.ToString()),
                new Claim(ClaimsSaas.Papel, usuario.Papel.ToString()),
                new Claim(ClaimsSaas.Nome, usuario.Nome)
            ])
        });

        return Results.Ok(new LoginResponse(
            token,
            expiraEm,
            new UsuarioDto(usuario.Id, usuario.Nome, usuario.Email, usuario.Papel),
            new TenantDto(tenant.Nome, tenant.Slug)));
    }

    private static async Task<IResult> Me(AppDbContext db, IUsuarioAtual atual)
    {
        var usuario = await db.Usuarios.SingleOrDefaultAsync(u => u.Id == atual.UsuarioId);
        return usuario is null
            ? Results.Unauthorized()
            : Results.Ok(new UsuarioDto(usuario.Id, usuario.Nome, usuario.Email, usuario.Papel));
    }
}
