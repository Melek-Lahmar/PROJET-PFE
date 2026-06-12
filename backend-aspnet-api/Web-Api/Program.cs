using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.StaticFiles;
using Hangfire;
using Hangfire.SqlServer;
using Microsoft.AspNetCore.Authentication.Facebook;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Web_Api.Auth.Entities;
using Web_Api.Auth.Options;
using Web_Api.Auth.Seed;
using Web_Api.Auth.Services;
using Web_Api.data;
using Web_Api.Hubs;
using Web_Api.Options;
using Web_Api.Services;
using Web_Api.Services.Email;
using Web_Api.Services.Images;
using Web_Api.Services.Payments;
using Web_Api.Middleware;
using Web_Api.Services.Confirmatrice;
using Web_Api.Services.DevTest;
using Web_Api.Services.Geo;
using Web_Api.Services.Reclamations;
using Web_Api.Services.Refonte;
using Web_Api.Services.Dashboard;
using Web_Api.Services.Favorites;
using Web_Api.Services.B2B;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddSignalR();

builder.Services.AddHttpContextAccessor();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Web_Api", Version = "v1" });

    var securityScheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Description = "Entrez: Bearer {votre_token}",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = "Bearer"
        }
    };

    c.AddSecurityDefinition("Bearer", securityScheme);
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        { securityScheme, new[] { "Bearer" } }
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? "Server=(localdb)\\mssqllocaldb;Database=SageIntegrationDB;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlServer(connectionString);

    if (builder.Environment.IsDevelopment())
        options.EnableSensitiveDataLogging();
});

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        options.Password.RequiredLength = 6;
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    .AddDefaultTokenProviders();

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));

var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()
          ?? throw new Exception("Configuration Jwt manquante dans appsettings.json");

if (string.IsNullOrWhiteSpace(jwt.Key))
    throw new Exception("Jwt:Key est vide. Ajoute une clé dans appsettings.json");

var keyBytes = Encoding.UTF8.GetBytes(jwt.Key);

builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection("Cloudinary"));
builder.Services.Configure<KonnectOptions>(builder.Configuration.GetSection(KonnectOptions.SectionName));
builder.Services.Configure<SageOptions>(builder.Configuration.GetSection(SageOptions.SectionName));
builder.Services.Configure<SageX3Options>(builder.Configuration.GetSection(SageX3Options.SectionName));

builder.Services.AddScoped<IImageStorage, CloudinaryImageStorage>();
builder.Services.AddScoped<IEmailSenderService, BrevoSmtpEmailSender>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<BcToBlService>();
builder.Services.AddScoped<BonCommandeService>();
builder.Services.AddScoped<DocumentX3IntegrationService>();
builder.Services.AddScoped<KonnectPaymentService>();
builder.Services.AddScoped<IVirtualPaymentService, VirtualPaymentService>();

// Dashboard existant : conserver pour ne pas casser les anciens endpoints/services.
builder.Services.AddScoped<DashboardAggregationService>();

// Nouveau dashboard professionnel React : service utilisé par Controllers/Dashboard/DashboardController.cs.
builder.Services.AddScoped<IProDashboardAggregationService, ProDashboardAggregationService>();

builder.Services.AddScoped<Web_Api.Services.Admin.AdminDashboardService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminOrdersService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminDriversService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminConfirmatricesService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminClaimsService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminProductsService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminChatQueryService>();
builder.Services.AddScoped<Web_Api.Services.Admin.AdminChatAnalyzeService>();

// Singleton car les modèles ML.NET sont entraînés une fois par process.
// Le service crée son propre scope DI quand il a besoin du DbContext.
builder.Services.AddSingleton<Web_Api.Services.Admin.Prediction.PredictionService>();

// Orchestrateur du chatbot (remplace n8n) — Groq router + executor + formatter.
builder.Services.AddHttpClient<Web_Api.Services.Admin.GroqClient>(c =>
{
    c.Timeout = TimeSpan.FromSeconds(60);
});

builder.Services.AddScoped<Web_Api.Services.Admin.AdminChatOrchestratorService>();
builder.Services.AddScoped<HomepageService>();

// Module 4 — calcul HT/remise/total avec snapshot du taux B2B
builder.Services.AddScoped<OrderCalculatorService>();

// Module 7 — Homepage Builder (templates)
builder.Services.AddScoped<HomepageTemplateService>();

// Module 10 — App settings (cache 5 min)
builder.Services.AddScoped<AppSettingsService>();
builder.Services.AddScoped<Web_Api.Services.Sage.SageX3ConfigService>();

