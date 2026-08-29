import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import mongoose from "mongoose";
import { getAdminTransactions } from "../controllers/admin.controller.js";
import {
  decideAdminReport,
  getReportById,
  listAdminReports,
  updateAdminReport,
} from "../controllers/report.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/rbac.middleware.js";

const VEHICLE_MEDIA_PREFIX = "uploads/vehicles/";
const VEHICLE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DOCUMENT_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const asText = (value, fallback = "") => {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
};

const asDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : "—";
};

const asTimestamp = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString() : "";
};

const titleCase = (value, fallback) => {
  const normalized = asText(value).replace(/[_-]+/g, " ");
  if (!normalized) return fallback;
  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const mapRole = (role) => {
  if (role === "owner") return "Operator";
  if (role === "admin") return "Admin";
  return "Renter";
};

const mapCustomerStatus = (user) => {
  if (user.isArchived) return "Archived";
  if (user.isDisabled) return "Suspended";
  if (user.kycStatus === "rejected") return "Inactive";
  return user.isVerified ? "Active" : "Pending Verification";
};

const mapDocumentStatus = (status) => {
  if (status === "verified") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
};

const mapUser = (user) => ({
  id: user._id.toString(),
  name: asText(user.name, "Unnamed customer"),
  email: asText(user.email, "—"),
  phone: asText(user.phone, "—"),
  role: mapRole(user.role),
  status: mapCustomerStatus(user),
  created: asDate(user.createdAt),
  createdAt: asTimestamp(user.createdAt),
  disabledUntil: asTimestamp(user.disabledUntil),
  restrictions: user.moderationRestrictions || {},
});

const mapVehicle = (vehicle, ownerNames) => {
  const specs = vehicle.specs || {};
  const rawRate = Number(vehicle.dailyRentalRate);
  const pricingUnit = vehicle.pricingUnit === "daily" ? "day" : "hour";
  const rate = Number.isFinite(rawRate) ? rawRate.toLocaleString("en-PH") : "0";
  const imageReference = asText(vehicle.imageUrl) || (Array.isArray(vehicle.images) ? asText(vehicle.images[0]) : "");

  return {
    id: vehicle._id.toString(),
    name: asText(vehicle.name, "Unnamed vehicle"),
    image: imageReference ? `/api/admin/vehicles/${vehicle._id.toString()}/image` : "",
    plateNumber: asText(specs.plateNumber, "—"),
    type: asText(specs.type, "Vehicle"),
    category: asText(specs.subType, asText(specs.type, "Uncategorized")),
    seats: Number.isFinite(Number(specs.seats)) ? Number(specs.seats) : "—",
    transmission: asText(specs.transmission, "—"),
    fuel: asText(specs.fuel, "—"),
    location: asText(vehicle.location, "—"),
    operator: ownerNames.get(String(vehicle.owner)) || "Unknown operator",
    rentalRate: `PHP ${rate}/${pricingUnit}`,
    driverOption: vehicle.driverOptionEnabled ? "Available" : "Not available",
    status: vehicle.availabilityStatus === "available" ? "Available" : "Unavailable",
    createdAt: asTimestamp(vehicle.createdAt),
  };
};

const mapDocument = (document, usersByEmail) => {
  const email = asText(document.email).toLowerCase();
  const matchedUser = usersByEmail.get(email);
  const fallbackType = document.docType === "supporting" ? "Supporting Document" : "Government ID";

  return {
    id: document._id.toString(),
    customer: matchedUser?.name || email || "Unknown customer",
    email,
    role: mapRole(matchedUser?.role || document.role),
    document: titleCase(document.selectedDocCategory || document.docCategory, fallbackType),
    fileName: asText(document.fileName, fallbackType),
    submitted: asDate(document.createdAt),
    submittedAt: asTimestamp(document.createdAt),
    approval: mapDocumentStatus(document.status),
    mimeType: asText(document.mimeType, "application/octet-stream"),
    reason: asText(document.reason),
    confidence: Number.isFinite(Number(document.confidence)) ? Number(document.confidence) : null,
    previewUrl: document.fileKey ? `/api/admin/documents/${document._id.toString()}/file` : "",
  };
};

const mapBooking = (booking, usersById, vehiclesById) => {
  const vehicle = vehiclesById.get(String(booking.vehicle));
  const renter = usersById.get(String(booking.renter));
  const operator = usersById.get(String(booking.owner));
  const now = Date.now();
  const pickupTime = booking.pickupAt ? new Date(booking.pickupAt).getTime() : Number.NaN;
  const returnTime = booking.returnAt ? new Date(booking.returnAt).getTime() : Number.NaN;
  const confirmed = booking.status === "confirmed";

  return {
    id: booking._id.toString(),
    reference: booking._id.toString().slice(-6).toUpperCase(),
    vehicle: asText(vehicle?.name, "Unknown vehicle"),
    vehicleId: vehicle?._id?.toString() || "",
    renter: asText(renter?.name, "Unknown renter"),
    renterId: renter?._id?.toString() || "",
    operator: asText(operator?.name, "Unknown operator"),
    operatorId: operator?._id?.toString() || "",
    pickupAt: asTimestamp(booking.pickupAt),
    returnAt: asTimestamp(booking.returnAt),
    createdAt: asTimestamp(booking.createdAt),
    status: titleCase(booking.status, "Pending"),
    isActive: confirmed && Number.isFinite(pickupTime) && Number.isFinite(returnTime) && pickupTime <= now && returnTime >= now,
    isOverdue: confirmed && Number.isFinite(returnTime) && returnTime < now,
    driverSelected: Boolean(booking.driverSelected),
    reviewRating: Number.isFinite(Number(booking.reviewRating)) ? Number(booking.reviewRating) : null,
    reviewComment: asText(booking.reviewComment),
    reviewCreatedAt: asTimestamp(booking.reviewCreatedAt),
  };
};

const validObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const safeFileFromKey = (directory, key, allowedExtensions) => {
  const fileName = asText(key);
  if (!fileName || fileName !== path.basename(fileName) || /[\\/]/.test(fileName)) return "";
  if (!/^[a-z0-9][a-z0-9._-]{0,220}$/i.test(fileName)) return "";
  if (!allowedExtensions.has(path.extname(fileName).toLowerCase())) return "";

  const root = path.resolve(directory);
  const target = path.resolve(root, fileName);
  return path.dirname(target) === root ? target : "";
};

const normalizeVehicleReference = (value) => {
  const raw = asText(value).replace(/\\/g, "/");
  if (!raw) return { kind: "none" };

  try {
    const url = new URL(raw);
    if (["http:", "https:"].includes(url.protocol) && !url.username && !url.password) {
      return { kind: "remote", value: url.toString() };
    }
  } catch {
    // Local object keys are handled below.
  }

  const prefixIndex = raw.toLowerCase().lastIndexOf(VEHICLE_MEDIA_PREFIX);
  if (prefixIndex < 0) return { kind: "none" };
  const fileName = raw.slice(prefixIndex + VEHICLE_MEDIA_PREFIX.length);
  return fileName && fileName === path.basename(fileName) && !/[\\/]/.test(fileName)
    ? { kind: "local", value: fileName }
    : { kind: "none" };
};

const router = express.Router();
const routesDirectory = path.dirname(fileURLToPath(import.meta.url));
const websiteBackendDirectory = path.resolve(
  process.env.WEBSITE_BACKEND_DIR || path.join(routesDirectory, ".."),
);
const kycDirectory = path.resolve(
  process.env.KYC_UPLOAD_DIR || path.join(websiteBackendDirectory, "private_uploads", "kyc"),
);
const vehicleDirectory = path.resolve(websiteBackendDirectory, "uploads", "vehicles");

router.use(protect, authorize("admin"));

router.get("/transactions", getAdminTransactions);
router.get("/reports", listAdminReports);
router.get("/reports/:id", getReportById);
router.patch("/reports/:id", updateAdminReport);
router.post("/reports/:id/decision", decideAdminReport);

router.get("/data", async (_request, response, next) => {
    try {
      const database = mongoose.connection.db;
      const [users, vehicles, documents, bookings] = await Promise.all([
        database.collection("users").find({}, {
          projection: { name: 1, email: 1, phone: 1, role: 1, isVerified: 1, kycStatus: 1, isDisabled: 1, isArchived: 1, disabledUntil: 1, moderationRestrictions: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        database.collection("vehicles").find({}, {
          projection: { owner: 1, name: 1, dailyRentalRate: 1, pricingUnit: 1, location: 1, availabilityStatus: 1, images: 1, imageUrl: 1, driverOptionEnabled: 1, specs: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        database.collection("prekycdocuments").find({}, {
          projection: { email: 1, role: 1, docType: 1, status: 1, docCategory: 1, selectedDocCategory: 1, confidence: 1, reason: 1, fileName: 1, fileKey: 1, mimeType: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        database.collection("bookings").find({}, {
          projection: { vehicle: 1, renter: 1, owner: 1, pickupAt: 1, returnAt: 1, status: 1, driverSelected: 1, reviewRating: 1, reviewComment: 1, reviewCreatedAt: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
      ]);

      const usersByEmail = new Map(users.map((user) => [asText(user.email).toLowerCase(), user]));
      const usersById = new Map(users.map((user) => [user._id.toString(), user]));
      const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));
      const ownerNames = new Map(users.map((user) => [user._id.toString(), asText(user.name, "Unknown operator")]));

      return response.json({
        customers: users.map(mapUser),
        vehicles: vehicles.map((vehicle) => mapVehicle(vehicle, ownerNames)),
        documents: documents.map((document) => mapDocument(document, usersByEmail)),
        bookings: bookings.map((booking) => mapBooking(booking, usersById, vehiclesById)),
        syncedAt: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
});

router.get("/documents/:id/file", async (request, response, next) => {
    try {
      if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Invalid document ID." });
      const document = await mongoose.connection.db.collection("prekycdocuments").findOne(
        { _id: new mongoose.Types.ObjectId(request.params.id) },
        { projection: { fileKey: 1, fileName: 1, mimeType: 1 } },
      );
      if (!document?.fileKey) return response.status(404).json({ message: "Document file not found." });

      const filePath = safeFileFromKey(kycDirectory, document.fileKey, DOCUMENT_EXTENSIONS);
      if (!filePath) return response.status(400).json({ message: "Invalid document file reference." });

      response.setHeader("Cache-Control", "private, no-store");
      response.type(document.mimeType || "application/octet-stream");
      return response.sendFile(filePath, (error) => {
        if (!error) return;
        if (error.code === "ENOENT") return response.status(404).json({ message: "Document file is missing from storage." });
        return next(error);
      });
    } catch (error) {
      return next(error);
    }
});

router.get("/vehicles/:id/image", async (request, response, next) => {
    try {
      if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Invalid vehicle ID." });
      const vehicle = await mongoose.connection.db.collection("vehicles").findOne(
        { _id: new mongoose.Types.ObjectId(request.params.id) },
        { projection: { imageUrl: 1, images: 1 } },
      );
      if (!vehicle) return response.status(404).json({ message: "Vehicle not found." });

      const reference = normalizeVehicleReference(asText(vehicle.imageUrl) || (Array.isArray(vehicle.images) ? vehicle.images[0] : ""));
      if (reference.kind === "remote") return response.redirect(reference.value);
      if (reference.kind !== "local") return response.status(404).json({ message: "Vehicle image not found." });

      const imagePath = safeFileFromKey(vehicleDirectory, reference.value, VEHICLE_EXTENSIONS);
      if (!imagePath) return response.status(400).json({ message: "Invalid vehicle image reference." });
      response.setHeader("Cache-Control", "private, max-age=3600");
      return response.sendFile(imagePath, (error) => {
        if (!error) return;
        if (error.code === "ENOENT") return response.status(404).json({ message: "Vehicle image is missing from storage." });
        return next(error);
      });
    } catch (error) {
      return next(error);
    }
});

router.patch("/documents/:id", async (request, response, next) => {
    try {
      if (!validObjectId(request.params.id)) return response.status(400).json({ message: "Invalid document ID." });
      const approval = asText(request.body?.approval);
      if (!["Approved", "Rejected"].includes(approval)) {
        return response.status(400).json({ message: "Approval must be Approved or Rejected." });
      }

      const now = new Date();
      const setFields = {
        status: approval === "Approved" ? "verified" : "rejected",
        reason: approval === "Approved" ? "Approved by the RentifyPro system administrator." : "Rejected by the RentifyPro system administrator.",
        reviewedAt: now,
      };
      if (approval === "Approved") setFields.verifiedAt = now;

      const update = { $set: setFields };
      if (approval === "Rejected") update.$unset = { verifiedAt: "" };
      const result = await mongoose.connection.db.collection("prekycdocuments").findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(request.params.id), status: "pending_review" },
        update,
        { returnDocument: "after" },
      );
      const updatedDocument = result?.value ?? result;
      if (!updatedDocument) return response.status(409).json({ message: "This document is no longer pending review. Refresh the dashboard." });

      const matchedUser = await mongoose.connection.db.collection("users").findOne(
        { email: asText(updatedDocument.email).toLowerCase() },
        { projection: { name: 1, email: 1, role: 1 } },
      );
      const usersByEmail = new Map(matchedUser ? [[asText(matchedUser.email).toLowerCase(), matchedUser]] : []);
      return response.json({ document: mapDocument(updatedDocument, usersByEmail) });
    } catch (error) {
      return next(error);
    }
});


export default router;
