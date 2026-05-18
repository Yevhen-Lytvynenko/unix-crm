namespace UnixCrm.Api.Hubs;

public static class KanbanGroups
{
    public static string Board(Guid boardId) => $"board-{boardId}";
}
