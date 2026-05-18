using UnixCrm.Api.Data.Entities;

namespace UnixCrm.Api.Dtos;

public record BoardSummaryDto(Guid Id, string Title);

public record TagDto(Guid Id, string Name, string? Color, int SortOrder);

public record TaskDto(
    Guid Id,
    Guid ColumnId,
    string Title,
    string? Description,
    Guid? AssigneeId,
    int Position,
    TaskPriority Priority,
    DateTime? DueDateUtc,
    IReadOnlyList<TagDto> Tags,
    IReadOnlyList<Guid> BlockerTaskIds);

public record ColumnDto(
    Guid Id,
    Guid BoardId,
    string Title,
    int Position,
    bool IsCompletionColumn,
    IReadOnlyList<TaskDto> Tasks);

public record BoardDetailDto(
    Guid Id,
    string Title,
    IReadOnlyList<ColumnDto> Columns);

public record DashboardBoardSummaryDto(Guid Id, string Title, int TaskCount);

public record DashboardOverviewDto(
    int BoardCount,
    int ColumnCount,
    int TaskCount,
    int TagCount,
    int? UserCount,
    int TasksLow,
    int TasksNormal,
    int TasksHigh,
    int TasksUrgent,
    int OverdueCount,
    int DueWithin7DaysCount,
    int UnassignedCount,
    int TasksWithBlockersCount,
    int DependencyLinkCount,
    IReadOnlyList<DashboardBoardSummaryDto> Boards);

public record CreateColumnDto(Guid BoardId, string Title);

public record UpdateColumnDto(string Title, bool? IsCompletionColumn);

public record CreateTaskDto(
    Guid BoardId,
    string Title,
    string? Description,
    Guid? AssigneeId,
    TaskPriority? Priority,
    DateTime? DueDateUtc,
    IReadOnlyList<Guid>? TagIds,
    Guid? ColumnId);

public record UpdateTaskDto(
    string Title,
    string? Description,
    Guid? AssigneeId,
    TaskPriority? Priority,
    DateTime? DueDateUtc,
    IReadOnlyList<Guid>? TagIds);

public record MoveTaskDto(Guid TaskId, Guid NewColumnId, int NewPosition);

public record TaskMoveEventDto(Guid TaskId, Guid NewColumnId, int NewPosition, Guid BoardId);

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, DateTime ExpiresAtUtc, bool MustChangePassword);

public record SetPasswordRequest(string NewPassword);

public record MeResponse(Guid Id, string Username, bool MustChangePassword, string Role);

public record CreateTagDto(string Name, string? Color, int? SortOrder);

public record UpdateTagDto(string Name, string? Color, int? SortOrder);

public record UserAdminDto(Guid Id, string Username, bool MustChangePassword, string Role);

public record SystemInfoDto(string Version, string ReleaseDate, string Changelog);

public record AddDependencyDto(Guid BlockerTaskId);
