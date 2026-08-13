import { useMemo, useState } from "react";
import {
  DEFAULT_VEHICLE_IMAGE,
  getVehicleCoverImageCandidates,
} from "../utils/media";
import { API_BASE_URL } from "../utils/runtimeConfig";

const DISPLAY_MODES = new Set(["auto", "photo", "cutout"]);

const normalizeDisplayMode = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return DISPLAY_MODES.has(normalized) ? normalized : "auto";
};

const getImageCrossOrigin = (source) => {
  if (typeof window === "undefined" || !source || /^(data:|blob:)/i.test(source)) return undefined;

  try {
    const imageOrigin = new URL(source, window.location.href).origin;
    const apiOrigin = new URL(API_BASE_URL, window.location.href).origin;
    return imageOrigin === apiOrigin && imageOrigin !== window.location.origin
      ? "anonymous"
      : undefined;
  } catch {
    return undefined;
  }
};

const hasMeaningfulTransparency = (image) => {
  if (!image?.naturalWidth || !image?.naturalHeight) return false;

  const maxSampleSize = 64;
  const scale = Math.min(1, maxSampleSize / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const pixels = context.getImageData(0, 0, width, height).data;
    const transparentPixelThreshold = Math.max(1, Math.ceil((pixels.length / 4) * 0.02));
    let transparentPixels = 0;

    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] < 245) {
        transparentPixels += 1;
        if (transparentPixels >= transparentPixelThreshold) return true;
      }
    }
  } catch {
    // Cross-origin images without canvas permission safely fall back to photo mode.
  }

  return false;
};

export default function VehicleCover({
  vehicle = null,
  src = "",
  alt = "Vehicle",
  className = "",
  contentClassName = "",
  imageClassName = "",
  displayMode = "",
  children,
}) {
  const candidates = useMemo(() => {
    const directSource = String(src || "").trim();
    const vehicleCandidates = getVehicleCoverImageCandidates(vehicle || {});

    if (!directSource) return vehicleCandidates;
    return [directSource, ...vehicleCandidates.filter((candidate) => candidate !== directSource)];
  }, [src, vehicle]);

  const candidateSignature = candidates.join("||");
  const [candidateState, setCandidateState] = useState({ signature: "", index: 0 });
  const candidateIndex = candidateState.signature === candidateSignature ? candidateState.index : 0;

  const currentImage =
    candidates[Math.min(candidateIndex, Math.max(0, candidates.length - 1))] ||
    DEFAULT_VEHICLE_IMAGE;
  const [autoModeState, setAutoModeState] = useState({ image: "", mode: "photo" });
  const autoDisplayMode = autoModeState.image === currentImage ? autoModeState.mode : "photo";
  const requestedDisplayMode = normalizeDisplayMode(displayMode || vehicle?.coverDisplayMode);
  const resolvedDisplayMode = requestedDisplayMode === "auto" ? autoDisplayMode : requestedDisplayMode;
  const crossOrigin = getImageCrossOrigin(currentImage);

  const handleError = () => {
    setCandidateState(() => {
      if (candidateIndex >= candidates.length - 1) {
        return { signature: candidateSignature, index: candidateIndex };
      }
      return { signature: candidateSignature, index: candidateIndex + 1 };
    });
  };

  const handleLoad = (event) => {
    if (requestedDisplayMode !== "auto") return;
    setAutoModeState({
      image: currentImage,
      mode: hasMeaningfulTransparency(event.currentTarget) ? "cutout" : "photo",
    });
  };

  return (
    <div
      className={`rp-vehicle-cover rp-vehicle-cover--${resolvedDisplayMode} ${className}`.trim()}
      data-display-mode={resolvedDisplayMode}
    >
      {resolvedDisplayMode === "cutout" && (
        <>
          <div
            className="rp-vehicle-cover__backdrop"
            style={currentImage ? { backgroundImage: `url("${currentImage}")` } : undefined}
            aria-hidden="true"
          />
          <div className="rp-vehicle-cover__wash" aria-hidden="true" />
          <div className="rp-vehicle-cover__floor" aria-hidden="true" />
        </>
      )}
      <div className={`rp-vehicle-cover__content ${contentClassName}`.trim()}>
        <img
          src={currentImage || DEFAULT_VEHICLE_IMAGE}
          alt={alt}
          className={`rp-vehicle-cover__image ${imageClassName}`.trim()}
          crossOrigin={crossOrigin}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
      {children}
    </div>
  );
}
