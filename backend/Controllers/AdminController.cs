using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using UnixCrm.Api.Options;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = UnixCrm.Api.Data.Entities.User.RoleAdmin)]
public class AdminController(AppDbContext db, IOptions<CrmInfoOptions> crm) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<UserAdminDto>>> Users(CancellationToken ct)
    {
        var list = await db.Users
            .AsNoTracking()
            .OrderBy(u => u.Username)
            .Select(u => new UserAdminDto(u.Id, u.Username, u.MustChangePassword, u.Role))
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpGet("system-info")]
    public ActionResult<SystemInfoDto> SystemInfo()
    {
        var c = crm.Value;
        return Ok(new SystemInfoDto(c.Version, c.ReleaseDate, c.Changelog));
    }
}