builder.Services.AddMemoryCache();
builder.Services.AddScoped<ReclamationsService>();
builder.Services.AddScoped<ReclamationPhotoStorageService>();
builder.Services.AddScoped<DevTestDataSeeder>();
builder.Services.AddScoped<RealisticFullDatabaseSeeder>();
builder.Services.AddScoped<ConfirmatriceStatusService>();
builder.Services.AddScoped<Web_Api.Services.Confirmatrice.CommandeConfirmationLockService>();

// Module 5 — purge proactive toutes les 60s des verrous stale (>15 min).
builder.Services.AddHostedService<Web_Api.Services.Confirmatrice.StaleLockCleanupHostedService>();

builder.Services.AddScoped<Web_Api.Services.Orders.CustomerTrackingBuilder>();
builder.Services.AddScoped<ClientFavoritesService>();
builder.Services.AddScoped<QuoteService>();

// Phase 3C — scan toutes les 5 min : libération cas inactifs + reprise orphelins.
builder.Services.AddHostedService<Web_Api.Services.Reclamations.ReclamationRedistributionHostedService>();

builder.Services.AddScoped<Web_Api.Services.Avis.AvisService>();
builder.Services.AddScoped<Web_Api.Services.Livreur.CommandePoolService>();
builder.Services.AddScoped<IDepotZoneService, DepotZoneService>();
builder.Services.AddScoped<IStockTransferService, StockTransferService>();
builder.Services.AddScoped<ITransitAccountProvisioningService, TransitAccountProvisioningService>();
builder.Services.AddScoped<ITransitOrchestrationService, TransitOrchestrationService>();
builder.Services.AddScoped<IOrderTimelineService, OrderTimelineService>();
builder.Services.AddScoped<ISupervisorAlertService, SupervisorAlertService>();

// Section 1.1 — DepotIncrementJob (Hangfire) + Section 5.4 — ProactiveInsightsJob
builder.Services.AddScoped<Web_Api.Services.Livreur.DepotIncrementJob>();

// T-10 / T-03 — Jobs Hangfire transit
builder.Services.AddScoped<Web_Api.Services.Jobs.TransitRetryAssignmentJob>();
builder.Services.AddScoped<Web_Api.Services.Jobs.TransitEscalation24hJob>();

// Section 1.3 — Sms gateway selon config "Sms:Provider" (Mock par défaut)
builder.Services.AddSingleton<Web_Api.Services.Sms.ISmsGateway>(sp =>
{
    var cfg = sp.GetRequiredService<IConfiguration>();
    var provider = cfg["Sms:Provider"] ?? "Mock";

    return provider.Equals("TunisieTelecom", StringComparison.OrdinalIgnoreCase)
        ? new Web_Api.Services.Sms.TunisieTelecomSmsGateway(
            cfg,
            sp.GetRequiredService<IHttpClientFactory>(),
            sp.GetRequiredService<ILogger<Web_Api.Services.Sms.TunisieTelecomSmsGateway>>())
        : new Web_Api.Services.Sms.MockSmsGateway(
            sp.GetRequiredService<ILogger<Web_Api.Services.Sms.MockSmsGateway>>());
});

builder.Services.AddHttpClient();
builder.Services.AddScoped<Web_Api.Services.Sms.SmsNotificationService>();

// Section 1.5 — KbProvider + KbGenerator (HostedService au boot)
builder.Services.AddSingleton<Web_Api.Services.Admin.Chat.KbProvider>();
builder.Services.AddHostedService<Web_Api.Services.Admin.Chat.KbGeneratorService>();

// Section 5.3 — détection langue chatbot
builder.Services.AddSingleton<Web_Api.Services.Admin.Chat.LanguageDetectorService>();

// Section 5.4 — proactive insights job
builder.Services.AddScoped<Web_Api.Services.Admin.Chat.ProactiveInsightsJob>();

// Section 3.11 — push FCM
builder.Services.AddScoped<Web_Api.Services.Push.PushNotificationService>();

// Section 4.7 — exports Excel/PDF
builder.Services.AddScoped<Web_Api.Services.Admin.Export.ExportService>();

// Module Impression — PDF BL/Manifeste + paramètres d'impression
builder.Services.AddScoped<Web_Api.Services.Print.BlPdfService>();

// Chantier 1 Géo — polygones de validation des délégations (chargement au boot via IHostedService).
builder.Services.AddSingleton<GeoPolygonService>();
builder.Services.AddSingleton<IGeoPolygonService>(sp => sp.GetRequiredService<GeoPolygonService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<GeoPolygonService>());

