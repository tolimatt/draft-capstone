import React, { useState } from "react";
import { Eye, EyeOff, User, Car } from "lucide-react";

const RegisterPage = ({ onNavigateToHome, onNavigateToSignIn, onNavigateToRegisterOTP,  onNavigateToOwnerRegister,}) => {

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  {/* TESTING LANG TO */}

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [accountType, setAccountType] = useState("user"); 
  const handleAccountSelect = (type) => {
  if (type === "renter") {
    onNavigateToOwnerRegister();
    return;
  }
  setAccountType(type);
};


  const nameRegex = /^[A-Za-z\s]+$/;
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  const phoneRegex = /^\d{11}$/;

  const allowedDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
  ];

{/* EXISTING EMAILS FOR TESTING */}
const existingEmails = ["test@gmail.com", "admin@yahoo.com"];


  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
    setErrors({ ...errors, [field]: "" });
  };

 const handleRegister = () => {
  const newErrors = {};

  {/* AUTH */}

  {/* FIRST NAME */}
  if (!form.firstName) {
    newErrors.firstName = "First name is required.";
  } else if (!nameRegex.test(form.firstName)) {
    newErrors.firstName =
      "First name must contain letters only.";
  }

  {/* LAST NAME */}
  if (!form.lastName) {
    newErrors.lastName = "Last name is required.";
  } else if (!nameRegex.test(form.lastName)) {
    newErrors.lastName =
      "Last name must contain letters only.";
  }

  {/* EMAIL */}
  if (!form.email) {
    newErrors.email = "Email address is required.";
  } else if (!emailRegex.test(form.email)) {
    newErrors.email = "Please enter a valid email address.";
  } else {
    const domain = form.email.split("@")[1];

    if (!allowedDomains.includes(domain)) {
      newErrors.email =
        "Please use a valid email address from a supported provider.";
    } else if (existingEmails.includes(form.email)) {
      newErrors.email =
        "This email address is already registered.";
    }
  }

  {/* NUMBER */}
  if (!form.phone) {
    newErrors.phone = "Phone number is required.";
  } else if (!phoneRegex.test(form.phone)) {
    newErrors.phone =
      "Phone number must be exactly 11 digits.";
  }

  {/* PASSWORD */}
  if (!form.password) {
    newErrors.password = "Password is required.";
  } else if (form.password.length < 8) {
    newErrors.password =
      "Password must be at least 8 characters.";
  } else if (!/[A-Z]/.test(form.password)) {
    newErrors.password =
      "Password must contain at least one uppercase letter.";
  } else if (!/[0-9]/.test(form.password)) {
    newErrors.password =
      "Password must contain at least one number.";
  }

  {/* CPAK */}
  if (!form.confirmPassword) {
    newErrors.confirmPassword = "Please confirm your password.";
  } else if (form.password !== form.confirmPassword) {
    newErrors.confirmPassword = "Passwords do not match.";
  }

  {/* TERMS */}
  if (!form.agree) {
    newErrors.agree =
      "You must agree to the Terms and Conditions.";
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    // 🔴 IMPORTANT RESET (NORMAL USER IS NOT OWNER)
  localStorage.removeItem("isVehicleOwner");
  localStorage.setItem("activeRole", "user");
  localStorage.setItem("hasUserAccount", "true");


  const users = JSON.parse(localStorage.getItem("users")) || [];

  {/* SAVE DATA FOR NEW USER */}
  users.push({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    password: form.password, 
    role: accountType,
  });

  localStorage.setItem("users", JSON.stringify(users));

  console.log("Registered users:", users);

  onNavigateToRegisterOTP(form.email, form.phone);
}


};


  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <div className="absolute top-0 -left-5 h-full w-[75%] bg-gradient-to-br from-[#017FE6] to-[#015FCC] flex justify-center">
          <div className="mt-28 text-center text-white">
            <button
              onClick={onNavigateToHome}
              className="text-5xl font-bold mb-4 hover:opacity-90"
            >
              Rentify<span className="text-white">Pro</span>
            </button>
            <p className="text-xl">Create an account and book with ease.</p>
          </div>
        </div>

        <img
          src="/sign-in-car.png"
          alt="RentifyPro vehicle"
          className="absolute bottom-0 -left-32 w-[900px] max-w-none z-20"
        />
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex justify-center p-8 bg-white overflow-y-auto max-h-screen">
        <div className="w-full max-w-[620px]">
          <div className="bg-white rounded-3xl border border-gray-300 p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-center mb-1">Register</h2>
            <p className="text-gray-600 text-center mb-4 text-sm">
              Create an account to get started.
            </p>

            {/* REGISTER AS */}
            <div className="space-y-2 mb-4">
              <label className="font-semibold text-gray-700 block">
                Register as
              </label>

              <div className="grid grid-cols-2 gap-3">
              <button
              type="button"
              onClick={() => handleAccountSelect("user")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition
                ${accountType === "user"
                  ? "border-[#017FE6] bg-blue-50"
                  : "border-gray-300 hover:border-[#017FE6]"}
              `}
            >
              {/* CHECK */}
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0
                  ${accountType === "user"
                    ? "border-[#017FE6] bg-[#017FE6] text-white"
                    : "border-gray-400"}
                `}
              >
                {accountType === "user" && "✓"}
              </div>

              {/* CONTENT */}
              <div className="flex items-center gap-3">
                <span className="text-xl"><User size={18} /></span>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">
                    User
                  </p>
                  <p className="text-xs text-gray-600">
                    Rent vehicles 
                  </p>
                </div>
              </div>
            </button>

              <button
              type="button"
              onClick={() => handleAccountSelect("renter")}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition
                ${accountType === "renter"
                  ? "border-[#017FE6] bg-blue-50"
                  : "border-gray-300 hover:border-[#017FE6]"}
              `}
            >
              {/* CHECK */}
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0
                  ${accountType === "renter"
                    ? "border-[#017FE6] bg-[#017FE6] text-white"
                    : "border-gray-400"}
                `}
              >
                {accountType === "renter" && "✓"}
              </div>

              {/* CONTENT */}
              <div className="flex items-center gap-3">
                <span className="text-xl"><Car size={18} /></span>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">
                    Renter
                  </p>
                  <p className="text-xs text-gray-600">
                    List vehicles 
                  </p>
                </div>
              </div>
            </button>
              </div>
            </div>


            <div className="space-y-3">
              {/* NAME */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:border-[#017FE6]
                      ${errors.firstName ? "border-red-500" : "border-gray-300"}
                    `}
                    onChange={(e) =>
                      handleChange("firstName", e.target.value)
                    }
                  />
                  <p className="text-red-500 text-xs min-h-[1rem]">
                    {errors.firstName || ""}
                  </p>

                </div>

                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                   className={`w-full px-4 py-2 border rounded-lg text-sm focus:border-[#017FE6]
                      ${errors.lastName ? "border-red-500" : "border-gray-300"}
                    `}
                    onChange={(e) =>
                      handleChange("lastName", e.target.value)
                    }
                  />
                  <p className="text-red-500 text-xs min-h-[1rem]">
                    {errors.lastName || ""}
                  </p>

                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className={`w-full px-4 py-2 border rounded-lg text-sm focus:border-[#017FE6]
                    ${errors.email ? "border-red-500" : "border-gray-300"}
                  `}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                <p className="text-red-500 text-xs min-h-[1rem]">
                  {errors.email || ""}
                </p>

              </div>

              {/* PHONE */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className={`w-full px-4 py-2 border rounded-lg text-sm focus:border-[#017FE6]
                    ${errors.phone ? "border-red-500" : "border-gray-300"}
                  `}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                <p className="text-red-500 text-xs min-h-[1rem]">
                  {errors.phone || ""}
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`w-full px-4 py-2 border rounded-lg text-sm focus:border-[#017FE6]
                    ${errors.password ? "border-red-500" : "border-gray-300"}
                  `}
                    onChange={(e) =>
                      handleChange("password", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
               <p className="text-red-500 text-xs min-h-[1rem]">
                  {errors.password || ""}
                </p>

              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                   className={`w-full px-4 py-2 border rounded-lg text-sm focus:border-[#017FE6]
                    ${errors.confirmPassword ? "border-red-500" : "border-gray-300"}
                  `}
                    onChange={(e) =>
                      handleChange("confirmPassword", e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showConfirm ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <p className="text-red-500 text-xs min-h-[1rem]">
                  {errors.confirmPassword || ""}
                </p>

              </div>

              {/* TERMS */}
                  <div>
                    <label className="flex items-start gap-3 mb-1">
                     <input
                      type="checkbox"
                      checked={form.agree}
                      onChange={(e) => handleChange("agree", e.target.checked)}
                      className="mt-1"
                    />

                      <span className="text-sm text-gray-700">
                        I agree to the{" "}
                        <span className="text-[#017FE6] font-semibold">
                          Terms of Condition
                        </span>{" "}
                        and{" "}
                        <span className="text-[#017FE6] font-semibold">
                          Privacy Policy
                        </span>
                      </span>
                    </label>
                    {errors.agree && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.agree}
                      </p>
                    )}
                  </div>

              {/* SUBMIT */}
              <button
                onClick={handleRegister}
                className="w-full bg-[#017FE6] text-white py-3 rounded-xl font-semibold hover:bg-[#0165B8]"
              >
                Register
              </button>

              <p className="text-center text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={onNavigateToSignIn}
                  className="text-[#017FE6] font-semibold"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
