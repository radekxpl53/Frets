```
using Frets.Infrastructure.Persistence;
using Frets.Infrastructure.Persistence.Seeders;
using Frets.Infrastructure.Services;
using Frets.Core.Validators.Auth;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Scalar.AspNetCore;
using System.IdentityModel.Tokens.Jwt;

Microsoft.IdentityModel.Logging.IdentityModelEventSource.ShowPII = true;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = false,
            ValidateIssuerSigningKey = false,
            SignatureValidator = (token, parameters) => new JwtSecurityToken(token)
        };
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                Console.WriteLine($"Auth failed: {context.Exception.Message}");
                var authHeader = context.Request.Headers["Authorization"].ToString();
                Console.WriteLine($"Authorization header: '{authHeader}'");
                return Task.CompletedTask;
            },
        };
    });

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<SongService>();

builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<RegisterRequestValidator>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    Console.WriteLine("Seeding chords...");
    await ChordSeeder.SeedAsync(db);
    Console.WriteLine("Seeding levels...");
    await LevelThresholdSeeder.SeedAsync(db);
    Console.WriteLine("Seeding done.");
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.WithHttpBearerAuthentication(bearer =>
        {
            bearer.Token = "";
        });
    });
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();