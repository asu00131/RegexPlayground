// ✅ 然后开始顶层语句
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace MyAspNetApi
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var MyAllowSpecificOrigins = "_myAllowSpecificOrigins";


            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();
            builder.Services.AddCors(options =>
            {
                options.AddPolicy(name: MyAllowSpecificOrigins, policy =>
                {
                    policy.AllowAnyOrigin()
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            var app = builder.Build();

            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors(MyAllowSpecificOrigins);

            app.MapPost("/api/regex/process", (RegexRequest request) =>
            {
                try
                {
                    var regexPattern = request.Regex ?? "";
                    var testString = request.TestString ?? "";
                    var replacementString = request.ReplacementString ?? "";

                    if (string.IsNullOrEmpty(regexPattern))
                    {
                        return Results.Ok(new RegexResponse(System.Array.Empty<MatchResult>(), testString, null));
                    }
                    
                    var options = RegexOptions.None;
                    if (request.IgnoreCase) options |= RegexOptions.IgnoreCase;
                    if (request.Multiline) options |= RegexOptions.Multiline;

                    var regex = new Regex(regexPattern, options);

                    MatchResult[] matchResults;

                    if (request.GlobalSearch)
                    {
                        var matches = regex.Matches(testString);
                        matchResults = matches.Cast<Match>()
                            .Select(m => new MatchResult(
                                m.Index,
                                m.Groups.Cast<Group>().Select(g => g.Value).ToArray()
                            ))
                            .ToArray();
                    }
                    else
                    {
                        var match = regex.Match(testString);
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
                        ? regex.Replace(testString, replacementString)
                        : regex.Replace(testString, replacementString, 1);

                    return Results.Ok(new RegexResponse(matchResults, replacementResult, null));
                }
                catch (ArgumentException ex)
                {
                    return Results.Ok(new RegexResponse(null, null, ex.Message));
                }
                catch (Exception ex)
                {
                    return Results.Problem(ex.Message);
                }
            })
            .WithName("ProcessRegex")
            .WithOpenApi();

            // ✅ 监听 0.0.0.0 以便 Firebase Studio 预览端口生效
            app.Run("http://0.0.0.0:5000");
        }

        // ✅ 类型声明必须放在类中
        public record RegexRequest(string? Regex, string? TestString, string? ReplacementString, bool IgnoreCase, bool Multiline, bool GlobalSearch);
        public record MatchResult(int Index, string[] Groups);
        public record RegexResponse(MatchResult[]? Matches, string? ReplacementResult, string? Error);
    }
}
