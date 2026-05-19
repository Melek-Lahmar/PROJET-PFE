using Microsoft.AspNetCore.Mvc;
using Web_Api.Services;

namespace Web_Api.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestController : ControllerBase
    {
        private readonly SageService _sageService;

        public TestController(SageService sageService)
        {
            _sageService = sageService;
        }

        [HttpGet("articles")]
        public async Task<IActionResult> TestArticles()
        {
            try
            {
                var articles = await _sageService.GetArticlesFromSage();
                return Ok(new
                {
                    Success = true,
                    Count = articles.Count,
                    Sample = articles.Take(3).Select(a => new { a.AR_Ref, a.AR_Design, a.AR_PrixVen })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    Success = false,
                    Error = ex.Message
                });
            }
        }
    }
}