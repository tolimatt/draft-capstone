import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const SignInPage = ({ onNavigateToHome, onNavigateToRegister, onNavigateToForgotPassword, onLoginSuccess}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  const allowedDomains = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
];



 const handleSignIn = () => {
  const newErrors = {};

  {/* EMAIL */}
  if (!email) {
    newErrors.email = "Email is required";
  } else if (!emailRegex.test(email)) {
    newErrors.email = "Enter a valid email format";
  } else {
    const parts = email.split("@");
    const domain = parts.length === 2 ? parts[1] : "";

    if (!allowedDomains.includes(domain)) {
      newErrors.email =
       "Please use a valid email address from a supported provider.";
    }

    
  }

  {/* PASSWORD */}
  if (!password) {
    newErrors.password = "Password is required";
  } else if (password.length < 8) {
    newErrors.password = "Password must be at least 8 characters";
  }

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
  console.log("Sign in with:", email, password);

  const users = JSON.parse(localStorage.getItem("users")) || [];
const ownerUsers = JSON.parse(localStorage.getItem("ownerUsers")) || [];

const foundUser =
  users.find(
    (user) => user.email === email && user.password === password
  ) ||
  ownerUsers.find(
    (user) => user.email === email && user.password === password
  );

if (!foundUser) {
  setErrors({
    email: "Invalid email or password",
    password: "Invalid email or password",
  });
  return;
}

{/* IF THE LOGIN SUCCESS */}
onLoginSuccess({
  name: foundUser.name || `${foundUser.firstName} ${foundUser.lastName}`,
  initials: foundUser.initials
    || (foundUser.name
      ? foundUser.name.split(" ").map(n => n[0]).join("")
      : foundUser.firstName.charAt(0) + foundUser.lastName.charAt(0)),
  email: foundUser.email,
  role: foundUser.role || "user",
});


}

};


  return (
    <div className="min-h-screen flex">
      {/* LEFT SIDE */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">

        {/* BLUE PANEL */}
        <div
          className="
            absolute top-0 -left-5 h-full
            w-[75%]
            bg-gradient-to-br from-[#017FE6] to-[#015FCC]
            z-0
            flex items-start justify-center
          "
        >
          <div className="mt-28 text-center text-white">

            {/* CLICKABLE LOGO */}
            <button
              onClick={onNavigateToHome}
              className="text-5xl font-bold mb-4 hover:opacity-90 transition"
            >
              Rentify<span className="text-white">Pro</span>
            </button>

            <p className="text-xl">Book your ride in minutes.</p>
          </div>
        </div>

        {/* CAR IMAGE */}
        <img
          src="/sign-in-car.png"
          alt="RentifyPro vehicle"
          className="
            absolute bottom-0 -left-32
            w-[900px] max-w-none
            object-contain z-20
          "
        />
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl border-2 border-gray-300 p-8 shadow-lg">
            <h2 className="text-3xl font-bold text-center mb-2">Sign In</h2>
            <p className="text-gray-600 text-center mb-8">
              Sign in to proceed with your vehicle reservation.
            </p>

            <div className="space-y-6">
              {/* EMAIL */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value.toLowerCase().trim());
                    setErrors({ ...errors, email: "" });
                  }}

                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none
                    ${
                      errors.email
                        ? "border-red-500"
                        : "border-gray-300 focus:border-[#017FE6]"
                    }
                  `}
                  placeholder="Enter your email"
                />
                <p className="text-red-500 text-xs min-h-[1rem]">
                  {errors.email || ""}
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  Supported providers: Gmail, Yahoo, Outlook, Hotmail
                </p>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors({ ...errors, password: "" });
                    }}
                    className={`w-full px-4 py-3 border-2 rounded-xl pr-12 focus:outline-none
                      ${
                        errors.password
                          ? "border-red-500"
                          : "border-gray-300 focus:border-[#017FE6]"
                      }
                    `}
                    placeholder="Enter your password"
                  />

                  {/* PASSWOTD TOGGLE*/}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#017FE6]"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                  <p className="text-red-500 text-xs min-h-[1rem]">
                  {errors.password || ""}
                </p>
              
              </div>

              <div className="text-right">
                <button onClick={onNavigateToForgotPassword} className="text-gray-600 hover:text-[#017FE6] text-sm">
                  Forgot Password?
                </button>
              </div>

              <button
                onClick={handleSignIn}
                className="w-full bg-[#017FE6] text-white py-3 rounded-xl font-semibold hover:bg-[#0165B8]"
              >
                Sign In
              </button>

              <p className="text-center text-gray-600">
                Don&apos;t have an account?{" "}
                <button onClick={onNavigateToRegister} className="text-[#017FE6] font-semibold">
                  Register
                </button>

              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
