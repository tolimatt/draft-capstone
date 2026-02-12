import React, { useState, useEffect, useRef } from "react";

const RegisterOTP = ({ onNavigateToSignIn, onNavigateToRegister, email, phone, role, }) => {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);


 const maskEmail = (email) => {
  if (!email || !email.includes("@")) return "";

  const [name, domain] = email.split("@");

  const maskedName = name
    .split("")
    .map((char, index) => (index % 2 === 0 ? char : "*"))
    .join("");

  return `${maskedName}@${domain}`;
};


const maskPhone = (phone) => {
  if (!phone || phone.length < 11) return "";
  return phone.replace(/(\d{2})\d{5}(\d{2})/, "$1*****$2");
};




  const inputsRef = useRef([]);

  useEffect(() => {
  inputsRef.current[0]?.focus();
}, []);


  // Countdown timer
  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Handle OTP input
  const handleChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleBackspace = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1].focus();
    }
  };

  const handleVerify = () => {
  if (otp.some((digit) => digit === "")) {
    setError("Please enter the complete 6-digit verification code.");
    return;
  }

  setError("");
  setIsVerifying(true);

  const code = otp.join("");
  console.log("OTP Code:", code);

  // FRONTEND ONLY (simulate API verification)
  setTimeout(() => {
    setIsVerifying(false);
    setIsSuccess(true);

    // Auto redirect to Sign In after 2 seconds
    setTimeout(() => {
  if (role === "owner") {
    localStorage.setItem("isNewOwner", "true"); // 👈 persist owner session
  }
  onNavigateToSignIn();
}, 2000);
  }, 1500);
};


  const handleResend = () => {
    setTimer(60);
    setOtp(["", "", "", "", "", ""]);
    setError("");
    inputsRef.current[0].focus();
    console.log("Resend OTP");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-3xl border-2 border-gray-300 px-12 py-14 shadow-lg w-full max-w-2xl flex flex-col text-center">

        <h1 className="text-4xl font-extrabold text-[#017FE6] mb-4">
          Registration Verification
        </h1>

       <p className="text-gray-600 text-lg mb-10 leading-relaxed">

  Enter the 6-digit verification code sent to <br />
  <span className="font-medium text-gray-700">
    {maskEmail(email)}
  </span>{" "}
  or{" "}
  <span className="font-medium text-gray-700">
    {maskPhone(phone)}
  </span>
</p>

        {/* OTP INPUTS */}
       <div className="flex justify-center items-center gap-4 mb-8">
  {otp.map((digit, index) => (
    <input
      key={index}
      ref={(el) => (inputsRef.current[index] = el)}
      type="text"
      maxLength="1"
      value={digit}
      onChange={(e) => handleChange(e.target.value, index)}
      onKeyDown={(e) => handleBackspace(e, index)}
      className="w-16 h-20 text-center border-2 rounded-2xl text-2xl font-bold focus:outline-none focus:border-[#017FE6]"
    />
  ))}
</div>

        {error && (
          <p className="text-blue-500 text-sm mb-3">{error}</p>
        )}

        {/* RESEND */}
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

        {isSuccess && (
  <p className="text-green-600 font-semibold mb-4">
    ✅ Verification successful! Redirecting to Sign In…
  </p>
)}


        {/* VERIFY BUTTON */}
        <button
  onClick={handleVerify}
  disabled={isVerifying || isSuccess}
  className={`w-full py-3 rounded-xl font-semibold mb-5 transition
    ${
      isVerifying || isSuccess
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-[#017FE6] text-white hover:bg-[#0165B8]"
    }
  `}
>
  {isVerifying ? "Verifying..." : "Verify"}
</button>


        <button
  onClick={onNavigateToRegister}
  disabled={isVerifying || isSuccess}
  className="text-sm text-gray-500 hover:text-[#017FE6] disabled:opacity-50"
>
  ← Cancel
</button>

      </div>
    </div>
  );
};

export default RegisterOTP;
