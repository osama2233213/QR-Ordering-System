const User = require("../models/User");

/**
 * Ensures at least one DevGate Super Admin account exists in the system.
 */
const seedDevGateAdmin = async () => {
  try {
    const devGateAdmin = await User.findOne({ role: "devgate_admin" });

    if (!devGateAdmin) {
      console.log("[DevGate Seed] No super-admin found. Seeding default DevGate Admin...");
      await User.create({
        name: "DevGate Super Admin",
        email: "superadmin@devgate.internal",
        passwordHash: "Admin@123456",
        role: "devgate_admin",
        restaurantId: null,
        isActive: true,
      });
      console.log("[DevGate Seed] Created superadmin@devgate.internal / Admin@123456");
    }
  } catch (error) {
    console.error("[DevGate Seed] Failed to seed default super-admin:", error.message);
  }
};

module.exports = seedDevGateAdmin;
