@echo off
setlocal
if not defined NEXUS_DESKTOP_URL (
  if exist "%~dp0url.local.txt" (
    for /f "usebackq delims=" %%u in ("%~dp0url.local.txt") do set "NEXUS_DESKTOP_URL=%%u"
  )
)
cd /d "%~dp0.."
call npm run desktop
