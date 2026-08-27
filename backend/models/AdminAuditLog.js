import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    adminKey: { type: String, required: true, default: "system-admin", index: true },
    adminEmail: { type: String, required: true, lowercase: true, trim: true },
    action: { type: String, required: true, trim: true, index: true },
    outcome: { type: String, enum: ["success", "failure"], default: "success", index: true },
    targetType: { type: String, default: "", trim: true },
    targetId: { type: String, default: "", trim: true },
    targetLabel: { type: String, default: "", trim: true },
    reason: { type: String, default: "", trim: true },
    summary: { type: String, required: true, trim: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "", trim: true },
    userAgent: { type: String, default: "", trim: true },
  },
  { timestamps: true },
);

adminAuditLogSchema.index({ createdAt: -1, _id: -1 });
adminAuditLogSchema.index({ action: 1, createdAt: -1 });

export default mongoose.model("AdminAuditLog", adminAuditLogSchema);
