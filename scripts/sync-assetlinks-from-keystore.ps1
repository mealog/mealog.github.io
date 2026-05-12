# twa-android/android.keystore 의 SHA-256 을 읽어 public/.well-known/assetlinks.json 을 갱신합니다.
#
#   $env:BUBBLEWRAP_KEYSTORE_PASSWORD = '키스토어 비밀번호'
#   npm run assetlinks:sync
#
# Play 앱 서명만 쓰는 경우: 콘솔의 "앱 서명 인증서" SHA-256 과 이 스크립트 결과(업로드 키)가 다를 수 있습니다.
# 다르면 assetlinks.json 에 Play 가 안내하는 지문을 추가 항목으로 넣으세요.

param(
  [string]$Keystore = "",
  [string]$StorePass = "",
  [string]$Alias = "",
  [string]$PackageName = ""
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$manifestPath = Join-Path $repoRoot "twa-android\twa-manifest.json"
$outPath = Join-Path $repoRoot "public\.well-known\assetlinks.json"

if (-not $Keystore) {
  $Keystore = Join-Path $repoRoot "twa-android\android.keystore"
}
if (-not $StorePass) {
  $StorePass = $env:BUBBLEWRAP_KEYSTORE_PASSWORD
}

if (-not (Test-Path -LiteralPath $manifestPath)) {
  Write-Error "twa-manifest.json 없음: $manifestPath"
}
$mf = Get-Content -LiteralPath $manifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $PackageName) { $PackageName = $mf.packageId }
if (-not $Alias) { $Alias = $mf.signingKey.alias }

if (-not (Test-Path -LiteralPath $Keystore)) {
  Write-Error "키스토어 없음: $Keystore`n먼저 twa-android\create-keystore.ps1 를 실행하세요."
}
if (-not $StorePass) {
  Write-Error "환경 변수 BUBBLEWRAP_KEYSTORE_PASSWORD 를 설정하세요."
}

$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
  Write-Error "keytool 을 찾을 수 없습니다. JDK 를 설치하고 PATH 에 포함하세요."
}

$out = & keytool -list -v -keystore $Keystore -storepass $StorePass -alias $Alias 2>&1 | Out-String
if (-not $?) {
  Write-Error "keytool 실패: $out"
}

if ($out -notmatch '(?m)SHA256:\s*((?:[0-9A-Fa-f]{2}:)+[0-9A-Fa-f]{2})') {
  Write-Error "SHA256 줄을 찾지 못했습니다. keytool 출력을 확인하세요."
}
$fingerprint = $Matches[1].Trim().ToUpperInvariant()

$jsonObj = @(
  @{
    relation = @("delegate_permission/common.handle_all_urls")
    target     = @{
      namespace              = "android_app"
      package_name           = $PackageName
      sha256_cert_fingerprints = @($fingerprint)
    }
  }
)
$json = $jsonObj | ConvertTo-Json -Depth 6
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($outPath, $json + "`n", $utf8NoBom)
Write-Host "작성됨: $outPath"
Write-Host "  package_name: $PackageName"
Write-Host "  SHA256:       $fingerprint"
Write-Host "다음: npm run build 후 배포해 https://muklog.github.io/.well-known/assetlinks.json 을 확인하세요."
