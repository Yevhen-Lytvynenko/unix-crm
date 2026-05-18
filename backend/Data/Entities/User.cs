namespace UnixCrm.Api.Data.Entities;

public class User
{
    public const string RoleAdmin = "Admin";

    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool MustChangePassword { get; set; }
    public string Role { get; set; } = RoleAdmin;

    public ICollection<KanbanTask> AssignedTasks { get; set; } = new List<KanbanTask>();
}
