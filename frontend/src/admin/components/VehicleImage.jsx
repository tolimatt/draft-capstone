import "../../components/VehicleImageFrame.css";
import { Car } from "lucide-react";
import VehicleImageFrame from "../../components/VehicleImageFrame";

const getImageCrossOrigin = (source) => {
  if (!source || /^(data:|blob:)/i.test(source)) return undefined;
  try {
    const imageOrigin = new URL(source, window.location.href).origin;
    const apiOrigin = new URL(import.meta.env.VITE_API_URL || "/api", window.location.href).origin;
    return imageOrigin === apiOrigin && imageOrigin !== window.location.origin ? "use-credentials" : undefined;
  } catch {
    return undefined;
  }
};

const unavailable = <span role="img" aria-label="Vehicle image unavailable" className="flex h-full w-full items-center justify-center text-slate-500"><Car size={28} aria-hidden="true" /></span>;

export default function VehicleImage({ vehicle, className = "", fit = false, thumbnail = false }) {
  const source = String(vehicle?.image || "").trim();
  return (
    <div className={`relative aspect-[16/10] shrink-0 overflow-hidden ${thumbnail ? "rounded" : "rounded-xl"} ${className}`}>
      <VehicleImageFrame
        candidates={source ? [source] : []}
        alt={vehicle?.name || "Vehicle"}
        displayMode={fit ? "cutout" : vehicle?.coverDisplayMode}
        variant={thumbnail ? "thumbnail" : "listing"}
        getCrossOrigin={getImageCrossOrigin}
        fallback={unavailable}
      />
    </div>
  );
}
