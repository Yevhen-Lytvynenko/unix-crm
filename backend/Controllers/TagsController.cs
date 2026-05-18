using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/tags")]
[Authorize(Roles = UnixCrm.Api.Data.Entities.User.RoleAdmin)]
public class TagsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TagDto>>> GetAll(CancellationToken ct)
    {
        var list = await db.Tags
            .AsNoTracking()
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => new TagDto(t.Id, t.Name, t.Color, t.SortOrder))
            .ToListAsync(ct);

        return Ok(list);
    }

    [HttpPost]
    public async Task<ActionResult<TagDto>> Create([FromBody] CreateTagDto dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest("Name is required.");

        var name = dto.Name.Trim();
        var exists = await db.Tags.AnyAsync(t => t.Name == name, ct);
        if (exists)
            return Conflict("Tag name already exists.");

        var maxOrder = await db.Tags.MaxAsync(t => (int?)t.SortOrder, ct) ?? -1;
        var tag = new Tag
        {
            Id = Guid.NewGuid(),
            Name = name,
            Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim(),
            SortOrder = dto.SortOrder ?? maxOrder + 1,
        };

        db.Tags.Add(tag);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(GetAll), new TagDto(tag.Id, tag.Name, tag.Color, tag.SortOrder));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TagDto>> Update(Guid id, [FromBody] UpdateTagDto dto, CancellationToken ct)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tag is null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            var name = dto.Name.Trim();
            var taken = await db.Tags.AnyAsync(t => t.Name == name && t.Id != id, ct);
            if (taken)
                return Conflict("Tag name already taken.");
            tag.Name = name;
        }

        if (dto.Color is not null)
            tag.Color = string.IsNullOrWhiteSpace(dto.Color) ? null : dto.Color.Trim();

        if (dto.SortOrder.HasValue)
            tag.SortOrder = dto.SortOrder.Value;

        await db.SaveChangesAsync(ct);

        return Ok(new TagDto(tag.Id, tag.Name, tag.Color, tag.SortOrder));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var tag = await db.Tags.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (tag is null)
            return NotFound();

        db.Tags.Remove(tag);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }
}