const string ExternalScheme = "External";

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(keyBytes),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    })
    .AddCookie(ExternalScheme, options =>
    {
        options.Cookie.Name = "melek.external";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
        options.SlidingExpiration = false;
    })
    .AddGoogle(GoogleDefaults.AuthenticationScheme, options =>
    {
        options.SignInScheme = ExternalScheme;
        options.ClientId = builder.Configuration["ExternalAuth:Google:ClientId"] ?? "";
        options.ClientSecret = builder.Configuration["ExternalAuth:Google:ClientSecret"] ?? "";
        options.CallbackPath = "/signin-google";
        options.SaveTokens = true;

        options.CorrelationCookie.HttpOnly = true;
        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
        options.CorrelationCookie.SameSite = SameSiteMode.None;
        options.CorrelationCookie.Name = "melek.google.correlation";

        options.Events.OnRemoteFailure = context =>
        {
            context.HandleResponse();

            var message = Uri.EscapeDataString(context.Failure?.Message ?? "Échec OAuth Google.");
            context.Response.Redirect($"/api/auth/external/failure?provider=google&message={message}");

            return Task.CompletedTask;
        };
    })
    .AddFacebook(FacebookDefaults.AuthenticationScheme, options =>
    {
        options.SignInScheme = ExternalScheme;
        options.AppId = builder.Configuration["ExternalAuth:Facebook:AppId"] ?? "";
        options.AppSecret = builder.Configuration["ExternalAuth:Facebook:AppSecret"] ?? "";
        options.CallbackPath = "/signin-facebook";
        options.SaveTokens = true;

        options.CorrelationCookie.HttpOnly = true;
        options.CorrelationCookie.SecurePolicy = CookieSecurePolicy.Always;
        options.CorrelationCookie.SameSite = SameSiteMode.None;
        options.CorrelationCookie.Name = "melek.facebook.correlation";

        options.Events.OnRemoteFailure = context =>
        {
            context.HandleResponse();

            var message = Uri.EscapeDataString(context.Failure?.Message ?? "Échec OAuth Facebook.");
            context.Response.Redirect($"/api/auth/external/failure?provider=facebook&message={message}");

            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("RequireSupervisor", policy =>
        policy.RequireRole(Web_Api.Auth.Constants.AppRoles.SUPERVISEUR, Web_Api.Auth.Constants.AppRoles.ADMIN));
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowDev", policy =>
    {
        // En dev, accepte tout http(s)://localhost:* et http(s)://127.0.0.1:*.
        // Évite de devoir mettre à jour la whitelist chaque fois que Vite
        // bascule sur un autre port (5173 → 5174 → 5175 quand le port est occupé).
        policy
            .SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin))
                    return false;

                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    var host = uri.Host;

                    if (host == "localhost" || host == "127.0.0.1")
                        return true;

                    // Émulateur Android (Flutter) loopback host
                    if (host == "10.0.2.2")
                        return true;
                }

                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddHttpClient<SageService>((sp, client) =>
{
    var sage = sp.GetRequiredService<IOptions<SageOptions>>().Value;
    var rawUrl = string.IsNullOrWhiteSpace(sage.BaseUrl) ? "http://localhost:8124/" : sage.BaseUrl;

    if (!rawUrl.EndsWith('/'))
        rawUrl += "/";

    client.BaseAddress = new Uri(rawUrl);
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

    if (sage.HasBasicAuth)
    {
        var raw = $"{sage.Username}:{sage.Password}";
        var b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(raw));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Basic", b64);
    }
})
.ConfigurePrimaryHttpMessageHandler(() =>
{
    return new HttpClientHandler
    {
        ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
    };
});

builder.Services.AddHttpClient<IKonnectClient, KonnectClient>((sp, client) =>
{
    var options = sp.GetRequiredService<IOptions<KonnectOptions>>().Value;
    client.BaseAddress = new Uri(options.ResolveApiBaseUrl());
    client.Timeout = TimeSpan.FromSeconds(45);
    client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
});

// Section 1.1 + 5.4 — Hangfire (DepotIncrementJob 00:00 + ProactiveInsightsJob 30 min)
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseSqlServerStorage(connectionString, new SqlServerStorageOptions
    {
        CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
        SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
        QueuePollInterval = TimeSpan.Zero,
        UseRecommendedIsolationLevel = true,
        DisableGlobalLocks = true,
        PrepareSchemaIfNecessary = true,
    }));

builder.Services.AddHangfireServer();

// QuestPDF community licence (gratuit pour usage non-commercial / PFE)
QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;

// Section 1.2 — IdempotencyMiddleware DI
builder.Services.AddScoped<Web_Api.Middleware.IdempotencyMiddleware>();

// Filet global d'exception (cf. GlobalExceptionMiddleware.cs)
builder.Services.AddScoped<Web_Api.Middleware.GlobalExceptionMiddleware>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
    await IdentitySeeder.SeedRolesAsync(roleManager);

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    await IdentitySeeder.SeedDevUsersAsync(userManager, db);

    // 1.B — Garantit la ligne F_APP_CONFIG Id=1 (singleton thème).
    await IdentitySeeder.SeedAppConfigAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// IMPORTANT : ce middleware doit être enregistré tôt pour capturer aussi
