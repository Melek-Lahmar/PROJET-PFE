namespace Web_Api.Services.Images
{
    public class ImageValidationException : Exception
    {
        public ImageValidationException(string message) : base(message)
        {
        }
    }
}