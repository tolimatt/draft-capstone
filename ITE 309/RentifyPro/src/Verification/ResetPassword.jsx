import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const ResetPassword = ({ onSuccess, onBack }) => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleReset = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    console.log("Password reset success");
    setTimeout(onSuccess, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-3xl border-2 px-12 py-14 shadow-xl w-full max-w-lg text-center">

        {/* HEADER */}
        <h1 className="text-4xl font-bold text-[#017FE6] mb-10">
          Reset Password
        </h1>

        {/* NEW PASSWORD */}
        <div className="relative mb-5">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New Password"
            className="w-full border-2 rounded-2xl px-5 py-4 pr-12 text-lg focus:outline-none focus:border-[#017FE6]"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#017FE6]"
          >
            {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="relative mb-5">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirm Password"
            className="w-full border-2 rounded-2xl px-5 py-4 pr-12 text-lg focus:outline-none focus:border-[#017FE6]"
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#017FE6]"
          >
            {showConfirm ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        </div>

        {error && (
          <p className="text-red-500 text-base mb-4">
            {error}
          </p>
        )}

        {/* UPDATE PASSWORD */}
        <button
          onClick={handleReset}
          className="w-full bg-[#017FE6] hover:bg-[#0165B8] text-white py-4 rounded-2xl font-semibold text-lg transition"
        >
          Update Password
        </button>

        {/* CANCEL */}
        <button
          onClick={onBack}
          className="mt-6 text-sm text-gray-500 hover:text-[#017FE6]"
        >
          Cancel
        </button>

      </div>
    </div>
  );
};

export default ResetPassword;
