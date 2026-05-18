using Microsoft.EntityFrameworkCore;
using UnixCrm.Api.Data;

namespace UnixCrm.Api.Services;

public class DependencyCycleService(AppDbContext db)
{
    /// <summary>
    /// Adding <paramref name="blockedTaskId"/> blocked by <paramref name="blockerTaskId"/> would create a cycle
    /// if there is already a prerequisite chain requiring <paramref name="blockedTaskId"/> before <paramref name="blockerTaskId"/>.
    /// </summary>
    public async Task<bool> WouldCreateCycleAsync(Guid blockedTaskId, Guid blockerTaskId, CancellationToken ct = default)
    {
        if (blockedTaskId == blockerTaskId)
            return true;

        var visited = new HashSet<Guid>();
        var stack = new Stack<Guid>();
        stack.Push(blockerTaskId);

        while (stack.Count > 0)
        {
            var current = stack.Pop();
            if (current == blockedTaskId)
                return true;

            if (!visited.Add(current))
                continue;

            var prerequisites = await db.TaskDependencies
                .AsNoTracking()
                .Where(d => d.BlockedTaskId == current)
                .Select(d => d.BlockerTaskId)
                .ToListAsync(ct);

            foreach (var p in prerequisites)
                stack.Push(p);
        }

        return false;
    }
}
