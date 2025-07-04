# 使用 SDK 镜像进行构建
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# 拷贝项目文件并还原依赖项
COPY *.csproj ./
RUN dotnet restore

# 拷贝所有源代码并发布
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# 使用运行时镜像构建最终镜像
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

# 设置监听端口（Render 默认监听 10000）
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000

ENTRYPOINT ["dotnet", "MyAspNetApi.dll"]

