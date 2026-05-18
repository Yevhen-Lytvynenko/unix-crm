namespace UnixCrm.Api.Data.Entities;

public class Board
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;

    public ICollection<BoardColumn> Columns { get; set; } = new List<BoardColumn>();
}
