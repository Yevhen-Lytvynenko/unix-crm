using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using UnixCrm.Api.Data;
using UnixCrm.Api.Data.Entities;
using UnixCrm.Api.Dtos;
using UnixCrm.Api.Options;
using UnixCrm.Api.Services;

namespace UnixCrm.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    IPasswordHasher<User> passwordHasher,
    JwtTokenService tokens,
    IOptions<JwtOptions> jwtOptions) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest dto, CancellationToken ct)
    {
        var username = dto.Username.Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);
        if (user is null)
            return Unauthorized();

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password);
        if (result != PasswordVerificationResult.Success && result != PasswordVerificationResult.SuccessRehashNeeded)
            return Unauthorized();

        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, dto.Password);
            await db.SaveChangesAsync(ct);
        }

        var token = tokens.CreateToken(user);
        var minutes = jwtOptions.Value.AccessTokenMinutes;
        return Ok(new LoginResponse(token, DateTime.UtcNow.AddMinutes(minutes), user.MustChangePassword));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<MeResponse>> Me(CancellationToken ct)
    {
        var id = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            return Unauthorized();

        return Ok(new MeResponse(user.Id, user.Username, user.MustChangePassword, user.Role));
    }

    [HttpPost("set-password")]
    [Authorize]
    public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest dto, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 4)
            return BadRequest(new { error = "Password must be at least 4 characters." });

        var id = Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user is null)
            return Unauthorized();

        user.PasswordHash = passwordHasher.HashPassword(user, dto.NewPassword);
        user.MustChangePassword = false;
        await db.SaveChangesAsync(ct);

        return NoContent();
    }
}
