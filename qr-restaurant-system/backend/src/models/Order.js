const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MenuItem",
      required: true,
    },

    nameSnapshot: {
      type: String,
      required: true,
    },

    priceSnapshot: {
      type: Number,
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },

    guestSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GuestSession",
      required: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
    },

    status: {
      type: String,
      enum: ["Placed", "Received", "Preparing", "Ready", "Served", "Cancelled"],
      default: "Placed",
    },

    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid"],
      default: "unpaid",
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({
  restaurantId: 1,
  status: 1,
  createdAt: -1,
});

orderSchema.index({
  guestSessionId: 1,
});

module.exports = mongoose.model("Order", orderSchema);
