using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RupResearchAPI.Data;

namespace RupResearchAPI.Controllers
{
    [ApiController]
    [Route("api/centers")]
    [Authorize]
    public class CentersController : ControllerBase
    {
        private readonly AppDbContext _db;
        public CentersController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var centers = await _db.ResearchCenters
                .OrderBy(c => c.CenterName)
                .Select(c => new { c.CenterId, c.CenterName })
                .ToListAsync();
            return Ok(centers);
        }
    }
}
