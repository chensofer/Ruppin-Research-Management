# Switch to net8 for local development
$csproj = "RupResearchAPI.csproj"
$content = Get-Content $csproj -Raw
$content = $content -replace '<TargetFramework>net6.0</TargetFramework>', '<TargetFramework>net8.0</TargetFramework>'
$content = $content -replace '<LangVersion>12.0</LangVersion>\r?\n\s*', ''
$content = $content -replace 'Version="6.0.36"', 'Version="8.0.0"'
Set-Content $csproj $content

Write-Host "Switched to .NET 8 for local run" -ForegroundColor Green

# Start backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; dotnet run" -WindowStyle Normal

# Start frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\frontend'; npm run dev" -WindowStyle Normal

Write-Host "Starting... open http://localhost:5173 in ~10 seconds" -ForegroundColor Cyan
