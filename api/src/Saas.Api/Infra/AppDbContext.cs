using Microsoft.EntityFrameworkCore;
using Saas.Api.Domain;

namespace Saas.Api.Infra;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IUsuarioAtual usuarioAtual) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Chamado> Chamados => Set<Chamado>();
    public DbSet<Comentario> Comentarios => Set<Comentario>();

    // Lido a cada consulta pelo filtro global. Sem tenant (anônimo), nenhuma linha é retornada.
    private Guid? TenantAtualId => usuarioAtual.TenantId;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(e =>
        {
            e.Property(x => x.Nome).HasMaxLength(120);
            e.Property(x => x.Slug).HasMaxLength(60);
            e.HasIndex(x => x.Slug).IsUnique();
        });

        modelBuilder.Entity<Usuario>(e =>
        {
            e.Property(x => x.Nome).HasMaxLength(120);
            e.Property(x => x.Email).HasMaxLength(160);
            e.Property(x => x.Papel).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => new { x.TenantId, x.Email }).IsUnique();
            e.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(x => x.TenantId == TenantAtualId);
        });

        modelBuilder.Entity<Chamado>(e =>
        {
            e.Property(x => x.Titulo).HasMaxLength(150);
            e.Property(x => x.Descricao).HasMaxLength(4000);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Prioridade).HasConversion<string>().HasMaxLength(20);
            e.HasOne(x => x.Cliente).WithMany().HasForeignKey(x => x.ClienteId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Responsavel).WithMany().HasForeignKey(x => x.ResponsavelId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => new { x.TenantId, x.Status });
            e.HasQueryFilter(x => x.TenantId == TenantAtualId);
        });

        modelBuilder.Entity<Comentario>(e =>
        {
            e.Property(x => x.Texto).HasMaxLength(4000);
            e.HasOne<Chamado>().WithMany(c => c.Comentarios).HasForeignKey(x => x.ChamadoId);
            e.HasOne(x => x.Autor).WithMany().HasForeignKey(x => x.AutorId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => x.TenantId == TenantAtualId);
        });
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Toda entidade nova herda o tenant do usuário logado; nunca do corpo da requisição.
        foreach (var entry in ChangeTracker.Entries<IPertenceAoTenant>())
        {
            if (entry.State == EntityState.Added && entry.Entity.TenantId == Guid.Empty)
            {
                entry.Entity.TenantId = TenantAtualId
                    ?? throw new InvalidOperationException("Não há tenant no contexto para gravar o registro.");
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }
}
