using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data.Entities;

namespace UnixCrm.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardColumn> Columns => Set<BoardColumn>();
    public DbSet<KanbanTask> Tasks => Set<KanbanTask>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<TaskTag> TaskTags => Set<TaskTag>();
    public DbSet<TaskDependency> TaskDependencies => Set<TaskDependency>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            e.Property(x => x.Username).IsRequired().HasMaxLength(256);
            e.Property(x => x.PasswordHash).IsRequired().HasMaxLength(4096);
            e.Property(x => x.Role).IsRequired().HasMaxLength(64);
            e.HasIndex(x => x.Username).IsUnique();
        });

        modelBuilder.Entity<Board>(e =>
        {
            e.ToTable("boards");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(512);
        });

        modelBuilder.Entity<BoardColumn>(e =>
        {
            e.ToTable("columns");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(256);
            e.HasIndex(x => new { x.BoardId, x.Position });

            e.HasOne(x => x.Board)
                .WithMany(b => b.Columns)
                .HasForeignKey(x => x.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<KanbanTask>(e =>
        {
            e.ToTable("tasks");
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(512);
            e.Property(x => x.Priority).HasConversion<byte>();
            e.HasIndex(x => new { x.ColumnId, x.Position });
            e.HasIndex(x => x.AssigneeId);
            e.HasIndex(x => x.DueDateUtc);
            e.HasIndex(x => x.Priority);

            e.HasOne(x => x.Column)
                .WithMany(c => c.Tasks)
                .HasForeignKey(x => x.ColumnId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Assignee)
                .WithMany(u => u.AssignedTasks)
                .HasForeignKey(x => x.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Tag>(e =>
        {
            e.ToTable("tags");
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(128);
            e.Property(x => x.Color).HasMaxLength(32);
            e.HasIndex(x => x.Name).IsUnique();
            e.HasIndex(x => x.SortOrder);
        });

        modelBuilder.Entity<TaskTag>(e =>
        {
            e.ToTable("task_tags");
            e.HasKey(x => new { x.TaskId, x.TagId });

            e.HasOne(x => x.Task)
                .WithMany(t => t.TaskTags)
                .HasForeignKey(x => x.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.Tag)
                .WithMany(t => t.TaskTags)
                .HasForeignKey(x => x.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskDependency>(e =>
        {
            e.ToTable("task_dependencies");
            e.HasKey(x => new { x.BlockedTaskId, x.BlockerTaskId });

            e.HasOne(x => x.BlockedTask)
                .WithMany(t => t.BlockedByPrerequisites)
                .HasForeignKey(x => x.BlockedTaskId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.BlockerTask)
                .WithMany(t => t.BlocksDependents)
                .HasForeignKey(x => x.BlockerTaskId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
