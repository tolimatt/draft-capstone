import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_VEHICLE_IMAGE,
  getVehicleCoverImageCandidates,
} from "../utils/media";

export default function VehicleCover({
  vehicle = null,
  src = "",
  alt = "Vehicle",
  className = "",
  contentClassName = "",
  imageClassName = "",
  children,
}) {
  const candidates = useMemo(() => {
    const directSource = String(src || "").trim();
    const vehicleCandidates = getVehicleCoverImageCandidates(vehicle || {});

    if (!directSource) return vehicleCandidates;
    return [directSource, ...vehicleCandidates.filter((candidate) => candidate !== directSource)];
  }, [src, vehicle]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const candidateSignature = candidates.join("||");

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidateSignature]);

  const currentImage =
    candidates[Math.min(candidateIndex, Math.max(0, candidates.length - 1))] ||
    DEFAULT_VEHICLE_IMAGE;

  const handleError = () => {
    setCandidateIndex((prev) => {
      if (prev >= candidates.length - 1) return prev;
      return prev + 1;
    });
  };

  return (
    <div className={`rp-vehicle-cover ${className}`.trim()}>
      <div
        className="rp-vehicle-cover__backdrop"
        style={currentImage ? { backgroundImage: `url("${currentImage}")` } : undefined}
        aria-hidden="true"
      />
      <div className="rp-vehicle-cover__wash" aria-hidden="true" />
      <div className="rp-vehicle-cover__floor" aria-hidden="true" />
      <div className={`rp-vehicle-cover__content ${contentClassName}`.trim()}>
        <img
          src={currentImage || DEFAULT_VEHICLE_IMAGE}
          alt={alt}
          className={`rp-vehicle-cover__image ${imageClassName}`.trim()}
          onError={handleError}
        />
      </div>
      {children}
    </div>
  );
}
