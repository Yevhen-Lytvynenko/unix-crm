namespace UnixCrm.Api.Dtos;

public record BoardSummaryDto(Guid Id, string Title);

public record TaskDto(
    Guid Id,
    Guid ColumnId,
    string Title,
    string? Description,
    Guid? AssigneeId,
    int Position);

public record ColumnDto(
    Guid Id,
    Guid BoardId,
    string Title,
    int Position,
    IReadOnlyList<TaskDto> Tasks);

public record BoardDetailDto(
    Guid Id,
    string Title,
    IReadOnlyList<ColumnDto> Columns);

public record CreateColumnDto(Guid BoardId, string Title);

public record CreateTaskDto(Guid BoardId, string Title, string? Description, Guid? AssigneeId);

public record UpdateTaskDto(string Title, string? Description);

public record MoveTaskDto(Guid TaskId, Guid NewColumnId, int NewPosition);

public record TaskMoveEventDto(Guid TaskId, Guid NewColumnId, int NewPosition, Guid BoardId);
