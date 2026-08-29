import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Loader,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Upload,
  User,
} from "lucide-react";

import {
  captureBase64FromStream,
  fileToBase64,
  getMimeFromDataUrl,
  startCamera,
  stopCamera,
  stripDataUrlPrefix,
  validateDocumentImageFile,
  validateSupportingDocumentFile,
} from "../utils/cameraKyc";
import {
  preRegisterIdFace,
  preSelfieVerify,
  preVerifySupportingDocument,
  getPreKycSessionToken,
} from "../utils/kycApi";
import AuthShell from "../components/AuthShell";
import LegalPolicyModal from "../components/LegalPolicyModal";
import API from "../utils/api";
import { ALLOWED_EMAIL_DOMAINS, NAME_REGEX } from "../data/registerValidation";
import { ID_DOCUMENT_TYPES, SUPPORTING_DOCUMENT_TYPES } from "../data/kycDocumentTypes";

const TOTAL_STEPS = 4;
const STEP_LABELS = ["Personal Details", "Account & Documents", "Face Verification", "Review"];
const ACTION_COOLDOWN_MS = 2000;
const PSGC_BASE_URL = "https://psgc.gitlab.io/api";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// The joined/variation-selector code points are intentionally included to reject complete emoji sequences.
// eslint-disable-next-line no-misleading-character-class
const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{2028}\u{2029}]/u;
const PH_LOCAL_MOBILE_REGEX = /^9\d{9}$/;

const normalizeNameInput = (value = "") => {
  let nextValue = String(value);
  nextValue = nextValue.replace(/[^A-Za-z ]/g, "");
  nextValue = nextValue.replace(/\s+/g, " ");
  if (nextValue.startsWith(" ")) nextValue = nextValue.slice(1);
  return nextValue;
};

const normalizePhMobileInput = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (!digits.startsWith("9")) return "";
  return digits.slice(0, 10);
};

const initialForm = {
  firstName: "",
  lastName: "",
  businessEmail: "",
  phone: "",
  region: "",
  province: "",
  city: "",
  barangay: "",
  address: "",
  ownerType: "individual",
  businessName: "",
  permitNumber: "",
  password: "",
  confirmPassword: "",
  agree: false,
};

const initialFiles = {
  supportingDocument: null,
};

const initialKyc = {
  idType: "",
  idCardFile: null,
  idRegistered: false,
  selfieVerified: false,
  selfieDataUrl: "",
  selfieBase64Clean: "",
};

function friendlyError(msg) {
  if (!msg || typeof msg !== "string") return "Something went wrong. Please try again.";
  const lower = msg.toLowerCase();
  if (lower.includes("face") && lower.includes("not") && lower.includes("match")) {
    return "Your selfie does not match your ID photo. Try better lighting and face the camera directly.";
  }
  if (lower.includes("no face") || lower.includes("face detection failed")) {
    return "We could not find a face in your image. Make sure your face is clearly visible.";
  }
  if (lower.includes("blurry") || lower.includes("blur")) return "The image is blurry. Please try again.";
  if (lower.includes("dark")) return "The image is too dark. Move to a brighter area.";
  if (lower.includes("bright") || lower.includes("glare")) return "The image is too bright. Avoid direct light.";
  if (lower.includes("too many face")) return "Multiple faces were detected. Make sure only you are in frame.";
  if (lower.includes("expired") || lower.includes("timed out")) return "Session timed out. Capture a new selfie and try again.";
  if (lower.includes("not running") || lower.includes("econnrefused")) return "Verification service is temporarily unavailable.";
  if (lower.includes("timeout") || lower.includes("etimedout")) return "Request timed out. Please try again.";
  if (lower.includes("too many")) return msg;
  if (/^[A-Z]/.test(msg) && !lower.includes("error") && !lower.includes("exception") && !lower.includes("500"))
    return msg;
  return "Something went wrong. Please try again.";
}

function validateOwnerPassword(value) {
  if (!value) return "Password is required.";
  if (/\s/.test(value)) return "Password must not contain spaces.";
  if (EMOJI_REGEX.test(value)) return "Password must not contain emoji.";
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(value)) return "Password needs an uppercase letter.";
  if (!/[a-z]/.test(value)) return "Password needs a lowercase letter.";
  if (!/[0-9]/.test(value)) return "Password needs a number.";
  if (!/[!@#$%^&*()_+\-=[\]{}|;':",.<>?/`~]/.test(value)) {
    return "Password needs a special character.";
  }
  return "";
}

