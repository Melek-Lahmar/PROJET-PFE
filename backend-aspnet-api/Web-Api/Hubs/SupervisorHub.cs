using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Web_Api.Auth.Constants;

namespace Web_Api.Hubs
{
    [Authorize(Roles = AppRoles.SUPERVISEUR + "," + AppRoles.ADMIN)]
    public sealed class SupervisorHub : Hub
    {
    }
}
