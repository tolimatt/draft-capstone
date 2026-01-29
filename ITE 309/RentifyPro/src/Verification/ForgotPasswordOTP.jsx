import React, { useState, useEffect, useRef } from "react";

 const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "";

  const [name, domain] = email.split("@");

  const maskedName = name
    .split("")
    .map((char, index) => (index % 2 === 0 ? char : "*"))
    .join("");

  return `${maskedName}@${domain}`;
};


const ForgotPasswordOTP = ({ email, onVerified, onNavigateToForgotPassword }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer === 0) return;
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const handleChange = (v, i) => {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp];
    n[i] = v;
    setOtp(n);
    if (v && i < 5) inputsRef.current[i + 1].focus();
  };

  const handleVerify = () => {
    if (otp.some((d) => d === "")) return;

    setIsVerifying(true);

    setTimeout(() => {
      setIsVerifying(false);
      setSuccess(true);

      setTimeout(() => {
        onVerified();
      }, 1500);
    }, 1200);
  };

  const handleResend = () => {
  setTimer(60);
  setOtp(["", "", "", "", "", ""]);
  setSuccess(false);
  setIsVerifying(false);

  setTimeout(() => {
    inputsRef.current[0]?.focus();
  }, 100);

  console.log("Resend OTP to:", email);
};


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-3xl border-2 border-gray-300 px-12 py-14 shadow-lg w-full max-w-2xl text-center">

        <h1 className="text-4xl font-extrabold text-[#017FE6] mb-4">
          Password Recovery
        </h1>

        <p className="text-gray-600 mb-8">
          Enter the 6-digit code sent to <br />
          <span className="font-medium">{maskEmail(email)}</span>
        </p>

        {/* OTP INPUTS */}
        <div className="flex justify-center gap-4 mb-6">
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(e.target.value, i)}
              className="w-16 h-20 text-center border-2 rounded-2xl text-2xl font-bold focus:outline-none focus:border-[#017FE6]"
            />
          ))}
        </div>

        {success && (
          <p className="text-green-600 font-semibold mb-4">
            ✅ Verified! Redirecting…
          </p>
        )}

     {/* RESEND (SAME AS REGISTER OTP) */}
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


        {/* VERIFY BUTTON */}
        <button
          onClick={handleVerify}
          disabled={isVerifying || success}
          className={`w-full py-3 rounded-xl font-semibold transition ${
            isVerifying || success
              ? "bg-gray-300"
              : "bg-[#017FE6] text-white hover:bg-[#0165B8]"
          }`}
        >
          {isVerifying ? "Verifying..." : "Verify"}
        </button>

        {/* CANCEL / BACK */}
        <button
          onClick={onNavigateToForgotPassword}
          className="mt-6 text-sm text-gray-500 hover:text-[#017FE6]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordOTP;
