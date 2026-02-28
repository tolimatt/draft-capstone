import React, { useState, useEffect } from "react";
import {
  Bot,
  Bell,
  MessageCircle,
  Settings,
  Car,
  ShieldCheck,
  User,
  Lock,
  BellRing,
  BadgeCheck,
  Shield,
  Camera,
  MessageCircle as ChatIcon,
  ArrowLeftRight,
} from "lucide-react";

import ChangePassword from "./ChangePassword";
import NotificationSettings from "./NotificationSettings";
import VerificationSettings from "./VerificationSettings";
import ActivityLogs from "./ActivityLogs";

  const headerMap = {
  "Profile Settings": {
    title: "Account Settings",
    description: "Manage your personal information and account preferences",
  },
  "Change Password": {
    title: "Change Password",
    description: "Update your account password securely",
  },
  "Notifications Settings": {
    title: "Notification Settings",
    description: "Choose how you want to receive notifications",
  },
  "Verification": {
    title: "Account Verification",
    description: "View the status of your identity verification submitted during registration",
  },
  "Activity Logs": {
    title: "Activity Logs",
    description: "Review recent login history and security activity",
  },
};

const InputField = React.memo(function InputField({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  max,
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        max={max}
        className={`w-full mt-1 border rounded-lg px-3 py-2 text-sm ${
          disabled ? "bg-gray-100" : "bg-white"
        }`}
      />
    </div>
  );
});

const RadioGroupField = React.memo(function RadioGroupField({
  label,
  value,
  onChange,
  disabled,
  options,
  name,
}) {

  return (
    <div className="mt-1">
      <label className="text-xs text-gray-500 block mb-2">{label}</label>

      <div className="flex gap-6 items-center mt-1">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 text-sm ${
              disabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700"
            }`}
          >
            <input
              type="radio"
              name={name || label}
              value={opt}
              checked={value === opt}
              disabled={disabled}
              onChange={() => onChange(opt)}
              className="accent-[#017FE6] translate-y-[1px]"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
});

const SelectField = React.memo(function SelectField({
  label,
  value,
  onChange,
  disabled,
  options,
}) {
  return (
    <div>
      <label className="text-xs text-gray-500">{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full mt-1 border rounded-lg px-3 py-2 text-sm ${
          disabled ? "bg-gray-100" : "bg-white"
        }`}
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
});

