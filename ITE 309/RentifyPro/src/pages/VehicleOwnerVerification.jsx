import React, { useState } from "react";
import { Upload, Camera, CheckCircle } from "lucide-react";

const UploadBox = ({ label, file, onChange, icon: Icon }) => (
  <label className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition
    ${file ? "border-green-500 bg-green-50" : "hover:border-[#017FE6]"}`}
  >
    {file ? (
      <>
        <CheckCircle className="text-green-600 mb-2" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-green-600 mt-1">Uploaded</p>
      </>
    ) : (
      <>
        <Icon className="mb-2 text-gray-500" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-1">Click to upload image</p>
      </>
    )}

    <input
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => onChange(e.target.files[0])}
    />
  </label>
);

const VehicleOwnerVerification = ({
  onBack,
  onSubmit,
  onNavigateToHome,
}) => {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [frontID, setFrontID] = useState(null);
  const [backID, setBackID] = useState(null);
  const [selfie, setSelfie] = useState(null);

  const isComplete =
    licenseNumber.trim() && frontID && backID && selfie;

  return (
    <div className="bg-gray-100 flex justify-center px-4 py-16">
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden">

        {/* HEADER */}
        <div className="relative h-16 flex items-center border-b px-6">
          <button
            onClick={onNavigateToHome}
            className="absolute left-1/2 -translate-x-1/2 text-xl font-bold"
          >
            Rentify<span className="text-[#017FE6]">Pro</span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="px-8 py-6 space-y-8">

          {/* TITLE */}
          <div className="text-center">

            <h1 className="text-2xl font-bold mt-1">
              Vehicle Owner Verification
            </h1>

            <p className="text-sm text-gray-600 max-w-md mx-auto mt-2">
              Verify your identity to unlock vehicle listing and management.
            </p>
          </div>

          {/* LICENSE NUMBER */}
          <div>
            <label className="text-sm font-medium">
              Driver’s License Number
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="e.g. N01-12-123456"
              className="mt-1 w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#017FE6]"
            />
          </div>

          {/* LICENSE UPLOADS */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Driver’s License Images
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <UploadBox
                label="License Front"
                file={frontID}
                onChange={setFrontID}
                icon={Upload}
              />

              <UploadBox
                label="License Back"
                file={backID}
                onChange={setBackID}
                icon={Upload}
              />
            </div>
          </div>

          {/* SELFIE */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Selfie Verification
            </h3>

            <UploadBox
              label="Upload a clear selfie"
              file={selfie}
              onChange={setSelfie}
              icon={Camera}
            />
          </div>

          {/* STATUS */}
          {isComplete && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={18} />
              All required fields completed
            </div>
          )}

          {/* ACTIONS */}
          <div className="flex flex-col gap-4 pt-2">
            <button
            disabled={!isComplete}
            onClick={() => {
              // mark user as vehicle owner
              localStorage.setItem("isVehicleOwner", "true");

              // optional: set default role
              localStorage.setItem("activeRole", "owner");

              // proceed to next step / success
              onSubmit();
            }}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              isComplete
                ? "bg-[#017FE6] text-white hover:bg-[#0165B8]"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Verification
          </button>


            <button
              onClick={onBack}
              className="text-sm text-gray-500 hover:underline"
            >
              Back
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VehicleOwnerVerification;
