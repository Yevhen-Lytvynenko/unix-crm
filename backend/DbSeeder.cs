using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;

namespace UnixCrm.Api;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        if (await db.Boards.AnyAsync())
            return;

        var user = new User { Id = Guid.NewGuid(), Username = "demo" };
        var board = new Board { Id = Guid.NewGuid(), Title = "Development Tasks" };

        var colTodo = new BoardColumn { Id = Guid.NewGuid(), BoardId = board.Id, Title = "To Do", Position = 0 };
        var colProgress = new BoardColumn { Id = Guid.NewGuid(), BoardId = board.Id, Title = "In Progress", Position = 1 };
        var colDone = new BoardColumn { Id = Guid.NewGuid(), BoardId = board.Id, Title = "Done", Position = 2 };

        db.Users.Add(user);
        db.Boards.Add(board);
        db.Columns.AddRange(colTodo, colProgress, colDone);

        db.Tasks.AddRange(
            new KanbanTask
            {
                Id = Guid.NewGuid(),
                ColumnId = colTodo.Id,
                Title = "Sample task A",
                Description = "Try dragging me to another column.",
                Position = 0
            },
            new KanbanTask
            {
                Id = Guid.NewGuid(),
                ColumnId = colTodo.Id,
                Title = "Sample task B",
                Description = null,
                Position = 1
            });

        await db.SaveChangesAsync();
    }
}
