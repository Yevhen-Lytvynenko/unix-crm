using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using UnixCrm.Api.Services;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/columns")]
[Authorize]
public class ColumnsController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<ColumnDto>> Create([FromBody] CreateColumnDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            return BadRequest("Title is required.");

        var boardExists = await db.Boards.AnyAsync(b => b.Id == dto.BoardId, ct);
        if (!boardExists)
            return NotFound("Board not found.");

        var maxPos = await db.Columns
            .Where(c => c.BoardId == dto.BoardId)
            .Select(c => (int?)c.Position)
            .MaxAsync(ct) ?? -1;

        var column = new BoardColumn
        {
            Id = Guid.NewGuid(),
            BoardId = dto.BoardId,
            Title = dto.Title.Trim(),
            Position = maxPos + 1,
        };

        db.Columns.Add(column);
        await db.SaveChangesAsync(ct);

        var result = new ColumnDto(column.Id, column.BoardId, column.Title, column.Position, column.IsCompletionColumn, []);
        return CreatedAtAction(nameof(BoardsController.GetById), "Boards", new { id = dto.BoardId }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ColumnDto>> Update(Guid id, [FromBody] UpdateColumnDto dto, CancellationToken ct)
    {
        var col = await db.Columns.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (col is null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Title))
            col.Title = dto.Title.Trim();

        if (dto.IsCompletionColumn.HasValue)
            col.IsCompletionColumn = dto.IsCompletionColumn.Value;

        await db.SaveChangesAsync(ct);

        return Ok(new ColumnDto(col.Id, col.BoardId, col.Title, col.Position, col.IsCompletionColumn, []));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var col = await db.Columns.Include(c => c.Tasks).FirstOrDefaultAsync(c => c.Id == id, ct);
        if (col is null)
            return NotFound();

        var boardId = col.BoardId;

        var others = await db.Columns
            .Where(c => c.BoardId == boardId && c.Id != col.Id)
            .OrderBy(c => c.Position)
            .ToListAsync(ct);

        if (others.Count == 0)
            return BadRequest(new { error = "Нельзя удалить единственную колонку доски." });

        if (col.Tasks.Count > 0)
        {
            var target = others[0];
            var maxPos = await db.Tasks.Where(t => t.ColumnId == target.Id).MaxAsync(t => (int?)t.Position, ct) ?? -1;
            var ordered = col.Tasks.OrderBy(t => t.Position).ToList();
            for (var i = 0; i < ordered.Count; i++)
            {
                ordered[i].ColumnId = target.Id;
                ordered[i].Position = maxPos + 1 + i;
            }
        }

        db.Columns.Remove(col);
        await db.SaveChangesAsync(ct);

        var remaining = await db.Columns.Where(c => c.BoardId == boardId).OrderBy(c => c.Position).ToListAsync(ct);
        for (var i = 0; i < remaining.Count; i++)
            remaining[i].Position = i;

        await db.SaveChangesAsync(ct);

        return NoContent();
    }
}
