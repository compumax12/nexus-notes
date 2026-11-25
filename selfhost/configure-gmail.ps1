$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$secretDirectory = Join-Path $env:LOCALAPPDATA 'NexusNotes\secrets'
$secretPath = $null
$configured = $false
$securePassword = $null
$pointer = [IntPtr]::Zero
try {
    Write-Host 'Conectar Gmail a Nexus Notes'
    Write-Host 'Usa una contrasena de aplicacion de Google, no tu contrasena habitual.'
    $sender = Read-Host 'Correo remitente [tu-correo@ejemplo.com]'
    if ([string]::IsNullOrWhiteSpace($sender) -or $sender -eq 'tu-correo@ejemplo.com') { throw 'Introduce tu correo Gmail real; el marcador no es valido.' }
    $sender = $sender.Trim().ToLowerInvariant()
    if ($sender -notmatch '^[a-z0-9._%+-]+@gmail\.com$') { throw 'Introduce una direccion Gmail valida.' }
    $securePassword = Read-Host 'Contrasena de aplicacion (entrada oculta)' -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) -replace '\s', ''
    if ($plainPassword.Length -ne 16) { throw "Se recibieron $($plainPassword.Length) caracteres sin espacios; se necesitan 16. Copia solo la clave de aplicacion generada por Google, sin comillas." }
    if ($plainPassword -notmatch '^[a-zA-Z]{16}$') { throw 'La clave contiene caracteres inesperados. Copia solo las 16 letras de la contrasena de aplicacion generada por Google.' }
    New-Item -ItemType Directory -Path $secretDirectory -Force | Out-Null
    $secretPath = Join-Path $secretDirectory (([guid]::NewGuid().ToString()) + '.txt')
    # Create an empty file, restrict its ACL, and only then write the secret.
    New-Item -ItemType File -Path $secretPath | Out-Null
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().User
    $acl = New-Object Security.AccessControl.FileSecurity
    $acl.SetOwner($identity)
    $acl.SetAccessRuleProtection($true, $false)
    $rule = New-Object Security.AccessControl.FileSystemAccessRule($identity, 'FullControl', 'Allow')
    $acl.AddAccessRule($rule)
    Set-Acl -LiteralPath $secretPath -AclObject $acl
    [IO.File]::WriteAllText($secretPath, $plainPassword, (New-Object Text.UTF8Encoding($false)))
    $plainPassword = $null
    $env:NEXUS_SMTP_USER = $sender
    $env:NEXUS_SMTP_PASSWORD_FILE = $secretPath
    Write-Host 'Comprobando conexion TLS y autenticacion. No se enviaran mensajes.'
    & node (Join-Path $PSScriptRoot 'verify-gmail.mjs')
    if ($LASTEXITCODE -ne 0) { throw 'Google no acepto la conexion. Comprueba la contrasena de aplicacion y tu acceso a Internet.' }
    $portablePath = $secretPath.Replace('\', '/')
    $configuration = "NEXUS_SMTP_HOST=smtp.gmail.com`nNEXUS_SMTP_PORT=465`nNEXUS_SMTP_USER=$sender`nNEXUS_SMTP_PASSWORD_FILE=`"$portablePath`"`n"
    [IO.File]::WriteAllText((Join-Path $projectDirectory '.env.mail.local'), $configuration, (New-Object Text.UTF8Encoding($false)))
    $configured = $true
    Write-Host 'Gmail conectado. Reinicia Nexus Notes y prueba Olvide mi contrasena con tu cuenta registrada.' -ForegroundColor Green
    Write-Host 'Tu contrasena quedo fuera del proyecto y del archivo para GitHub.'
} catch {
    Write-Host 'No se completo la configuracion. No se cambio la configuracion anterior.' -ForegroundColor Red
    Write-Host $_.Exception.Message
} finally {
    if ($pointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    if ($securePassword) { $securePassword.Dispose() }
    $plainPassword = $null
    if (!$configured -and $secretPath -and (Test-Path -LiteralPath $secretPath)) { Remove-Item -LiteralPath $secretPath }
    Remove-Item Env:NEXUS_SMTP_PASSWORD_FILE -ErrorAction SilentlyContinue
    Remove-Item Env:NEXUS_SMTP_USER -ErrorAction SilentlyContinue
}
