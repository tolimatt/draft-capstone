import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, CarFront, Check, Fuel, ImagePlus, MapPin, Settings, Settings2, UploadCloud, UserRoundCheck, Users, Wrench, X } from "lucide-react";
import API from "../../utils/api";
import { isPhilippineLocation } from "../../utils/locationValidation";
import VehicleCover from "../../components/VehicleCover";
import ModalPortal from "../../components/ModalPortal";
import { validateVehicleImageFiles } from "../../utils/fileValidation";
import OwnerPageHeader from "../components/OwnerPageHeader";

const createInitialForm = () => ({
  name: "",
  description: "",
  dailyRentalRate: "",
  lateReturnFeeType: "percentage",
  lateReturnFeeValue: "25",
  lateReturnGraceMinutes: "0",
  location: "",
  availabilityStatus: "available",
  specType: "car",
  specSubType: "",
  specSeats: 4,
  specTransmission: "Automatic",
  specFuel: "Gasoline",
  specPlateNumber: "",
  driverOptionEnabled: false,
  driverDailyRate: "",
  existingImages: [],
  existingImagePaths: [],
  newImageFiles: [],
  coverImagePath: "",
  coverUploadIndex: "",
  coverDisplayMode: "auto",
});

const getVehicleOperationalStatus = (vehicle) => {
  if (vehicle?.availabilityStatus === "available") return "available";
  if (vehicle?.availabilityHoldReason === "inspection") return "inspection";
  return "unavailable";
};

const formatCurrency = (value) => `\u20b1${Number(value || 0).toLocaleString("en-PH")}`;

const formatLateReturnPolicy = (source = {}) => {
  const policy = source.lateReturnPolicy || source;
  const feeType = policy.feeType || source.lateReturnFeeType || "percentage";
  const value = Number(policy.value ?? source.lateReturnFeeValue ?? 25);
  const graceMinutes = Number(policy.graceMinutes ?? source.lateReturnGraceMinutes ?? 0);
  const feeLabel = feeType === "fixed_hourly" ? `${formatCurrency(value)} / overdue hour` : `${value}% of hourly rate`;
  return `${feeLabel} after ${graceMinutes} minute${graceMinutes === 1 ? "" : "s"} grace`;
};

const getFallbackCoverState = ({ existingImagePaths = [], newImageFiles = [] } = {}) => {
  if (existingImagePaths.length) {
    return { coverImagePath: existingImagePaths[0], coverUploadIndex: "" };
  }

  if (newImageFiles.length) {
    return { coverImagePath: "", coverUploadIndex: "0" };
  }

  return { coverImagePath: "", coverUploadIndex: "" };
};