export default function RegisterOwnerPage({
  onBack,
  onNavigateToSignIn,
  onNavigateToHome,
  onNavigateToRegisterOTP,
}) {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState(initialFiles);
  const [kyc, setKyc] = useState(initialKyc);
  const [supportingDocType, setSupportingDocType] = useState("");
  const [supportingDocStatus, setSupportingDocStatus] = useState({ submitted: false, message: "" });

  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [touchedStep1, setTouchedStep1] = useState({});
  const [stepErrors, setStepErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [legalModalType, setLegalModalType] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [addressLoadError, setAddressLoadError] = useState("");

  const [kycUi, setKycUi] = useState({ showCamera: false, statusText: "" });
  const [cameraStream, setCameraStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [camError, setCamError] = useState("");
  const [camInfo, setCamInfo] = useState("");

  const videoRef = useRef(null);
  const idInputRef = useRef(null);
  const lastActionRef = useRef(0);

  const fullName = useMemo(
    () => `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
    [form.firstName, form.lastName]
  );
  const canShowBusinessFields = useMemo(() => form.ownerType === "business", [form.ownerType]);

  const canAct = useCallback(() => {
    const now = Date.now();
    if (now - lastActionRef.current < ACTION_COOLDOWN_MS) return false;
    lastActionRef.current = now;
    return true;
  }, []);

  const closeCamera = useCallback(() => {
    try {
      stopCamera(videoRef.current || cameraStream);
    } catch {
      // Ignore cleanup errors here.
    }
    setCameraStream(null);
    setKycUi((prev) => ({ ...prev, showCamera: false }));
    setCamError("");
    setCamInfo("");
  }, [cameraStream]);

  useEffect(() => {
    return () => {
      try {
        stopCamera(cameraStream);
      } catch {
        // Ignore cleanup errors here.
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (step !== 3 && kycUi.showCamera) closeCamera();
  }, [step, kycUi.showCamera, closeCamera]);

  useEffect(() => {
    let active = true;
    const loadRegions = async () => {
      try {
        setAddressLoadError("");
        const res = await fetch(`${PSGC_BASE_URL}/regions/`);
        if (!res.ok) throw new Error("Failed to load regions.");
        const data = await res.json();
        if (active) setRegions(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setRegions([]);
        setAddressLoadError("Could not load address options. Please refresh and try again.");
      }
    };
    loadRegions();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.region) {
      setProvinces([]);
      setCities([]);
      setBarangays([]);
      return;
    }

    let active = true;
    const loadProvincesOrCities = async () => {
      try {
        setAddressLoadError("");
        const provinceRes = await fetch(`${PSGC_BASE_URL}/regions/${form.region}/provinces/`);
        if (!provinceRes.ok) throw new Error("Failed to load provinces.");
        const provinceData = await provinceRes.json();
        const provinceList = Array.isArray(provinceData) ? provinceData : [];
        if (!active) return;

        setProvinces(provinceList);
        setCities([]);
        setBarangays([]);

        if (provinceList.length === 0) {
          const cityRes = await fetch(`${PSGC_BASE_URL}/regions/${form.region}/cities-municipalities/`);
          if (!cityRes.ok) throw new Error("Failed to load cities.");
          const cityData = await cityRes.json();
          if (!active) return;
          setCities(Array.isArray(cityData) ? cityData : []);
        }
      } catch {
        if (!active) return;
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        setAddressLoadError("Could not load address options. Please refresh and try again.");
      }
    };

    loadProvincesOrCities();
    return () => {
      active = false;
    };
  }, [form.region]);

  useEffect(() => {
    if (!form.province) {
      if (provinces.length > 0) setCities([]);
      setBarangays([]);
      return;
    }

    let active = true;
    const loadCities = async () => {
      try {
        setAddressLoadError("");
        const res = await fetch(`${PSGC_BASE_URL}/provinces/${form.province}/cities-municipalities/`);
        if (!res.ok) throw new Error("Failed to load cities.");
        const data = await res.json();
        if (!active) return;
        setCities(Array.isArray(data) ? data : []);
        setBarangays([]);
      } catch {
        if (!active) return;
        setCities([]);
        setBarangays([]);
        setAddressLoadError("Could not load address options. Please refresh and try again.");
      }
    };

    loadCities();
    return () => {
      active = false;
    };
  }, [form.province, provinces.length]);

  useEffect(() => {
    if (!form.city) {
      setBarangays([]);
      return;
    }

    let active = true;
    const loadBarangays = async () => {
      try {
        setAddressLoadError("");
        const res = await fetch(`${PSGC_BASE_URL}/cities-municipalities/${form.city}/barangays/`);
        if (!res.ok) throw new Error("Failed to load barangays.");
        const data = await res.json();
        if (!active) return;
        setBarangays(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setBarangays([]);
        setAddressLoadError("Could not load address options. Please refresh and try again.");
      }
    };

    loadBarangays();
    return () => {
      active = false;
    };
  }, [form.city]);

  const validateStep1Field = useCallback(
    (field, values = form) => {
      const trimmedFirstName = values.firstName.trim();
      const trimmedLastName = values.lastName.trim();

      switch (field) {
        case "firstName":
          if (!trimmedFirstName) return "First name is required.";
          if (!NAME_REGEX.test(trimmedFirstName)) return "First name can only contain letters and spaces between names.";
          if (EMOJI_REGEX.test(values.firstName)) return "No emoji allowed.";
          if (trimmedFirstName.length > 50) return "First name is too long (max 50 characters).";
          return "";
        case "lastName":
          if (!trimmedLastName) return "Last name is required.";
          if (!NAME_REGEX.test(trimmedLastName)) return "Last name can only contain letters and spaces between names.";
          if (EMOJI_REGEX.test(values.lastName)) return "No emoji allowed.";
          if (trimmedLastName.length > 50) return "Last name is too long (max 50 characters).";
          return "";
        case "businessEmail": {
          if (!values.businessEmail.trim()) return "Email is required.";
          if (/\s/.test(values.businessEmail)) return "Email must not contain spaces.";
          if (EMOJI_REGEX.test(values.businessEmail)) return "Email must not contain emoji.";
          if (values.businessEmail.length > 254) return "Email is too long (max 254 characters).";
          if (!EMAIL_REGEX.test(values.businessEmail)) return "Enter a valid email.";
          const domain = values.businessEmail.split("@")[1]?.toLowerCase() || "";
          if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
            return "Please use a valid email address from a supported provider.";
          }
          return "";
        }
        case "phone":
          if (!values.phone.trim()) return "Phone number is required.";
          if (!PH_LOCAL_MOBILE_REGEX.test(values.phone)) {
            return "Phone number must be exactly 10 digits and start with 9.";
          }
          if (values.phone.length > 10) return "Phone number is too long (max 10 digits).";
          return "";
        case "region":
          return values.region ? "" : "Region is required.";
        case "province":
          if (provinces.length > 0 && !values.province) return "Province is required.";
          return "";
        case "city":
          return values.city ? "" : "City / Municipality is required.";
        case "barangay":
          return values.barangay ? "" : "Barangay is required.";
        case "address":
          if (!values.address.trim()) return "Complete your address selection.";
          if (values.address.length > 255) return "Address is too long (max 255 characters).";
          return "";
        case "businessName":
          if (!values.businessName.trim()) return "Business name is required.";
          if (values.businessName.length > 120) return "Business name is too long (max 120 characters).";
          return "";
        case "permitNumber":
          if (!values.permitNumber.trim()) return "Permit number is required.";
          if (values.permitNumber.length > 50) return "Permit number is too long (max 50 characters).";
          return "";
        case "password":
          return validateOwnerPassword(values.password);
        case "confirmPassword":
          if (validateOwnerPassword(values.password)) return "";
          if (!values.confirmPassword) return "Please confirm password.";
          if (/\s/.test(values.confirmPassword)) return "Password must not contain spaces.";
          if (values.password !== values.confirmPassword) return "Passwords do not match.";
          return "";
        case "agree":
          return values.agree ? "" : "You must agree to the terms.";
        default:
          return "";
      }
    },
    [form, provinces.length]
  );

  useEffect(() => {
    const regionName = regions.find((entry) => entry.code === form.region)?.name || "";
    const provinceName = provinces.find((entry) => entry.code === form.province)?.name || "";
    const cityName = cities.find((entry) => entry.code === form.city)?.name || "";
    const barangayName = barangays.find((entry) => entry.code === form.barangay)?.name || "";
    const composedAddress = [barangayName, cityName, provinceName, regionName].filter(Boolean).join(", ");

    const nextForm = { ...form, address: composedAddress };
    setForm((prev) => (prev.address === composedAddress ? prev : nextForm));
    if (step === 1 && touchedStep1.address) {
      setErrors((prev) => ({ ...prev, address: validateStep1Field("address", nextForm) }));
    }
  }, [
    form,
    step,
    touchedStep1.address,
    regions,
    provinces,
    cities,
    barangays,
    validateStep1Field,
  ]);

  const handleStep1Blur = useCallback(
    (field, values = form) => {
      if (step !== 1) return;
      if (!touchedStep1[field]) return;
      setErrors((prev) => {
        const next = { ...prev, [field]: validateStep1Field(field, values) };
        if (field === "password" && (touchedStep1.confirmPassword || values.confirmPassword)) {
          next.confirmPassword = validateStep1Field("confirmPassword", values);
        }
        return next;
      });
    },
    [form, step, touchedStep1, validateStep1Field]
  );

  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const normalizedPhone = name === "phone" ? normalizePhMobileInput(value) : value;
      const nextValue =
        name === "businessEmail"
          ? value.toLowerCase().trim()
          : type === "checkbox"
            ? checked
            : normalizedPhone;
      const nextForm = { ...form, [name]: nextValue };
      setForm(nextForm);
      setFormError("");
      if (step === 1) {
        setTouchedStep1((prev) => ({ ...prev, [name]: true }));
      }
      setErrors((prev) => ({ ...prev, [name]: "" }));
      if (name === "password") {
        setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      }
      if (["businessEmail", "firstName", "lastName", "businessName", "permitNumber"].includes(name)) {
        setSupportingDocStatus({ submitted: false, message: "" });
        setErrors((prev) => ({ ...prev, supportingDocument: "" }));
      }
      if (["businessEmail", "firstName", "lastName"].includes(name)) {
        setKyc((prev) => ({
          ...prev,
          idRegistered: false,
          selfieVerified: false,
          selfieDataUrl: "",
          selfieBase64Clean: "",
        }));
        setStepErrors((prev) => ({ ...prev, idRegistered: "", selfieVerified: "" }));
        setKycUi((prev) => ({ ...prev, statusText: "" }));
      }
    },
    [form, step]
  );

  const handleRegionChange = useCallback((e) => {
    const region = e.target.value;
    const nextForm = {
      ...form,
      region,
      province: "",
      city: "",
      barangay: "",
      address: "",
    };
    setForm(nextForm);
    setTouchedStep1((prev) => ({
      ...prev,
      region: true,
      province: false,
      city: false,
      barangay: false,
      address: false,
    }));
    setErrors((prev) => ({
      ...prev,
      region: "",
      province: "",
      city: "",
      barangay: "",
      address: "",
    }));
  }, [form]);

  const handleProvinceChange = useCallback((e) => {
    const province = e.target.value;
    const nextForm = {
      ...form,
      province,
      city: "",
      barangay: "",
      address: "",
    };
    setForm(nextForm);
    setTouchedStep1((prev) => ({
      ...prev,
      province: true,
      city: false,
      barangay: false,
      address: false,
    }));
    setErrors((prev) => ({
      ...prev,
      province: "",
      city: "",
      barangay: "",
      address: "",
    }));
  }, [form]);

  const handleCityChange = useCallback((e) => {
    const city = e.target.value;
    const nextForm = {
      ...form,
      city,
      barangay: "",
      address: "",
    };
    setForm(nextForm);
    setTouchedStep1((prev) => ({
      ...prev,
      city: true,
      barangay: false,
      address: false,
    }));
    setErrors((prev) => ({
      ...prev,
      city: "",
      barangay: "",
      address: "",
    }));
  }, [form]);

  const handleBarangayChange = useCallback((e) => {
    const barangay = e.target.value;
    const nextForm = {
      ...form,
      barangay,
      address: "",
    };
    setForm(nextForm);
    setTouchedStep1((prev) => ({
      ...prev,
      barangay: true,
      address: false,
    }));
    setErrors((prev) => ({
      ...prev,
      barangay: "",
      address: "",
    }));
  }, [form]);

  const handleOwnerTypeSelect = useCallback(
    (type) => {
      const nextForm = {
        ...form,
        ownerType: type,
      };
      setForm(nextForm);
      setErrors((prev) => ({
        ...prev,
        businessName: "",
        permitNumber: "",
        supportingDocument: "",
      }));
      setSupportingDocStatus({ submitted: false, message: "" });
    },
    [form]
  );

  const handleFile = useCallback(async (e) => {
    const { name, files: picked } = e.target;
    const file = picked?.[0] || null;
    if (file) {
      try {
        await validateSupportingDocumentFile(file);
      } catch (validationError) {
        setFiles((prev) => ({ ...prev, [name]: null }));
        setErrors((prev) => ({ ...prev, [name]: validationError.message || "Please choose a valid document." }));
        e.target.value = "";
        return;
      }
    }
    setFiles((prev) => ({ ...prev, [name]: file }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (name === "supportingDocument") {
      setSupportingDocStatus({ submitted: false, message: "" });
    }
  }, []);

  const handleSupportingDocTypeChange = useCallback((e) => {
    const value = String(e?.target?.value || "");
    setSupportingDocType(value);
    setSupportingDocStatus({ submitted: false, message: "" });
    setErrors((prev) => ({ ...prev, supportingDocType: "", supportingDocument: "" }));
  }, []);

  const handleIdTypeChange = useCallback((e) => {
    const value = String(e?.target?.value || "");
    setKyc((prev) => ({
      ...prev,
      idType: value,
      idRegistered: false,
      selfieVerified: false,
      selfieDataUrl: "",
      selfieBase64Clean: "",
    }));
    setStepErrors((prev) => ({
      ...prev,
      idType: "",
      idRegistered: "",
      selfieVerified: "",
    }));
    setKycUi((prev) => ({ ...prev, statusText: "" }));
    setCamError("");
    setCamInfo("");
    closeCamera();
  }, [closeCamera]);

  const validateStep1 = useCallback(() => {
    const fields = [
      "firstName",
      "lastName",
      "businessEmail",
      "phone",
      "region",
      "province",
      "city",
      "barangay",
      "address",
      "businessName",
      "permitNumber",
      "password",
      "confirmPassword",
      "agree",
    ];
    const next = {};
    for (const field of fields) {
      const message = validateStep1Field(field, form);
      if (message) next[field] = message;
    }
    setTouchedStep1({
      firstName: true,
      lastName: true,
      businessEmail: true,
      phone: true,
      region: true,
      province: true,
      city: true,
      barangay: true,
      address: true,
      businessName: true,
      permitNumber: true,
      password: true,
      confirmPassword: true,
      agree: true,
    });
    setErrors((prev) => {
      const merged = { ...prev };
      for (const field of fields) {
        if (next[field]) merged[field] = next[field];
        else delete merged[field];
      }
      return merged;
    });
    return Object.keys(next).length === 0;
  }, [form, validateStep1Field]);

  const validateStep2 = useCallback(() => {
    const next = {};
    if (!supportingDocType) next.supportingDocType = "Please select a document type.";
    if (!files.supportingDocument) next.supportingDocument = "Please upload a supporting document.";
    setErrors((prev) => ({
      ...prev,
      supportingDocType: next.supportingDocType || "",
      supportingDocument: next.supportingDocument || "",
    }));
    return Object.keys(next).length === 0;
  }, [files.supportingDocument, supportingDocType]);

  const verifySupportingDoc = async () => {
    if (supportingDocStatus.submitted) return true;
    if (!supportingDocType) {
      setErrors((prev) => ({ ...prev, supportingDocType: "Please select a document type." }));
      return false;
    }
    if (!files.supportingDocument) {
      setErrors((prev) => ({ ...prev, supportingDocument: "Please upload a supporting document." }));
      return false;
    }
    if (!form.businessEmail) {
      setErrors((prev) => ({ ...prev, supportingDocument: "Please enter your email first." }));
      return false;
    }
    const maxBytes = 4 * 1024 * 1024;
    if (files.supportingDocument.size > maxBytes) {
      setErrors((prev) => ({
        ...prev,
        supportingDocument: "Document file is too large. Please upload a smaller file.",
      }));
      return false;
    }

    setIsLoading(true);
    setSuccessMessage("");
    setFormError("");
    try {
      await validateSupportingDocumentFile(files.supportingDocument);
      const dataUrl = await fileToBase64(files.supportingDocument);
      const clean = stripDataUrlPrefix(dataUrl);
      const mime = getMimeFromDataUrl(dataUrl);
      const result = await preVerifySupportingDocument(form.businessEmail, clean, mime, "owner", {
        documentType: supportingDocType,
        userProfile: {
          full_name: fullName,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          owner_type: form.ownerType,
          business_name: form.businessName,
          permit_number: form.permitNumber,
          email: form.businessEmail,
        },
      });
      if (!result.success) throw new Error(result.message || "Supporting document verification failed.");

      setSupportingDocStatus({
        submitted: true,
        message:
          result.message ||
          "Supporting document queued for automated screening and Super Admin review.",
      });
      setErrors((prev) => ({ ...prev, supportingDocType: "", supportingDocument: "" }));
      return true;
    } catch (error) {
      setSupportingDocStatus({ submitted: false, message: "" });
      setErrors((prev) => ({
        ...prev,
        supportingDocument: error?.message || "Supporting document verification failed.",
      }));
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep3 = useCallback(() => {
    const next = {};
    if (!kyc.idType) next.idType = "Please select your ID type.";
    if (!kyc.idCardFile) next.idCardFile = "Please upload your government ID.";
    if (!kyc.idRegistered) next.idRegistered = "Please register your ID first.";
    if (!kyc.selfieVerified) next.selfieVerified = "Please verify your selfie matches the ID.";
    setStepErrors(next);
    return Object.keys(next).length === 0;
  }, [kyc]);

  const goNext = async () => {
    if (!canAct()) return;
    setSuccessMessage("");
    if (step === 1 && !validateStep1()) return;
    if (step === 2) {
      if (!validateStep2()) return;
      const verified = await verifySupportingDoc();
      if (!verified) return;
    }
    if (step === 3 && !validateStep3()) return;
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  };

  const goBack = () => {
    if (!canAct()) return;
    if (step === 1) return;
    setSuccessMessage("");
    setStepErrors({});
    setErrors({});
    setStep((prev) => Math.max(1, prev - 1));
  };

  const registerId = async () => {
    if (!canAct()) return;
    if (!kyc.idType) {
      setStepErrors((prev) => ({ ...prev, idType: "Select your ID type first." }));
      return;
    }
    if (!kyc.idCardFile) {
      setStepErrors((prev) => ({ ...prev, idCardFile: "Upload your ID image first." }));
      return;
    }

    setIsLoading(true);
    setKycUi((prev) => ({ ...prev, statusText: "Registering ID face..." }));

    try {
      await validateDocumentImageFile(kyc.idCardFile);
      const dataUrl = await fileToBase64(kyc.idCardFile);
      const clean = stripDataUrlPrefix(dataUrl);
      const mime = getMimeFromDataUrl(dataUrl);
      const result = await preRegisterIdFace(form.businessEmail, fullName, "owner", clean, mime, {
        idType: kyc.idType,
        userProfile: {
          full_name: fullName,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.businessEmail,
          owner_type: form.ownerType,
          business_name: form.businessName,
          permit_number: form.permitNumber,
        },
      });
      if (!result.success) throw new Error(result.message || "Failed to register ID.");

      setKyc((prev) => ({
        ...prev,
        idRegistered: true,
        selfieVerified: false,
        selfieDataUrl: "",
        selfieBase64Clean: "",
      }));
      setStepErrors((prev) => ({ ...prev, idType: "", idRegistered: "" }));
      setKycUi((prev) => ({ ...prev, statusText: "ID registered. Open camera to capture your selfie." }));
    } catch (error) {
      setStepErrors((prev) => ({ ...prev, idRegistered: friendlyError(error.message) }));
      setKycUi((prev) => ({ ...prev, statusText: "" }));
    } finally {
      setIsLoading(false);
    }
  };

  const openCamera = async () => {
    if (!canAct()) return;
    setCamError("");
    setCamInfo("");
    setKycUi((prev) => ({ ...prev, showCamera: true, statusText: "Initializing camera..." }));

    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter((d) => d.kind === "videoinput");
      setDevices(cams);

      let deviceId = selectedDeviceId;
      if (!deviceId || !cams.find((d) => d.deviceId === deviceId)) {
        deviceId = cams[0]?.deviceId || "";
        setSelectedDeviceId(deviceId);
      }

      const stream = await startCamera(videoRef.current, {
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId }, facingMode: "user" } : { facingMode: "user" },
      });

      setCameraStream(stream);
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};
      const label = cams.find((d) => d.deviceId === deviceId)?.label || "Camera";
      setCamInfo(`${label} | ${settings.width || "?"}x${settings.height || "?"}`);
      setKycUi((prev) => ({ ...prev, statusText: "Camera ready. Capture your selfie." }));
    } catch (error) {
      const name = error?.name || "";
      let message = "Something went wrong with the camera.";
      if (name === "NotAllowedError") message = "Camera permission denied. Please allow access.";
      if (name === "NotReadableError") message = "Your camera is being used by another app.";
      if (name === "NotFoundError") message = "No camera found on this device.";
      setCamError(message);
      closeCamera();
    }
  };

  const switchCamera = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    setCamError("");
    setCamInfo("");
    try {
      stopCamera(videoRef.current || cameraStream);
      setCameraStream(null);
      const stream = await startCamera(videoRef.current, {
        audio: false,
        video: { deviceId: { exact: deviceId }, facingMode: "user" },
      });
      setCameraStream(stream);
      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings?.() || {};
      const label = devices.find((d) => d.deviceId === deviceId)?.label || "Camera";
      setCamInfo(`${label} | ${settings.width || "?"}x${settings.height || "?"}`);
    } catch {
      setCamError("Failed to switch camera. Please try again.");
    }
  };

  const captureSelfie = async () => {
    if (!canAct()) return;
    if (!cameraStream) {
      setStepErrors((prev) => ({ ...prev, selfieVerified: "Open camera first." }));
      return;
    }

    setIsLoading(true);
    setKycUi((prev) => ({ ...prev, statusText: "Capturing selfie..." }));

    try {
      const dataUrl = await captureBase64FromStream(cameraStream);
      if (!dataUrl) throw new Error("Failed to capture selfie.");
      const clean = stripDataUrlPrefix(dataUrl);

      setKyc((prev) => ({ ...prev, selfieDataUrl: dataUrl, selfieBase64Clean: clean }));
      setStepErrors((prev) => ({ ...prev, selfieVerified: "" }));
      setKycUi((prev) => ({ ...prev, statusText: "Selfie captured. Click Verify to match with your ID." }));
    } catch (error) {
      setKyc((prev) => ({ ...prev, selfieDataUrl: "", selfieBase64Clean: "" }));
      setStepErrors((prev) => ({ ...prev, selfieVerified: friendlyError(error.message) }));
      setKycUi((prev) => ({ ...prev, statusText: "" }));
    } finally {
      setIsLoading(false);
    }
  };

  const verifySelfie = async () => {
    if (!canAct()) return;
    if (!kyc.selfieBase64Clean) {
      setStepErrors((prev) => ({ ...prev, selfieVerified: "Capture a selfie first." }));
      return;
    }

    setIsLoading(true);
    setKycUi((prev) => ({ ...prev, statusText: "Verifying face match..." }));

    try {
      const result = await preSelfieVerify(form.businessEmail, kyc.selfieBase64Clean, "owner");
      if (!result.verified) throw new Error(result.message || "Face does not match ID.");
      setKyc((prev) => ({ ...prev, selfieVerified: true }));
      setStepErrors((prev) => ({ ...prev, selfieVerified: "" }));
      setKycUi((prev) => ({ ...prev, statusText: "Face verified successfully." }));
      closeCamera();
    } catch (error) {
      setKyc((prev) => ({ ...prev, selfieVerified: false }));
      setStepErrors((prev) => ({ ...prev, selfieVerified: friendlyError(error.message) }));
      setKycUi((prev) => ({ ...prev, statusText: "" }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading || !canAct()) return;
    if (!validateStep1()) {
      setStep(1);
      return;
    }
    if (!validateStep2()) {
      setStep(2);
      return;
    }
    if (!validateStep3()) {
      setStep(3);
      return;
    }

    setIsLoading(true);
    setSuccessMessage("");
    setFormError("");

    try {
      const preKycToken = await getPreKycSessionToken(form.businessEmail, "owner");
      const response = await API.register({
        name: fullName,
        email: form.businessEmail,
        password: form.password,
        role: "owner",
        phone: form.phone,
        address: form.address,
        region: form.region,
        province: form.province,
        city: form.city,
        barangay: form.barangay,
        ownerType: form.ownerType,
        businessName: form.businessName,
        permitNumber: form.permitNumber,
        preKycToken,
      });

      const registeredEmail = String(response?.user?.email || form.businessEmail || "").trim().toLowerCase();
      setSuccessMessage(response?.message || "Registration successful. Redirecting to OTP verification...");
      await API.sendOTP(registeredEmail).catch(() => {});
      setTimeout(() => onNavigateToRegisterOTP(registeredEmail, form.phone, fullName), 1200);
    } catch (error) {
      const lower = (error?.message || "").toLowerCase();
      const raw = error?.message || "";
      const serverErrors = error?.details?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        const fieldErrors = { ...serverErrors };
        if (fieldErrors.email) {
          fieldErrors.businessEmail = fieldErrors.email;
          delete fieldErrors.email;
        }
        if (fieldErrors.name) {
          fieldErrors.firstName = fieldErrors.name;
          delete fieldErrors.name;
        }
        setErrors(fieldErrors);
        setFormError("");
        setStep(1);
        return;
      }
      const phoneConflict = lower.includes("phone") && lower.includes("already");
      const msg = lower.includes("already")
        ? phoneConflict
          ? "This phone number is already registered."
          : "This email is already registered."
        : lower.includes("too many")
        ? raw
        : /^[A-Z]/.test(raw) && !/request failed/i.test(raw)
        ? raw
        : "Registration failed. Please try again.";
      if (lower.includes("password")) {
        setErrors({ password: msg });
        setFormError("");
        setStep(1);
      } else if (phoneConflict) {
        setErrors({ phone: msg });
        setFormError("");
        setStep(1);
      } else if (lower.includes("email") && (lower.includes("already") || lower.includes("invalid"))) {
        setErrors({ businessEmail: msg });
        setFormError("");
        setStep(1);
      } else {
        setErrors({});
        setFormError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      onNavigateToHome={onNavigateToHome}
      badge="Guided account onboarding"
      panelTitle="Create your RentifyPro account."
      panelDescription="Finish setup in guided steps with secure identity checks and instant access."
      highlights={[
        "Clear step-by-step onboarding with progress tracking",
        "Supporting document, ID, and face verification",
        "Ready after successful OTP verification",
      ]}
      contentMaxWidth="max-w-4xl"
      contentContainerClassName="items-start py-2 sm:py-4"
    >
      <div className="rp-surface rp-glass rounded-[28px] border-white/70 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] sm:p-8">
        <div className="mt-5 text-center">
          <span className="rp-chip bg-blue-50 text-blue-700 ring-1 ring-blue-100">Register</span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Create your account</h2>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">Fast, secure onboarding in {TOTAL_STEPS} guided steps.</p>
        </div>

        <div className="mb-7 mt-6 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step > s ? "bg-[#017FE6] text-white" : step === s ? "bg-[#017FE6] text-white ring-4 ring-blue-100" : "bg-gray-100 text-gray-400"}`}>
                  {step > s ? <Check size={15} strokeWidth={3} /> : s}
                </div>
                <span className="text-[10px] font-medium text-gray-400 hidden sm:block">{STEP_LABELS[s - 1]}</span>
              </div>
              {s < TOTAL_STEPS && <div className={`h-1 w-10 sm:w-14 rounded-full transition-all self-start mt-[18px] ${step > s ? "bg-[#017FE6]" : "bg-gray-100"}`} />}
            </React.Fragment>
          ))}
        </div>

        {successMessage && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 flex items-center gap-2">
            <CheckCircle2 size={16} /> {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {formError && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
            >
              {formError}
            </div>
          )}

          {step === 1 && (
            <>
              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <p className="font-semibold text-gray-900 mb-2">Owner Type</p>
                <p className="text-sm text-gray-500 mb-3">Choose if you are registering as an individual or business owner.</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { type: "individual", label: "Individual", sub: "Personal lessor", icon: User },
                    { type: "business", label: "Business", sub: "Company lessor", icon: Building2 },
                  ].map(({ type, label, sub, icon: Icon }) => (
                    <button key={type} type="button" onClick={() => handleOwnerTypeSelect(type)} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition ${form.ownerType === type ? "border-[#017FE6] bg-blue-50" : "border-gray-200 hover:border-[#017FE6]"}`}>
                      <Icon size={18} className="text-gray-600" />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800">{label}</p>
                        <p className="text-xs text-gray-500">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <p className="font-semibold text-gray-900 mb-1">Step 1 — Personal Details</p>
                <p className="text-sm text-gray-500">Enter your information to create your owner account.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="First Name"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("firstName")}
                  error={errors.firstName}
                  disabled={isLoading}
                  onlyLetters
                  icon={User}
                  placeholder="Juan"
                  helper="Use your legal first name as shown on your government ID."
                  maxLength={50}
                />
                <Field
                  label="Last Name"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("lastName")}
                  error={errors.lastName}
                  disabled={isLoading}
                  onlyLetters
                  icon={User}
                  placeholder="Dela Cruz"
                  helper="Use your legal last name for matching during verification."
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label="Enter Email"
                  type="email"
                  name="businessEmail"
                  value={form.businessEmail}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("businessEmail")}
                  error={errors.businessEmail}
                  disabled={isLoading}
                  icon={Mail}
                  placeholder="Enter Email"
                  helper="Enter Email"
                  maxLength={254}
                />
                <Field
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("phone")}
                  error={errors.phone}
                  disabled={isLoading}
                  onlyNumbers
                  icon={Phone}
                  placeholder="9XXXXXXXXX"
                  helper="Enter your 10-digit mobile number."
                  maxLength={10}
                  prefixText="+63"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 bg-white space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-[#017FE6]" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Business Address</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Select your address from dropdown options. No manual typing required.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectField
                    label="Region"
                    name="region"
                    value={form.region}
                    onChange={handleRegionChange}
                    onBlur={() => handleStep1Blur("region", form)}
                    options={regions.map((region) => ({ value: region.code, label: region.name }))}
                    error={errors.region}
                    disabled={isLoading}
                    helper="Start by selecting your region."
                    placeholder="Select region"
                  />
                  <SelectField
                    label={provinces.length > 0 ? "Province" : "Province (N/A for this region)"}
                    name="province"
                    value={form.province}
                    onChange={handleProvinceChange}
                    onBlur={() => handleStep1Blur("province", form)}
                    options={provinces.map((province) => ({ value: province.code, label: province.name }))}
                    error={errors.province}
                    disabled={isLoading || !form.region || provinces.length === 0}
                    required={provinces.length > 0}
                    helper={provinces.length > 0 ? "Select the province tied to your selected region." : "This region does not use province selection."}
                    placeholder={provinces.length > 0 ? "Select province" : "Province not required for this region"}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SelectField
                    label="City / Municipality"
                    name="city"
                    value={form.city}
                    onChange={handleCityChange}
                    onBlur={() => handleStep1Blur("city", form)}
                    options={cities.map((city) => ({ value: city.code, label: city.name }))}
                    error={errors.city}
                    disabled={isLoading || !form.region || (provinces.length > 0 && !form.province)}
                    helper="Select your city or municipality."
                    placeholder="Select city / municipality"
                  />
                  <SelectField
                    label="Barangay"
                    name="barangay"
                    value={form.barangay}
                    onChange={handleBarangayChange}
                    onBlur={() => handleStep1Blur("barangay", form)}
                    options={barangays.map((barangay) => ({ value: barangay.code, label: barangay.name }))}
                    error={errors.barangay}
                    disabled={isLoading || !form.city}
                    helper="Pick the barangay to complete your address."
                    placeholder="Select barangay"
                  />
                </div>

                <div className={`rounded-xl border px-4 py-3 text-sm ${errors.address ? "border-red-300 bg-red-50/40 text-red-600" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
                  {form.address || "Selected address will appear here after choosing region, city, and barangay."}
                </div>
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
                {addressLoadError && <p className="text-xs text-red-500">{addressLoadError}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field
                  label={form.ownerType === "individual" ? "Business / Trade Name" : "Business Name"}
                  name="businessName"
                  value={form.businessName}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("businessName")}
                  error={errors.businessName}
                  disabled={isLoading}
                  icon={Building2}
                  placeholder="Sample Transport Services Inc."
                  helper="Use the business or trade name shown in your supporting document."
                  maxLength={120}
                />
                <Field
                  label="Permit / Registration No."
                  name="permitNumber"
                  value={form.permitNumber}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("permitNumber")}
                  error={errors.permitNumber}
                  disabled={isLoading}
                  icon={Building2}
                  placeholder="DTI/SEC/Permit No."
                  helper="Enter the permit or registration number shown on your uploaded document."
                  maxLength={50}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PasswordField
                  label="Create Password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("password")}
                  error={errors.password}
                  disabled={isLoading}
                  show={showPw}
                  toggle={() => setShowPw((prev) => !prev)}
                  helper="Create Password"
                  placeholder="Create Password"
                  maxLength={128}
                />
                <PasswordField
                  label="Confirm Password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => handleStep1Blur("confirmPassword")}
                  error={errors.confirmPassword}
                  disabled={isLoading}
                  show={showCpw}
                  toggle={() => setShowCpw((prev) => !prev)}
                  helper="Confirm Password"
                  placeholder="Confirm Password"
                  maxLength={128}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} onBlur={() => handleStep1Blur("agree")} disabled={isLoading} className="w-5 h-5 accent-[#017FE6] cursor-pointer flex-shrink-0 disabled:opacity-60" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setLegalModalType("terms");
                      }}
                      className="text-[#017FE6] font-semibold hover:underline"
                    >
                      Terms and Conditions
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setLegalModalType("privacy");
                      }}
                      className="text-[#017FE6] font-semibold hover:underline"
                    >
                      Privacy Policy
                    </button>
                  </span>
                </label>
                {errors.agree && <p className="text-red-500 text-sm font-medium">{errors.agree}</p>}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText size={20} className="text-[#017FE6]" /></div>
                  <div>
                    <p className="font-semibold text-gray-900">Step 2 — Account & Documents</p>
                    <p className="text-sm text-gray-500 mt-1">Upload your supporting document for owner verification.</p>
                  </div>
                </div>
              </div>

              <SelectField
                label="Supporting Document Type"
                name="supportingDocType"
                value={supportingDocType}
                onChange={handleSupportingDocTypeChange}
                options={SUPPORTING_DOCUMENT_TYPES.map((entry) => ({ value: entry, label: entry }))}
                error={errors.supportingDocType}
                disabled={isLoading}
                required
                placeholder="Select the document type you uploaded"
              />

              <FileInput
                label="Supporting Business Document"
                helper="Upload a Philippines-issued document (DTI/SEC/Mayor's Permit/etc.) that matches your business name and permit/registration number."
                name="supportingDocument"
                onChange={handleFile}
                error={errors.supportingDocument}
                file={files.supportingDocument}
                disabled={isLoading}
              />
              {supportingDocStatus.submitted && !errors.supportingDocument && (
                <p className="text-xs font-medium text-amber-700">{supportingDocStatus.message}</p>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><ShieldCheck size={20} className="text-[#017FE6]" /></div>
                  <div>
                    <p className="font-semibold text-gray-900">Step 3 — Identity Verification</p>
                    <p className="text-sm text-gray-500 mt-1">Upload your government ID, then capture a live selfie to verify your identity.</p>
                  </div>
                </div>
              </div>

              <SelectField
                label="ID Type"
                name="idType"
                value={kyc.idType}
                onChange={handleIdTypeChange}
                options={ID_DOCUMENT_TYPES.map((entry) => ({ value: entry, label: entry }))}
                error={stepErrors.idType}
                disabled={isLoading}
                required
                placeholder="Select the ID type you uploaded"
              />

              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <p className="font-semibold text-gray-900">Government ID (front side)</p>
                <p className="text-sm text-gray-600 mt-1">Upload a clear photo of a Philippine government ID.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    ref={idInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        await validateDocumentImageFile(file);
                      } catch (validationError) {
                        setStepErrors((prev) => ({ ...prev, idCardFile: validationError.message || "Please choose a valid ID image." }));
                        e.target.value = "";
                        return;
                      }
                      setKyc((prev) => ({ ...prev, idCardFile: file, idRegistered: false, selfieVerified: false, selfieDataUrl: "", selfieBase64Clean: "" }));
                      setKycUi((prev) => ({ ...prev, statusText: "" }));
                      setStepErrors({});
                      setCamError("");
                      setCamInfo("");
                      closeCamera();
                    }}
                  />

                  {!kyc.idCardFile ? (
                    <button type="button" onClick={() => idInputRef.current?.click()} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:opacity-95 transition disabled:opacity-60">
                      <Upload size={18} /> Upload
                    </button>
                  ) : (
                    <>
                      <div className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 min-w-0 truncate">
                        <span className="font-medium">Selected:</span> {kyc.idCardFile.name}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setKyc(initialKyc);
                          setKycUi({ showCamera: false, statusText: "" });
                          setStepErrors({});
                          closeCamera();
                        }}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-800 font-semibold hover:bg-gray-50 transition disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </>
                  )}
                </div>
                {stepErrors.idCardFile && <p className="text-red-500 text-sm font-medium mt-2">{stepErrors.idCardFile}</p>}
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <p className="font-semibold text-gray-900 mb-3">Verification Steps</p>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={isLoading || !kyc.idType || !kyc.idCardFile} onClick={registerId} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition ${kyc.idRegistered ? "bg-green-500 text-white cursor-default" : "bg-gray-900 text-white hover:opacity-95"} disabled:opacity-50`}>
                    {isLoading && !kyc.idRegistered ? <><Loader size={15} className="animate-spin" /> Processing...</> : kyc.idRegistered ? "ID Registered" : "1. Register ID"}
                  </button>
                  <button type="button" disabled={isLoading || !kyc.idRegistered} onClick={kycUi.showCamera ? closeCamera : openCamera} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#017FE6] to-[#0165B8] hover:opacity-95 disabled:opacity-50 transition">
                    {kycUi.showCamera ? "Close Camera" : "2. Open Camera"}
                  </button>
                  <button type="button" disabled={isLoading || !cameraStream || !kyc.idRegistered} onClick={captureSelfie} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition ${kyc.selfieBase64Clean ? "bg-blue-500 text-white" : "bg-gray-700 text-white hover:opacity-95"} disabled:opacity-50`}>
                    {isLoading && !kyc.selfieBase64Clean ? <><Loader size={15} className="animate-spin" /> Capturing...</> : kyc.selfieBase64Clean ? "3. Retake Selfie" : "3. Capture Selfie"}
                  </button>
                  <button type="button" disabled={isLoading || !kyc.selfieBase64Clean || kyc.selfieVerified} onClick={verifySelfie} className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-sm transition ${kyc.selfieVerified ? "bg-green-500 text-white cursor-default" : "bg-green-600 text-white hover:opacity-95"} disabled:opacity-50`}>
                    {isLoading && !kyc.selfieVerified ? <><Loader size={15} className="animate-spin" /> Verifying...</> : kyc.selfieVerified ? "Face Verified" : "4. Verify Face Match"}
                  </button>
                </div>

                {kycUi.statusText && <p className={`text-sm font-medium mt-3 ${kyc.selfieVerified ? "text-green-600" : "text-gray-600"}`}>{kycUi.statusText}</p>}
                {stepErrors.idRegistered && <p className="text-red-500 text-sm font-medium mt-2">{stepErrors.idRegistered}</p>}
                {stepErrors.selfieVerified && <p className="text-red-500 text-sm font-medium mt-1">{stepErrors.selfieVerified}</p>}
              </div>

              {kycUi.showCamera && (
                <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 space-y-3">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" style={{ transform: "scaleX(-1)" }} />
                  {devices.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-600 font-medium block mb-1">Camera device</label>
                      <select value={selectedDeviceId} onChange={(e) => switchCamera(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 bg-white text-sm">
                        {devices.map((d, idx) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${idx + 1}`}</option>)}
                      </select>
                    </div>
                  )}
                  {camError && <p className="text-sm text-red-600 p-2 bg-red-50 rounded-lg">{camError}</p>}
                  {camInfo && <p className="text-xs text-gray-600 p-2 bg-gray-100 rounded-lg break-words">{camInfo}</p>}
                  <button type="button" disabled={isLoading} onClick={closeCamera} className="w-full px-4 py-2 rounded-xl font-semibold border border-gray-200 text-gray-900 hover:bg-white transition disabled:opacity-50">Close Camera</button>
                  {kyc.selfieDataUrl && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Selfie Preview</p>
                      <img src={kyc.selfieDataUrl} alt="Selfie" className="w-full rounded-xl border border-gray-200" style={{ transform: "scaleX(-1)" }} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div className="rounded-2xl border border-gray-200 p-4 bg-white">
                <p className="font-semibold text-gray-900">Step 4 — Review & Submit</p>
                <p className="text-sm text-gray-500 mt-1">Confirm your details before creating your account.</p>
              </div>

              <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50 space-y-3">
                {[
                  { label: "Full Name", value: fullName || "-" },
                  { label: "Email", value: form.businessEmail || "-" },
                  { label: "Phone", value: form.phone || "-" },
                  { label: "Address", value: form.address || "-" },
                  { label: "Region", value: regions.find((entry) => entry.code === form.region)?.name || "-" },
                  { label: "Province", value: provinces.length > 0 ? (provinces.find((entry) => entry.code === form.province)?.name || "-") : "N/A" },
                  { label: "City / Municipality", value: cities.find((entry) => entry.code === form.city)?.name || "-" },
                  { label: "Barangay", value: barangays.find((entry) => entry.code === form.barangay)?.name || "-" },
                  { label: "Owner Type", value: canShowBusinessFields ? "Business" : "Individual" },
                  { label: "Business Name", value: form.businessName || "-" },
                  { label: "Permit Number", value: form.permitNumber || "-" },
                  { label: "Supporting Document Type", value: supportingDocType || "-" },
                  { label: "Supporting Document", value: files.supportingDocument ? "Uploaded" : "Missing" },
                  { label: "ID Type", value: kyc.idType || "-" },
                  { label: "Face Verification", value: kyc.selfieVerified ? "Verified" : "Not verified", highlight: kyc.selfieVerified },
                ].map(({ label, value, highlight }, i, arr) => (
                  <React.Fragment key={label}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-500">{label}</p>
                      <p className={`text-sm font-semibold ${highlight ? "text-green-600" : "text-gray-900"}`}>{value}</p>
                    </div>
                    {i < arr.length - 1 && <div className="h-px bg-gray-200" />}
                  </React.Fragment>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-3 pt-1">
            <button type="button" onClick={step === 1 ? onBack : goBack} disabled={isLoading} className="rp-btn-secondary flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowLeft size={18} /> {step === 1 ? "Register as User" : "Back"}
            </button>
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={goNext} disabled={isLoading} className="rp-btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-70">
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button type="submit" disabled={isLoading} className="rp-btn-primary flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-70">
                {isLoading ? <><Loader size={18} className="animate-spin" /> Registering...</> : "Register as Owner"}
              </button>
            )}
          </div>

          {step === 1 && (
            <p className="text-center text-gray-500 text-sm mt-1">
              Already have an account?{" "}
              <button type="button" onClick={onNavigateToSignIn} disabled={isLoading} className="text-[#017FE6] font-semibold hover:underline transition-colors disabled:opacity-50">
                Sign In
              </button>
            </p>
          )}
        </form>
      </div>
      <LegalPolicyModal
        isOpen={Boolean(legalModalType)}
        documentType={legalModalType === "privacy" ? "privacy" : "terms"}
        onClose={() => setLegalModalType("")}
        onSwitchToTerms={() => setLegalModalType("terms")}
        onSwitchToPrivacy={() => setLegalModalType("privacy")}
      />
    </AuthShell>
  );
}

