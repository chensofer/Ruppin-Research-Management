using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RupResearchAPI.Models
{
    [Table("research_categories")]
    public class ResearchCategory
    {
        [Key]
        [Column("category_name")]
        [StringLength(50)]
        public string CategoryName { get; set; } = null!;

        [Column("category_description")]
        [StringLength(255)]
        public string? CategoryDescription { get; set; }
    }
}
