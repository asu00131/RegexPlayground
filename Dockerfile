# STAGE 1: Build Environment
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies first.
# This leverages Docker's layer caching to speed up future builds.
COPY ["MyAspNetApi/MyAspNetApi.csproj", "MyAspNetApi/"]
RUN dotnet restore "MyAspNetApi/MyAspNetApi.csproj"

# Copy the rest of the source code
COPY . .
WORKDIR "/src/MyAspNetApi"

# Publish the application for release.
RUN dotnet publish "MyAspNetApi.csproj" -c Release -o /app/publish /p:UseAppHost=false


# STAGE 2: Runtime Environment
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app/publish .

# Expose the port the app runs on. Render will use this to route traffic.
EXPOSE 5000

# Set the entrypoint to run the application.
ENTRYPOINT ["dotnet", "MyAspNetApi.dll"]
