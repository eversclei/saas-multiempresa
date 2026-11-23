# Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY src/Saas.Api/Saas.Api.csproj src/Saas.Api/
RUN dotnet restore src/Saas.Api/Saas.Api.csproj
COPY src/ src/
RUN dotnet publish src/Saas.Api/Saas.Api.csproj -c Release -o /app --no-restore

# Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "Saas.Api.dll"]
