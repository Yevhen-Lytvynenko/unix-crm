namespace UnixCrm.Api.Options;

public class CrmInfoOptions
{
    public const string SectionName = "Crm";

    public string Version { get; set; } = "0.0.1";
    public string ReleaseDate { get; set; } = "";
    public string Changelog { get; set; } = "";
}
