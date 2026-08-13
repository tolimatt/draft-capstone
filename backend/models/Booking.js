import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
      index: true,
    },
    renter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    pickupAt: {
      type: Date,
      required: true,
    },
    returnAt: {
      type: Date,
      required: true,
    },
    vehicleDailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    rentalRateUnit: {
      type: String,
      enum: ["hourly", "daily"],
      default: "hourly",
    },
    driverSelected: {
      type: Boolean,
      default: false,
    },
    driverDailyRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    bookingDays: {
      type: Number,
      required: true,
      min: 1,
    },
    bookingDurationMinutes: {
      type: Number,
      min: 1,
      default: null,
    },
    bookingDurationHours: {
      type: Number,
      min: 0,
      default: null,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    driverAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    lateReturnPenaltyRatePerHour: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateReturnPenaltyFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    blockchainGasFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "extended", "completed", "cancelled", "rejected"],
      default: "pending",
      index: true,
    },
    autoCompletedAt: {
      type: Date,
      default: null,
    },
    actualReturnAt: {
      type: Date,
      default: null,
    },
    lateReturnIsOverdue: {
      type: Boolean,
      default: false,
      index: true,
    },
    lateReturnDetectedAt: {
      type: Date,
      default: null,
    },
    lateReturnNotifiedAt: {
      type: Date,
      default: null,
    },
    lateReturnOverdueMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateReturnAction: {
      type: String,
      enum: ["none", "extend_requested", "proceed_late_return"],
      default: "none",
    },
    lateReturnResolvedAt: {
      type: Date,
      default: null,
    },
    lateReturnResolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    extensionStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected"],
      default: "none",
      index: true,
    },
    extensionRequestedAt: {
      type: Date,
      default: null,
    },
    extensionRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    extensionCurrentReturnAt: {
      type: Date,
      default: null,
    },
    extensionRequestedReturnAt: {
      type: Date,
      default: null,
    },
    extensionRequestNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    extensionReviewedAt: {
      type: Date,
      default: null,
    },
    extensionReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    extensionReviewAction: {
      type: String,
      enum: ["", "approve", "reject"],
      default: "",
    },
    extensionReviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    cancellationStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected"],
      default: "none",
      index: true,
    },
    cancellationRequestedAt: {
      type: Date,
      default: null,
    },
    cancellationRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationRequestNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    cancellationReviewedAt: {
      type: Date,
      default: null,
    },
    cancellationReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    cancellationReviewAction: {
      type: String,
      enum: ["", "approve", "reject"],
      default: "",
    },
    cancellationReviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    paymentStatus: {
      type: String,
      enum: ["unpaid", "partial", "paid", "refunded"],
      default: "unpaid",
      index: true,
    },
    paymentAmountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentAmountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentCheckoutAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentScope: {
      type: String,
      enum: ["downpayment", "full"],
      default: null,
    },
    paymentChannel: {
      type: String,
      enum: ["ewallet", "card"],
      default: null,
    },
    paymentMethod: {
      type: String,
      trim: true,
      default: null,
    },
    balancePaymentMethod: {
      type: String,
      trim: true,
      default: null,
    },
    walkInPaymentStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "completed"],
      default: "none",
      index: true,
    },
    walkInRequestedAt: {
      type: Date,
      default: null,
    },
    walkInRequestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    walkInRequestNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    walkInReviewedAt: {
      type: Date,
      default: null,
    },
    walkInReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    walkInReviewNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    walkInConfirmedAt: {
      type: Date,
      default: null,
    },
    walkInConfirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    walkInConfirmationNote: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    paymongoReference: {
      type: String,
      trim: true,
      default: null,
      index: true,
      sparse: true,
    },
    paymongoCheckoutId: {
      type: String,
      trim: true,
      default: null,
      index: true,
      sparse: true,
    },
    paymongoVerifiedCheckoutIds: {
      type: [String],
      default: [],
    },
    paymentIntentId: {
      type: String,
      trim: true,
      default: null,
      index: true,
      sparse: true,
    },
    paymentRequestedAt: {
      type: Date,
      default: null,
    },
    paymentUpdatedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    reviewRating: {
      type: Number,
      min: 1,
      max: 5,
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: 1200,
    },
    reviewCreatedAt: {
      type: Date,
    },
    blockchainTxHash: {
      type: String,
      trim: true,
      default: null,
      index: true,
      sparse: true,
    },
    blockchainRecordedAt: {
      type: Date,
      default: null,
    },
    blockchain: {
      network: {
        type: String,
        trim: true,
        default: null,
      },
      chainId: {
        type: Number,
        default: null,
      },
      contractAddress: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
      version: {
        type: String,
        trim: true,
        default: null,
      },
      bookingKey: {
        type: String,
        trim: true,
        default: null,
      },
      bookingHash: {
        type: String,
        trim: true,
        default: null,
      },
      renterIdHash: {
        type: String,
        trim: true,
        default: null,
      },
      ownerId: {
        type: String,
        trim: true,
        default: null,
      },
      amountInCents: {
        type: Number,
        default: null,
      },
      paymentStatus: {
        type: String,
        trim: true,
        default: null,
      },
      paymentStatusCode: {
        type: Number,
        default: null,
      },
      blockNumber: {
        type: Number,
        default: null,
      },
    },
  },
  { timestamps: true }
);

bookingSchema.index({ vehicle: 1, pickupAt: 1, returnAt: 1 });
bookingSchema.index({ owner: 1, status: 1, createdAt: -1 });
bookingSchema.index({ renter: 1, createdAt: -1 });
// Tenant-scoped indexes for the paginated renter and owner booking work queues.
// Do not remove legacy indexes during application startup; validate their use in
// production with $indexStats before scheduling a separate migration.
bookingSchema.index({ renter: 1, status: 1, pickupAt: 1 });
bookingSchema.index({ renter: 1, status: 1, updatedAt: -1 });
bookingSchema.index({ owner: 1, status: 1, pickupAt: 1 });
bookingSchema.index({ owner: 1, status: 1, updatedAt: -1 });
bookingSchema.index({ owner: 1, updatedAt: -1 });
bookingSchema.index(
  { vehicle: 1, status: 1, reviewCreatedAt: -1 },
  { partialFilterExpression: { reviewRating: { $exists: true } } }
);

export default mongoose.model("Booking", bookingSchema);
