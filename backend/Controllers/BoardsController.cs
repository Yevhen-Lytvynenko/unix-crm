using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/boards")]
[Authorize]
public class BoardsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BoardSummaryDto>>> GetAll(CancellationToken ct)
    {
        var list = await db.Boards
            .AsNoTracking()
            .OrderBy(b => b.Title)
            .Select(b => new BoardSummaryDto(b.Id, b.Title))
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BoardDetailDto>> GetById(
        Guid id,
        [FromQuery] Guid? assigneeId,
        [FromQuery] Guid? tagId,
        [FromQuery] TaskPriority? priority,
        [FromQuery] DateTime? dueFrom,
        [FromQuery] DateTime? dueTo,
        CancellationToken ct)
    {
        var boardExists = await db.Boards.AsNoTracking().AnyAsync(b => b.Id == id, ct);
        if (!boardExists)
            return NotFound();

        var columns = await db.Columns
            .AsNoTracking()
            .Where(c => c.BoardId == id)
            .OrderBy(c => c.Position)
            .ToListAsync(ct);

        if (columns.Count == 0)
        {
            var titleOnly = await db.Boards.AsNoTracking().Where(b => b.Id == id).Select(b => b.Title).FirstAsync(ct);
            return Ok(new BoardDetailDto(id, titleOnly, []));
        }

        var columnIds = columns.Select(c => c.Id).ToList();

        var tasksQuery = db.Tasks
            .AsNoTracking()
            .Where(t => columnIds.Contains(t.ColumnId))
            .Include(t => t.TaskTags)
            .ThenInclude(tt => tt.Tag)
            .Include(t => t.BlockedByPrerequisites)
            .AsQueryable();

        if (assigneeId.HasValue)
            tasksQuery = tasksQuery.Where(t => t.AssigneeId == assigneeId);

        if (priority.HasValue)
            tasksQuery = tasksQuery.Where(t => t.Priority == priority.Value);

        if (dueFrom.HasValue)
            tasksQuery = tasksQuery.Where(t => t.DueDateUtc != null && t.DueDateUtc >= dueFrom.Value);

        if (dueTo.HasValue)
            tasksQuery = tasksQuery.Where(t => t.DueDateUtc != null && t.DueDateUtc <= dueTo.Value);

        if (tagId.HasValue)
            tasksQuery = tasksQuery.Where(t => t.TaskTags.Any(tt => tt.TagId == tagId.Value));

        var tasks = await tasksQuery
            .OrderBy(t => t.ColumnId)
            .ThenBy(t => t.Position)
            .ToListAsync(ct);

        var title = await db.Boards.AsNoTracking().Where(b => b.Id == id).Select(b => b.Title).FirstAsync(ct);

        var taskDtosByColumn = tasks
            .GroupBy(t => t.ColumnId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<TaskDto>)g.OrderBy(t => t.Position).Select(MapTask).ToList());

        var columnDtos = columns.Select(c =>
        {
            var ts = taskDtosByColumn.GetValueOrDefault(c.Id, []);
            return new ColumnDto(c.Id, c.BoardId, c.Title, c.Position, c.IsCompletionColumn, ts);
        }).ToList();

        return Ok(new BoardDetailDto(id, title, columnDtos));
    }

    private static TaskDto MapTask(KanbanTask t)
    {
        var tags = t.TaskTags
            .OrderBy(tt => tt.Tag.SortOrder)
            .Select(tt => new TagDto(tt.Tag.Id, tt.Tag.Name, tt.Tag.Color, tt.Tag.SortOrder))
            .ToList();

        var blockers = t.BlockedByPrerequisites
            .Select(d => d.BlockerTaskId)
            .OrderBy(x => x)
            .ToList();

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
