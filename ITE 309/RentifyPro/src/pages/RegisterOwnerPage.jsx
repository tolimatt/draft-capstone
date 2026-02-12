import React, { useMemo, useState, useEffect} from "react";
import { ChevronLeft, Upload, Eye, EyeOff } from "lucide-react";

/**
 * RegisterOwnerPage
 * - Fixed LEFT panel background width
 * - Removed inner 75% blue div
 * - Gradient now applied directly to panel
 */
const RegisterOwnerPage = ({
  onBack,
  onNavigateToSignIn,
  onNavigateToHome,
  onNavigateToRegisterOTP,
}) => {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    businessName: "",
    businessEmail: "",
    password: "",
    confirmPassword: "",
    ownerType: "individual",
    licenseNumber: "",
    permitNumber: "",
    agree: false,
  });

  const [files, setFiles] = useState({
  governmentId: null,
  driversLicense: null,
  businessPermit: null,
  selfie: null,
});

  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const documentConfig = form.ownerType === "business"
  ? [
      {
        key: "governmentId",
        label: "Government ID",
        helper: "National ID, Passport, etc.",
      },
      {
        key: "driversLicense",
        label: "Driver’s License",
        helper: "Valid driver's license",
      },
      {
        key: "businessPermit",
        label: "Business Permit",
        helper: "DTI / SEC / Mayor’s Permit",
      },
    ]
  : [
      {
        key: "governmentId",
        label: "Government ID",
        helper: "National ID, Passport, etc.",
      },
      {
        key: "driversLicense",
        label: "Driver’s License",
        helper: "Valid driver's license",
      },
    ];


  const canShowBusinessFields = useMemo(
    () => form.ownerType === "business",
    [form.ownerType]
  );

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
  name === "businessEmail"
    ? value.toLowerCase().trim()
    : type === "checkbox"
    ? checked
    : value,

    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFile = (e) => {
    const { name, files: picked } = e.target;
    const file = picked && picked[0] ? picked[0] : null;

    setFiles((prev) => ({ ...prev, [name]: file }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

// PSGC data
const [regions, setRegions] = useState([]);
const [provinces, setProvinces] = useState([]);
const [cities, setCities] = useState([]);
const [barangays, setBarangays] = useState([]);

// Track manual address edit
const [isAddressEdited, setIsAddressEdited] = useState(false);

  const validate = () => {
    const next = {};

    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.phone.trim()) next.phone = "Phone number is required.";
    if (!form.address.trim()) next.address = "Address is required.";
    if (!form.region.trim()) next.region = "Region is required.";
    if (!form.province.trim()) next.province = "Province is required.";
    if (!form.city.trim()) next.city = "City/Municipality is required.";
    if (!form.barangay.trim()) next.barangay = "Barangay is required.";

    if (!form.businessEmail.trim())
      next.businessEmail = "Email is required.";
    if (
      form.businessEmail &&
      !/^\S+@\S+\.\S+$/.test(form.businessEmail)
    ) {
      next.businessEmail = "Enter a valid email.";
    }

    if (!form.password) next.password = "Password required.";
    if (form.password && form.password.length < 8) {
      next.password = "Password must be at least 8 characters.";
    }
    if (!form.confirmPassword)
      next.confirmPassword = "Confirm password.";
    if (form.password !== form.confirmPassword)
      next.confirmPassword = "Passwords do not match.";

    if (!form.licenseNumber.trim())
      next.licenseNumber = "License required.";

    if (canShowBusinessFields) {
      if (!form.businessName.trim())
        next.businessName = "Business name required.";
      if (!form.permitNumber.trim())
        next.permitNumber = "Permit required.";
    }

    if (!files.governmentId)
    next.governmentId = "Government ID required.";

    if (!files.driversLicense)
      next.driversLicense = "Driver’s License required.";

    if (canShowBusinessFields && !files.businessPermit)
      next.businessPermit = "Business permit required.";
    // selfie (required for ALL owners)
    if (!files.selfie) {
      next.selfie = "Selfie with clear face is required.";
    }



    if (!form.agree) next.agree = "You must agree.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

 const handleSubmit = (e) => {
  e.preventDefault();
  if (!validate()) return;

  const ownerUsers =
    JSON.parse(localStorage.getItem("ownerUsers")) || [];

  ownerUsers.push({
    email: form.businessEmail.toLowerCase(),
    password: form.password,
    role: "owner",
    name: `${form.firstName} ${form.lastName}`,
  });

  localStorage.setItem("ownerUsers", JSON.stringify(ownerUsers));

  onNavigateToRegisterOTP(
    form.businessEmail,
    form.phone
  );
};



  // Load regions
useEffect(() => {
  fetch("https://psgc.gitlab.io/api/regions/")
    .then(res => res.json())
    .then(setRegions)
    .catch(() => {});
}, []);

// Region -> Province
useEffect(() => {
  if (!form.region) {
    setProvinces([]);
    setCities([]);
    setBarangays([]);
    return;
  }

  fetch(`https://psgc.gitlab.io/api/regions/${form.region}/provinces/`)
    .then(res => res.json())
    .then(data => {
      setProvinces(data);
      setCities([]);
      setBarangays([]);
    })
    .catch(() => {});
}, [form.region]);

// Province -> City
useEffect(() => {
  if (!form.province) {
    setCities([]);
    setBarangays([]);
    return;
  }

  fetch(
    `https://psgc.gitlab.io/api/provinces/${form.province}/cities-municipalities/`
  )
    .then(res => res.json())
    .then(data => {
      setCities(data);
      setBarangays([]);
    })
    .catch(() => {});
}, [form.province]);

// City -> Barangay
useEffect(() => {
  if (!form.city) {
    setBarangays([]);
    return;
  }

  fetch(
    `https://psgc.gitlab.io/api/cities-municipalities/${form.city}/barangays/`
  )
    .then(res => res.json())
    .then(setBarangays)
    .catch(() => {});
}, [form.city]);

useEffect(() => {
  if (isAddressEdited) return;
  if (!form.region) return;

  const regionName =
    regions.find(r => r.code === form.region)?.name || "";
  const provinceName =
    provinces.find(p => p.code === form.province)?.name || "";
  const cityName =
    cities.find(c => c.code === form.city)?.name || "";
  const barangayName =
    barangays.find(b => b.code === form.barangay)?.name || "";

  const fullAddress = [barangayName, cityName, provinceName, regionName]
    .filter(Boolean)
    .join(", ");

  setForm(prev => ({
    ...prev,
    address: fullAddress,
  }));
}, [
  form.region,
  form.province,
  form.city,
  form.barangay,
  regions,
  provinces,
  cities,
  barangays,
  isAddressEdited,
]);


  return (
    <div className="min-h-screen flex">
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


      {/* ================= RIGHT PANEL ================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8 bg-white">
        <div className="w-full max-w-[620px]">
          {/* Mobile Back */}
          <div className="lg:hidden flex items-center mb-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-700 hover:text-[#017FE6]"
            >
              <ChevronLeft size={18} />
              Back
            </button>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-300 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-7 pt-7 pb-4">
              <h2 className="text-2xl font-bold text-center">
                Register as Owner / Lessor
              </h2>
              <p className="text-gray-600 text-center mt-2 mb-4 text-sm">
                 Provide your details and documents to apply.
              </p>
            </div>

            {/* Body */}
            <div className="px-7 py-6 max-h-[74vh] overflow-y-auto space-y-7">
              {/* SUCCESS STATE */}
              {submitted ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                  <h2 className="text-2xl font-bold mb-2 text-green-700">
                    Submitted
                  </h2>
                  <p className="text-green-700/80 mb-6">
                    Your owner/lessor registration form was captured.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setSubmitted(false)}
                      className="bg-[#017FE6] text-white px-6 py-2 rounded-full hover:bg-[#0165B8] transition font-semibold shadow-lg shadow-blue-200/60"
                    >
                      Submit another
                    </button>
                    <button
                      onClick={onBack}
                      className="border border-gray-200 px-6 py-2 rounded-full hover:bg-gray-50 transition font-semibold"
                    >
                      Go back
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-7">
                  
                  {/* OWNER TYPE */}
                  <div>
                    <label className="block font-semibold mb-3 text-gray-800">
                      Owner Type <span className="text-red-500">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <RadioCard
                        checked={form.ownerType === "individual"}
                        title="Individual"
                        subtitle="Personal lessor account"
                      >
                        <input
                          type="radio"
                          name="ownerType"
                          value="individual"
                          checked={form.ownerType === "individual"}
                          onChange={handleChange}
                        />
                      </RadioCard>

                      <RadioCard
                        checked={form.ownerType === "business"}
                        title="Business"
                        subtitle="Registered company lessor"
                      >
                        <input
                          type="radio"
                          name="ownerType"
                          value="business"
                          checked={form.ownerType === "business"}
                          onChange={handleChange}
                        />
                      </RadioCard>
                    </div>
                  </div>
                  
                  {/* PERSONAL INFO */}
                  <section className="pt-2">
                    <h3 className="text-lg font-bold mb-4">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="First Name"
                        required
                        name="firstName"
                        value={form.firstName}
                        onChange={handleChange}
                        error={errors.firstName}
                        placeholder="Juan"
                      />
                      <InputField
                        label="Last Name"
                        required
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        error={errors.lastName}
                        placeholder="Dela Cruz"
                      />
                      <InputField
                        label="Phone Number"
                        required
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        error={errors.phone}
                        placeholder="+63..."
                      />

                    </div>
                    </section>

                      {/* ADDRESS INFO */}
                      <section className="pt-2">
                      <h3 className="text-lg font-bold mb-4">
                        Address Information
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* FULL ADDRESS */}
                        <InputField
                          label="Full Address"
                          required
                          name="address"
                          value={form.address}
                          onChange={(e) => {
                            setIsAddressEdited(true);
                            handleChange(e);
                          }}
                          error={errors.address}
                        />

                        {/* REGION */}
                        <SelectField
                          label="Region"
                          required
                          name="region"
                          value={form.region}
                          onChange={(e) => {
                            setIsAddressEdited(false);
                            handleChange(e);
                          }}
                          error={errors.region}
                          options={regions}
                        />

                        {/* PROVINCE */}
                        <SelectField
                          label="Province"
                          required
                          name="province"
                          value={form.province}
                          onChange={(e) => {
                            setIsAddressEdited(false);
                            handleChange(e);
                          }}
                          error={errors.province}
                          options={provinces}
                          disabled={!form.region}
                        />

                        {/* CITY */}
                        <SelectField
                          label="City / Municipality"
                          required
                          name="city"
                          value={form.city}
                          onChange={(e) => {
                            setIsAddressEdited(false);
                            handleChange(e);
                          }}
                          error={errors.city}
                          options={cities}
                          disabled={!form.province}
                        />

                        {/* BARANGAY */}
                        <SelectField
                          label="Barangay"
                          required
                          name="barangay"
                          value={form.barangay}
                          onChange={(e) => {
                            setIsAddressEdited(false);
                            handleChange(e);
                          }}
                          error={errors.barangay}
                          options={barangays}
                          disabled={!form.city}
                        />

                      </div>
                    </section>

                  
                  {/* BUSINESS INFO */}
                  {canShowBusinessFields && (
                    <section className="border-t border-gray-200 pt-7">
                      <h3 className="text-lg font-bold mb-4">
                        Business Information
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputField
                          label="Business Name"
                          required
                          name="businessName"
                          value={form.businessName}
                          onChange={handleChange}
                          error={errors.businessName}
                        />
                        <InputField
                          label="Permit Number"
                          required
                          name="permitNumber"
                          value={form.permitNumber}
                          onChange={handleChange}
                          error={errors.permitNumber}
                        />
                      </div>
                    </section>
                  )}
                  
                  {/* ACCOUNT DETAILS */}
                  <section className="border-t border-gray-200 pt-7">
                    <h3 className="text-lg font-bold mb-4">
                      Account Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="Business Email"
                        required
                        name="businessEmail"
                        value={form.businessEmail}
                        onChange={handleChange}
                        error={errors.businessEmail}
                      />

                      <InputField
                        label="Driver’s License Number"
                        required
                        name="licenseNumber"
                        value={form.licenseNumber}
                        onChange={handleChange}
                        error={errors.licenseNumber}
                      />

                      <PasswordField
                        label="Password"
                        required
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        error={errors.password}
                        show={showPw}
                        toggleShow={() => setShowPw(v => !v)}
                      />

                      <PasswordField
                        label="Confirm Password"
                        required
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        error={errors.confirmPassword}
                        show={showCpw}
                        toggleShow={() => setShowCpw(v => !v)}
                      />
                    </div>
                  </section>
                
                  {/* DOCUMENTS */}
                  <section className="border-t border-gray-200 pt-7">
                    <h3 className="text-lg font-bold mb-2">
                      Verification Documents
                    </h3>

                    <p className="text-gray-600 text-sm mb-5">
                      Upload clear and valid documents.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {documentConfig.map((doc) => (
                        <FileInput
                          key={doc.key}
                          label={doc.label}
                          helper={doc.helper}
                          name={doc.key}
                          file={files[doc.key]}
                          error={errors[doc.key]}
                          onChange={handleFile}
                        />
                      ))}

                      <FileInput
                        label="Live Selfie (Face Verification)"
                        helper="Take a clear selfie. Make sure your face is visible and well-lit."
                        name="selfie"
                        onChange={handleFile}
                        error={errors.selfie}
                        file={files.selfie}
                      />
                    </div>
                  </section>

                  {/* TERMS */}
                  <div>
                    <label className="flex items-start gap-3 mb-1">
                      <input
                        type="checkbox"
                        name="agree"
                        checked={form.agree}
                        onChange={handleChange}
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

                  {/* BUTTONS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={onBack}
                      className="border-2 border-gray-200 py-3 rounded-2xl font-semibold"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="bg-[#017FE6] text-white py-3 rounded-2xl font-semibold"
                    >
                      Register
                    </button>
                  </div>

                  <p className="text-center text-gray-600">
                    Already have an account?{" "}
                    <span
                      onClick={onNavigateToSignIn}
                      className="text-[#017FE6] font-semibold cursor-pointer"
                    >
                      Sign In
                    </span>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

{/* UI COMPONENTS */}

const baseInput =
  "w-full border rounded-xl px-4 py-3 focus:border-[#017FE6] focus:ring-2 focus:ring-[#017FE6]/15 outline-none bg-white";

const InputField = ({
  label,
  required,
  name,
  value,
  onChange,
  error,
  placeholder,
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label}{" "}
      {required && <span className="text-red-500">*</span>}
    </label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder || ""}
      className={`w-full h-11 rounded-xl border px-4 text-sm outline-none transition
        ${
          error
            ? "border-red-300 focus:border-red-400"
            : "border-gray-300 focus:border-[#017FE6]"
        }`}
    />
    {error && (
      <p className="text-xs text-red-500">{error}</p>
    )}
  </div>
);

const SelectField = ({
  label,
  required,
  name,
  value,
  onChange,
  error,
  options,
  disabled,
}) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <select
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full h-11 rounded-xl border px-4 text-sm outline-none transition
        ${
          error
            ? "border-red-300"
            : "border-gray-300 focus:border-[#017FE6]"
        }
        ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
      `}
    >
      <option value="">Select {label}</option>
      {options.map(opt => (
        <option key={opt.code} value={opt.code}>
          {opt.name}
        </option>
      ))}
    </select>

    {error && <p className="text-xs text-red-500">{error}</p>}
  </div>
);



const PasswordField = ({
  label,
  required,
  name,
  value,
  onChange,
  error,
  show,
  toggleShow,
}) => (
  <div className="relative">
    <label className="block text-sm font-semibold mb-2">
      {label}{" "}
      {required && (
        <span className="text-red-500">*</span>
      )}
    </label>
    <input
      type={show ? "text" : "password"}
      name={name}
      value={value}
      onChange={onChange}
      className={`${baseInput} pr-11 ${
        error ? "border-red-300" : "border-gray-200"
      }`}
    />
    <button
      type="button"
      onClick={toggleShow}
      className="absolute right-3 top-[42px]"
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
    {error && (
      <p className="text-red-500 text-sm mt-1">
        {error}
      </p>
    )}
  </div>
);

const RadioCard = ({
  checked,
  title,
  subtitle,
  children,
}) => (
  <label
    className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer ${
      checked
        ? "border-[#017FE6] bg-[#017FE6]/5"
        : "border-gray-200"
    }`}
  >
    {children}
    <div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs text-gray-500">
        {subtitle}
      </p>
    </div>
  </label>


);

const FileInput = ({
  label,
  helper,
  name,
  onChange,
  error,
  file,
}) => (
  <div className="space-y-1">

    {helper && (
      <p className="text-xs text-gray-500">{helper}</p>
    )}

    <div
      className={`h-11 flex items-center justify-between gap-3 rounded-xl border px-4
        ${
          error ? "border-red-300" : "border-gray-300"
        }`}
    >
      <span className="text-sm text-gray-600 truncate">
        {file ? file.name : "No file selected"}
      </span>

      <label className="text-sm font-semibold text-[#017FE6] cursor-pointer hover:underline">
        Choose
        <input
          type="file"
          name={name}
          accept="image/*,.pdf"
          capture="user" 
          onChange={onChange}
          className="hidden"
        />
      </label>
    </div>

    {error && (
      <p className="text-xs text-red-500">{error}</p>
    )}
  </div>
);


export default RegisterOwnerPage;