// les exceptions de UseAuthentication / UseAuthorization / pipelines en aval.
app.UseMiddleware<Web_Api.Middleware.GlobalExceptionMiddleware>();

app.UseCors("AllowDev");

// Sert /assets/*, /vite.svg, /logo-mytek.png, ... avec un cache long.
// Mais pour index.html (et /), on force `no-cache` plus bas via MapFallbackToFile
// — sinon le navigateur sert une vieille version qui référence un ancien bundle JS,
// et les corrections de l'API ne sont jamais visibles.
// Enregistrer les types MIME pour HEIC/HEIF (photos iOS) que le provider par défaut ignore.
var mimeProvider = new FileExtensionContentTypeProvider();
mimeProvider.Mappings[".heic"] = "image/heic";
mimeProvider.Mappings[".heif"] = "image/heif";

app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = mimeProvider,
    OnPrepareResponse = ctx =>
    {
        var path = ctx.File.Name;

        if (string.Equals(path, "index.html", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers["Pragma"] = "no-cache";
            ctx.Context.Response.Headers["Expires"] = "0";
        }
    }
});

app.UseAuthentication();

app.UseAuthorization();

app.UseMiddleware<ConfirmatriceActivityMiddleware>();

// Section 1.2 — Idempotence X-Client-Action-Id sur POST /api/livreur/* et POST /api/client/*
app.UseMiddleware<Web_Api.Middleware.IdempotencyMiddleware>();

app.MapControllers();
app.MapHub<ReclamationHub>("/hubs/reclamations");
app.MapHub<SupervisorHub>("/hubs/supervisor");

// SPA fallback — sert le React (wwwroot/index.html) pour toute route non-API.
// /api/*, /hubs/*, /hangfire restent gérés par leurs handlers respectifs car
// MapControllers/MapHub/UseHangfireDashboard sont enregistrés avant.
//
// On utilise un handler custom (au lieu du raccourci MapFallbackToFile) pour
// pouvoir poser `Cache-Control: no-cache` — sinon le navigateur garde la vieille
// version d'index.html et continue à charger un bundle JS périmé après chaque
// redéploiement (les pages affichent "erreur de chargement" car le bundle
// référence des endpoints qui ont changé).
app.MapFallback(async context =>
{
    var webRoot = context.RequestServices.GetRequiredService<IWebHostEnvironment>().WebRootPath;
    var indexPath = Path.Combine(webRoot, "index.html");

    context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
    context.Response.Headers["Pragma"] = "no-cache";
    context.Response.Headers["Expires"] = "0";
    context.Response.ContentType = "text/html; charset=utf-8";

    await context.Response.SendFileAsync(indexPath);
});

// Section 1.1 + 5.4 — Hangfire
app.UseHangfireDashboard("/hangfire", new Hangfire.DashboardOptions
{
    Authorization = new[] { new Web_Api.Auth.HangfireAdminAuthFilter() }
});

using (var scope2 = app.Services.CreateScope())
{
    Hangfire.RecurringJob.AddOrUpdate<Web_Api.Services.Livreur.DepotIncrementJob>(
        Web_Api.Services.Livreur.DepotIncrementJob.JobId,
        job => job.RunAsync(),
       
        "0 23 * * *", 
        new Hangfire.RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Utc
        });

    Hangfire.RecurringJob.AddOrUpdate<Web_Api.Services.Admin.Chat.ProactiveInsightsJob>(
        Web_Api.Services.Admin.Chat.ProactiveInsightsJob.JobId,
        job => job.RunAsync(),
        "*/30 * * * *",
        new Hangfire.RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Utc
        });

    // T-10 — Relance affectation transit toutes les 5 minutes
    Hangfire.RecurringJob.AddOrUpdate<Web_Api.Services.Jobs.TransitRetryAssignmentJob>(
        Web_Api.Services.Jobs.TransitRetryAssignmentJob.JobId,
        job => job.RunAsync(),
        "*/5 * * * *",
        new Hangfire.RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Utc
        });

    // T-03 — Escalade 24h sans affectation, toutes les heures
    Hangfire.RecurringJob.AddOrUpdate<Web_Api.Services.Jobs.TransitEscalation24hJob>(
        Web_Api.Services.Jobs.TransitEscalation24hJob.JobId,
        job => job.RunAsync(),
        "0 * * * *",
        new Hangfire.RecurringJobOptions
        {
            TimeZone = TimeZoneInfo.Utc
        });
}

app.Run();
