using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace UnixCrm.Api.Data;

/// <summary>Used by EF CLI (dotnet ef migrations …). Set UNIXCRM_CONNECTION_STRING or use local Docker Postgres defaults.</summary>
public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable("UNIXCRM_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=unixcrm;Username=postgres;Password=postgres";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(cs)
            .Options;

        return new AppDbContext(options);
    }
}
