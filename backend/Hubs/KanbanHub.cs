using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace UnixCrm.Api.Hubs;

[Authorize]
public class KanbanHub : Hub
{
    public async Task JoinBoard(Guid boardId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, KanbanGroups.Board(boardId));
    }

    public async Task LeaveBoard(Guid boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, KanbanGroups.Board(boardId));
    }
}
