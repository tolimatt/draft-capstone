import React, { useState } from "react";

const ForgotPasswordEmail = ({ onNavigateToOTP, onNavigateToSignIn }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
  ];

  const handleSubmit = () => {
    if (!email) {
      setError("Email address is required.");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address format.");
      return;
    }

    const domain = email.split("@")[1];
    if (!allowedDomains.includes(domain)) {
      setError(
        "Please use a valid email from Gmail, Yahoo, Outlook, or Hotmail."
      );
      return;
    }

    setError("");

    // FRONTEND ONLY – simulate sending OTP
    console.log("Send OTP to:", email);

    onNavigateToOTP(email);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-3xl border-2 border-gray-300 px-12 py-14 shadow-lg w-full max-w-lg flex flex-col text-center">

        <h1 className="text-4xl font-extrabold text-[#017FE6] mb-4">
          Forgot Password
        </h1>

        <p className="text-gray-600 text-base mb-8">
          Enter your registered email address. <br />
          We’ll send you a 6-digit verification code.
        </p>

        {/* EMAIL INPUT */}
        <div className="text-left mb-6">
          <label className="block text-gray-700 font-semibold mb-2">
            Email Address
          </label>

          <input
            type="email"
            placeholder="you@example.com"
            className={`w-full border-2 rounded-xl px-4 py-3 outline-none
              ${
                error
                  ? "border-red-500"
                  : "border-gray-300 focus:border-[#017FE6]"
              }
            `}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value.toLowerCase().trim());
              setError("");
            }}
          />

          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}

          <p className="text-xs text-gray-400 mt-1">
            Supported providers: Gmail, Yahoo, Outlook, Hotmail
          </p>
        </div>

        {/* SEND OTP */}
        <button
          onClick={handleSubmit}
          className="w-full bg-[#017FE6] text-white py-3 rounded-xl font-semibold hover:bg-[#0165B8] mb-6"
        >
          Send OTP
        </button>

        {/* CANCEL */}
        <button
          onClick={onNavigateToSignIn}
          className="text-sm text-gray-500 hover:text-[#017FE6]"
        >
          ← Cancel
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordEmail;