function VehicleFormSectionHeader({ step, icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#017FE6]">
        <Icon size={20} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#017FE6]">Step {step}</span>
          <span className="h-px w-5 bg-blue-200" aria-hidden="true" />
        </div>
        <h3 className="mt-1 text-base font-bold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function VehicleSelectField({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className="relative block">
        <select
          className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-800 shadow-sm outline-none transition hover:border-slate-300 focus:border-[#017FE6] focus:ring-4 focus:ring-blue-100"
          value={value}
          onChange={onChange}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

function VehicleModal({
  mode,
  form,
  setForm,
  loading,
  error,
  locationError,
  onFileError,
  onLocationChange,
  onClose,
  onSubmit,
}) {
  const newImagePreviews = useMemo(
    () =>
      form.newImageFiles.map((file, index) => ({
        key: `${file.name}-${file.lastModified}`,
        index,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    [form.newImageFiles]
  );

  const coverPreviewUrl = useMemo(() => {
    if (form.coverImagePath) {
      const existingIndex = form.existingImagePaths.indexOf(form.coverImagePath);
      if (existingIndex >= 0) return form.existingImages[existingIndex] || "";
    }

    const uploadIndex = Number.parseInt(String(form.coverUploadIndex), 10);
    if (Number.isFinite(uploadIndex) && uploadIndex >= 0) {
      return newImagePreviews[uploadIndex]?.url || "";
    }

    return form.existingImages[0] || newImagePreviews[0]?.url || "";
  }, [form.coverImagePath, form.coverUploadIndex, form.existingImagePaths, form.existingImages, newImagePreviews]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [newImagePreviews]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onClose]);

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-[#017FE6] focus:outline-none focus:ring-4 focus:ring-blue-100";
  const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  const listingChecks = [
    { label: "Listing details", complete: Boolean(form.name.trim() && form.location.trim() && form.description.trim()) },
    { label: "Rate and plate number", complete: Boolean(Number(form.dailyRentalRate) > 0 && form.specPlateNumber.trim()) },
    { label: "Late-return policy", complete: Boolean(Number(form.lateReturnFeeValue) >= 0 && Number(form.lateReturnGraceMinutes) >= 0) },
    { label: "Vehicle specifications", complete: Boolean(form.specType && form.specSubType.trim() && Number(form.specSeats) > 0) },
    { label: "At least one vehicle photo", complete: Boolean(form.existingImages.length || form.newImageFiles.length) },
  ];
  const completedChecks = listingChecks.filter((item) => item.complete).length;

  return (
    <ModalPortal>
      <div className="rp-modal-layer" role="dialog" aria-modal="true" aria-labelledby="vehicle-modal-title">
        <button type="button" className="rp-modal-backdrop" onClick={loading ? undefined : onClose} aria-label="Close vehicle form" />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
          className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.32)] sm:rounded-3xl"
        >
          <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-7 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#017FE6] text-white shadow-[0_8px_20px_rgba(1,127,230,0.24)]">
                  <CarFront size={20} />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#017FE6]">Vehicle inventory</p>
                  <h2 id="vehicle-modal-title" className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                    {mode === "edit" ? "Edit vehicle listing" : "Create vehicle listing"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add accurate details and clear photos so renters can book with confidence.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="grid flex-1 overflow-y-auto bg-[#f7f9fc] xl:grid-cols-[minmax(0,1.75fr)_minmax(300px,0.75fr)]">
            <div className="min-w-0 space-y-5 p-4 sm:p-6">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5">
              <VehicleFormSectionHeader
                step="01"
                icon={CarFront}
                title="Listing details"
                description="The core information renters will see first."
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Vehicle Name</label>
                  <input
                    className={inputClass}
                    placeholder="Ex. Honda Civic RS"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    className={inputClass}
                    placeholder="Ex. Quezon City"
                    value={form.location}
                    onChange={(e) => onLocationChange(e.target.value)}
                  />
                  {locationError && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{locationError}</p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:border-[#017FE6] focus:outline-none focus:ring-4 focus:ring-blue-100"
                  rows={3}
                  placeholder="Describe the vehicle condition, notable features, and renter expectations."
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Hourly Rate</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">₱</span>
                    <input
                      type="number"
                      min="0"
                      className={`${inputClass} pl-8`}
                      placeholder="0"
                      value={form.dailyRentalRate}
                      onChange={(e) => setForm((prev) => ({ ...prev, dailyRentalRate: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Availability</label>
                  <div className="grid h-11 grid-cols-2 rounded-xl border border-slate-200 bg-slate-100 p-1">
                    {["available", "unavailable"].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, availabilityStatus: status }))}
                        className={`rounded-lg text-xs font-semibold capitalize transition ${form.availabilityStatus === status ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Plate Number</label>
                  <input
                    className={inputClass}
                    placeholder="Ex. ABC-1234"
                    value={form.specPlateNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, specPlateNumber: e.target.value }))}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                <div>
                  <p className="text-sm font-bold text-amber-950">Late-return policy</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    This policy is disclosed to renters and locked into each new booking. Editing it later affects only future bookings.
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <VehicleSelectField
                    label="Fee type"
                    value={form.lateReturnFeeType}
                    onChange={(event) => setForm((prev) => ({ ...prev, lateReturnFeeType: event.target.value }))}
                    options={[
                      { value: "percentage", label: "Percentage" },
                      { value: "fixed_hourly", label: "Fixed per hour" },
                    ]}
                  />
                  <div>
                    <label className={labelClass}>
                      {form.lateReturnFeeType === "fixed_hourly" ? "Fee per overdue hour" : "Percentage"}
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                        {form.lateReturnFeeType === "fixed_hourly" ? "₱" : "%"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={form.lateReturnFeeType === "fixed_hourly" ? "100000" : "100"}
                        step="0.01"
                        className={`${inputClass} pl-8`}
                        value={form.lateReturnFeeValue}
                        onChange={(event) => setForm((prev) => ({ ...prev, lateReturnFeeValue: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Grace period (minutes)</label>
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      step="1"
                      className={inputClass}
                      value={form.lateReturnGraceMinutes}
                      onChange={(event) => setForm((prev) => ({ ...prev, lateReturnGraceMinutes: event.target.value }))}
                    />
                  </div>
                </div>
                <p className="mt-3 text-xs font-medium text-amber-900">
                  Preview: {formatLateReturnPolicy(form)}
                  {form.lateReturnFeeType === "percentage" ? ". A selected driver’s hourly rate is included in the percentage base." : "."}
                </p>
              </div>
            </section>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5">
              <VehicleFormSectionHeader
                step="02"
                icon={Settings2}
                title="Vehicle specifications"
                description="Help renters compare capacity, transmission, and fuel type."
              />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-5">
                    <VehicleSelectField
                      label="Type"
                      value={form.specType}
                      onChange={(e) => setForm((prev) => ({ ...prev, specType: e.target.value }))}
                      options={[
                        { value: "car", label: "Car" },
                        { value: "motorcycle", label: "Motorcycle" },
                        { value: "van", label: "Van" },
                        { value: "truck", label: "Truck" },
                      ]}
                    />
                <div>
                  <label className={labelClass}>Sub-type</label>
                  <input
                    className={inputClass}
                    placeholder="Ex. Sedan"
                    value={form.specSubType}
                    onChange={(e) => setForm((prev) => ({ ...prev, specSubType: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Seats</label>
                  <input
                    type="number"
                    min="1"
                    className={inputClass}
                    placeholder="4"
                    value={form.specSeats}
                    onChange={(e) => setForm((prev) => ({ ...prev, specSeats: e.target.value }))}
                  />
                </div>
                    <VehicleSelectField
                      label="Transmission"
                      value={form.specTransmission}
                      onChange={(e) => setForm((prev) => ({ ...prev, specTransmission: e.target.value }))}
                      options={[
                        { value: "Automatic", label: "Automatic" },
                        { value: "Manual", label: "Manual" },
                      ]}
                    />
                    <VehicleSelectField
                      label="Fuel"
                      value={form.specFuel}
                      onChange={(e) => setForm((prev) => ({ ...prev, specFuel: e.target.value }))}
                      options={[
                        { value: "Gasoline", label: "Gasoline" },
                        { value: "Diesel", label: "Diesel" },
                        { value: "Electric", label: "Electric" },
                        { value: "Hybrid", label: "Hybrid" },
                      ]}
                    />
              </div>
            </section>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5">
              <VehicleFormSectionHeader
                step="03"
                icon={UserRoundCheck}
                title="Driver option"
                description="Choose whether this listing supports self-drive or a driver service."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      driverOptionEnabled: true,
                    }))
                  }
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    form.driverOptionEnabled
                      ? "border-[#017FE6] bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#017FE6]"
                  }`}
                >
                  <p className="text-sm font-semibold">With driver</p>
                  <p className="mt-0.5 text-xs text-slate-500">Driver service enabled for this vehicle.</p>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      driverOptionEnabled: false,
                      driverDailyRate: "",
                    }))
                  }
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    !form.driverOptionEnabled
                      ? "border-[#017FE6] bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-[#017FE6]"
                  }`}
                >
                  <p className="text-sm font-semibold">Without driver</p>
                  <p className="mt-0.5 text-xs text-slate-500">Self-drive only for this vehicle.</p>
                </button>
              </div>
              {form.driverOptionEnabled && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                  <label className={labelClass}>Driver hourly rate</label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-full max-w-xs">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        className={`${inputClass} pl-8`}
                        placeholder="0"
                        value={form.driverDailyRate}
                        onChange={(event) => setForm((prev) => ({ ...prev, driverDailyRate: event.target.value }))}
                      />
                    </div>
                    <span className="text-xs text-slate-500">Added to the vehicle rate per hour</span>
                  </div>
                </div>
              )}
            </section>

            <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.035)] sm:p-5">
              <div className="relative">
                <VehicleFormSectionHeader
                  step="04"
                  icon={ImagePlus}
                  title="Photos and cover"
                  description="Use clear, recent photos that show the vehicle accurately."
                />
                <span className="absolute right-0 top-0 shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">Up to 8</span>
              </div>

              <p className="text-xs text-slate-500">
                Choose one cover image for the renter and owner cards. The rest stay in the gallery.
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold text-slate-800">Cover presentation</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Auto uses a full photo for opaque images and the RentifyPro background for transparent cutouts.
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Cover presentation">
                    {[
                      { value: "auto", label: "Auto" },
                      { value: "photo", label: "Photo" },
                      { value: "cutout", label: "Cutout" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={form.coverDisplayMode === option.value}
                        onClick={() => setForm((prev) => ({ ...prev, coverDisplayMode: option.value }))}
                        className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                          form.coverDisplayMode === option.value
                            ? "border-[#017FE6] bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Use Photo for regular JPGs. Use Cutout only when the image background is transparent.
                  </p>
                </div>
              </div>

              <label className="group flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-[#017FE6] hover:bg-blue-50/40">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#017FE6] shadow-sm ring-1 ring-slate-200">
                    <UploadCloud size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Upload vehicle photos</p>
                    <p className="text-xs text-slate-500">PNG, JPG, or WEBP format</p>
                  </div>
                </div>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Choose Files
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files || []);
                    if (!selected.length) return;
                    const combined = [...form.newImageFiles, ...selected];
                    try {
                      validateVehicleImageFiles(combined);
                      onFileError?.("");
                    } catch (validationError) {
                      onFileError?.(validationError.message || "Please choose valid vehicle photos.");
                      e.target.value = "";
                      return;
                    }
                    setForm((prev) => ({
                      ...prev,
                      newImageFiles: combined,
                      ...(prev.coverImagePath || prev.coverUploadIndex !== ""
                        ? {}
                        : getFallbackCoverState({
                            existingImagePaths: prev.existingImagePaths,
                            newImageFiles: combined,
                          })),
                    }));
                    e.target.value = "";
                  }}
                />
              </label>

              {form.newImageFiles.length > 0 && (
                <p className="text-xs text-slate-500">
                  {form.newImageFiles.length} new image(s) selected
                </p>
              )}

              {(form.existingImages.length > 0 || newImagePreviews.length > 0) && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {form.existingImages.map((image, index) => (
                    <div key={`existing-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {form.coverImagePath === form.existingImagePaths[index] && form.coverUploadIndex === "" && (
                        <span className="absolute left-2 top-2 z-10 rounded-md bg-[#017FE6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Cover
                        </span>
                      )}
                      <img src={image} alt="vehicle" className="h-24 w-full bg-slate-50 object-contain object-center p-1.5" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-700 shadow transition hover:bg-red-500 hover:text-white"
                        onClick={() =>
                          setForm((prev) => {
                            const nextExistingImages = prev.existingImages.filter((_, idx) => idx !== index);
                            const nextExistingImagePaths = prev.existingImagePaths.filter((_, idx) => idx !== index);
                            const removedPath = prev.existingImagePaths[index];
                            const shouldResetCover =
                              prev.coverImagePath === removedPath || (
                                prev.coverImagePath && !nextExistingImagePaths.includes(prev.coverImagePath)
                              );

                            return {
                              ...prev,
                              existingImages: nextExistingImages,
                              existingImagePaths: nextExistingImagePaths,
                              ...(shouldResetCover
                                ? getFallbackCoverState({
                                    existingImagePaths: nextExistingImagePaths,
                                    newImageFiles: prev.newImageFiles,
                                  })
                                : {}),
                            };
                          })
                        }
                        aria-label="Remove existing image"
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className={`absolute bottom-2 left-2 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                          form.coverImagePath === form.existingImagePaths[index] && form.coverUploadIndex === ""
                            ? "bg-[#017FE6] text-white"
                            : "bg-white/90 text-slate-700 hover:bg-slate-100"
                        }`}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            coverImagePath: prev.existingImagePaths[index],
                            coverUploadIndex: "",
                          }))
                        }
                      >
                        {form.coverImagePath === form.existingImagePaths[index] && form.coverUploadIndex === ""
                          ? "Selected cover"
                          : "Set as cover"}
                      </button>
                    </div>
                  ))}

                  {newImagePreviews.map((preview, index) => (
                    <div key={preview.key} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {form.coverImagePath === "" && String(form.coverUploadIndex) === String(index) && (
                        <span className="absolute left-2 top-2 z-10 rounded-md bg-[#017FE6] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                          Cover
                        </span>
                      )}
                      <img src={preview.url} alt={preview.name} className="h-24 w-full bg-slate-50 object-contain object-center p-1.5" />
                      <button
                        type="button"
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/90 text-slate-700 shadow transition hover:bg-red-500 hover:text-white"
                        onClick={() =>
                          setForm((prev) => {
                            const nextNewImageFiles = prev.newImageFiles.filter((_, idx) => idx !== index);
                            const currentCoverUploadIndex = Number.parseInt(String(prev.coverUploadIndex), 10);
                            const isCurrentCover =
                              prev.coverImagePath === "" &&
                              Number.isFinite(currentCoverUploadIndex) &&
                              currentCoverUploadIndex === index;

                            let nextCoverImagePath = prev.coverImagePath;
                            let nextCoverUploadIndex = prev.coverUploadIndex;

                            if (prev.coverImagePath === "" && Number.isFinite(currentCoverUploadIndex)) {
                              if (isCurrentCover) {
                                const fallbackCover = getFallbackCoverState({
                                  existingImagePaths: prev.existingImagePaths,
                                  newImageFiles: nextNewImageFiles,
                                });
                                nextCoverImagePath = fallbackCover.coverImagePath;
                                nextCoverUploadIndex = fallbackCover.coverUploadIndex;
                              } else if (currentCoverUploadIndex > index) {
                                nextCoverUploadIndex = String(currentCoverUploadIndex - 1);
                              }
                            }

                            return {
                              ...prev,
                              newImageFiles: nextNewImageFiles,
                              coverImagePath: nextCoverImagePath,
                              coverUploadIndex: nextCoverUploadIndex,
                            };
                          })
                        }
                        aria-label="Remove new image"
                      >
                        <X size={16} strokeWidth={2} />
                      </button>
                      <button
                        type="button"
                        className={`absolute bottom-2 left-2 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                          form.coverImagePath === "" && String(form.coverUploadIndex) === String(index)
                            ? "bg-[#017FE6] text-white"
                            : "bg-white/90 text-slate-700 hover:bg-slate-100"
                        }`}
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            coverImagePath: "",
                            coverUploadIndex: String(index),
                          }))
                        }
                      >
                        {form.coverImagePath === "" && String(form.coverUploadIndex) === String(index)
                          ? "Selected cover"
                          : "Set as cover"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

            <aside className="border-t border-slate-200 bg-white p-5 xl:sticky xl:top-0 xl:self-start xl:border-l xl:border-t-0 xl:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#017FE6]">Renter view</p>
                  <h3 className="mt-1 text-base font-bold text-slate-900">Listing preview</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${form.availabilityStatus === "available" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {form.availabilityStatus === "available" ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.07)]">
                <div className="p-3 pb-0">
                  {coverPreviewUrl ? (
                    <VehicleCover
                      src={coverPreviewUrl}
                      alt="Selected vehicle cover preview"
                      displayMode={form.coverDisplayMode}
                      className="min-h-40"
                      contentClassName="p-3"
                    />
                  ) : (
                    <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center">
                      <ImagePlus size={24} strokeWidth={2} className="text-slate-400" aria-hidden="true" />
                      <p className="mt-2 text-xs font-medium text-slate-500">Your cover photo will appear here</p>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {form.specType || "Vehicle"}{form.specSubType ? ` · ${form.specSubType}` : ""}
                  </p>
                  <h4 className="mt-1 truncate text-lg font-bold text-slate-900">{form.name.trim() || "Vehicle name"}</h4>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <MapPin size={16} strokeWidth={2} className="shrink-0 text-[#017FE6]" aria-hidden="true" />
                    <span className="truncate">{form.location.trim() || "Vehicle location"}</span>
                  </p>
                  <div className="mt-4 grid grid-cols-3 divide-x divide-slate-200 border-y border-slate-100 py-3 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1 pr-2"><Users size={16} strokeWidth={2} aria-hidden="true" />{form.specSeats || "-"} seats</span>
                    <span className="truncate px-2 text-center">{form.specTransmission || "-"}</span>
                    <span className="truncate pl-2 text-right">{form.specFuel || "-"}</span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Hourly rate</p>
                      <p className="mt-0.5 text-xl font-bold text-slate-900">{form.dailyRentalRate ? formatCurrency(form.dailyRentalRate) : "₱0"}<span className="ml-1 text-[11px] font-medium text-slate-400">/ hour</span></p>
                    </div>
                    {form.driverOptionEnabled && <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Driver available</span>}
                  </div>
                  <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] font-medium leading-4 text-amber-800">
                    Late returns: {formatLateReturnPolicy(form)}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-800">Listing readiness</p>
                  <span className="text-xs font-semibold text-slate-500">{completedChecks}/{listingChecks.length}</span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#017FE6] transition-all" style={{ width: `${(completedChecks / listingChecks.length) * 100}%` }} />
                </div>
                <div className="mt-4 space-y-2.5">
                  {listingChecks.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-300 ring-1 ring-slate-200"}`}>
                        <Check size={16} strokeWidth={2} aria-hidden="true" />
                      </span>
                      <span className={item.complete ? "font-medium text-slate-700" : "text-slate-500"}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
              <BadgeCheck size={16} strokeWidth={2} className="text-[#017FE6]" aria-hidden="true" />
              Changes are reviewed before they appear to renters.
            </div>
            <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-[#017FE6] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(1,127,230,0.25)] transition hover:bg-[#016fc8] disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Vehicle"}
            </button>
            </div>
          </div>
        </form>
      </div>
    </ModalPortal>
  );
}

function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatusId, setUpdatingStatusId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createInitialForm());

  const loadVehicles = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await API.getOwnerVehicles();
      setVehicles(response.vehicles || []);
    } catch (err) {
      setError(err.message || "Failed to load vehicles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    const openAdd = () => {
      setModalMode("create");
      setEditingId(null);
      setForm(createInitialForm());
      setModalError("");
      setModalOpen(true);
    };
    window.addEventListener("open-add-vehicle", openAdd);
    return () => window.removeEventListener("open-add-vehicle", openAdd);
  }, []);

  const filteredVehicles = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !query ||
        vehicle.name?.toLowerCase().includes(query) ||
        vehicle.location?.toLowerCase().includes(query) ||
        vehicle.specs?.plateNumber?.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || getVehicleOperationalStatus(vehicle) === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicles, search, statusFilter]);

  const openEditModal = (vehicle) => {
    setModalMode("edit");
    setEditingId(vehicle._id);
    setForm({
      name: vehicle.name || "",
      description: vehicle.description || "",
      dailyRentalRate: String(vehicle.dailyRentalRate ?? ""),
      lateReturnFeeType: vehicle.lateReturnPolicy?.feeType || vehicle.lateReturnFeeType || "percentage",
      lateReturnFeeValue: String(vehicle.lateReturnPolicy?.value ?? vehicle.lateReturnFeeValue ?? 25),
      lateReturnGraceMinutes: String(vehicle.lateReturnPolicy?.graceMinutes ?? vehicle.lateReturnGraceMinutes ?? 0),
      location: vehicle.location || "",
      availabilityStatus: vehicle.availabilityStatus || "available",
      specType: vehicle.specs?.type || "car",
      specSubType: vehicle.specs?.subType || "",
      specSeats: String(vehicle.specs?.seats ?? 4),
      specTransmission: vehicle.specs?.transmission || "Automatic",
      specFuel: vehicle.specs?.fuel || "Gasoline",
      specPlateNumber: vehicle.specs?.plateNumber || "",
      driverOptionEnabled: Boolean(vehicle.driverOptionEnabled),
      driverDailyRate: vehicle.driverOptionEnabled ? String(vehicle.driverDailyRate || "") : "",
      existingImages: vehicle.images || [],
      existingImagePaths: vehicle.imagePaths || vehicle.images || [],
      newImageFiles: [],
      coverImagePath: vehicle.coverImagePath || vehicle.imagePaths?.[0] || "",
      coverUploadIndex: "",
      coverDisplayMode: vehicle.coverDisplayMode || "auto",
    });
    setModalError("");
    setLocationError("");
    setModalOpen(true);
  };

  const handleLocationChange = (value) => {
    setForm((prev) => ({ ...prev, location: value }));
    if (locationError && (!value.trim() || isPhilippineLocation(value))) {
      setLocationError("");
    }
  };

  const buildFormData = () => {
    const body = new FormData();
    body.append("name", form.name);
    body.append("description", form.description);
    body.append("dailyRentalRate", String(form.dailyRentalRate));
    body.append("lateReturnFeeType", form.lateReturnFeeType);
    body.append("lateReturnFeeValue", String(form.lateReturnFeeValue));
    body.append("lateReturnGraceMinutes", String(form.lateReturnGraceMinutes));
    body.append("location", form.location);
    body.append("availabilityStatus", form.availabilityStatus);
    body.append("specType", form.specType);
    body.append("specSubType", form.specSubType);
    body.append("specSeats", String(form.specSeats));
    body.append("specTransmission", form.specTransmission);
    body.append("specFuel", form.specFuel);
    body.append("specPlateNumber", form.specPlateNumber);
    body.append("driverOptionEnabled", String(form.driverOptionEnabled));
    body.append("driverDailyRate", String(form.driverDailyRate || 0));
    body.append("existingImages", JSON.stringify(form.existingImagePaths || []));
    if (form.coverImagePath) body.append("coverImagePath", form.coverImagePath);
    if (form.coverUploadIndex !== "") body.append("coverUploadIndex", String(form.coverUploadIndex));
    body.append("coverDisplayMode", form.coverDisplayMode || "auto");

    form.newImageFiles.forEach((file) => body.append("images", file));
    return body;
  };

  const submitModal = async () => {
    setModalLoading(true);
    setModalError("");
    setLocationError("");
    try {
      const trimmedLocation = form.location.trim();
      if (!trimmedLocation) {
        setModalError("Please enter a vehicle location.");
        setLocationError("Location is required.");
        return;
      }
      if (!isPhilippineLocation(trimmedLocation)) {
        const message = "Only vehicle locations within the Philippines are allowed.";
        setModalError(message);
        setLocationError(message);
        return;
      }
      const lateReturnFeeValue = Number(form.lateReturnFeeValue);
      const lateReturnGraceMinutes = Number(form.lateReturnGraceMinutes);
      const maxLateReturnFee = form.lateReturnFeeType === "fixed_hourly" ? 100000 : 100;
      if (!Number.isFinite(lateReturnFeeValue) || lateReturnFeeValue < 0 || lateReturnFeeValue > maxLateReturnFee) {
        setModalError(
          form.lateReturnFeeType === "fixed_hourly"
            ? "Late-return fee must be between ₱0 and ₱100,000 per overdue hour."
            : "Late-return percentage must be between 0% and 100%."
        );
        return;
      }
      if (
        !Number.isInteger(lateReturnGraceMinutes) ||
        lateReturnGraceMinutes < 0 ||
        lateReturnGraceMinutes > 1440
      ) {
        setModalError("Late-return grace period must be a whole number from 0 to 1,440 minutes.");
        return;
      }
      validateVehicleImageFiles(form.newImageFiles);

      if (modalMode === "create") {
        await API.createOwnerVehicle(buildFormData());
      } else {
        await API.updateOwnerVehicle(editingId, buildFormData());
      }
      setModalOpen(false);
      setForm(createInitialForm());
      await loadVehicles();
    } catch (err) {
      setModalError(err.message || "Failed to save vehicle.");
    } finally {
      setModalLoading(false);
    }
  };

  const updateVehicleStatus = async (vehicle, operationalStatus) => {
    const availabilityStatus = operationalStatus === "available" ? "available" : "unavailable";
    const availabilityHoldReason =
      operationalStatus === "inspection" ? "inspection" : operationalStatus === "unavailable" ? "manual" : "none";
    try {
      setUpdatingStatusId(vehicle._id);
      setError("");
      const response = await API.setOwnerVehicleAvailability(
        vehicle._id,
        availabilityStatus,
        availabilityHoldReason
      );
      setVehicles((prev) =>
        prev.map((item) =>
          item._id === vehicle._id
            ? response.vehicle || {
                ...item,
                availabilityStatus,
                availabilityHoldReason,
              }
            : item
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update vehicle status.");
    } finally {
      setUpdatingStatusId("");
    }
  };

  const deleteVehicle = async (vehicleId) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try {
      await API.deleteOwnerVehicle(vehicleId);
      setVehicles((prev) => prev.filter((vehicle) => vehicle._id !== vehicleId));
    } catch (err) {
      setError(err.message || "Failed to delete vehicle.");
    }
  };

  return (
    <div className="space-y-6">
      <OwnerPageHeader
        title="Vehicle Management"
        description="Manage vehicle details, images, availability, and driver options."
      />

      <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row gap-3">
        <input
          className="flex-1 rounded-lg border px-3 py-2"
          placeholder="Search by name, location, or plate number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="relative md:min-w-48">
          <select
            className="h-full w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700 outline-none transition hover:border-slate-300 focus:border-[#0B75E7] focus:ring-4 focus:ring-[#0B75E7]/10"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Vehicles</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
            <option value="inspection">Under inspection/maintenance</option>
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && filteredVehicles.length === 0 && (
        <div className="bg-white border rounded-xl p-6 text-sm text-gray-600">
          No vehicles found.
        </div>
      )}

      {!loading && <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <article key={vehicle._id} className="rp-surface rp-hover-lift flex h-full flex-col overflow-hidden">
            <div className="px-4 pt-4">
              <VehicleCover
                vehicle={vehicle}
                alt={vehicle.name}
                contentClassName="p-4 sm:p-5"
              >
                <span
                  className={`absolute top-3 left-3 z-10 rp-chip ${
                    vehicle.availabilityStatus === "available"
                      ? "bg-emerald-100 text-emerald-700"
                      : vehicle.availabilityHoldReason === "inspection"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {vehicle.availabilityStatus === "available"
                    ? "Available"
                    : vehicle.availabilityHoldReason === "inspection"
                      ? "Under inspection/maintenance"
                      : "Unavailable"}
                </span>
                <span className="absolute top-3 right-3 z-10 rp-chip bg-slate-900 text-white">
                  {(vehicle.images || []).length} photo(s)
                </span>
              </VehicleCover>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-lg font-bold">{vehicle.name}</h3>
              <p className="mt-2 text-sm text-slate-600 line-clamp-2">{vehicle.description}</p>

              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <MapPin size={16} strokeWidth={2} className="text-[#0B75E7]" aria-hidden="true" />
                <span>{vehicle.location}</span>
              </div>

              <div className="mt-2 flex gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Users size={16} strokeWidth={2} className="text-[#0B75E7]" aria-hidden="true" />
                  {vehicle.specs?.seats || "-"}
                </span>
                <span className="flex items-center gap-1">
                  <Settings size={16} strokeWidth={2} className="text-[#0B75E7]" aria-hidden="true" />
                  {vehicle.specs?.transmission || "-"}
                </span>
                <span className="flex items-center gap-1">
                  <Fuel size={16} strokeWidth={2} className="text-[#0B75E7]" aria-hidden="true" />
                  {vehicle.specs?.fuel || "-"}
                </span>
              </div>

              {vehicle.driverOptionEnabled && <p className="mt-2 text-sm text-blue-700">Driver available</p>}

              <div className="mt-3 text-xl font-bold text-[#0B75E7]">
                {formatCurrency(vehicle.dailyRentalRate)}
                <span className="text-sm text-slate-500 font-medium"> / hour</span>
              </div>
              <p className="mt-2 text-xs font-medium text-amber-700">Late returns: {formatLateReturnPolicy(vehicle)}</p>

              <div className="mt-auto pt-4">
                <label className="mb-3 block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                    <Wrench size={16} strokeWidth={2} aria-hidden="true" /> Vehicle status
                  </span>
                  <select
                    value={getVehicleOperationalStatus(vehicle)}
                    disabled={updatingStatusId === vehicle._id}
                    onChange={(event) => updateVehicleStatus(vehicle, event.target.value)}
                    className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-[#017FE6] focus:ring-4 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60"
                    aria-label={`Set status for ${vehicle.name}`}
                  >
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="inspection">Under inspection/maintenance</option>
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                <button onClick={() => openEditModal(vehicle)} className="rp-btn-secondary py-2 text-sm">
                  Edit
                </button>
                <button
                  onClick={() => deleteVehicle(vehicle._id)}
                  className="py-2 rounded-xl bg-rose-50 text-rose-700 text-sm font-semibold transition hover:bg-rose-100"
                >
                  Delete
                </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>}
      {modalOpen && (
        <VehicleModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          loading={modalLoading}
          error={modalError}
          locationError={locationError}
          onFileError={setModalError}
          onLocationChange={handleLocationChange}
          onClose={() => setModalOpen(false)}
          onSubmit={submitModal}
        />
      )}
    </div>
  );
}

export default Vehicles;
