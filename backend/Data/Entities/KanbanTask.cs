namespace UnixCrm.Api.Data.Entities;

public class KanbanTask
{
    public Guid Id { get; set; }
    public Guid ColumnId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? AssigneeId { get; set; }
    public int Position { get; set; }
    public TaskPriority Priority { get; set; } = TaskPriority.Normal;
    public DateTime? DueDateUtc { get; set; }

    public BoardColumn Column { get; set; } = null!;
    public User? Assignee { get; set; }
    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();

    public ICollection<TaskDependency> BlockedByPrerequisites { get; set; } = new List<TaskDependency>();
    public ICollection<TaskDependency> BlocksDependents { get; set; } = new List<TaskDependency>();
}
