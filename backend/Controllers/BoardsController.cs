using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Dtos;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/boards")]
public class BoardsController(AppDbContext db) : ControllerBase
{
    /// <summary>Lists boards (MVP helper so the SPA can pick a board id after seed).</summary>
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
    public async Task<ActionResult<BoardDetailDto>> GetById(Guid id, CancellationToken ct)
    {
        var board = await db.Boards
            .AsNoTracking()
            .Where(b => b.Id == id)
            .Select(b => new BoardDetailDto(
                b.Id,
                b.Title,
                b.Columns
                    .OrderBy(c => c.Position)
                    .Select(c => new ColumnDto(
                        c.Id,
                        c.BoardId,
                        c.Title,
                        c.Position,
                        c.Tasks
                            .OrderBy(t => t.Position)
                            .Select(t => new TaskDto(t.Id, t.ColumnId, t.Title, t.Description, t.AssigneeId, t.Position))
                            .ToList()))
                    .ToList()))
            .FirstOrDefaultAsync(ct);

        if (board is null)
            return NotFound();

        return Ok(board);
    }
}
