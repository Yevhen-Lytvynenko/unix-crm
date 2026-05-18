using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using TaskPriority = UnixCrm.Api.Data.Entities.TaskPriority;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet("overview")]
    public async Task<ActionResult<DashboardOverviewDto>> Overview(CancellationToken ct)
    {
        var isAdmin = User.IsInRole(UnixCrm.Api.Data.Entities.User.RoleAdmin);

        var today = DateTime.UtcNow.Date;
        var weekEnd = today.AddDays(7);

        var boardCount = await db.Boards.CountAsync(ct);
        var columnCount = await db.Columns.CountAsync(ct);
        var taskCount = await db.Tasks.CountAsync(ct);
        var tagCount = await db.Tags.CountAsync(ct);
        int? userCount = isAdmin ? await db.Users.CountAsync(ct) : null;

        var low = await db.Tasks.CountAsync(t => t.Priority == TaskPriority.Low, ct);
        var normal = await db.Tasks.CountAsync(t => t.Priority == TaskPriority.Normal, ct);
        var high = await db.Tasks.CountAsync(t => t.Priority == TaskPriority.High, ct);
        var urgent = await db.Tasks.CountAsync(t => t.Priority == TaskPriority.Urgent, ct);

        var overdue = await db.Tasks.CountAsync(
            t => t.DueDateUtc != null && t.DueDateUtc < today,
            ct);

        var dueWeek = await db.Tasks.CountAsync(
            t => t.DueDateUtc != null && t.DueDateUtc >= today && t.DueDateUtc < weekEnd,
            ct);

        var unassigned = await db.Tasks.CountAsync(t => t.AssigneeId == null, ct);

        var withBlockers = await db.Tasks.CountAsync(
            t => t.BlockedByPrerequisites.Count > 0,
            ct);

        var depLinks = await db.TaskDependencies.CountAsync(ct);

        var boards = await db.Boards
            .AsNoTracking()
            .OrderBy(b => b.Title)
            .Select(b => new DashboardBoardSummaryDto(
                b.Id,
                b.Title,
                db.Tasks.Count(t => t.Column.BoardId == b.Id)))
            .ToListAsync(ct);

        return Ok(new DashboardOverviewDto(
            boardCount,
            columnCount,
            taskCount,
            tagCount,
            userCount,
            low,
            normal,
            high,
            urgent,
            overdue,
            dueWeek,
            unassigned,
            withBlockers,
            depLinks,
            boards));
    }
}
