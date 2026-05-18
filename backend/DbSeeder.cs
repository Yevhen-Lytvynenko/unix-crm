using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;

namespace UnixCrm.Api;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db, IPasswordHasher<User> passwordHasher)
    {
        if (!await db.Users.AnyAsync())
        {
            var jonny = new User
            {
                Id = Guid.NewGuid(),
                Username = "Jonny",
                MustChangePassword = true,
                Role = User.RoleAdmin,
            };
            jonny.PasswordHash = passwordHasher.HashPassword(jonny, "demo");

            var dove = new User
            {
                Id = Guid.NewGuid(),
                Username = "Dove",
                MustChangePassword = true,
                Role = User.RoleAdmin,
            };
            dove.PasswordHash = passwordHasher.HashPassword(dove, "demo");

            db.Users.AddRange(jonny, dove);
            await db.SaveChangesAsync();

            if (!await db.Boards.AnyAsync())
                await SeedBoardAsync(db, jonny.Id);
        }
        else if (!await db.Boards.AnyAsync())
        {
            var firstUser = await db.Users.OrderBy(u => u.Username).FirstAsync();
            await SeedBoardAsync(db, firstUser.Id);
        }
    }

    private static async Task SeedBoardAsync(AppDbContext db, Guid assigneeId)
    {
        var board = new Board { Id = Guid.NewGuid(), Title = "Development Tasks" };

        var colTodo = new BoardColumn { Id = Guid.NewGuid(), BoardId = board.Id, Title = "To Do", Position = 0 };
        var colProgress = new BoardColumn { Id = Guid.NewGuid(), BoardId = board.Id, Title = "In Progress", Position = 1 };
        var colDone = new BoardColumn
        {
            Id = Guid.NewGuid(),
            BoardId = board.Id,
            Title = "Done",
            Position = 2,
            IsCompletionColumn = true,
        };

        db.Boards.Add(board);
        db.Columns.AddRange(colTodo, colProgress, colDone);

        db.Tasks.AddRange(
            new KanbanTask
            {
                Id = Guid.NewGuid(),
                ColumnId = colTodo.Id,
                Title = "Sample task A",
                Description = "Try dragging me to another column.",
                Position = 0,
                AssigneeId = assigneeId,
                Priority = TaskPriority.Normal,
            },
            new KanbanTask
            {
                Id = Guid.NewGuid(),
                ColumnId = colTodo.Id,
                Title = "Sample task B",
                Description = null,
                Position = 1,
                AssigneeId = assigneeId,
                Priority = TaskPriority.Low,
            });

        await db.SaveChangesAsync();
    }
}
