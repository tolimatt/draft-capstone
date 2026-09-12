import mongoose from "mongoose";

const adminCredentialSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: "system-admin" },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    passkeyHash: { type: String, default: "", select: false },
    passkeyEnabledAt: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);

export default mongoose.model("AdminCredential", adminCredentialSchema);
