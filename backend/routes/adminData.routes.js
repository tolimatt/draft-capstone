import path from "node:path";
import { unlink } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import AdminCredential from "../models/AdminCredential.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { recordAdminAudit } from "../services/adminAudit.service.js";
import { ADMIN_API_CONTRACT_VERSION, ADMIN_API_ROUTES } from "../../shared/adminApiContract.js";

const VEHICLE_MEDIA_PREFIX = "uploads/vehicles/";
const VEHICLE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const DOCUMENT_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);
const PAYMENT_STATUSES = new Set(["unpaid", "partial", "paid", "refunded"]);
const DEFAULT_TRANSACTION_LIMIT = 50;
const MAX_TRANSACTION_LIMIT = 100;
const CUSTOMER_ROLES = new Set(["user", "owner"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+0-9()\-\s]{7,32}$/;

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
  disabled: Boolean(user.isDisabled),
  disabledAt: asTimestamp(user.disabledAt),
  disabledReason: asText(user.disabledReason),
  created: asDate(user.createdAt),
  createdAt: asTimestamp(user.createdAt),
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
    paymentStatus: asText(booking.paymentStatus, "unpaid").toLowerCase(),
    paymentAmountDue: roundCurrency(booking.paymentAmountDue),
  };
};

const roundCurrency = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

const transactionAmounts = (booking) => {
  const rentalAmount = roundCurrency(
    Math.max(Number(booking.totalAmount || 0), 0) +
      Math.max(Number(booking.lateReturnPenaltyFee || 0), 0),
  );
  const persistedFee = Number(booking.transactionFee);
  const paidValue = Math.max(Number(booking.paymentAmountPaid || 0), 0);
  const dueValue = Math.max(Number(booking.paymentAmountDue || 0), 0);
  const inferredFee = paidValue + dueValue - rentalAmount;
  const transactionFee = roundCurrency(
    Number.isFinite(persistedFee) && persistedFee > 0
      ? persistedFee
      : Number.isFinite(inferredFee) && inferredFee > 0
        ? inferredFee
        : 0,
  );
  const amountPayable = roundCurrency(rentalAmount + transactionFee);
  const paymentAmountPaid = roundCurrency(
    paidValue > 0 ? Math.min(paidValue, amountPayable) : booking.paymentStatus === "paid" ? amountPayable : 0,
  );
  const persistedDue = Number(booking.paymentAmountDue);
  const paymentAmountDue = roundCurrency(
    Number.isFinite(persistedDue) && persistedDue >= 0
      ? persistedDue
      : Math.max(amountPayable - paymentAmountPaid, 0),
  );

  return { rentalAmount, transactionFee, amountPayable, paymentAmountPaid, paymentAmountDue };
};

const mapTransaction = (booking, usersById, vehiclesById) => {
  const vehicle = vehiclesById.get(String(booking.vehicle));
  const renter = usersById.get(String(booking.renter));
  const owner = usersById.get(String(booking.owner));

  return {
    _id: booking._id.toString(),
    bookingStatus: asText(booking.status, "pending").toLowerCase(),
    paymentStatus: asText(booking.paymentStatus, "unpaid").toLowerCase(),
    paymentMethod: asText(booking.paymentMethod) || null,
    paymentChannel: asText(booking.paymentChannel) || null,
    balancePaymentMethod: asText(booking.balancePaymentMethod) || null,
    paymongoReference: asText(booking.paymongoReference) || null,
    paymongoCheckoutId: asText(booking.paymongoCheckoutId) || null,
    paymentIntentId: asText(booking.paymentIntentId) || null,
    ...transactionAmounts(booking),
    paymentRequestedAt: asTimestamp(booking.paymentRequestedAt) || null,
    paymentUpdatedAt: asTimestamp(booking.paymentUpdatedAt) || null,
    paidAt: asTimestamp(booking.paidAt) || null,
    createdAt: asTimestamp(booking.createdAt),
    updatedAt: asTimestamp(booking.updatedAt),
    vehicle: vehicle ? {
      _id: vehicle._id.toString(),
      name: asText(vehicle.name),
      location: asText(vehicle.location),
    } : null,
    renter: renter ? {
      _id: renter._id.toString(),
      name: asText(renter.name),
      email: asText(renter.email),
    } : null,
    owner: owner ? {
      _id: owner._id.toString(),
      name: asText(owner.name),
      email: asText(owner.email),
    } : null,
  };
};

