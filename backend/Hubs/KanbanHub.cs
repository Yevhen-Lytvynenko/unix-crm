using Microsoft.AspNetCore.SignalR;

namespace UnixCrm.Api.Hubs;

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
