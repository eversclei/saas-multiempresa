using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Saas.Api.Domain;
using Saas.Api.Features;
using Saas.Api.Infra;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Banco: PostgreSQL em produção; SQLite nos testes de integração.
var provedor = builder.Configuration["Database:Provider"] ?? "Postgres";
builder.Services.AddDbContext<AppDbContext>(options =>
{
    if (provedor == "Sqlite")
        options.UseSqlite(builder.Configuration.GetConnectionString("Sqlite"));
    else
        options.UseNpgsql(builder.Configuration.GetConnectionString("Postgres"));
});

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IUsuarioAtual, UsuarioAtualHttp>();
builder.Services.AddScoped<IPasswordHasher<Usuario>, PasswordHasher<Usuario>>();

// Autenticação JWT. As claims ficam com os nomes curtos (sub, role, tenant_id).
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>() ?? new JwtOptions();
if (jwt.Chave.Length < 32)
    throw new InvalidOperationException("Configure Jwt:Chave com pelo menos 32 caracteres.");
builder.Services.AddSingleton(jwt);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = jwt.Emissor,
            ValidAudience = jwt.Publico,
            IssuerSigningKey = jwt.ChaveDeAssinatura(),
            NameClaimType = ClaimsSaas.Nome,
            RoleClaimType = ClaimsSaas.Papel
        };
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(Politicas.Equipe, p => p.RequireRole(nameof(Papel.Admin), nameof(Papel.Agente)))
    .AddPolicy(Politicas.Admin, p => p.RequireRole(nameof(Papel.Admin)));

builder.Services.ConfigureHttpJsonOptions(o => o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var origensFront = builder.Configuration.GetSection("Cors:Origens").Get<string[]>() ?? ["http://localhost:4200"];
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.WithOrigins(origensFront).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();

// Regra de negócio violada vira 409 com ProblemDetails; o resto vira 500 sem vazar detalhes.
app.UseExceptionHandler(erro => erro.Run(async context =>
{
    var ex = context.Features.Get<IExceptionHandlerFeature>()?.Error;
    var (status, titulo) = ex is RegraDeNegocioException
        ? (StatusCodes.Status409Conflict, ex.Message)
        : (StatusCodes.Status500InternalServerError, "Erro inesperado.");
    await Results.Problem(titulo, statusCode: status).ExecuteAsync(context);
}));

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapOpenApi();
app.MapScalarApiReference(o => o.WithTitle("SaaS Multiempresa - API"));

app.MapAuth();
app.MapChamados();
app.MapUsuarios();
app.MapDashboard();
app.MapGet("/health", () => Results.Ok(new { status = "ok" })).ExcludeFromDescription();

await PrepararBancoAsync(app);
app.Run();

static async Task PrepararBancoAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (db.Database.IsSqlite())
        await db.Database.EnsureCreatedAsync();
    else
        await db.Database.MigrateAsync();

    if (app.Configuration.GetValue("Seed:DadosDemo", false))
        await DadosDemo.CriarSeVazioAsync(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<Usuario>>());
}

public partial class Program;
