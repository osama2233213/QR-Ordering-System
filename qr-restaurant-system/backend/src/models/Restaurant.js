const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    logoUrl: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "suspended"],
      default: "pending",
    },

    isActive: {
      type: Boolean,
      default: false,
    },

    settings: {
      currency: {
        type: String,
        default: "PKR",
      },

      taxRate: {
        type: Number,
        default: 0,
      },

      openingHours: {
        type: String,
        default: "11:00 AM - 11:00 PM",
      },
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Restaurant", restaurantSchema);