/* =========================================================
   MAIN COMPONENT
========================================================= */
const AccountSettings = ({
  onNavigateToHome,
  onNavigateToSignIn,
  onNavigateToVehicles,
  onNavigateToRegister,
  onNavigateToAbout,
  onNavigateToBookingHistory,
  onNavigateToAccountSettings,
  onNavigateToVehicleOwnerProceed,
  onSwitchToOwner,
  isLoggedIn,
  user,
  onLogout,
}) => {
  const [showAI, setShowAI] = useState(false);
  const [userMessage, setUserMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("Profile Settings");
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isVehicleOwner, setIsVehicleOwner] = useState(false);
  

  useEffect(() => {
  if (!user?.email) return;

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const currentUser = users.find(u => u.email === user.email);

  setIsVehicleOwner(!!currentUser?.isVehicleOwner);
}, [user]);

  // PSGC lists
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);

  // Basic profile (read-only from localStorage users)
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // Profile photo
  const [profilePhoto, setProfilePhoto] = useState(
    localStorage.getItem("profilePhoto") || null
  );

  // Editable sections
  const [editingSection, setEditingSection] = useState(null);
  const [draftProfile, setDraftProfile] = useState(null);

  // Extra profile (saved)
  const [extraProfile, setExtraProfile] = useState({
    dob: "",
    gender: "",
    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    zip: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
  });

  const [isAddressEdited, setIsAddressEdited] = useState(false);

  // AI reset message
  useEffect(() => {
    if (!showAI) return;
    setMessages([
      { sender: "ai", text: "Hi! 👋 This is RentifyPro AI. How can I assist you today?" },
    ]);
  }, [showAI]);

  // Load user data from localStorage users
 useEffect(() => {
  if (!user?.email) return;

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const registeredUser = users.find((u) => u.email === user.email);

  if (!registeredUser) return;

  setProfile({
    firstName: registeredUser.firstName || "",
    lastName: registeredUser.lastName || "",
    email: registeredUser.email || "",
    phone: registeredUser.phone || "",
  });

  if (registeredUser.profile) {
    setExtraProfile({
      dob: registeredUser.profile.dob || "",
      gender: registeredUser.profile.gender || "",
      address: registeredUser.profile.address || "",
      region: registeredUser.profile.region || "",
      province: registeredUser.profile.province || "",
      city: registeredUser.profile.city || "",
      barangay: registeredUser.profile.barangay || "",
      zip: registeredUser.profile.zip || "",
      emergencyName: registeredUser.profile.emergencyName || "",
      emergencyPhone: registeredUser.profile.emergencyPhone || "",
      emergencyRelation: registeredUser.profile.emergencyRelation || "",
    });
  }
}, [user]);

  // Photo upload/remove
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePhoto(reader.result);
      localStorage.setItem("profilePhoto", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    localStorage.removeItem("profilePhoto");
  };

  // ✅ helper: current form data to display (draft when editing, else saved)
  const current = draftProfile || extraProfile;

  /* =========================================================
     ✅ PSGC FETCH: NOW BASED ON `current` (draft while editing)
     so dropdowns update correctly while you're editing.
  ========================================================= */

  // Regions on load
  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/regions/")
      .then((res) => res.json())
      .then((data) => setRegions(data))
      .catch(() => {});
  }, []);

  // Region -> Provinces
  useEffect(() => {
    if (!current.region) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      return;
    }

    fetch(`https://psgc.gitlab.io/api/regions/${current.region}/provinces/`)
      .then((res) => res.json())
      .then((data) => {
        setProvinces(data);
        setCities([]);
        setBarangays([]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.region]);

  // Province -> Cities
  useEffect(() => {
    if (!current.province) {
      setCities([]);
      setBarangays([]);
      return;
    }

    fetch(
      `https://psgc.gitlab.io/api/provinces/${current.province}/cities-municipalities/`
    )
      .then((res) => res.json())
      .then((data) => {
        setCities(data);
        setBarangays([]);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.province]);

  // City -> Barangays
  useEffect(() => {
    if (!current.city) {
      setBarangays([]);
      return;
    }

    fetch(
      `https://psgc.gitlab.io/api/cities-municipalities/${current.city}/barangays/`
    )
      .then((res) => res.json())
      .then((data) => setBarangays(data))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.city]);

  // ✅ Auto-build full address while editing location,
  // unless user manually typed in the address box.
  useEffect(() => {
    // only auto-fill while editing location
    if (editingSection !== "location") return;
    if (isAddressEdited) return;
    if (!current.region) return;

    const regionName = regions.find((r) => r.code === current.region)?.name || "";
    const provinceName =
      provinces.find((p) => p.code === current.province)?.name || "";
    const cityName = cities.find((c) => c.code === current.city)?.name || "";
    const barangayName =
      barangays.find((b) => b.code === current.barangay)?.name || "";

    const fullAddress = [barangayName, cityName, provinceName, regionName]
      .filter(Boolean)
      .join(", ");

    setDraftProfile((prev) => ({
      ...(prev || extraProfile),
      address: fullAddress,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editingSection,
    isAddressEdited,
    current.region,
    current.province,
    current.city,
    current.barangay,
    regions,
    provinces,
    cities,
    barangays,
  ]);

  // Save/Edit button handler
  // Save/Edit button handler
const toggleEdit = (sectionKey) => {
  if (editingSection === sectionKey) {
    // SAVE
    const updatedProfile = {
      ...extraProfile,
      ...(draftProfile || {}),
    };

    setExtraProfile(updatedProfile);

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const currentUser = users.find((u) => u.email === user.email);

    const verified =
      updatedProfile.dob &&
      updatedProfile.gender &&
      updatedProfile.address &&
      updatedProfile.region &&
      updatedProfile.province &&
      updatedProfile.city &&
      updatedProfile.barangay &&
      updatedProfile.emergencyName &&
      updatedProfile.emergencyPhone &&
      updatedProfile.emergencyRelation;

    const updatedUsers = users.map((u) =>
  u.email === user.email
    ? {
        ...u,
        isVerified: verified,
        profile: {
          dob: updatedProfile.dob,
          gender: updatedProfile.gender,
          address: updatedProfile.address,
          region: updatedProfile.region,
          province: updatedProfile.province,
          city: updatedProfile.city,
          barangay: updatedProfile.barangay,
          emergencyName: updatedProfile.emergencyName,
          emergencyPhone: updatedProfile.emergencyPhone,
          emergencyRelation: updatedProfile.emergencyRelation,
        },
      }
    : u
);

localStorage.setItem("users", JSON.stringify(updatedUsers));

    if (verified) {
  setIsVerified(true);
}

    // ✅ SHOW MODAL ONLY ON FIRST VERIFICATION
    if (verified && !currentUser?.isVerified) {
      setShowVerifiedModal(true);
    }

    setEditingSection(null);
    setDraftProfile(null);
    setIsAddressEdited(false);
  } else {
    // EDIT
    setDraftProfile({ ...extraProfile });
    setEditingSection(sectionKey);
    setIsAddressEdited(false);
  }
};

useEffect(() => {
  if (!user?.email) return;

  const users = JSON.parse(localStorage.getItem("users")) || [];
  const currentUser = users.find(u => u.email === user.email);

  setIsVerified(!!currentUser?.isVerified);
}, [user, showVerifiedModal]);

  return (
    <div className="min-h-screen bg-white">
      {/* NAVBAR */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <button
            onClick={onNavigateToHome}
            className="text-2xl font-bold hover:opacity-90 transition"
          >
            Rentify<span className="text-[#017FE6]">Pro</span>
          </button>

          <div className="hidden md:flex gap-8 relative left-12">
            <button onClick={onNavigateToHome} className="hover:text-[#017FE6]">
              Home
            </button>
            <button
              onClick={onNavigateToVehicles}
              className="hover:text-[#017FE6]"
            >
              Vehicles
            </button>
            <button
              onClick={onNavigateToBookingHistory}
              className="hover:text-[#017FE6]"
            >
              Booking History
            </button>
            <button onClick={onNavigateToAbout} className="hover:text-[#017FE6]">
              About
            </button>
            <a href="#contacts" className="hover:text-[#017FE6]">
              Contacts
            </a>
          </div>

          <div className="flex items-center gap-4">
            {/* SHOW ONLY WHEN LOGGED IN*/}
            {isLoggedIn && (
              <>
                {/* REAL TIME CHAT */}
                <button
                  aria-label="Chatroom"
                  className="relative w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-[#D6EBFF] transition"
                >
                  <ChatIcon size={20} className="text-[#017FE6]" />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#017FE6] rounded-full" />
                </button>

                {/* NOTIFICATIONS */}
                <button
                  aria-label="Notifications"
                  className="relative w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-[#D6EBFF] transition"
                >
                  <Bell size={20} className="text-[#017FE6]" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-semibold">
                    3
                  </span>
                </button>
              </>
            )}

            {/* AI */}
            <button
              onClick={() => setShowAI(true)}
              aria-label="AI Assistant"
              className="relative w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-[#D6EBFF] transition shadow-sm"
            >
              <Bot size={22} className="text-[#017FE6]" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
            </button>

            {/* PROFILE */}
            {!isLoggedIn ? (
              <>
                <button onClick={onNavigateToSignIn} className="hover:text-[#017FE6]">
                  Sign In
                </button>

                <button
                  onClick={onNavigateToRegister}
                  className="bg-[#017FE6] text-white px-5 py-2 rounded-full hover:bg-[#0165B8]"
                >
                  Register
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full hover:bg-gray-200 transition"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-[#017FE6] flex items-center justify-center">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {user?.initials}
                      </span>
                    )}
                  </div>

                  <span className="text-sm font-medium">{user?.name}</span>
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-2xl z-50">
                    <div className="px-4 py-4 border-b">
                      <p className="font-semibold">{user?.name}</p>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        onNavigateToAccountSettings?.();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition"
                    >
                      <Settings size={18} /> Account Settings
                    </button>

                    <button
                      onClick={onNavigateToBookingHistory}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition"
                    >
                      <Car size={18} /> My Bookings
                    </button>

                    {isVehicleOwner && (
                      <button
                        onClick={() => {
                          localStorage.setItem("activeRole", "owner");
                          setShowProfileMenu(false);
                          onSwitchToOwner();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#017FE6]/10 transition border-t"
                      >
                        <ArrowLeftRight size={18} className="text-[#017FE6]" />
                        <span className="text-[#017FE6] font-medium">
                          Switch to Owner
                        </span>
                      </button>
                    )}

                    <button
                      onClick={onLogout}
                      className="w-full px-4 py-3 text-red-500 hover:bg-red-50"
                    >
                      ⎋ Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="pt-24 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 flex gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="w-72 space-y-6 sticky top-24 self-start mt-4">
            <div className="bg-white rounded-xl shadow p-5 space-y-1">
              {[
                { label: "Profile Settings", icon: User },
                { label: "Change Password", icon: Lock },
                { label: "Notifications Settings", icon: BellRing },
                { label: "Verification", icon: ShieldCheck },
                { label: "Activity Logs", icon: Shield },
              ].map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-lg text-sm font-medium transition ${
                    activeTab === label
                      ? "bg-[#017FE6]/10 text-[#017FE6]"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow p-5 space-y-4">

  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-lg bg-[#E6F2FF] flex items-center justify-center">
      <Car size={18} className="text-[#017FE6]" />
    </div>

    <h4 className="font-semibold text-m text-gray-900 leading-none">
      {isVehicleOwner ? "Vehicle Owner Mode" : "Become a Vehicle Owner"}
    </h4>
  </div>

  <p className="text-sm text-gray-500 leading-relaxed">
    {isVehicleOwner
      ? "You are verified as a vehicle owner. Manage your listings and bookings."
      : "List your vehicles and earn money by renting them to verified users."}
  </p>

  <button
    onClick={() => {
      if (isVehicleOwner) {
        localStorage.setItem("activeRole", "owner");
        onNavigateToHome(); // or owner dashboard
      } else {
        onNavigateToVehicleOwnerProceed();
      }
    }}
    className="w-full bg-[#017FE6] text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-[#0165B8] transition"
  >
    {isVehicleOwner ? "Switch to Owner" : "Register as Vehicle Owner"}
  </button>

</div>
          </aside>

          {/* RIGHT CONTENT */}
          <main className="flex-1 space-y-8 pb-24">
            <div className="pb-6 mb-6 border-b">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {headerMap[activeTab]?.title}
              </h1>

              <p className="text-base text-gray-500 max-w-xl">
                {headerMap[activeTab]?.description}
              </p>
            </div>

            {activeTab === "Profile Settings" && (
              <>
            {/* HEADER CARD */}
            <div className="bg-white rounded-xl shadow p-6 flex items-center gap-4">
              <div className="relative">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-[#017FE6] flex items-center justify-center">
                    {profilePhoto ? (
                      <img
                        src={profilePhoto}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {user?.initials}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setShowPhotoMenu((prev) => !prev)}
                    className="absolute bottom-0 right-0 bg-white border rounded-full p-1.5 shadow hover:bg-gray-100"
                  >
                    <Camera size={18} className="text-[#017FE6]" />
                  </button>

                  {showPhotoMenu && (
                    <div className="absolute top-full left-0 mt-2 mr-1 w-40 bg-white rounded-lg shadow-lg border z-50 origin-top-right">
                      <label className="block px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer">
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            handlePhotoUpload(e);
                            setShowPhotoMenu(false);
                          }}
                          className="hidden"
                        />
                      </label>

                      {profilePhoto && (
                        <button
                          onClick={() => {
                            handleRemovePhoto();
                            setShowPhotoMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  {user?.name}
                  {isVerified && (
                    <BadgeCheck size={18} className="text-[#017FE6]" />
                  )}
                </h2>

                <p className="text-m text-gray-500">{user?.email}</p>

                <span
              className={`text-sm font-medium ${
                isVerified ? "text-[#017FE6]" : "text-red-500"
              }`}
            >
              {isVerified? "Verified User" : "Unverified User"}
            </span>
              </div>
            </div>

            {/* INFO CARDS */}
            {[
              {
                key: "personal",
                title: "Personal Information",
                content: (
                  <>
                    <InputField label="First Name" value={profile.firstName} disabled />
                    <InputField label="Last Name" value={profile.lastName} disabled />

                    <InputField
                      label="Date of Birth"
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={
                        editingSection === "personal"
                          ? (draftProfile?.dob ?? extraProfile.dob)
                          : extraProfile.dob
                      }
                      disabled={editingSection !== "personal"}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          dob: e.target.value,
                        }))
                      }
                    />

                    <RadioGroupField
                      label="Gender"
                      value={
                        editingSection === "personal"
                          ? (draftProfile?.gender ?? extraProfile.gender)
                          : extraProfile.gender
                      }
                      disabled={editingSection !== "personal"}
                      options={["Male", "Female"]}
                      onChange={(val) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          gender: val,
                        }))
                      }
                      name="gender"
                    />
                  </>
                ),
              },
              {
                key: "contact",
                title: "Contact Information",
                content: (
                  <>
                    <InputField label="Email" value={profile.email} disabled />
                    <InputField label="Phone Number" value={profile.phone} disabled />
                  </>
                ),
              },
              {
                key: "location",
                title: "Location Information",
                content: (
                  <>
                    {/* ✅ This is the one that was losing focus - now fixed */}
                    <InputField
                      label="Full Address"
                      value={
                        editingSection === "location"
                          ? (draftProfile?.address ?? extraProfile.address)
                          : extraProfile.address
                      }
                      disabled={editingSection !== "location"}
                      onChange={(e) => {
                        const value = e.target.value;
                        setIsAddressEdited(value.trim() !== "");
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          address: value,
                        }));
                      }}
                    />

                    <SelectField
                      label="Region"
                      value={
                        editingSection === "location"
                          ? (draftProfile?.region ?? extraProfile.region)
                          : extraProfile.region
                      }
                      disabled={editingSection !== "location"}
                      options={regions.map((r) => ({ label: r.name, value: r.code }))}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          region: e.target.value,
                          province: "",
                          city: "",
                          barangay: "",
                        }))
                      }
                    />

                    <SelectField
                      label="Province"
                      value={
                        editingSection === "location"
                          ? (draftProfile?.province ?? extraProfile.province)
                          : extraProfile.province
                      }
                      disabled={editingSection !== "location" || !current.region}
                      options={provinces.map((p) => ({ label: p.name, value: p.code }))}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          province: e.target.value,
                          city: "",
                          barangay: "",
                        }))
                      }
                    />

                    <SelectField
                      label="City / Municipality"
                      value={
                        editingSection === "location"
                          ? (draftProfile?.city ?? extraProfile.city)
                          : extraProfile.city
                      }
                      disabled={editingSection !== "location" || !current.province}
                      options={cities.map((c) => ({ label: c.name, value: c.code }))}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          city: e.target.value,
                          barangay: "",
                        }))
                      }
                    />

                    <SelectField
                      label="Barangay"
                      value={
                        editingSection === "location"
                          ? (draftProfile?.barangay ?? extraProfile.barangay)
                          : extraProfile.barangay
                      }
                      disabled={editingSection !== "location" || !current.city}
                      options={barangays.map((b) => ({ label: b.name, value: b.code }))}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          barangay: e.target.value,
                        }))
                      }
                    />
                  </>
                ),
              },
              {
                key: "emergency",
                title: "Emergency Contact Information",
                content: (
                  <>
                    <InputField
                      label="Contact Name"
                      value={
                        editingSection === "emergency"
                          ? (draftProfile?.emergencyName ?? extraProfile.emergencyName)
                          : extraProfile.emergencyName
                      }
                      disabled={editingSection !== "emergency"}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          emergencyName: e.target.value,
                        }))
                      }
                    />

                    <InputField
                      label="Phone Number"
                      value={
                        editingSection === "emergency"
                          ? (draftProfile?.emergencyPhone ?? extraProfile.emergencyPhone)
                          : extraProfile.emergencyPhone
                      }
                      disabled={editingSection !== "emergency"}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          emergencyPhone: e.target.value,
                        }))
                      }
                    />

                    <SelectField
                      label="Relationship"
                      value={
                        editingSection === "emergency"
                          ? (draftProfile?.emergencyRelation ??
                              extraProfile.emergencyRelation)
                          : extraProfile.emergencyRelation
                      }
                      disabled={editingSection !== "emergency"}
                      options={[
                        { label: "Friend", value: "Friend" },
                        { label: "Family", value: "Family" },
                        { label: "Spouse", value: "Spouse" },
                      ]}
                      onChange={(e) =>
                        setDraftProfile((prev) => ({
                          ...(prev || extraProfile),
                          emergencyRelation: e.target.value,
                        }))
                      }
                    />
                  </>
                ),
              },
            ].map((section) => (
              <div key={section.key} className="bg-white rounded-xl shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold">{section.title}</h3>

                  <button
                    onClick={() => toggleEdit(section.key)}
                    className="text-sm border px-4 py-1 rounded-full hover:bg-gray-100"
                  >
                    {editingSection === section.key ? "Save" : "Edit"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">{section.content}</div>
              </div>
              
            ))}
              </>
            )}

            {/* CHANGE PASSWORD */}
            {activeTab === "Change Password" && (
              <ChangePassword user={user} />
            )}

            {/* NOTIFICATION SETTINGS */}
            {activeTab === "Notifications Settings" && (
            <NotificationSettings user={user} />
          )}

          {activeTab === "Verification" && (
          <VerificationSettings user={user} />
        )}

        {activeTab === "Activity Logs" && (
        <ActivityLogs user={user} />
      )}
                  
          </main>  
        </div>
      </div>

      {/* AI CHAT */}
      {showAI && (
        <div className="fixed bottom-4 right-4 w-[95vw] sm:w-[400px] h-[70vh] sm:h-[450px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col">
          <div className="bg-[#017FE6] text-white px-4 py-3 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-sm">RentifyPro AI</h3>
              <p className="text-xs opacity-80">Online • Ready to help</p>
            </div>
            <button onClick={() => setShowAI(false)}>✕</button>
          </div>

          <div className="p-4 flex-1 overflow-y-auto bg-gray-50 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-end gap-2 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "ai" && (
                  <img src="/robot-ai.png" className="w-8 h-8 rounded-full" alt="AI" />
                )}

                <div
                  className={`px-4 py-2 rounded-2xl text-sm max-w-[75%] shadow ${
                    msg.sender === "user"
                      ? "bg-[#017FE6] text-white rounded-br-sm"
                      : "bg-white text-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>

                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-xs">
                    U
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2">
                <img src="/robot-ai.png" className="w-8 h-8 rounded-full" alt="AI" />
                <div className="bg-white px-4 py-2 rounded-2xl shadow text-sm text-gray-500 flex gap-1">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-150">.</span>
                  <span className="animate-bounce delay-300">.</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t bg-white px-3 py-2 flex items-center gap-2">
            <input
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              placeholder="Ask me about vehicles, bookings..."
              className="flex-1 border rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#017FE6]"
            />

            <button
              onClick={() => {
                if (!userMessage.trim()) return;

                setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
                setUserMessage("");
                setIsTyping(true);

                setTimeout(() => {
                  setMessages((prev) => [
                    ...prev,
                    { sender: "ai", text: "Got it! 😊 Let me help you with that." },
                  ]);
                  setIsTyping(false);
                }, 1200);
              }}
              className="bg-[#017FE6] text-white w-9 h-9 rounded-full"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {showVerifiedModal && (
  <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 text-center">
      
      <BadgeCheck size={40} className="text-green-600 mx-auto mb-4" />

      <h2 className="text-xl font-bold mb-2">
        Account Verified 🎉
      </h2>

      <p className="text-gray-600 text-sm mb-6">
        You can now proceed with booking.
      </p>

      <button
        onClick={() => {
          const returnPage =
            localStorage.getItem("returnAfterVerification") || "vehicles";

          localStorage.removeItem("returnAfterVerification");
          setShowVerifiedModal(false);

          // 🔁 GO BACK
          if (returnPage === "checkout") {
            onNavigateToVehicles(); // or checkout page
          } else {
            onNavigateToVehicles();
          }
        }}
        className="w-full bg-[#017FE6] text-white py-3 rounded-lg font-semibold hover:bg-[#0165B8]"
      >
        OK
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default AccountSettings;