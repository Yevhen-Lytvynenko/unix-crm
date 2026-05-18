using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using UnixCrm.Api.Services;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController(AppDbContext db, TaskMoveService moveService) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<TaskDto>> Create([FromBody] CreateTaskDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("Title is required.");

        var firstColumn = await db.Columns
            .Where(c => c.BoardId == dto.BoardId)
            .OrderBy(c => c.Position)
            .FirstOrDefaultAsync(ct);

        if (firstColumn is null)
            return BadRequest("Board has no columns.");

        var existingInColumn = await db.Tasks.Where(t => t.ColumnId == firstColumn.Id).ToListAsync(ct);
        foreach (var t in existingInColumn)
            t.Position++;

        var task = new KanbanTask
        {
            Id = Guid.NewGuid(),
            ColumnId = firstColumn.Id,
            Title = dto.Title.Trim(),
            Description = dto.Description,
            AssigneeId = dto.AssigneeId,
            Position = 0
        };

        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(BoardsController.GetById), "Boards", new { id = dto.BoardId },
            new TaskDto(task.Id, task.ColumnId, task.Title, task.Description, task.AssigneeId, task.Position));
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
        await db.SaveChangesAsync(ct);

        return Ok(new TaskDto(task.Id, task.ColumnId, task.Title, task.Description, task.AssigneeId, task.Position));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var task = await db.Tasks.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (task is null)
            return NotFound();

        var columnId = task.ColumnId;
        var deletedPos = task.Position;

        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);

        var toShift = await db.Tasks.Where(t => t.ColumnId == columnId && t.Position > deletedPos).ToListAsync(ct);
        foreach (var t in toShift)
            t.Position--;

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
}
