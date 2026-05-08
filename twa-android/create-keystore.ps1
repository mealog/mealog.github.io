# JDK 의 keytool 이 PATH 에 있어야 합니다 (OpenJDK 17 권장).
# 사용 예: .\create-keystore.ps1
$ErrorActionPreference = "Stop"
$keystore = Join-Path $PSScriptRoot "android.keystore"
if (Test-Path $keystore) {
  Write-Host "이미 존재: $keystore"
  exit 0
}
$storePass = $env:BUBBLEWRAP_KEYSTORE_PASSWORD
$keyPass = $env:BUBBLEWRAP_KEY_PASSWORD
if (-not $storePass -or -not $keyPass) {
  Write-Error "먼저 환경 변수를 설정하세요 (PowerShell 예시):`n  `$env:BUBBLEWRAP_KEYSTORE_PASSWORD='강한비밀번호'`n  `$env:BUBBLEWRAP_KEY_PASSWORD='같거나다른강한비밀번호'"
  exit 1
}
$keytool = Get-Command keytool -ErrorAction SilentlyContinue
if (-not $keytool) {
  Write-Error "keytool 을 찾을 수 없습니다. JDK 17 을 설치하고 PATH 에 포함되게 하세요."
}
& keytool -genkeypair -v `
  -keystore $keystore `
  -alias muklog `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storetype PKCS12 `
  -storepass $storePass `
  -keypass $keyPass `
  -dname "CN=Muklog, OU=App, O=Muklog, L=Seoul, ST=Seoul, C=KR"
Write-Host "생성됨: $keystore"