const transactionMatchesSearch = (transaction, rawSearch) => {
  const search = asText(rawSearch).toLowerCase();
  if (!search) return true;
  return [
    transaction._id,
    transaction.paymongoReference,
    transaction.paymongoCheckoutId,
    transaction.paymentIntentId,
    transaction.vehicle?.name,
    transaction.vehicle?.location,
    transaction.renter?.name,
    transaction.renter?.email,
    transaction.owner?.name,
    transaction.owner?.email,
  ].some((value) => String(value || "").toLowerCase().includes(search));
};

const parseTransactionOffset = (cursor) => {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), "base64url").toString("utf8"));
    return Number.isInteger(parsed?.offset) && parsed.offset >= 0 ? parsed.offset : 0;
  } catch {
    return 0;
  }
};

const transactionCursor = (offset) => Buffer.from(JSON.stringify({ offset })).toString("base64url");

const validObjectId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const getCustomerManagementTarget = async (database, id, adminEmail) => {
  if (!validObjectId(id)) {
    return { error: { status: 400, message: "Invalid customer ID." } };
  }

  const objectId = new mongoose.Types.ObjectId(id);
  const customer = await database.collection("users").findOne(
    { _id: objectId },
    { projection: { name: 1, email: 1, phone: 1, role: 1, isVerified: 1, isDisabled: 1, isArchived: 1, disabledAt: 1, sessionVersion: 1, kycStatus: 1, createdAt: 1 } },
  );
  if (!customer) return { error: { status: 404, message: "Customer account not found." } };
  if (customer.isArchived) return { error: { status: 410, message: "This customer account has already been archived." } };

  const protectedAdmin = customer.role === "admin" || asText(customer.email).toLowerCase() === asText(adminEmail).toLowerCase();
  if (protectedAdmin) {
    return { error: { status: 403, message: "The administrator account cannot be changed from customer management." } };
  }

  return { customer, objectId };
};

const verifyCriticalAction = async (request, { requireReason = false } = {}) => {
  const adminPassword = String(request.body?.adminPassword || "");
  const reason = asText(request.body?.reason);
  if (!adminPassword) return { error: { status: 400, message: "Enter your Super Admin password to continue.", code: "ADMIN_REAUTH_REQUIRED" } };
  if (requireReason && (reason.length < 10 || reason.length > 500)) {
    return { error: { status: 400, message: "Provide a clear reason between 10 and 500 characters.", code: "REASON_REQUIRED" } };
  }

  const account = await AdminCredential.findOne({ key: request.adminAccount?.key || "system-admin" }).select("+passwordHash");
  const validPassword = account && await bcrypt.compare(adminPassword, account.passwordHash);
  if (!validPassword) {
    await recordAdminAudit({
      request,
      admin: request.adminAccount,
      action: "admin.reauthentication.failed",
      outcome: "failure",
      reason,
      summary: "A critical admin action was blocked because password confirmation failed.",
    });
    return { error: { status: 403, message: "The Super Admin password is incorrect.", code: "ADMIN_REAUTH_FAILED" } };
  }
  return { account, reason };
};

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

