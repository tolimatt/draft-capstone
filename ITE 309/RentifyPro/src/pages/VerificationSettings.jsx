import React, { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle, Clock, AlertCircle } from "lucide-react";

const VerificationSettings = ({ user }) => {
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (!user?.email) return;

    const users = JSON.parse(localStorage.getItem("users")) || [];
    const currentUser = users.find(u => u.email === user.email);

    setVerification(
      currentUser?.verification || {
        status: "not_submitted",
        idType: null,
      }
    );
  }, [user]);

  if (!verification) return null;

  return (
    <div className="flex justify-center">
      <div className="bg-white rounded-xl shadow p-6 max-w-2xl w-full">

        {/* HEADER */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-[#E6F2FF] flex items-center justify-center">
            <ShieldCheck className="text-[#017FE6]" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Account Verification</h3>
            <p className="text-sm text-gray-500">
              View your identity verification status
            </p>
          </div>
        </div>

        {/* NOT SUBMITTED */}
        {verification.status === "not_submitted" && (
          <div className="flex gap-3 bg-red-50 text-red-600 px-4 py-3 rounded-lg">
            <AlertCircle size={20} />
            <div>
              <p className="font-semibold">Not Submitted</p>
              <p className="text-sm">
                No government ID was submitted during registration.
              </p>
            </div>
          </div>
        )}

        {/* PENDING */}
        {verification.status === "pending" && (
          <div className="flex gap-3 bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg">
            <Clock size={20} />
            <div>
              <p className="font-semibold">Pending Verification</p>
              <p className="text-sm">
                Submitted ID: <strong>{verification.idType}</strong>
              </p>
              <p className="text-sm">
                Your document is currently under review.
              </p>
            </div>
          </div>
        )}

        {/* VERIFIED */}
        {verification.status === "verified" && (
          <div className="flex gap-3 bg-green-50 text-green-700 px-4 py-3 rounded-lg">
            <CheckCircle size={20} />
            <div>
              <p className="font-semibold">Verified</p>
              <p className="text-sm">
                Verified using <strong>{verification.idType}</strong>
              </p>
              <p className="text-sm">
                Your account is fully verified and eligible for rentals.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VerificationSettings;