function Field({
  label,
  type = "text",
  name,
  value,
  onChange,
  error,
  disabled = false,
  onlyLetters = false,
  onlyNumbers = false,
  icon: Icon,
  placeholder = "",
  helper = "",
  maxLength,
  prefixText = "",
  onBlur,
}) {
  const handleInputChange = (e) => {
    let nextValue = e.target.value;
    if (onlyLetters) nextValue = normalizeNameInput(nextValue);
    if (onlyNumbers) nextValue = nextValue.replace(/[^0-9]/g, "");
    if (type === "email") nextValue = nextValue.replace(/\s/g, "");
    onChange({ target: { name, value: nextValue, type } });
  };

  const handleInputKeyDown = (e) => {
    if (type === "email" && e.key === " ") {
      e.preventDefault();
    }
  };

  const handleInputPaste = (e) => {
    if (type !== "email") return;
    const pastedText = String(e.clipboardData?.getData("text") || "");
    if (!/\s/.test(pastedText)) return;
    e.preventDefault();
    const sanitizedText = pastedText.replace(/\s/g, "");
    const input = e.currentTarget;
    const currentValue = String(input?.value || "");
    const start = Number.isInteger(input?.selectionStart) ? input.selectionStart : currentValue.length;
    const end = Number.isInteger(input?.selectionEnd) ? input.selectionEnd : currentValue.length;
    const nextValue = currentValue.slice(0, start) + sanitizedText + currentValue.slice(end);
    onChange({ target: { name, value: nextValue, type } });
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      {helper ? <p className="text-xs text-gray-500">{helper}</p> : null}
      <div className="relative">
        {prefixText ? (
          <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm font-medium text-gray-500">
            {prefixText}
          </span>
        ) : null}
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onPaste={handleInputPaste}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`relative z-0 w-full h-11 rounded-xl border px-4 text-[15px] placeholder:text-gray-400 outline-none shadow-sm transition ${Icon ? "pr-11" : ""} ${prefixText ? "pl-14" : ""} ${error ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-gray-300 hover:border-gray-400 focus:border-[#017FE6] focus:ring-4 focus:ring-blue-100"} ${disabled ? "cursor-not-allowed bg-gray-100 text-gray-500" : "bg-white"}`}
        />
        {Icon && <Icon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500" />}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  error,
  disabled = false,
  required = true,
  helper = "",
  placeholder = "",
  onBlur,
}) {
  const fallbackPlaceholder = placeholder || `Select ${label.toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {helper ? <p className="text-xs text-gray-500">{helper}</p> : null}
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full h-11 rounded-xl border px-4 text-sm outline-none shadow-sm transition ${error ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-gray-300 hover:border-gray-400 focus:border-[#017FE6] focus:ring-4 focus:ring-blue-100"} ${disabled ? "cursor-not-allowed bg-gray-100 text-gray-500" : "bg-white text-gray-900"}`}
        >
          <option value="">{fallbackPlaceholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  onChange,
  error,
  disabled = false,
  show,
  toggle,
  helper = "",
  placeholder = "",
  maxLength,
  onBlur,
}) {
  const sanitizePasswordValue = (rawValue = "") => String(rawValue).replace(/\s/g, "");

  const handlePasswordChange = (event) => {
    const sanitizedValue = sanitizePasswordValue(event?.target?.value || "");
    onChange({ target: { name, value: sanitizedValue, type: "password" } });
  };

  const handlePasswordKeyDown = (event) => {
    if (event.key === " ") event.preventDefault();
  };

  const handlePasswordPaste = (event) => {
    const pastedText = String(event.clipboardData?.getData("text") || "");
    if (!/\s/.test(pastedText)) return;
    event.preventDefault();
    const sanitizedText = sanitizePasswordValue(pastedText);
    const input = event.currentTarget;
    const currentValue = String(input?.value || "");
    const start = Number.isInteger(input?.selectionStart) ? input.selectionStart : currentValue.length;
    const end = Number.isInteger(input?.selectionEnd) ? input.selectionEnd : currentValue.length;
    const nextValue = currentValue.slice(0, start) + sanitizedText + currentValue.slice(end);
    onChange({ target: { name, value: nextValue, type: "password" } });
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>
      {helper ? (
        <p className="min-h-8 text-xs leading-4 text-gray-500">{helper}</p>
      ) : (
        <div className="min-h-8" />
      )}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={handlePasswordChange}
          onKeyDown={handlePasswordKeyDown}
          onPaste={handlePasswordPaste}
          onBlur={onBlur}
          disabled={disabled}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full h-11 rounded-xl border px-4 pr-11 text-[15px] placeholder:text-gray-400 outline-none shadow-sm transition ${error ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100" : "border-gray-300 hover:border-gray-400 focus:border-[#017FE6] focus:ring-4 focus:ring-blue-100"} ${disabled ? "cursor-not-allowed bg-gray-100 text-gray-500" : "bg-white"}`}
        />
        <button type="button" onClick={toggle} disabled={disabled} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed">
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function FileInput({ label, helper, name, onChange, error, file, disabled = false }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-4 bg-white space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label} <span className="text-red-500">*</span></label>
      {helper && <p className="text-xs text-gray-500">{helper}</p>}
      <div className={`h-11 flex items-center justify-between gap-3 rounded-xl border px-4 ${error ? "border-red-300" : "border-gray-300"} ${disabled ? "bg-gray-100" : "bg-white"}`}>
        <span className={`text-sm truncate min-w-0 ${disabled ? "text-gray-400" : "text-gray-600"}`}>{file ? file.name : "No file selected"}</span>
        <label className={`inline-flex items-center gap-2 text-sm font-semibold flex-shrink-0 ${disabled ? "text-gray-400 cursor-not-allowed" : "text-[#017FE6] cursor-pointer hover:underline"}`}>
          <Upload size={16} /> Choose
          <input type="file" name={name} accept="image/jpeg,image/png,application/pdf" onChange={onChange} disabled={disabled} className="hidden" />
        </label>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
