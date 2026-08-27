import mongoose from "mongoose";

const adminMfaChallengeSchema = new mongoose.Schema(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    otpHash: { type: String, required: true, select: false },
    rememberMe: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    requestedIp: { type: String, default: "" },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

adminMfaChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("AdminMfaChallenge", adminMfaChallengeSchema);