export function createAdminDataRouter({ requireAdminSession }) {
  const router = express.Router();
  const websiteBackendDirectory = path.resolve(
    process.env.WEBSITE_BACKEND_DIR || path.join(process.cwd(), "..", "rentifypro", "backend"),
  );
  const kycDirectory = path.resolve(process.env.KYC_UPLOAD_DIR || path.join(websiteBackendDirectory, "private_uploads", "kyc"));
  const vehicleDirectory = path.resolve(websiteBackendDirectory, "uploads", "vehicles");

  router.use((_request, response, next) => {
    response.setHeader("X-RentifyPro-Admin-Contract", ADMIN_API_CONTRACT_VERSION);
    next();
  });
  router.use(requireAdminSession);

  router.get("/contract", (_request, response) => response.json({
    version: ADMIN_API_CONTRACT_VERSION,
    routes: ADMIN_API_ROUTES,
  }));

  router.get("/audit-logs", async (request, response, next) => {
    try {
      const parsedLimit = Number.parseInt(String(request.query.limit || ""), 10);
      const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
      const parsedOffset = Number.parseInt(String(request.query.offset || ""), 10);
      const offset = Number.isInteger(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
      const action = asText(request.query.action);
      const outcome = asText(request.query.outcome).toLowerCase();
      const search = asText(request.query.search).slice(0, 100);
      const filter = {};
      if (action && action !== "all") filter.action = action;
      if (["success", "failure"].includes(outcome)) filter.outcome = outcome;
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = ["summary", "targetLabel", "adminEmail", "reason"].map((field) => ({ [field]: { $regex: escaped, $options: "i" } }));
      }
      const [logs, total, actions] = await Promise.all([
        AdminAuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).lean(),
        AdminAuditLog.countDocuments(filter),
        AdminAuditLog.distinct("action"),
      ]);
      return response.json({
        logs: logs.map((log) => ({
          id: log._id.toString(),
          adminEmail: log.adminEmail,
          action: log.action,
          outcome: log.outcome,
          targetType: log.targetType,
          targetId: log.targetId,
          targetLabel: log.targetLabel,
          reason: log.reason,
          summary: log.summary,
          ip: log.ip,
          createdAt: asTimestamp(log.createdAt),
        })),
        actions: actions.sort(),
        page: { offset, limit, total, hasMore: offset + logs.length < total },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/transactions", async (request, response, next) => {
    try {
      const requestedStatus = asText(request.query.paymentStatus, "all").toLowerCase();
      if (requestedStatus !== "all" && !PAYMENT_STATUSES.has(requestedStatus)) {
        return response.status(400).json({ message: "Invalid payment status filter." });
      }

      const parsedLimit = Number.parseInt(String(request.query.limit || ""), 10);
      const limit = Number.isInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, MAX_TRANSACTION_LIMIT)
        : DEFAULT_TRANSACTION_LIMIT;
      const offset = parseTransactionOffset(request.query.cursor);
      const database = mongoose.connection.db;
      const bookings = await database.collection("bookings").find({}, {
        projection: {
          vehicle: 1, renter: 1, owner: 1, status: 1, paymentStatus: 1, paymentMethod: 1,
          paymentChannel: 1, balancePaymentMethod: 1, paymongoReference: 1,
          paymongoCheckoutId: 1, paymentIntentId: 1, totalAmount: 1, lateReturnPenaltyFee: 1,
          transactionFee: 1, paymentAmountPaid: 1, paymentAmountDue: 1, paymentRequestedAt: 1,
          paymentUpdatedAt: 1, paidAt: 1, createdAt: 1, updatedAt: 1,
        },
      }).sort({ createdAt: -1, _id: -1 }).toArray();

      const userIds = [...new Set(bookings.flatMap((booking) => [String(booking.renter || ""), String(booking.owner || "")]).filter(validObjectId))]
        .map((id) => new mongoose.Types.ObjectId(id));
      const vehicleIds = [...new Set(bookings.map((booking) => String(booking.vehicle || "")).filter(validObjectId))]
        .map((id) => new mongoose.Types.ObjectId(id));
      const [users, vehicles] = await Promise.all([
        database.collection("users").find({ _id: { $in: userIds } }, { projection: { name: 1, email: 1 } }).toArray(),
        database.collection("vehicles").find({ _id: { $in: vehicleIds } }, { projection: { name: 1, location: 1 } }).toArray(),
      ]);
      const usersById = new Map(users.map((user) => [user._id.toString(), user]));
      const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));
      const allTransactions = bookings.map((booking) => mapTransaction(booking, usersById, vehiclesById));
      const filteredTransactions = allTransactions.filter((transaction) =>
        (requestedStatus === "all" || transaction.paymentStatus === requestedStatus) &&
        transactionMatchesSearch(transaction, asText(request.query.search).slice(0, 100)),
      );
      const transactions = filteredTransactions.slice(offset, offset + limit);
      const nextOffset = offset + transactions.length;

      return response.json({
        success: true,
        transactions,
        summary: {
          totalRecords: allTransactions.length,
          paidBookings: allTransactions.filter((item) => item.paymentStatus === "paid").length,
          partialPayments: allTransactions.filter((item) => item.paymentStatus === "partial").length,
          unpaidBookings: allTransactions.filter((item) => item.paymentStatus === "unpaid").length,
          refundedBookings: allTransactions.filter((item) => item.paymentStatus === "refunded").length,
          totalCollected: roundCurrency(allTransactions.reduce((sum, item) => sum + item.paymentAmountPaid, 0)),
        },
        page: {
          hasMore: nextOffset < filteredTransactions.length,
          nextCursor: nextOffset < filteredTransactions.length ? transactionCursor(nextOffset) : null,
          limit,
        },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/customers/:id", async (request, response, next) => {
    try {
      const reauthentication = await verifyCriticalAction(request);
      if (reauthentication.error) return response.status(reauthentication.error.status).json({ message: reauthentication.error.message, code: reauthentication.error.code });
      const database = mongoose.connection.db;
      const target = await getCustomerManagementTarget(database, request.params.id, request.adminAccount?.email);
      if (target.error) return response.status(target.error.status).json({ message: target.error.message });

      const name = asText(request.body?.name);
      const email = asText(request.body?.email).toLowerCase();
      const phone = asText(request.body?.phone);
      const requestedRole = asText(request.body?.role).toLowerCase();
      const role = requestedRole === "renter" ? "user" : requestedRole === "operator" ? "owner" : requestedRole;

      if (name.length < 2 || name.length > 100) {
        return response.status(400).json({ message: "Name must be between 2 and 100 characters." });
      }
      if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return response.status(400).json({ message: "Enter a valid customer email address." });
      }
      if (email === asText(request.adminAccount?.email).toLowerCase()) {
        return response.status(409).json({ message: "The administrator email cannot be assigned to a customer account." });
      }
      if (phone && !PHONE_PATTERN.test(phone)) {
        return response.status(400).json({ message: "Enter a valid phone number using 7 to 32 digits and phone symbols." });
      }
      if (!CUSTOMER_ROLES.has(role)) {
        return response.status(400).json({ message: "Customer role must be Renter or Operator." });
      }

      if (target.customer.role === "owner" && role === "user") {
        const [ownedVehicles, ownedBookings] = await Promise.all([
          database.collection("vehicles").countDocuments({ owner: target.objectId }),
          database.collection("bookings").countDocuments({ owner: target.objectId }),
        ]);
        if (ownedVehicles > 0 || ownedBookings > 0) {
          return response.status(409).json({
            message: "This operator has linked vehicles or bookings and cannot be changed to a renter.",
          });
        }
      }

      const duplicateEmail = await database.collection("users").findOne({
        _id: { $ne: target.objectId },
        email,
      }, { projection: { _id: 1 } });
      if (duplicateEmail) return response.status(409).json({ message: "That email address is already in use." });

      const previousEmail = asText(target.customer.email).toLowerCase();
      if (email !== previousEmail) {
        const [documentConflict, faceConflict] = await Promise.all([
          database.collection("prekycdocuments").findOne({ email }, { projection: { _id: 1 } }),
          database.collection("prekycfaces").findOne({ email }, { projection: { _id: 1 } }),
        ]);
        if (documentConflict || faceConflict) {
          return response.status(409).json({ message: "That email already has verification records and cannot be assigned to this customer." });
        }
      }

      const update = {
        $set: { name, email, role, updatedAt: new Date() },
        ...(phone ? {} : { $unset: { phone: "" } }),
      };
      if (phone) update.$set.phone = phone;

      const result = await database.collection("users").findOneAndUpdate(
        { _id: target.objectId },
        update,
        { returnDocument: "after" },
      );
      const updatedCustomer = result?.value ?? result;
      if (email !== previousEmail) {
        await Promise.all([
          database.collection("prekycdocuments").updateMany({ email: previousEmail }, { $set: { email } }),
          database.collection("prekycfaces").updateMany({ email: previousEmail }, { $set: { email } }),
          database.collection("otps").updateMany({ email: previousEmail }, { $set: { email } }),
        ]);
      }
      const changedFields = [
        name !== asText(target.customer.name) ? "name" : "",
        email !== previousEmail ? "email" : "",
        phone !== asText(target.customer.phone) ? "phone" : "",
        role !== target.customer.role ? "role" : "",
      ].filter(Boolean);
      await recordAdminAudit({
        request,
        admin: request.adminAccount,
        action: "customer.updated",
        targetType: "customer",
        targetId: target.objectId.toString(),
        targetLabel: name,
        summary: `Updated customer account ${name}.`,
        metadata: { changedFields },
      });
      return response.json({ message: "Customer account updated.", customer: mapUser(updatedCustomer) });
    } catch (error) {
      if (error?.code === 11000) return response.status(409).json({ message: "That email address is already in use." });
      return next(error);
    }
  });

  router.patch("/customers/:id/status", async (request, response, next) => {
    try {
      if (typeof request.body?.disabled !== "boolean") {
        return response.status(400).json({ message: "The disabled field must be true or false." });
      }
      const reauthentication = await verifyCriticalAction(request, { requireReason: true });
      if (reauthentication.error) return response.status(reauthentication.error.status).json({ message: reauthentication.error.message, code: reauthentication.error.code });

      const database = mongoose.connection.db;
      const target = await getCustomerManagementTarget(database, request.params.id, request.adminAccount?.email);
      if (target.error) return response.status(target.error.status).json({ message: target.error.message });

      const disabled = request.body.disabled;
      const now = new Date();
      const update = disabled
        ? {
            $set: {
              isDisabled: true,
              disabledAt: now,
              disabledBy: asText(request.adminAccount?.email, "system-admin"),
              disabledReason: reauthentication.reason,
              updatedAt: now,
            },
            $inc: { sessionVersion: 1 },
          }
        : {
            $set: { isDisabled: false, updatedAt: now },
            $unset: { disabledAt: "", disabledBy: "", disabledReason: "" },
          };
      const result = await database.collection("users").findOneAndUpdate(
        { _id: target.objectId },
        update,
        { returnDocument: "after" },
      );
      const updatedCustomer = result?.value ?? result;
      await recordAdminAudit({
        request,
        admin: request.adminAccount,
        action: disabled ? "customer.disabled" : "customer.enabled",
        targetType: "customer",
        targetId: target.objectId.toString(),
        targetLabel: asText(target.customer.name),
        reason: reauthentication.reason,
        summary: `${disabled ? "Disabled" : "Enabled"} customer account ${asText(target.customer.name)}.`,
      });
      return response.json({
        message: disabled ? "Customer account disabled." : "Customer account enabled.",
        customer: mapUser(updatedCustomer),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.patch("/customers/:id/archive", async (request, response, next) => {
    try {
      const reauthentication = await verifyCriticalAction(request, { requireReason: true });
      if (reauthentication.error) return response.status(reauthentication.error.status).json({ message: reauthentication.error.message, code: reauthentication.error.code });
      const database = mongoose.connection.db;
      const target = await getCustomerManagementTarget(database, request.params.id, request.adminAccount?.email);
      if (target.error) return response.status(target.error.status).json({ message: target.error.message });

      const [activeBookingCount, vehicleCount] = await Promise.all([
        database.collection("bookings").countDocuments({
          $or: [{ renter: target.objectId }, { owner: target.objectId }],
          status: { $in: ["pending", "confirmed", "extended"] },
        }),
        database.collection("vehicles").countDocuments({ owner: target.objectId }),
      ]);
      if (activeBookingCount > 0) {
        return response.status(409).json({
          message: "This account has active bookings. Complete or cancel them before archiving the customer.",
          dependencies: { activeBookings: activeBookingCount, vehicles: vehicleCount },
        });
      }

      const email = asText(target.customer.email).toLowerCase();
      const verificationDocuments = await database.collection("prekycdocuments").find(
        { email },
        { projection: { fileKey: 1 } },
      ).toArray();
      const now = new Date();
      const archivedEmail = `archived+${target.objectId.toString()}@rentifypro.invalid`;
      const archivedPasswordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      const archival = await database.collection("users").updateOne(
        { _id: target.objectId, isArchived: { $ne: true } },
        {
          $set: {
            name: "Archived Customer",
            email: archivedEmail,
            password: archivedPasswordHash,
            isArchived: true,
            archivedAt: now,
            archivedBy: asText(request.adminAccount?.email, "system-admin"),
            archiveReason: reauthentication.reason,
            isVerified: false,
            kycStatus: "not_started",
            isDisabled: true,
            disabledAt: now,
            disabledBy: asText(request.adminAccount?.email, "system-admin"),
            disabledReason: "Account archived by the Super Admin.",
            updatedAt: now,
          },
          $unset: {
            phone: "", avatar: "", profilePicture: "", address: "", dateOfBirth: "", gender: "",
            ownerType: "", businessName: "", licenseNumber: "", permitNumber: "", region: "", province: "",
            city: "", barangay: "", emergencyContactName: "", emergencyContactPhone: "",
            emergencyContactRelationship: "", notificationSettings: "",
          },
          $inc: { sessionVersion: 1 },
        },
      );
      if (archival.modifiedCount !== 1) return response.status(409).json({ message: "The customer account changed before it could be archived. Refresh and try again." });

      await Promise.all([
        database.collection("prekycdocuments").deleteMany({ email }),
        database.collection("prekycfaces").deleteMany({ email }),
        database.collection("kyc_cases").deleteMany({ user: target.objectId }),
        database.collection("otps").deleteMany({ email }),
        database.collection("notifications").deleteMany({ user: target.objectId }),
        database.collection("loginactivities").deleteMany({ user: target.objectId }),
        database.collection("vehicles").updateMany({ owner: target.objectId }, { $set: { availabilityStatus: "unavailable", updatedAt: now } }),
      ]);

      await Promise.allSettled(
        verificationDocuments.map((document) => {
          const filePath = safeFileFromKey(kycDirectory, document.fileKey, DOCUMENT_EXTENSIONS);
          return filePath ? unlink(filePath) : Promise.resolve();
        }),
      );

      await recordAdminAudit({
        request,
        admin: request.adminAccount,
        action: "customer.archived",
        targetType: "customer",
        targetId: target.objectId.toString(),
        targetLabel: asText(target.customer.name),
        reason: reauthentication.reason,
        summary: `Archived and anonymized customer account ${asText(target.customer.name)}.`,
        metadata: { activeBookings: activeBookingCount, linkedVehicles: vehicleCount },
      });
      return response.json({ message: "Customer account archived and personal data anonymized.", archivedCustomerId: request.params.id });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/data", async (_request, response, next) => {
    try {
      const database = mongoose.connection.db;
      const [users, vehicles, documents, bookings, failedAdminLogins] = await Promise.all([
        database.collection("users").find({}, {
          projection: { name: 1, email: 1, phone: 1, role: 1, isVerified: 1, isDisabled: 1, isArchived: 1, disabledAt: 1, disabledReason: 1, kycStatus: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        database.collection("vehicles").find({}, {
          projection: { owner: 1, name: 1, dailyRentalRate: 1, pricingUnit: 1, location: 1, availabilityStatus: 1, images: 1, imageUrl: 1, driverOptionEnabled: 1, specs: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        database.collection("prekycdocuments").find({}, {
          projection: { email: 1, role: 1, docType: 1, status: 1, docCategory: 1, selectedDocCategory: 1, confidence: 1, reason: 1, fileName: 1, fileKey: 1, mimeType: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        database.collection("bookings").find({}, {
          projection: { vehicle: 1, renter: 1, owner: 1, pickupAt: 1, returnAt: 1, status: 1, paymentStatus: 1, paymentAmountDue: 1, driverSelected: 1, reviewRating: 1, reviewComment: 1, reviewCreatedAt: 1, createdAt: 1 },
        }).sort({ createdAt: -1 }).toArray(),
        AdminAuditLog.countDocuments({
          action: { $in: ["admin.login.failed", "admin.mfa.failed", "admin.reauthentication.failed"] },
          outcome: "failure",
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        }),
      ]);

      const usersByEmail = new Map(users.map((user) => [asText(user.email).toLowerCase(), user]));
      const usersById = new Map(users.map((user) => [user._id.toString(), user]));
      const vehiclesById = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle]));
      const ownerNames = new Map(users.map((user) => [user._id.toString(), asText(user.name, "Unknown operator")]));

      const mappedCustomers = users.filter((user) => !user.isArchived).map(mapUser);
      const mappedVehicles = vehicles.map((vehicle) => mapVehicle(vehicle, ownerNames));
      const mappedDocuments = documents.map((document) => mapDocument(document, usersByEmail));
      const mappedBookings = bookings.map((booking) => mapBooking(booking, usersById, vehiclesById));
      const overdueCount = mappedBookings.filter((booking) => booking.isOverdue).length;
      const pendingDocumentCount = mappedDocuments.filter((document) => document.approval === "Pending").length;
      const suspendedCustomerCount = mappedCustomers.filter((customer) => customer.disabled).length;
      const outstandingPaymentCount = mappedBookings.filter((booking) => booking.paymentAmountDue > 0 && !["Cancelled", "Rejected"].includes(booking.status)).length;
      const unavailableVehicleCount = mappedVehicles.filter((vehicle) => vehicle.status !== "Available").length;
      const operationalAlerts = [
        overdueCount ? { id: "overdue-returns", severity: "critical", title: "Overdue vehicle returns", description: "Bookings have passed their scheduled return time.", count: overdueCount, view: "bookings", context: { status: "Overdue" } } : null,
        pendingDocumentCount ? { id: "pending-documents", severity: "warning", title: "Documents awaiting review", description: "Identity or permit documents need a Super Admin decision.", count: pendingDocumentCount, view: "documents", context: { status: "Pending Review" } } : null,
        outstandingPaymentCount ? { id: "outstanding-payments", severity: "warning", title: "Outstanding booking balances", description: "Bookings have an unpaid or partially paid balance.", count: outstandingPaymentCount, view: "transactions", context: { paymentStatus: "unpaid" } } : null,
        failedAdminLogins ? { id: "failed-admin-access", severity: "critical", title: "Failed admin security checks", description: "Login, MFA, or password confirmations failed in the last 24 hours.", count: failedAdminLogins, view: "audit", context: { outcome: "failure" } } : null,
        suspendedCustomerCount ? { id: "suspended-customers", severity: "info", title: "Suspended customer accounts", description: "Accounts remain blocked from RentifyPro access.", count: suspendedCustomerCount, view: "customers", context: { status: "Suspended" } } : null,
        unavailableVehicleCount ? { id: "unavailable-vehicles", severity: "info", title: "Unavailable vehicles", description: "Fleet units are currently unavailable for rental.", count: unavailableVehicleCount, view: "vehicles", context: {} } : null,
      ].filter(Boolean);

      return response.json({
        customers: mappedCustomers,
        vehicles: mappedVehicles,
        documents: mappedDocuments,
        bookings: mappedBookings,
        operationalAlerts,
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
      await recordAdminAudit({
        request,
        admin: request.adminAccount,
        action: approval === "Approved" ? "document.approved" : "document.rejected",
        targetType: "document",
        targetId: request.params.id,
        targetLabel: asText(updatedDocument.fileName, asText(updatedDocument.email)),
        summary: `${approval} verification document for ${asText(updatedDocument.email)}.`,
      });
      return response.json({ document: mapDocument(updatedDocument, usersByEmail) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
