import React, { useState, useEffect } from "react";
import {
  Camera,
  BadgeCheck,
  ShieldCheck,
  User,
  Building2,
  CreditCard,
} from "lucide-react";

const InputField = ({ label, value, onChange, disabled }) => (
  <div>
    <label className="text-xs text-gray-500">{label}</label>
    <input
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={`w-full mt-1 border rounded-lg px-3 py-2 text-sm ${
        disabled ? "bg-gray-100" : "bg-white"
      }`}
    />
  </div>
);

const SelectField = ({ label, value, onChange, options, disabled }) => (
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
      {options.map((o) => (
        <option key={o.code} value={o.code}>
          {o.name}
        </option>
      ))}
    </select>
  </div>
);


export default function Profile() {
  const [editing, setEditing] = useState(false);

  /* OWNER PROFILE */
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",

    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",

    ownerType: "individual", 
    businessName: "",
    permitNumber: "",

    licenseNumber: "",
  });

  /* AVATAR */
  const [photo, setPhoto] = useState(
    localStorage.getItem("ownerProfilePhoto")
  );

  /* PSGC */
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);


  useEffect(() => {
    const owner = JSON.parse(localStorage.getItem("ownerProfile"));
    if (owner) setProfile(owner);
  }, []);

  /* SAVE */
  const saveProfile = () => {
    localStorage.setItem("ownerProfile", JSON.stringify(profile));
    setEditing(false);
  };

  /* PHOTO */
  const uploadPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result);
      localStorage.setItem("ownerProfilePhoto", reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhoto(null);
    localStorage.removeItem("ownerProfilePhoto");
  };

  
  useEffect(() => {
    fetch("https://psgc.gitlab.io/api/regions/")
      .then((r) => r.json())
      .then(setRegions);
  }, []);

  useEffect(() => {
    if (!profile.region) return;
    fetch(
      `https://psgc.gitlab.io/api/regions/${profile.region}/provinces/`
    )
      .then((r) => r.json())
      .then(setProvinces);
  }, [profile.region]);

  useEffect(() => {
    if (!profile.province) return;
    fetch(
      `https://psgc.gitlab.io/api/provinces/${profile.province}/cities-municipalities/`
    )
      .then((r) => r.json())
      .then(setCities);
  }, [profile.province]);

  useEffect(() => {
    if (!profile.city) return;
    fetch(
      `https://psgc.gitlab.io/api/cities-municipalities/${profile.city}/barangays/`
    )
      .then((r) => r.json())
      .then(setBarangays);
  }, [profile.city]);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Owner Profile</h1>
        <button
          onClick={() => (editing ? saveProfile() : setEditing(true))}
          className="px-4 py-2 rounded-full border hover:bg-gray-100"
        >
          {editing ? "Save" : "Edit"}
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white rounded-xl shadow p-6 flex gap-6 items-center">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#017FE6] text-white flex items-center justify-center text-2xl font-bold overflow-hidden">
            {photo ? (
              <img src={photo} className="w-full h-full object-cover" />
            ) : (
              `${profile.firstName?.[0] || ""}${profile.lastName?.[0] || ""}`
            )}
          </div>

          {editing && (
            <>
              <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow cursor-pointer">
                <Camera size={18} />
                <input type="file" hidden onChange={uploadPhoto} />
              </label>

              {photo && (
                <button
                  onClick={removePhoto}
                  className="text-xs text-red-500 block mt-1"
                >
                  Remove
                </button>
              )}
            </>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {profile.firstName} {profile.lastName}
            <BadgeCheck className="text-[#017FE6]" size={18} />
          </h2>
          <p className="text-gray-500">{profile.email}</p>
          <span className="text-sm text-[#017FE6] font-medium">
            Verified Owner
          </span>
        </div>
      </div>

      {/* PERSONAL */}
      <Section title="Personal Information" icon={User}>
        <InputField
          label="First Name"
          value={profile.firstName}
          disabled={!editing}
          onChange={(e) =>
            setProfile({ ...profile, firstName: e.target.value })
          }
        />
        <InputField
          label="Last Name"
          value={profile.lastName}
          disabled={!editing}
          onChange={(e) =>
            setProfile({ ...profile, lastName: e.target.value })
          }
        />
        <InputField label="Email" value={profile.email} disabled />
        <InputField
          label="Phone"
          value={profile.phone}
          disabled={!editing}
          onChange={(e) =>
            setProfile({ ...profile, phone: e.target.value })
          }
        />
      </Section>

      {/* ADDRESS */}
      <Section title="Address Information" icon={Building2}>
        <InputField
          label="Full Address"
          value={profile.address}
          disabled={!editing}
          onChange={(e) =>
            setProfile({ ...profile, address: e.target.value })
          }
        />
        <SelectField
          label="Region"
          value={profile.region}
          disabled={!editing}
          options={regions}
          onChange={(e) =>
            setProfile({
              ...profile,
              region: e.target.value,
              province: "",
              city: "",
              barangay: "",
            })
          }
        />
        <SelectField
          label="Province"
          value={profile.province}
          disabled={!editing || !profile.region}
          options={provinces}
          onChange={(e) =>
            setProfile({
              ...profile,
              province: e.target.value,
              city: "",
              barangay: "",
            })
          }
        />
        <SelectField
          label="City"
          value={profile.city}
          disabled={!editing || !profile.province}
          options={cities}
          onChange={(e) =>
            setProfile({
              ...profile,
              city: e.target.value,
              barangay: "",
            })
          }
        />
        <SelectField
          label="Barangay"
          value={profile.barangay}
          disabled={!editing || !profile.city}
          options={barangays}
          onChange={(e) =>
            setProfile({
              ...profile,
              barangay: e.target.value,
            })
          }
        />
      </Section>

      {/* BUSINESS */}
      {profile.ownerType === "business" && (
        <Section title="Business Information" icon={Building2}>
          <InputField
            label="Business Name"
            value={profile.businessName}
            disabled={!editing}
            onChange={(e) =>
              setProfile({
                ...profile,
                businessName: e.target.value,
              })
            }
          />
          <InputField
            label="Permit Number"
            value={profile.permitNumber}
            disabled={!editing}
            onChange={(e) =>
              setProfile({
                ...profile,
                permitNumber: e.target.value,
              })
            }
          />
        </Section>
      )}

      {/* LICENSE */}
      <Section title="License Information" icon={CreditCard}>
        <InputField
          label="Driver’s License Number"
          value={profile.licenseNumber}
          disabled={!editing}
          onChange={(e) =>
            setProfile({
              ...profile,
              licenseNumber: e.target.value,
            })
          }
        />
      </Section>

      {/* VERIFICATION */}
      <Section title="Verification Status" icon={ShieldCheck}>
    <Status label="Government ID" status="Submitted" />
    <Status label="Driver’s License" status="Submitted" />
    {profile.ownerType === "business" && (
        <Status label="Business Permit" status="Submitted" />
    )}
    <Status label="Selfie Verification" status="Submitted" />
    </Section>
    </div>
  );
}

/* ===========================
   HELPERS
=========================== */
const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Icon size={18} /> {title}
    </h3>
    <div className="grid grid-cols-2 gap-4">{children}</div>
  </div>
);

const Status = ({ label, status = "Submitted" }) => {
  const color =
    status === "Approved"
      ? "text-green-600"
      : status === "Rejected"
      ? "text-red-600"
      : "text-yellow-600";

  return (
    <div className={`flex items-center gap-2 text-sm ${color}`}>
      <ShieldCheck size={16} />
      <span>{label}</span>
      <span className="text-gray-400">— {status}</span>
    </div>
  );
};
