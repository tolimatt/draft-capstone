import mongoose from "mongoose";

const adminSessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    adminKey: { type: String, required: true, default: "system-admin", index: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    ip: { type: String, default: "", trim: true },
    userAgent: { type: String, default: "", trim: true },
    rememberMe: { type: Boolean, default: false },
    lastSeenAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
adminSessionSchema.index({ adminKey: 1, revokedAt: 1, lastSeenAt: -1 });

export default mongoose.model("AdminSession", adminSessionSchema);
