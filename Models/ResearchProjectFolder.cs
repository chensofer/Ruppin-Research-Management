using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_project_folders")]
    public class ResearchProjectFolder
    {
        [Key]
        [Column("folder_id")]
        public int FolderId { get; set; }

        [Column("project_id")]
        public int ProjectId { get; set; }

        [Column("folder_name")]
        [StringLength(100)]
        public string FolderName { get; set; } = "";
    }
}
