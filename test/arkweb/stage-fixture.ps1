<#
.SYNOPSIS
Stage the real-ArkWeb regression app outside the source checkout.
.DESCRIPTION
Copies the current production entry/library, overlays the regression harness,
and creates a generic unsigned project. No build, signing, install or device
operation is performed. Private signing values are never printed.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory,
  [string]$BundleName = 'com.hreyulog.dsbridge.regression',
  [string]$CompileSdkVersion,
  [string]$SigningConfigPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$taskRepository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$taskOutput = [IO.Path]::GetFullPath($OutputDirectory)
$taskPrefix = $taskRepository.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
if ($taskOutput.Equals($taskRepository, [StringComparison]::OrdinalIgnoreCase) -or
    $taskOutput.StartsWith($taskPrefix, [StringComparison]::OrdinalIgnoreCase)) {
  throw 'OutputDirectory must be outside the source checkout.'
}
if ($BundleName -notmatch '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$') {
  throw 'BundleName must be a valid dotted bundle identifier.'
}

function Assert-NoReparseAncestor {
  param([string]$Path)
  $taskCurrentPath = [IO.Path]::GetFullPath($Path)
  while ($taskCurrentPath) {
    if (Test-Path -LiteralPath $taskCurrentPath) {
      $taskAncestor = Get-Item -LiteralPath $taskCurrentPath -Force
      if (($taskAncestor.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw 'Source and output paths must not traverse symbolic links or junctions.'
      }
    }
    $taskParentPath = [IO.Path]::GetDirectoryName($taskCurrentPath)
    if ($taskParentPath -eq $taskCurrentPath) { break }
    $taskCurrentPath = $taskParentPath
  }
}

Assert-NoReparseAncestor -Path $taskRepository
Assert-NoReparseAncestor -Path $taskOutput
if (Test-Path -LiteralPath $taskOutput) {
  if (!(Test-Path -LiteralPath $taskOutput -PathType Container) -or
      @(Get-ChildItem -LiteralPath $taskOutput -Force).Count -gt 0) {
    throw 'OutputDirectory already exists and is not an empty directory. Choose a new directory.'
  }
}

function Copy-ProjectTree {
  param([string]$From, [string]$To)
  Assert-NoReparseAncestor -Path $From
  New-Item -ItemType Directory -Path $To -Force | Out-Null
  foreach ($taskItem in Get-ChildItem -LiteralPath $From -Force) {
    if (($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
    if ($taskItem.PSIsContainer) {
      if ($taskItem.Name -in @('.git', '.hg', '.idea', '.hvigor', 'build',
          'node_modules', 'oh_modules', 'signing', 'certificates', 'certs')) { continue }
      Copy-ProjectTree -From $taskItem.FullName -To (Join-Path $To $taskItem.Name)
    } else {
      if ($taskItem.Name -in @('local.properties', '.env', '.env.local')) { continue }
      if ($taskItem.Extension.ToLowerInvariant() -in @('.p7b', '.p12', '.cer', '.crt',
          '.pem', '.key', '.jks', '.keystore')) { continue }
      Copy-Item -LiteralPath $taskItem.FullName -Destination (Join-Path $To $taskItem.Name)
    }
  }
}

function Remove-Json5Comments {
  param([string]$Text)
  $taskBuilder = [Text.StringBuilder]::new()
  $taskQuote = ''
  for ($taskPosition = 0; $taskPosition -lt $Text.Length; $taskPosition++) {
    $taskCharacter = $Text[$taskPosition]
    if ($taskQuote) {
      [void]$taskBuilder.Append($taskCharacter)
      if ($taskCharacter -eq '\' -and $taskPosition + 1 -lt $Text.Length) {
        $taskPosition++
        [void]$taskBuilder.Append($Text[$taskPosition])
      } elseif ([string]$taskCharacter -eq $taskQuote) { $taskQuote = '' }
    } elseif ($taskCharacter -eq '"' -or $taskCharacter -eq "'") {
      $taskQuote = [string]$taskCharacter
      [void]$taskBuilder.Append($taskCharacter)
    } elseif ($taskCharacter -eq '/' -and $taskPosition + 1 -lt $Text.Length -and $Text[$taskPosition + 1] -eq '/') {
      while ($taskPosition + 1 -lt $Text.Length -and $Text[$taskPosition + 1] -notin @("`r", "`n")) { $taskPosition++ }
    } elseif ($taskCharacter -eq '/' -and $taskPosition + 1 -lt $Text.Length -and $Text[$taskPosition + 1] -eq '*') {
      $taskPosition += 2
      while ($taskPosition + 1 -lt $Text.Length -and !($Text[$taskPosition] -eq '*' -and $Text[$taskPosition + 1] -eq '/')) { $taskPosition++ }
      $taskPosition++
      [void]$taskBuilder.Append(' ')
    } else { [void]$taskBuilder.Append($taskCharacter) }
  }
  return $taskBuilder.ToString()
}

function Read-SdkValue {
  param([string]$Text, [string]$Name)
  # Only read public scalar SDK fields. Never copy source signingConfigs.
  $taskPattern = '["\x27]?' + [regex]::Escape($Name) +
    '["\x27]?\s*:\s*(?:"([^"\r\n]*)"|\x27([^\x27\r\n]*)\x27|(\d+))'
  $taskMatch = [regex]::Match($Text, $taskPattern)
  if (!$taskMatch.Success) { return $null }
  foreach ($taskIndex in 1..3) {
    if ($taskMatch.Groups[$taskIndex].Success) {
      if ($taskIndex -eq 3) { return [int]$taskMatch.Groups[$taskIndex].Value }
      return $taskMatch.Groups[$taskIndex].Value
    }
  }
  return $null
}

function Write-JsonFile {
  param([string]$Path, [Object]$Value)
  $taskText = $Value | ConvertTo-Json -Depth 24
  [IO.File]::WriteAllText($Path, $taskText + [Environment]::NewLine,
    [Text.UTF8Encoding]::new($false))
}

$taskSourceProfile = Remove-Json5Comments -Text ([IO.File]::ReadAllText((Join-Path $taskRepository 'build-profile.json5')))
$taskCompatible = Read-SdkValue -Text $taskSourceProfile -Name 'compatibleSdkVersion'
$taskTarget = Read-SdkValue -Text $taskSourceProfile -Name 'targetSdkVersion'
$taskCompile = Read-SdkValue -Text $taskSourceProfile -Name 'compileSdkVersion'
$taskRuntime = Read-SdkValue -Text $taskSourceProfile -Name 'runtimeOS'
if ($null -eq $taskCompatible -or $null -eq $taskTarget) {
  throw 'Cannot determine source compatibleSdkVersion and targetSdkVersion.'
}
if ($CompileSdkVersion) { $taskCompile = $CompileSdkVersion }
if (!$taskRuntime) { $taskRuntime = 'HarmonyOS' }
$taskProduct = [ordered]@{
  name = 'default'; compatibleSdkVersion = $taskCompatible
  targetSdkVersion = $taskTarget; runtimeOS = $taskRuntime
}
if ($null -ne $taskCompile) { $taskProduct.compileSdkVersion = $taskCompile }
$taskProfile = [ordered]@{
  app = [ordered]@{
    signingConfigs = @(); products = @($taskProduct)
    buildModeSet = @([ordered]@{ name = 'debug' }, [ordered]@{ name = 'release' })
  }
  modules = @(
    [ordered]@{
      name = 'entry'; srcPath = './entry'
      targets = @([ordered]@{ name = 'default'; applyToProducts = @('default') })
    },
    [ordered]@{ name = 'library'; srcPath = './library' }
  )
}

# Optional private JSON config, supplied explicitly by the developer.
# Never echo parse exceptions: those can contain excerpts of private values.
if ($SigningConfigPath) {
  try {
    $taskPrivatePath = [IO.Path]::GetFullPath($SigningConfigPath)
    if ($taskPrivatePath.Equals($taskRepository, [StringComparison]::OrdinalIgnoreCase) -or
        $taskPrivatePath.StartsWith($taskPrefix, [StringComparison]::OrdinalIgnoreCase) -or
        $taskPrivatePath.StartsWith($taskOutput.TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar,
          [StringComparison]::OrdinalIgnoreCase)) {
      throw 'Private signing config must be outside the source and output projects.'
    }
    Assert-NoReparseAncestor -Path $taskPrivatePath
    $taskPrivateConfig = [IO.File]::ReadAllText($taskPrivatePath) | ConvertFrom-Json
    if ($taskPrivateConfig.signingConfigs -isnot [Array] -or
        @($taskPrivateConfig.signingConfigs).Count -eq 0 -or
        !$taskPrivateConfig.signingConfig -or
        $taskPrivateConfig.signingConfig -isnot [string]) {
      throw 'Invalid private config shape.'
    }
    $taskSigningNames = @()
    foreach ($taskSigningItem in $taskPrivateConfig.signingConfigs) {
      if (!$taskSigningItem.name -or $taskSigningItem.name -isnot [string] -or
          $taskSigningNames -contains $taskSigningItem.name) {
        throw 'Signing configuration names must be unique strings.'
      }
      $taskSigningNames += $taskSigningItem.name
      foreach ($taskMaterialPathName in @('storeFile', 'certpath', 'profile')) {
        $taskMaterialPath = $taskSigningItem.material.$taskMaterialPathName
        if ($taskMaterialPath -isnot [string] -or ![IO.Path]::IsPathRooted($taskMaterialPath) -or
            !(Test-Path -LiteralPath $taskMaterialPath -PathType Leaf)) {
          throw 'Signing material paths must be existing absolute file paths.'
        }
      }
    }
    if ($taskSigningNames -notcontains $taskPrivateConfig.signingConfig) {
      throw 'The selected signing configuration name must exist.'
    }
    $taskProfile.app.signingConfigs = @($taskPrivateConfig.signingConfigs)
    $taskProduct.signingConfig = $taskPrivateConfig.signingConfig
  } catch {
    throw 'Cannot load private signing config. Supply valid JSON with signingConfigs and signingConfig; use absolute material paths.'
  }
}

New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
foreach ($taskDirectory in @('entry', 'library', 'AppScope', 'hvigor')) {
  Copy-ProjectTree -From (Join-Path $taskRepository $taskDirectory) -To (Join-Path $taskOutput $taskDirectory)
}
foreach ($taskName in @('hvigorfile.ts', 'oh-package.json5', 'oh-package-lock.json5')) {
  $taskFile = Join-Path $taskRepository $taskName
  if (Test-Path -LiteralPath $taskFile -PathType Leaf) {
    Copy-Item -LiteralPath $taskFile -Destination (Join-Path $taskOutput $taskName)
  }
}
Copy-ProjectTree -From (Join-Path $PSScriptRoot 'overlay') -To $taskOutput
Write-JsonFile -Path (Join-Path $taskOutput 'build-profile.json5') -Value $taskProfile

$taskAppPath = Join-Path $taskOutput 'AppScope\app.json5'
$taskApp = [IO.File]::ReadAllText($taskAppPath) | ConvertFrom-Json
$taskApp.app.bundleName = $BundleName
Write-JsonFile -Path $taskAppPath -Value $taskApp

$taskCommit = 'unknown'
if (Get-Command git -ErrorAction SilentlyContinue) {
  $taskGitOutput = & git -C $taskRepository rev-parse HEAD 2>$null
  if ($LASTEXITCODE -eq 0 -and $taskGitOutput) { $taskCommit = $taskGitOutput.Trim() }
}
$taskTrackedPaths = @(
  Get-ChildItem -LiteralPath (Join-Path $taskOutput 'library\src') -File -Recurse
  Get-Item -LiteralPath (Join-Path $taskOutput 'library\index.ets')
  Get-ChildItem -LiteralPath (Join-Path $taskOutput 'entry\src\main\ets\regression') -File
  Get-Item -LiteralPath (Join-Path $taskOutput 'entry\src\main\ets\pages\Index.ets')
  Get-ChildItem -LiteralPath (Join-Path $taskOutput 'entry\src\main\resources\rawfile') -File |
    Where-Object { $_.Name -in @('dsbridge2.0.js', 'dsBridge3.0.js', 'regression.js', 'ds2.html', 'ds3.html') }
)
$taskHashes = @($taskTrackedPaths | ForEach-Object {
  [ordered]@{
    path = $_.FullName.Substring($taskOutput.Length + 1).Replace('\', '/')
    sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  }
})
Write-JsonFile -Path (Join-Path $taskOutput 'arkweb-fixture-manifest.json') -Value ([ordered]@{
  schemaVersion = 1; sourceGitCommit = $taskCommit
  bundleName = $BundleName; signingConfigured = [bool]$SigningConfigPath
  compatibleSdkVersion = $taskCompatible; targetSdkVersion = $taskTarget
  compileSdkVersion = $taskCompile; expectedCaseCounts = [ordered]@{ DS3 = 14; DS2 = 13 }
  files = $taskHashes
})

Write-Output "Staged ArkWeb fixture: $taskOutput"
Write-Output "Bundle: $BundleName"
Write-Output "Compatibility / target: $taskCompatible / $taskTarget"
Write-Output 'Production library and bundled scripts are copied from the current checkout; no build or device operation was performed.'
