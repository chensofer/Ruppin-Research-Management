using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
        public DbSet<ResearchUsersProject> ResearchUsersProjects { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Composite primary keys for junction/association tables
            modelBuilder.Entity<ResearchAssistant>()
                .HasKey(a => new { a.AssistantUserId, a.ProjectId });

            modelBuilder.Entity<ResearchUsersProject>()
                .HasKey(u => new { u.UserId, u.ProjectId });

            // EF Core 6 + SQL Server: explicit property-by-property configuration for DateOnly/TimeOnly
            var dConv = new ValueConverter<DateOnly?, DateTime?>(
                v => v.HasValue ? (DateTime?)new DateTime(v.Value.Year, v.Value.Month, v.Value.Day) : null,
                v => v.HasValue ? (DateOnly?)new DateOnly(v.Value.Year, v.Value.Month, v.Value.Day) : null);
            var tConv = new ValueConverter<TimeOnly?, TimeSpan?>(
                v => v.HasValue ? (TimeSpan?)new TimeSpan(v.Value.Hour, v.Value.Minute, v.Value.Second) : null,
                v => v.HasValue ? (TimeOnly?)new TimeOnly(v.Value.Hours, v.Value.Minutes, v.Value.Seconds) : null);

            modelBuilder.Entity<ResearchBudgetPlan>().Property(e => e.PlannedDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchCenter>().Property(e => e.OpeningDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchCenter>().Property(e => e.ClosingDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchFutureCommitment>().Property(e => e.ExpectedDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchHourReport>().Property(e => e.ReportDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchHourReport>().Property(e => e.FromHour).HasColumnType("time").HasConversion(tConv);
            modelBuilder.Entity<ResearchHourReport>().Property(e => e.ToHour).HasColumnType("time").HasConversion(tConv);
            modelBuilder.Entity<ResearchMonthlyWorkApproval>().Property(e => e.ApprovalDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchPaymentRequest>().Property(e => e.RequestDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchPaymentRequest>().Property(e => e.DueDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchPaymentRequest>().Property(e => e.DecisionDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchProject>().Property(e => e.StartDate).HasColumnType("date").HasConversion(dConv);
            modelBuilder.Entity<ResearchProject>().Property(e => e.EndDate).HasColumnType("date").HasConversion(dConv);
        }
    }
}
