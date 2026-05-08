# muklog TWA — Bubblewrap update + build (AAB/APK)
# 사전: JDK 17, Node.js
# 한 번만 비밀번호 지정:
#   $env:BUBBLEWRAP_KEYSTORE_PASSWORD = '...'
#   $env:BUBBLEWRAP_KEY_PASSWORD      = '...'
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:BUBBLEWRAP_KEYSTORE_PASSWORD -or -not $env:BUBBLEWRAP_KEY_PASSWORD) {
  Write-Error @"
서명용 비밀번호를 설정한 뒤 다시 실행하세요. 예:
  `$env:BUBBLEWRAP_KEYSTORE_PASSWORD = '비밀번호1'
  `$env:BUBBLEWRAP_KEY_PASSWORD      = '비밀번호2'
"@
}

if (-not (Test-Path ".\android.keystore")) {
  Write-Host ">>> keystore 없음 — create-keystore.ps1 실행"
  & "$PSScriptRoot\create-keystore.ps1"
}

Write-Host ">>> bubblewrap update (Gradle 프로젝트 생성/갱신)"
npx --yes @bubblewrap/cli@latest update

Write-Host ">>> bubblewrap build (AAB/APK)"
npx --yes @bubblewrap/cli@latest build

Write-Host ">>> 완료. 같은 폴더에 app-release-bundle.aab 등이 생깁니다."
