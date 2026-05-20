using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RupResearchAPI.Converters;
using RupResearchAPI.Data;
using RupResearchAPI.Services;

namespace RupResearchAPI
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Load secrets from appsettings.Secrets.json (gitignored)
            builder.Configuration.AddJsonFile("appsettings.Secrets.json", optional: true, reloadOnChange: false);

            // CORS — allow the React dev server
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("FrontendDev", policy =>
                    policy.AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod());
            });

            // Database
            builder.Services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

            // Services
            builder.Services.AddHttpClient();
            builder.Services.AddScoped<IEmailService, EmailService>();
            builder.Services.AddScoped<IActivityLogService, ActivityLogService>();
            builder.Services.AddScoped<IAuthService, AuthService>();
            builder.Services.AddScoped<IProjectService, ProjectService>();
            builder.Services.AddScoped<IPaymentRequestService, PaymentRequestService>();
            builder.Services.AddScoped<IUserService, UserService>();
            builder.Services.AddScoped<IHourReportService, HourReportService>();

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
            builder.Services.AddControllers()
                .AddJsonOptions(opts =>
                {
                    opts.JsonSerializerOptions.Converters.Add(new DateOnlyJsonConverter());
                    opts.JsonSerializerOptions.Converters.Add(new NullableDateOnlyJsonConverter());
                    opts.JsonSerializerOptions.Converters.Add(new TimeOnlyJsonConverter());
                    opts.JsonSerializerOptions.Converters.Add(new NullableTimeOnlyJsonConverter());
                });
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

            // Apply any pending schema changes — wrapped in try/catch so startup never fails
            try
            {
                using var scope = app.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.Database.ExecuteSqlRaw(@"
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='research_projects' AND COLUMN_NAME='is_archived')
                        ALTER TABLE research_projects ADD is_archived BIT NOT NULL DEFAULT 0;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='research_projects' AND COLUMN_NAME='archived_at')
                        ALTER TABLE research_projects ADD archived_at DATETIME NULL;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='research_future_commitments' AND COLUMN_NAME='file_path')
                        ALTER TABLE research_future_commitments ADD file_path NVARCHAR(MAX) NULL;
                    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='research_activity_log')
                        CREATE TABLE research_activity_log (
                            log_id INT IDENTITY(1,1) PRIMARY KEY,
                            project_id INT NOT NULL,
                            action_type NVARCHAR(100) NOT NULL,
                            action_description NVARCHAR(500) NULL,
                            performed_by_user_id NVARCHAR(10) NULL,
                            performed_by_name NVARCHAR(200) NULL,
                            performed_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                        );
                ");
            }
            catch { }

            if (true)
            {
                app.UseSwagger();
                app.UseSwaggerUI();
                app.UseDeveloperExceptionPage();
            }

            // Ensure uploads directory exists
            var uploadsPath = Path.Combine(app.Environment.WebRootPath
                ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
            Directory.CreateDirectory(uploadsPath);

            app.UseStaticFiles();
            app.UseCors("FrontendDev");
            app.UseAuthentication();
            app.UseAuthorization();
            app.MapControllers();
            app.MapFallbackToFile("index.html");
            app.Run();
        }
    }
}
