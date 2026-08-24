import {
  getPreKycTokenFromRequest,
  verifyPreKycSession,
} from "../utils/preKycSession.js";

export const requirePreKycSession = (req, res, next) => {
  try {
    const session = verifyPreKycSession(getPreKycTokenFromRequest(req), {
      email: req.body?.email,
      role: req.body?.role,
    });
    req.preKyc = session;
    req.body.email = session.email;
    req.body.role = session.role;
    next();
  } catch (error) {
    return res.status(Number(error?.status) || 401).json({
      success: false,
      message: error?.message || "Verification session is invalid.",
    });
  }
};
