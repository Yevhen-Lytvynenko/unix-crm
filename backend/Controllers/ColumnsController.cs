using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/columns")]
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
            Position = maxPos + 1
        };

        db.Columns.Add(column);
        await db.SaveChangesAsync(ct);

        var result = new ColumnDto(column.Id, column.BoardId, column.Title, column.Position, []);
        return CreatedAtAction(nameof(BoardsController.GetById), "Boards", new { id = dto.BoardId }, result);
    }
}
