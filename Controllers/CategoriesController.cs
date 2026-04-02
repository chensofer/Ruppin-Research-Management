using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;
using RupResearchAPI.Models;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/categories")]
    [Authorize]
    public class CategoriesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public CategoriesController(AppDbContext db) => _db = db;

        // GET /api/categories
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var cats = await _db.ResearchCategories
                .OrderBy(c => c.CategoryName)
                .Select(c => new { c.CategoryName, c.CategoryDescription })
                .ToListAsync();
            return Ok(cats);
        }

        // POST /api/categories — creates a new category; returns existing if name already taken
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateCategoryRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CategoryName))
                return BadRequest(new { message = "שם הקטגוריה נדרש" });

            var name = dto.CategoryName.Trim();
            var existing = await _db.ResearchCategories.FindAsync(name);
            if (existing != null)
                return Ok(new { existing.CategoryName, existing.CategoryDescription });

            var cat = new ResearchCategory
            {
                CategoryName = name,
                CategoryDescription = dto.CategoryDescription?.Trim()
            };
            _db.ResearchCategories.Add(cat);
            await _db.SaveChangesAsync();
            return Ok(new { cat.CategoryName, cat.CategoryDescription });
        }
    }

    public record CreateCategoryRequest(string CategoryName, string? CategoryDescription);
}
