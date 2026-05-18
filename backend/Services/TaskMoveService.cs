using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using UnixCrm.Api.Hubs;

namespace UnixCrm.Api.Services;

public class TaskMoveService(
    AppDbContext db,
    IHubContext<KanbanHub> hubContext,
    ILogger<TaskMoveService> logger)
{
    public async Task<TaskMoveEventDto?> MoveAsync(MoveTaskDto dto, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);

        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == dto.TaskId, ct);
        if (task is null)
            return null;

        var boardId = await db.Columns
            .Where(c => c.Id == task.ColumnId)
            .Select(c => c.BoardId)
            .FirstAsync(ct);

        var newColumn = await db.Columns.FirstOrDefaultAsync(c => c.Id == dto.NewColumnId, ct);
        if (newColumn is null || newColumn.BoardId != boardId)
            throw new InvalidOperationException("Invalid target column for this board.");

        var oldColumnId = task.ColumnId;
        var oldPosition = task.Position;
        var newColumnId = dto.NewColumnId;
        var newPosition = dto.NewPosition;

        if (oldColumnId == newColumnId)
        {
            var count = await db.Tasks.CountAsync(t => t.ColumnId == oldColumnId, ct);
            if (newPosition < 0 || newPosition >= count)
                throw new InvalidOperationException("newPosition is out of range for this column.");

            if (newPosition == oldPosition)
            {
                await transaction.CommitAsync(ct);
                return new TaskMoveEventDto(task.Id, newColumnId, newPosition, boardId);
            }

            if (newPosition > oldPosition)
            {
                var toDecrement = await db.Tasks
                    .Where(t => t.ColumnId == oldColumnId && t.Id != task.Id && t.Position > oldPosition && t.Position <= newPosition)
                    .ToListAsync(ct);
                foreach (var t in toDecrement)
                    t.Position--;
                task.Position = newPosition;
            }
            else
            {
                var toIncrement = await db.Tasks
                    .Where(t => t.ColumnId == oldColumnId && t.Id != task.Id && t.Position >= newPosition && t.Position < oldPosition)
                    .ToListAsync(ct);
                foreach (var t in toIncrement)
                    t.Position++;
                task.Position = newPosition;
            }
        }
        else
        {
            var targetCount = await db.Tasks.CountAsync(t => t.ColumnId == newColumnId, ct);
            if (newPosition < 0 || newPosition > targetCount)
                throw new InvalidOperationException("newPosition is out of range for the target column.");

            var toDecrementSource = await db.Tasks
                .Where(t => t.ColumnId == oldColumnId && t.Position > oldPosition)
                .ToListAsync(ct);
            foreach (var t in toDecrementSource)
                t.Position--;

            var toIncrementTarget = await db.Tasks
                .Where(t => t.ColumnId == newColumnId && t.Position >= newPosition)
                .ToListAsync(ct);
            foreach (var t in toIncrementTarget)
                t.Position++;

            task.ColumnId = newColumnId;
            task.Position = newPosition;
        }

        await ValidateCompletionAllowedAsync(task.Id, newColumnId, ct);

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var evt = new TaskMoveEventDto(task.Id, newColumnId, newPosition, boardId);

        await hubContext.Clients.Group(KanbanGroups.Board(boardId)).SendAsync("ReceiveTaskMove", evt, ct);

        logger.LogInformation("Task {TaskId} moved to column {ColumnId} position {Position}", task.Id, newColumnId, newPosition);

        return evt;
    }

    private async Task ValidateCompletionAllowedAsync(Guid taskId, Guid newColumnId, CancellationToken ct)
    {
        var col = await db.Columns.AsNoTracking().FirstOrDefaultAsync(c => c.Id == newColumnId, ct);
        if (col is null || !col.IsCompletionColumn)
            return;

        var blockerIds = await db.TaskDependencies
            .AsNoTracking()
            .Where(d => d.BlockedTaskId == taskId)
            .Select(d => d.BlockerTaskId)
            .ToListAsync(ct);

        foreach (var bid in blockerIds)
        {
            var blocker = await db.Tasks
                .AsNoTracking()
                .Include(t => t.Column)
                .FirstAsync(t => t.Id == bid, ct);

            if (!blocker.Column.IsCompletionColumn)
                throw new InvalidOperationException(
                    $"Нельзя перенести в завершённые, пока не закрыта зависимость: «{blocker.Title}».");
        }
    }
}
