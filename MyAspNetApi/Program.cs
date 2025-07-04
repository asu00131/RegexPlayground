using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);
var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";

// Add services to the container.
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddPolicy(name: MyAllowSpecificOrigins,
                      policy =>
                      {
                          policy.WithOrigins("http://localhost:9002") // The frontend origin
                                .AllowAnyHeader()
                                .AllowAnyMethod();
                      });
});


var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Use CORS
app.UseCors(MyAllowSpecificOrigins);

// Define request and response records
record RegexRequest(string Regex, string TestString, string ReplacementString, bool IgnoreCase, bool Multiline, bool GlobalSearch);
record MatchResult(int Index, string[] Groups);
record RegexResponse(MatchResult[]? Matches, string? ReplacementResult, string? Error);


app.MapPost("/api/regex/process", (RegexRequest request) =>
{
    try
    {
        var options = RegexOptions.None;
        if (request.IgnoreCase) options |= RegexOptions.IgnoreCase;
        if (request.Multiline) options |= RegexOptions.Multiline;

        var regex = new Regex(request.Regex, options);

        MatchResult[] matchResults;

        if (request.GlobalSearch)
        {
            var matches = regex.Matches(request.TestString);
            matchResults = matches.Cast<Match>()
                .Select(m => new MatchResult(
                    m.Index,
                    m.Groups.Cast<Group>().Select(g => g.Value).ToArray()
                ))
                .ToArray();
        }
        else
        {
            var match = regex.Match(request.TestString);
            if (match.Success)
            {
                matchResults = new MatchResult[] {
                    new MatchResult(
                        match.Index,
                        match.Groups.Cast<Group>().Select(g => g.Value).ToArray()
                    )
                };
            }
            else
            {
                matchResults = System.Array.Empty<MatchResult>();
            }
        }
        
        var replacementResult = request.GlobalSearch
            ? regex.Replace(request.TestString, request.ReplacementString)
            : regex.Replace(request.TestString, request.ReplacementString, 1);
        
        return Results.Ok(new RegexResponse(matchResults, replacementResult, null));
    }
    catch (ArgumentException ex)
    {
        // Return a successful response with the error message for the client to display
        return Results.Ok(new RegexResponse(null, null, ex.Message));
    }
    catch (Exception ex)
    {
        // For other unexpected errors, return a problem response
        return Results.Problem(ex.Message);
    }
})
.WithName("ProcessRegex")
.WithOpenApi();

app.Run();
