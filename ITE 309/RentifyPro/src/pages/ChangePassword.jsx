import React, { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

import ChangePasswordOTP from "../Verification/ChangePasswordOTP";
import { logActivity } from "../utils/ActivityLogger";

const ChangePassword = ({ user }) => {
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [step, setStep] = useState("form"); // form | otp
    const [generatedOtp, setGeneratedOtp] = useState("");
  

  const handleChangePassword = () => {
  setError("");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return setError("All fields are required.");
  }

  if (newPassword !== confirmPassword) {
    return setError("Passwords do not match.");
  }

  if (newPassword === currentPassword) {
    return setError("New password must be different from your current password.");
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.email === user.email);

  if (users[index]?.password !== currentPassword) {
    return setError("Current password is incorrect.");
  }

  // DEMO OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("OTP (demo):", otpCode);

  setGeneratedOtp(otpCode);
  setStep("otp");
};

const verifyOtp = (inputOtp) => {
  if (inputOtp !== generatedOtp) {
    setError("Invalid verification code.");
    return;
  }

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const index = users.findIndex((u) => u.email === user.email);

  users[index].password = newPassword;
  localStorage.setItem("users", JSON.stringify(users));

  logActivity(
  user.email,
  "Password Changed",
  "User successfully updated their password",
  "security"
);

  // ✅ SHOW SUCCESS
  setSuccess("Password updated successfully.");

  // ✅ RESET FORM + CLOSE OTP
  setStep("form");
  setGeneratedOtp("");
  setCurrentPassword("");
  setNewPassword("");
  setConfirmPassword("");
  setShowCurrent(false);
  setShowNew(false);
  setShowConfirm(false);
  setError("");

  // ⏱ AUTO-HIDE SUCCESS AFTER 3 SECONDS
  setTimeout(() => {
    setSuccess("");
  }, 3000);
};
  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-xl mx-auto mt-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Lock size={18} />
        Change Password
      </h3>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 text-sm text-green-600 bg-green-50 px-4 py-2 rounded-lg">
          {success}
        </div>
      )}

      {step === "form" && (
  <div className="space-y-4">

    {/* CURRENT PASSWORD */}
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        Current Password
      </label>

      <div className="relative">
        <input
          type={showCurrent ? "text" : "password"}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 text-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShowCurrent(!showCurrent)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>

    {/* NEW PASSWORD */}
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        New Password
      </label>

      <div className="relative">
        <input
          type={showNew ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 text-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShowNew(!showNew)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>

    {/* CONFIRM PASSWORD */}
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">
        Confirm New Password
      </label>

      <div className="relative">
        <input
          type={showConfirm ? "text" : "password"}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border rounded-lg px-4 py-2 text-sm pr-10"
        />
        <button
          type="button"
          onClick={() => setShowConfirm(!showConfirm)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        >
          {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>

    <button
      onClick={handleChangePassword}
      className="bg-[#017FE6] text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-[#0165B8] mx-auto block"
    >
      Update Password
    </button>

  </div>
)}

{step === "otp" && (
  <ChangePasswordOTP
    email={user.email}
    onVerify={verifyOtp}
    onCancel={() => setStep("form")}
  />
)}
    </div>
  );
};

export default ChangePassword;