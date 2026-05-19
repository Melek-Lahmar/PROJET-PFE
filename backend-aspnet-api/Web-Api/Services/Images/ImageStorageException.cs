namespace Web_Api.Services.Images
{
    public class ImageStorageException : Exception
    {
        public ImageStorageException(string message) : base(message)
        {
        }

        public ImageStorageException(string message, Exception innerException) : base(message, innerException)
        {
        }
    }
}