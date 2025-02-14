import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    roles: {
      type: [String],
      default: ["ROLE_USER"],
    },
    authenticated: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware pour mettre à jour le champ updatedAt avant la sauvegarde
userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export const UserModel = mongoose.models.User || mongoose.model("User", userSchema);
