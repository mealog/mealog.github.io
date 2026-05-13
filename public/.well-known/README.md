# Digital Asset Links (`assetlinks.json`)

## TWA에서 로고만 보이고 멈출 때

거의 항상 **`https://muklog.github.io/.well-known/assetlinks.json` 의 SHA-256이 실제 앱 서명과 맞지 않을 때**입니다.  
(예: 레포에 **0으로만 된 플레이스홀더**가 배포된 채로 두면 Chrome이 도메인 검증에 실패해 스플래시에서 진행하지 않습니다.)

1. Play Console → **출시** → **설정** → **앱 무결성** → **앱 서명 키 인증서**의 **SHA-256** 을 복사합니다.  
2. 로컬에서 아래를 실행합니다. (`PLAY_APP_SIGNING_SHA256` 에 콘솔 값을 넣으면 업로드 키 지문과 **둘 다** JSON에 들어갑니다.)

```powershell
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = '키스토어 비밀번호'
$env:PLAY_APP_SIGNING_SHA256 = '콘솔에서 복사한 SHA256'   # 콜론 있/없음 모두 가능
npm run assetlinks:sync
npm run build
```

3. GitHub Pages에 배포한 뒤, 브라우저에서 `assetlinks.json` 이 올바른 배열인지 확인합니다.

---

TWA(Trusted Web Activity)가 **주소창 없이** `https://muklog.github.io` 를 열 때, 앱 서명과 이 파일의 SHA-256 이 일치해야 합니다.

## 지금 올라간 값

- **package_name**: `twa-android/twa-manifest.json` 의 `packageId` 와 맞춰 두었습니다 (`io.github.muklog.app`).
- **sha256_cert_fingerprints**: 키스토어가 생기기 전에는 **플레이스홀더(0만 64자)** 일 수 있습니다. 아래 명령으로 **로컬 키스토어** 지문을 넣을 수 있고, Play 앱 서명 지문은 콘솔 값과 병행하세요.

## 자동 갱신 (권장)

```powershell
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = '키스토어 비밀번호'
npm run assetlinks:sync
```

→ `public/.well-known/assetlinks.json` 이 갱신됩니다. 이후 `npm run build` 로 배포하세요.

## 수동 작업 순서

1. Bubblewrap / `twa-manifest.json` 의 **패키지명**이 `assetlinks.json` 의 `package_name` 과 일치하는지 확인합니다.
2. Play 전용 지문이 필요하면 `sha256_cert_fingerprints` 배열에 항목을 추가합니다.
3. 브라우저에서 `https://muklog.github.io/.well-known/assetlinks.json` 이 **200**·**JSON 배열**인지 확인합니다.

자세한 설명은 저장소 **`docs/play-android-twa.md`** 를 참고하세요.
