const mongoose = require("mongoose");

const platformAuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    actorEmail: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "TENANT_APPROVED",
        "TENANT_SUSPENDED",
        "TENANT_REACTIVATED",
        "TENANT_CREATED",
        "ACCESS_RESET",
      ],
      required: true,
    },
    targetRestaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },
    targetRestaurantName: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

platformAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("PlatformAuditLog", platformAuditLogSchema);
