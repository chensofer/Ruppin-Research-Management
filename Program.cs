using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RupResearchAPI.Data;
using RupResearchAPI.Services;

namespace RupResearchAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // CORS — allow the React dev server
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("FrontendDev", policy =>
                    policy.WithOrigins("http://localhost:5173")
                          .AllowAnyHeader()
                          .AllowAnyMethod());
            });

            // Database
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Services
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IProjectService, ProjectService>();
            builder.Services.AddScoped<IPaymentRequestService, PaymentRequestService>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IHourReportService, HourReportService>();
            builder.Services.AddScoped<IAuditLogService, AuditLogService>();

            // JWT Authentication
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuer = true,
                        ValidateAudience = true,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,
                        ValidIssuer = builder.Configuration["Jwt:Issuer"],
                        ValidAudience = builder.Configuration["Jwt:Audience"],
                        IssuerSigningKey = new SymmetricSecurityKey(
                            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
                    };
                });

            // Controllers + Swagger with JWT support
            builder.Services.AddControllers();
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen(c =>
            {
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your JWT token"
                });
                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        Array.Empty<string>()
                    }
                });
            });

            var app = builder.Build();

            // Apply any pending schema changes that are not covered by EF Core migrations
            using (var scope = app.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.ExecuteSqlRaw(@"
                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = 'research_projects' AND COLUMN_NAME = 'is_archived'
                    )
                        ALTER TABLE research_projects ADD is_archived BIT NOT NULL DEFAULT 0;

                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = 'research_projects' AND COLUMN_NAME = 'archived_at'
                    )
                        ALTER TABLE research_projects ADD archived_at DATETIME NULL;

                    IF NOT EXISTS (
                        SELECT 1 FROM INFORMATION_SCHEMA.TABLES
                        WHERE TABLE_NAME = 'research_audit_logs'
                    )
                    BEGIN
                        CREATE TABLE research_audit_logs (
                            id               INT           IDENTITY(1,1) PRIMARY KEY,
                            project_id       INT           NOT NULL,
                            performed_by_user_id NVARCHAR(20) NOT NULL,
                            action_type      NVARCHAR(100) NOT NULL,
                            action_description NVARCHAR(500) NOT NULL,
                            entity_type      NVARCHAR(50)  NULL,
                            entity_id        NVARCHAR(50)  NULL,
                            created_at       DATETIME      NOT NULL DEFAULT GETDATE()
                        );
                    END
                ");
            }

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                app.UseDeveloperExceptionPage();
            }

            // Ensure uploads directory exists
            var uploadsPath = Path.Combine(app.Environment.WebRootPath
                ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
            Directory.CreateDirectory(uploadsPath);

            app.UseHttpsRedirection();
            app.UseStaticFiles();
            app.UseCors("FrontendDev");
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.Run();
        }
    }
}
