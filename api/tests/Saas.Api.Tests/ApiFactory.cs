using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Saas.Api.Features;

namespace Saas.Api.Tests;

/// <summary>Sobe a API inteira com SQLite em memória e os dados de demonstração.</summary>
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    // Mantém o banco em memória vivo enquanto a fábrica existir.
    private readonly string _banco = $"Data Source=saas-{Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private readonly SqliteConnection _conexaoViva;

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };

    public ApiFactory()
    {
        _conexaoViva = new SqliteConnection(_banco);
        _conexaoViva.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "Sqlite");
        builder.UseSetting("ConnectionStrings:Sqlite", _banco);
        builder.UseSetting("Jwt:Chave", "chave-de-teste-com-mais-de-32-caracteres!!");
        builder.UseSetting("Seed:DadosDemo", "true");
    }

    public async Task<HttpClient> ClienteLogadoAsync(string tenant, string email)
    {
        var http = CreateClient();
        var resposta = await http.PostAsJsonAsync("/api/auth/login", new LoginRequest(tenant, email, "Senha@123"));
        resposta.EnsureSuccessStatusCode();
        var login = await resposta.Content.ReadFromJsonAsync<LoginResponse>(Json);
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", login!.Token);
        return http;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing) _conexaoViva.Dispose();
    }
}
