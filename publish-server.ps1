# Switch to net6 for server deployment
$csproj = "RupResearchAPI.csproj"
$content = Get-Content $csproj -Raw
$content = $content -replace '<TargetFramework>net8.0</TargetFramework>', "<TargetFramework>net6.0</TargetFramework>`n    <LangVersion>12.0</LangVersion>"
$content = $content -replace 'Version="8.0.0"', 'Version="6.0.36"'
Set-Content $csproj $content

Write-Host "Switched to .NET 6 for server" -ForegroundColor Yellow

# Build React
Set-Location frontend
npm run build 2>&1 | Select-Object -Last 2
Set-Location ..
Copy-Item "frontend\dist\*" "wwwroot\" -Recurse -Force

# Publish
dotnet publish -c Release -o publish --nologo 2>&1 | Select-Object -Last 2

# web.config
$wc = @'
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <location path="." inheritInChildApplications="false">
    <system.webServer>
      <handlers>
        <add name="aspNetCore" path="*" verb="*" modules="AspNetCoreModuleV2" resourceType="Unspecified" />
      </handlers>
      <aspNetCore processPath="dotnet" arguments=".\RupResearchAPI.dll" stdoutLogEnabled="false" stdoutLogFile=".\logs\stdout" hostingModel="inprocess" />
    </system.webServer>
  </location>
</configuration>
'@
[System.IO.File]::WriteAllText("publish\web.config", $wc, [System.Text.Encoding]::UTF8)

# Switch back to net8 for local dev
$content = Get-Content $csproj -Raw
$content = $content -replace '<TargetFramework>net6.0</TargetFramework>', '<TargetFramework>net8.0</TargetFramework>'
$content = $content -replace '<LangVersion>12.0</LangVersion>\r?\n\s*', ''
$content = $content -replace 'Version="6.0.36"', 'Version="8.0.0"'
Set-Content $csproj $content

Write-Host "Done! publish\ is ready. Switched back to .NET 8." -ForegroundColor Green
