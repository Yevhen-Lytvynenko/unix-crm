namespace UnixCrm.Api.Data.Entities;

public class TaskDependency
{
    public Guid BlockedTaskId { get; set; }
    public Guid BlockerTaskId { get; set; }

    public KanbanTask BlockedTask { get; set; } = null!;
    public KanbanTask BlockerTask { get; set; } = null!;
}
