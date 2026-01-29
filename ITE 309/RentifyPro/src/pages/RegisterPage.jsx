import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const RegisterPage = ({ onNavigateToHome, onNavigateToSignIn, onNavigateToRegisterOTP }) => {

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
  const users = JSON.parse(localStorage.getItem("users")) || [];

  {/* SAVE DATA FOR NEW USER */}
  users.push({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    password: form.password, 
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border-2 border-gray-300 p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-center mb-2">Register</h2>
            <p className="text-gray-600 text-center mb-8">
              Create an account to get started.
            </p>

            <div className="space-y-5">
              {/* NAME */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-[#017FE6]"
                    onChange={(e) =>
                      handleChange("firstName", e.target.value)
                    }
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="font-semibold text-gray-700 mb-1 block">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 rounded-xl focus:border-[#017FE6]"
                    onChange={(e) =>
                      handleChange("lastName", e.target.value)
                    }
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm">{errors.lastName}</p>
                  )}
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border-2 rounded-xl focus:border-[#017FE6]"
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </div>

              {/* PHONE */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 border-2 rounded-xl focus:border-[#017FE6]"
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3 border-2 rounded-xl pr-12 focus:border-[#017FE6]"
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
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="font-semibold text-gray-700 mb-1 block">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="w-full px-4 py-3 border-2 rounded-xl pr-12 focus:border-[#017FE6]"
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
                {errors.confirmPassword && (
                  <p className="text-red-500 text-sm">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* TERMS */}
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  onChange={(e) =>
                    handleChange("agree", e.target.checked)
                  }
                />
                <span>
                  I agree to the{" "}
                  <span className="text-blue-600 font-semibold">
                    Terms & Conditions
                  </span>{" "}
                  and{" "}
                  <span className="text-blue-600 font-semibold">
                    Privacy Policy
                  </span>
                </span>
              </div>
              {errors.agree && (
                <p className="text-red-500 text-sm">{errors.agree}</p>
              )}

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
