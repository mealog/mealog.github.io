import { toPng } from "html-to-image";
import { blobToDataUrl } from "./image";

/** 모바일 GPU/canvas 한계 대비 — 초과 시 pixelRatio 를 낮춤 */
const MAX_CAPTURE_AREA_PX = 12_000_000;

async function ensureImagesDecoded(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")];
  await Promise.all(
    imgs.map(async (img) => {
      if (img.complete && img.naturalWidth === 0) {
        throw new Error("사진을 불러오지 못했습니다.");
      }
      if (!img.complete) {
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("사진을 불러오지 못했습니다."));
        });
      }
      try {
        await img.decode();
      } catch {
        /* 일부 환경에서 decode 미지원·실패 무시 */
      }
    }),
  );
}

/**
 * WebKit(아이폰·갤럭시 브라우저)에서 SVG foreignObject 경로로 넘길 때 `blob:` URL 이
 * 번들되지 않거나 `cacheBust` 쿼리로 깨지는 경우가 많아, 캡처 직전에 data URL 로 바꾼 뒤 되돌린다.
 */
async function inlineBlobImagesForCapture(root: HTMLElement): Promise<() => void> {
  const imgs = [...root.querySelectorAll("img")];
  const revert: Array<{ img: HTMLImageElement; src: string | null; srcset: string | null }> = [];

  const rollback = (): void => {
    for (const r of revert) {
      if (r.src !== null) r.img.setAttribute("src", r.src);
      else r.img.removeAttribute("src");
      if (r.srcset !== null) r.img.setAttribute("srcset", r.srcset);
      else r.img.removeAttribute("srcset");
    }
    revert.length = 0;
  };

  try {
    for (const img of imgs) {
      const srcAttr = img.getAttribute("src");
      if (!srcAttr?.startsWith("blob:")) continue;

      revert.push({
        img,
        src: img.getAttribute("src"),
        srcset: img.getAttribute("srcset"),
      });
      img.removeAttribute("srcset");

      const blob = await fetch(srcAttr).then((r) => {
        if (!r.ok) throw new Error("blob 이미지를 읽지 못했습니다.");
        return r.blob();
      });
      const dataUrl = await blobToDataUrl(blob);
      img.src = dataUrl;

      await new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) {
          resolve();
          return;
        }
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("인라인 이미지 표시 실패"));
      });
      try {
        await img.decode();
      } catch {
        /* noop */
      }
    }
  } catch (e) {
    rollback();
    throw e;
  }

  return rollback;
}

function choosePixelRatio(cssW: number, cssH: number): number {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2;
  let pr = Math.min(2, Math.max(1, dpr));
  const area = cssW * cssH;
  if (area <= 0) return 1;
  while (pr > 1 && area * pr * pr > MAX_CAPTURE_AREA_PX) {
    pr -= 0.25;
  }
  return Math.max(1, Math.round(pr * 4) / 4);
}

function drawEllipsisText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): void {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, 0, 0);
    return;
  }
  const ellipsis = "…";
  for (let i = text.length - 1; i > 0; i--) {
    const t = text.slice(0, i) + ellipsis;
    if (ctx.measureText(t).width <= maxWidth) {
      ctx.fillText(t, 0, 0);
      return;
    }
  }
  ctx.fillText(ellipsis, 0, 0);
}

async function captureElementToDataUrl(element: HTMLElement, pixelRatio: number): Promise<string> {
  return toPng(element, {
    pixelRatio,
    /** blob URL 에 쿼리를 붙이면 일부 모바일 WebKit 에서 깨짐 */
    cacheBust: false,
    backgroundColor: "#0f172a",
    skipFonts: true,
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      const cls = typeof node.className === "string" ? node.className : "";
      if (cls.includes("backdrop-blur")) return false;
      if (cls.includes("backdrop-saturate")) return false;
      return true;
    },
  });
}

/**
 * 식단 카드 DOM 을 PNG 로 만든 뒤 하단에 앱 URL 워터마크를 붙이고 공유 시트 또는 저장으로 넘긴다.
 */
export async function shareMealCardFromElement(
  element: HTMLElement,
  opts: {
    filename: string;
    promoUrl: string;
    shareTitle?: string;
    shareText?: string;
  },
): Promise<void> {
  const w = element.offsetWidth;
  const h = element.offsetHeight;
  if (w < 12 || h < 12) {
    throw new Error("캡처할 카드 영역이 비어 있어요. 보이는 카드에서 다시 시도해 주세요.");
  }

  const revertDom = await inlineBlobImagesForCapture(element);
  let dataUrl: string;
  try {
    await ensureImagesDecoded(element);

    const cssW = Math.max(element.clientWidth, w);
    const cssH = Math.max(element.clientHeight, h);
    let pr = choosePixelRatio(cssW, cssH);

    try {
      dataUrl = await captureElementToDataUrl(element, pr);
    } catch (first) {
      console.warn("[shareMealCardImage] toPng 실패, pixelRatio 1 재시도", first);
      if (pr <= 1) throw first;
      dataUrl = await captureElementToDataUrl(element, 1);
    }

    if (!dataUrl || dataUrl.length < 64) {
      throw new Error("PNG 데이터가 비어 있습니다.");
    }
  } catch (e) {
    console.error("[shareMealCardImage] 캡처 단계", e);
    throw new Error(
      e instanceof Error
        ? `이미지 변환 실패: ${e.message}`
        : "이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
    );
  } finally {
    revertDom();
  }

  const img = new Image();
  img.decoding = "async";
  img.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("워터마크 처리 중 이미지를 불러오지 못했습니다."));
  });

  const cssWForScale = Math.max(element.clientWidth, 280);
  const scale = img.width / cssWForScale;
  const barCss = 38;
  const barPx = Math.round(barCss * scale);

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height + barPx;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas 2d 를 사용할 수 없습니다.");

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, img.height, canvas.width, barPx);

  const fontPx = Math.max(11, Math.round(12 * scale));
  ctx.fillStyle = "#cbd5e1";
  ctx.font = `${fontPx}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  const line = `헬스헬스 — ${opts.promoUrl}`;
  const pad = Math.round(12 * scale);
  const maxW = canvas.width - pad * 2;
  ctx.save();
  ctx.translate(pad, img.height + barPx / 2);
  drawEllipsisText(ctx, line, maxW);
  ctx.restore();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG 생성 실패"))), "image/png");
  });

  const file = new File([blob], opts.filename, { type: "image/png" });

  if (typeof navigator.share === "function") {
    try {
      const payload: ShareData = {
        files: [file],
        title: opts.shareTitle ?? "헬스헬스 식단",
        text: opts.shareText ?? `헬스헬스 식단 기록 — ${opts.promoUrl}`,
      };
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload);
        return;
      }
    } catch (e) {
      const err = e as { name?: string };
      if (err?.name === "AbortError") return;
      console.warn("[shareMealCardImage] navigator.share", e);
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = opts.filename;
  a.click();
  URL.revokeObjectURL(url);
  alert(
    "이미지를 저장했어요.\n카카오톡·인스타 DM 등에서 사진 첨부로 보내보세요.\n(브라우저에 따라 바로 공유 시트가 안 뜰 수 있어요.)",
  );
}
