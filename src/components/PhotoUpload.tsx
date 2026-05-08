import { useId, useRef, useState, type RefObject } from "react";
import { Camera, ImagePlus, Loader2 } from "lucide-react";
import { compressImage, type CompressOptions } from "../lib/image";
import { shouldOmitCaptureOnFileInputs } from "../lib/filePickerCapabilities";
import { cls } from "../lib/utils";

const GALLERY_FILE_ACCEPT = "image/*";

interface Props {
  /** 처리 후 호출 - photo / thumbnail 둘 다 압축된 Blob */
  onPicked: (photo: Blob, thumbnail: Blob) => void | Promise<void>;
  /** 갤러리에서 여러 장 선택 허용(순서대로 onPicked 호출) */
  multipleGallery?: boolean;
  label?: string;
  className?: string;
  /** 기본 후면 카메라 우선 모드(non-통합 선택기 에서만 capture 로 반영됨). */
  preferCamera?: boolean;
  variant?: "primary" | "ghost";
  disabled?: boolean;
  compressOptions?: CompressOptions;
  /** 인스타그램처럼 정사각형(가운데 크롭)으로 저장 — 식사 사진에 사용 */
  square?: boolean;
}

function clearInputs(refs: Array<RefObject<HTMLInputElement | null>>) {
  for (const r of refs) {
    if (r.current) r.current.value = "";
  }
}

/** display:none 은 일부 삼성·WebView 에서 깨져 sr-only 로 직사각 탭 영역만 가림 */
export default function PhotoUpload({
  onPicked,
  multipleGallery = false,
  label = "사진 업로드",
  className,
  preferCamera = true,
  variant = "primary",
  disabled,
  compressOptions,
  square = false,
}: Props) {
  const unifyPicker = shouldOmitCaptureOnFileInputs();
  const camInputId = useId();
  const galInputId = useId();
  const unifiedInputId = useId();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const unifiedRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);

  async function processOne(file: File) {
    if (!file.size) {
      throw new Error("사진이 아직 준비되지 않았거나 빈 파일입니다. 잠시 후 다시 선택해 주세요.");
    }
    const compressed = await compressImage(file, {
      maxDimension: 1280,
      quality: 0.85,
      square,
      ...compressOptions,
    });
    const thumb = await compressImage(compressed, {
      maxDimension: 320,
      quality: 0.7,
      square,
    });
    await onPicked(compressed, thumb);
  }

  async function handleFiles(
    fileList: FileList | File[] | null | undefined,
    clearRefs: Array<RefObject<HTMLInputElement | null>>,
  ) {
    const files = Array.from(fileList ?? []).filter((f) => f && f.size > 0);
    if (files.length === 0) return;
    setBusy(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        if (files.length > 1) setBusyLabel(`${i + 1}/${files.length}`);
        try {
          await processOne(file);
        } catch (e) {
          console.error("[PhotoUpload] 사진 처리 실패", e, {
            name: file.name,
            size: file.size,
            type: file.type,
            unifyPicker,
          });
          const detail = e instanceof Error ? e.message : String(e);
          alert(
            `이미지를 처리하지 못했습니다.\n${detail}\n\n다른 방법으로 같은 사진을 다시 선택하거나 JPG/PNG 로 저장된 뒤 시도해 보세요.`,
          );
        }
      }
    } finally {
      setBusy(false);
      setBusyLabel(null);
      clearInputs(clearRefs);
    }
  }

  const btnClass = variant === "primary" ? "btn-primary" : "btn-secondary";
  const galleryAria =
    multipleGallery === true ? "갤러리에서 선택 (여러 장 가능)" : "갤러리·사진에서 선택";

  const blocked = !!(disabled || busy);

  /** 삼성·standalone — capture 불사용, 레이블-직연결 하나로 시스템 선택기 오픈 (카메라/앨범 포함) */
  if (unifyPicker) {
    const mainLine = multipleGallery ? "여러 장 선택·추가" : label;
    const subHint = "아래에서 카메라·앨범·내 파일 등을 고를 수 있어요";
    return (
      <div className={cls("flex gap-2", className)}>
        <label
          htmlFor={unifiedInputId}
          onPointerDown={() => clearInput(unifiedRef.current)}
          className={cls(
            btnClass,
            "flex min-h-[3rem] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 px-2 py-2 text-center",
            blocked && "pointer-events-none opacity-55",
          )}
        >
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin shrink-0" aria-hidden />
              <span>{busyLabel ? `처리 중… ${busyLabel}` : "처리 중…"}</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium">
                <Camera size={18} aria-hidden />
                <ImagePlus size={17} className="opacity-75" aria-hidden />
                <span>{mainLine}</span>
              </span>
              <span className="max-w-[16rem] text-[10px] font-normal leading-snug opacity-75">{subHint}</span>
            </>
          )}
        </label>
        <input
          ref={unifiedRef}
          id={unifiedInputId}
          type="file"
          accept={GALLERY_FILE_ACCEPT}
          multiple={multipleGallery}
          disabled={blocked}
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files, [unifiedRef])}
          onPointerDown={() => clearInput(unifiedRef.current)}
        />
      </div>
    );
  }

  /** label htmlFor 로 기기 네이티브 파일 시트 호출(programmatic click 대비). */
  return (
    <div className={cls("flex gap-2", className)}>
      <label
        htmlFor={camInputId}
        onPointerDown={() => clearInput(camRef.current)}
        className={cls(
          btnClass,
          "flex flex-1 cursor-pointer items-center justify-center gap-2 py-3",
          blocked && "pointer-events-none opacity-55",
        )}
      >
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Camera size={18} aria-hidden />}
        {busy ? busyLabel ?? "처리 중…" : label}
      </label>
      <label
        htmlFor={galInputId}
        className={cls(
          "btn-secondary inline-flex shrink-0 cursor-pointer items-center justify-center px-3 py-3",
          blocked && "pointer-events-none opacity-55",
        )}
        aria-label={galleryAria}
        onPointerDown={() => clearInput(galRef.current)}
      >
        <ImagePlus size={18} aria-hidden />
      </label>
      <input
        ref={camRef}
        id={camInputId}
        type="file"
        accept={GALLERY_FILE_ACCEPT}
        capture={preferCamera ? "environment" : undefined}
        disabled={blocked}
        className="sr-only"
        onPointerDown={() => clearInput(camRef.current)}
        onChange={(e) => void handleFiles(e.target.files, [camRef])}
      />
      <input
        ref={galRef}
        id={galInputId}
        type="file"
        accept={GALLERY_FILE_ACCEPT}
        multiple={multipleGallery}
        disabled={blocked}
        className="sr-only"
        onPointerDown={() => clearInput(galRef.current)}
        onChange={(e) => void handleFiles(e.target.files, [galRef])}
      />
    </div>
  );
}

function clearInput(el: HTMLInputElement | null) {
  if (el) el.value = "";
}
