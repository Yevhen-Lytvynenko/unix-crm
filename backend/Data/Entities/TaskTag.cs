namespace UnixCrm.Api.Data.Entities;

public class TaskTag
{
    public Guid TaskId { get; set; }
    public Guid TagId { get; set; }

    public KanbanTask Task { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
