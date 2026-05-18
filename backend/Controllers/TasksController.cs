using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using UnixCrm.Api.Services;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/tasks")]
[Authorize]
public class TasksController(AppDbContext db, TaskMoveService moveService, DependencyCycleService cycleService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create([FromBody] CreateTaskDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("Title is required.");

        BoardColumn targetColumn;
        if (dto.ColumnId.HasValue)
        {
            var col = await db.Columns.FirstOrDefaultAsync(
                c => c.Id == dto.ColumnId.Value && c.BoardId == dto.BoardId,
                ct);
            if (col is null)
                return BadRequest("Column not found on this board.");
            targetColumn = col;
        }
        else
        {
            var firstColumn = await db.Columns
                .Where(c => c.BoardId == dto.BoardId)
                .OrderBy(c => c.Position)
                .FirstOrDefaultAsync(ct);

            if (firstColumn is null)
                return BadRequest("Board has no columns.");

            targetColumn = firstColumn;
        }

        var existingInColumn = await db.Tasks.Where(t => t.ColumnId == targetColumn.Id).ToListAsync(ct);
        foreach (var t in existingInColumn)
            t.Position++;

        var task = new KanbanTask
        {
            Id = Guid.NewGuid(),
            ColumnId = targetColumn.Id,
            Title = dto.Title.Trim(),
            Description = dto.Description,
            AssigneeId = dto.AssigneeId,
            Position = 0,
            Priority = dto.Priority ?? TaskPriority.Normal,
            DueDateUtc = dto.DueDateUtc,
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);

        if (dto.TagIds is { Count: > 0 })
        {
            foreach (var tagId in dto.TagIds.Distinct())
            {
                if (!await db.Tags.AnyAsync(t => t.Id == tagId, ct))
                    continue;
                db.TaskTags.Add(new TaskTag { TaskId = task.Id, TagId = tagId });
            }

            await db.SaveChangesAsync(ct);
        }

        return await LoadTaskDto(task.Id, ct) is { } created
            ? CreatedAtAction(nameof(BoardsController.GetById), "Boards", new { id = dto.BoardId }, created)
            : StatusCode(500);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TaskDto>> Update(Guid id, [FromBody] UpdateTaskDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("Title is required.");

        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null)
            return NotFound();

        task.Title = dto.Title.Trim();
        task.Description = dto.Description;
        task.AssigneeId = dto.AssigneeId;

        if (dto.Priority.HasValue)
            task.Priority = dto.Priority.Value;

        task.DueDateUtc = dto.DueDateUtc;

        if (dto.TagIds is not null)
        {
            var existing = await db.TaskTags.Where(tt => tt.TaskId == id).ToListAsync(ct);
            db.TaskTags.RemoveRange(existing);
            foreach (var tagId in dto.TagIds.Distinct())
            {
                if (await db.Tags.AnyAsync(t => t.Id == tagId, ct))
                    db.TaskTags.Add(new TaskTag { TaskId = id, TagId = tagId });
            }
        }

        await db.SaveChangesAsync(ct);

        return await LoadTaskDto(id, ct) is { } updated ? Ok(updated) : NotFound();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null)
            return NotFound();

        var columnId = task.ColumnId;
        var deletedPos = task.Position;

        var deps = await db.TaskDependencies.Where(d => d.BlockedTaskId == id || d.BlockerTaskId == id).ToListAsync(ct);
        db.TaskDependencies.RemoveRange(deps);

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);

        var toShift = await db.Tasks.Where(t => t.ColumnId == columnId && t.Position > deletedPos).ToListAsync(ct);
        foreach (var t in toShift)
            t.Position--;

        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpPost("{id:guid}/dependencies")]
    public async Task<IActionResult> AddDependency(Guid id, [FromBody] AddDependencyDto dto, CancellationToken ct)
    {
        var blocked = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        var blocker = await db.Tasks.FirstOrDefaultAsync(t => t.Id == dto.BlockerTaskId, ct);
        if (blocked is null || blocker is null)
            return NotFound();

        var bidBoard = await db.Columns.Where(c => c.Id == blocked.ColumnId).Select(c => c.BoardId).FirstAsync(ct);
        var boardBlocker = await db.Columns.Where(c => c.Id == blocker.ColumnId).Select(c => c.BoardId).FirstAsync(ct);
        if (bidBoard != boardBlocker)
            return BadRequest(new { error = "Зависимости разрешены только внутри одной доски." });

        if (id == dto.BlockerTaskId)
            return BadRequest(new { error = "Задача не может зависеть от самой себя." });

        var exists = await db.TaskDependencies.AnyAsync(
            d => d.BlockedTaskId == id && d.BlockerTaskId == dto.BlockerTaskId,
            ct);
        if (exists)
            return NoContent();

        if (await cycleService.WouldCreateCycleAsync(id, dto.BlockerTaskId, ct))
            return BadRequest(new { error = "Такая зависимость создаёт цикл." });

        db.TaskDependencies.Add(new TaskDependency { BlockedTaskId = id, BlockerTaskId = dto.BlockerTaskId });
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpDelete("{id:guid}/dependencies/{blockerTaskId:guid}")]
    public async Task<IActionResult> RemoveDependency(Guid id, Guid blockerTaskId, CancellationToken ct)
    {
        var row = await db.TaskDependencies.FirstOrDefaultAsync(
            d => d.BlockedTaskId == id && d.BlockerTaskId == blockerTaskId,
            ct);
        if (row is null)
            return NotFound();

        db.TaskDependencies.Remove(row);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    [HttpPut("move")]
    public async Task<ActionResult<TaskMoveEventDto>> Move([FromBody] MoveTaskDto dto, CancellationToken ct)
    {
        try
        {
            var result = await moveService.MoveAsync(dto, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    private async Task<TaskDto?> LoadTaskDto(Guid taskId, CancellationToken ct)
    {
        var t = await db.Tasks
            .AsNoTracking()
            .Include(x => x.TaskTags)
            .ThenInclude(tt => tt.Tag)
            .Include(x => x.BlockedByPrerequisites)
            .FirstOrDefaultAsync(x => x.Id == taskId, ct);

        if (t is null)
            return null;

        var tags = t.TaskTags
            .OrderBy(tt => tt.Tag.SortOrder)
            .Select(tt => new TagDto(tt.Tag.Id, tt.Tag.Name, tt.Tag.Color, tt.Tag.SortOrder))
            .ToList();

        var blockers = t.BlockedByPrerequisites.Select(d => d.BlockerTaskId).OrderBy(x => x).ToList();

        return new TaskDto(
            t.Id,
            t.ColumnId,
            t.Title,
            t.Description,
            t.AssigneeId,
            t.Position,
            t.Priority,
            t.DueDateUtc,
            tags,
            blockers);
    }
}
