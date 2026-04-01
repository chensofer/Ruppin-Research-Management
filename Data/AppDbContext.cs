using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Models;

namespace RupResearchAPI.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<ResearchUser> ResearchUsers { get; set; }
        public DbSet<ResearchRole> ResearchRoles { get; set; }
        public DbSet<ResearchProject> ResearchProjects { get; set; }
        public DbSet<ResearchCenter> ResearchCenters { get; set; }
        public DbSet<ResearchPaymentRequest> ResearchPaymentRequests { get; set; }
        public DbSet<ResearchBudgetCategory> ResearchBudgetCategories { get; set; }
        public DbSet<ResearchBudgetPlan> ResearchBudgetPlans { get; set; }
        public DbSet<ResearchFutureCommitment> ResearchFutureCommitments { get; set; }
        public DbSet<ResearchAssistant> ResearchAssistants { get; set; }
        public DbSet<ResearchHourReport> ResearchHourReports { get; set; }
        public DbSet<ResearchMonthlyWorkApproval> ResearchMonthlyWorkApprovals { get; set; }
        public DbSet<ResearchProvider> ResearchProviders { get; set; }
        public DbSet<ResearchFile> ResearchFiles { get; set; }
        public DbSet<ResearchAlert> ResearchAlerts { get; set; }
        public DbSet<ResearchCategory> ResearchCategories { get; set; }
        public DbSet<ResearchCenterBudget> ResearchCenterBudgets { get; set; }
        public DbSet<ResearchBelongsToCenter> ResearchBelongsToCenters { get; set; }
        public DbSet<ResearchUsersProject> ResearchUsersProjects { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Composite primary keys for junction/association tables
            modelBuilder.Entity<ResearchAssistant>()
                .HasKey(a => new { a.AssistantUserId, a.ProjectId });

            modelBuilder.Entity<ResearchBelongsToCenter>()
                .HasKey(b => new { b.UserId, b.CenterId });

            modelBuilder.Entity<ResearchUsersProject>()
                .HasKey(u => new { u.UserId, u.ProjectId });
        }
    }
}
