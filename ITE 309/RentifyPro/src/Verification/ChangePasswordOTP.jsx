import React, { useEffect, useState } from "react";

const ChangePasswordOTP = ({ email, onVerify, onCancel }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);

  // reset on mount
  useEffect(() => {
    setOtp(["", "", "", "", "", ""]);
    setTimer(60);
  }, []);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleChange = (value, index) => {
    if (!/^[0-9]?$/.test(value)) return;

    const updated = [...otp];
    updated[index] = value;
    setOtp(updated);

    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleResend = () => {
    setTimer(60);
    setOtp(["", "", "", "", "", ""]);
    console.log("Resend OTP to:", email);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">

        <h2 className="text-2xl font-bold text-[#017FE6] mb-2">
          Change Password Verification
        </h2>

        <p className="text-sm text-gray-500 mb-6">
          Enter the 6-digit verification code sent to <br />
          <span className="font-medium">{email}</span>
        </p>

        <div className="flex justify-center gap-3 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, index)}
              className="w-12 h-14 text-center text-xl border rounded-lg focus:ring-2 focus:ring-[#017FE6]"
            />
          ))}
        </div>

        {timer > 0 ? (
          <p className="text-xs text-gray-400 mb-4">
            Resend code in {timer}s
          </p>
        ) : (
          <button
            onClick={handleResend}
            className="text-sm text-[#017FE6] font-semibold mb-4"
          >
            Resend Code
          </button>
        )}

        <button
          onClick={() => onVerify(otp.join(""))}
          className="w-full bg-[#017FE6] text-white py-3 rounded-lg font-semibold hover:bg-[#0165B8]"
        >
          Verify Code
        </button>

        <button
          onClick={onCancel}
          className="mt-4 text-sm text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordOTP;