namespace UnixCrm.Api.Data.Entities;

public class BoardColumn
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }
    public bool IsCompletionColumn { get; set; }

    public Board Board { get; set; } = null!;
    public ICollection<KanbanTask> Tasks { get; set; } = new List<KanbanTask>();
}
