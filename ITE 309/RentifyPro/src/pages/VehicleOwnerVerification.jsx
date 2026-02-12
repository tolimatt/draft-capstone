import React, { useState } from "react";
import { Upload, Camera, CheckCircle } from "lucide-react";

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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-4xl w-full overflow-hidden">

        {/* HEADER */}
        <div className="relative h-16 flex items-center border-b px-6">
          <button
            onClick={onNavigateToHome}
            className="absolute left-1/2 -translate-x-1/2 text-xl font-bold hover:opacity-80"
          >
            Rentify<span className="text-[#017FE6]">Pro</span>
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-10 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">
                <span className="text-[#017FE6]">Vehicle Owner Verification</span>
            </h1>

            <p className="text-sm text-gray-600 max-w-md mx-auto">
                Please provide the following details to verify your identity.
            </p>
        </div>


          {/* DRIVER LICENSE NUMBER */}
          <div>
            <label className="text-sm font-medium">
              Driver’s License Number
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder="Enter license number"
              className="mt-1 w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#017FE6]"
            />
          </div>

          {/* ID UPLOADS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Driver’s License (Front)", set: setFrontID },
              { label: "Driver’s License (Back)", set: setBackID },
            ].map((item, i) => (
              <label
                key={i}
                className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#017FE6]"
              >
                <Upload className="mb-2 text-gray-500" />
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Click to upload image
                </p>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => item.set(e.target.files[0])}
                />
              </label>
            ))}
          </div>

          {/* SELFIE */}
          <label className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#017FE6]">
            <Camera className="mb-2 text-gray-500" />
            <p className="text-sm font-medium">Selfie Verification</p>
            <p className="text-xs text-gray-500 mt-1">
              Upload a clear selfie (camera supported later)
            </p>
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => setSelfie(e.target.files[0])}
            />
          </label>

          {/* ACTIONS */}
          <div className="flex flex-col gap-4 pt-4">
            <button
  disabled={!isComplete}
  onClick={onSubmit}
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

          {isComplete && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle size={18} />
              All required fields completed
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VehicleOwnerVerification;
