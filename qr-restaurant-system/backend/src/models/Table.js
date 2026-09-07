const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    tableNumber: {
      type: String,
      required: true,
      trim: true,
    },

    qrCodeUrl: {
      type: String,
      default: "",
    },

    capacity: {
      type: Number,
      default: 4,
    },

    status: {
      type: String,
      enum: ["available", "occupied", "reserved"],
      default: "available",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

tableSchema.index(
  {
    restaurantId: 1,
    tableNumber: 1,
  },
  {
    unique: true,
  },
);

tableSchema.index({
  restaurantId: 1,
  isActive: 1,
  status: 1,
});

module.exports = mongoose.model("Table", tableSchema);
