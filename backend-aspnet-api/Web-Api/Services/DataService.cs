using System.Net.Http.Headers;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Web_Api.Services
{
    public class DataService
    {
        private static HttpClientHandler GetClientProxy()
        {
            var handler = new HttpClientHandler();
            handler.UseProxy = false;
            return handler;
        }

        public static async Task<string> SetObjects(string token, string url, JObject jObject)
        {
            try
            {
                string data = "";
                using (HttpClient http = new HttpClient(GetClientProxy()))
                {
                    //http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var json = JsonConvert.SerializeObject(jObject);
                    HttpContent httpContent = new StringContent(json);

                    httpContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
                    http.Timeout = TimeSpan.FromMinutes(30);

                    var response = await http.PostAsync(url, httpContent);
                    if (response != null)
                        data = response.Content.ReadAsStringAsync().Result;

                    return data ?? "";
                }
            }
            catch (Exception ex)
            {
                return "";
            }
        }
    }
}
