import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    showThumbnails: {
      type: Boolean,
      default: true,
    },
    cacheMode: {
      type: String,
      enum: ["memory", "file"],
      default: "memory",
    },
    showOnlyUnread: {
      type: Boolean,
      default: false,
      required: false,
    },
    debug: {
      type: Boolean,
      default: false,
      required: false,
    },
  },
  {
    timestamps: true,
    strict: true,
    toObject: {
      transform: function (doc, ret) {
        // Force la conversion en booléen
        ret.showOnlyUnread = Boolean(ret.showOnlyUnread);
        ret.debug = Boolean(ret.debug);
        return ret;
      },
    },
  }
);

// Middleware pour s'assurer que les booléens sont toujours des booléens
preferencesSchema.pre("save", function (next) {
  if (this.showOnlyUnread === undefined) {
    this.showOnlyUnread = false;
  }
  if (this.debug === undefined) {
    this.debug = false;
  }
  this.showOnlyUnread = Boolean(this.showOnlyUnread);
  this.debug = Boolean(this.debug);
  next();
});

preferencesSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as mongoose.UpdateQuery<any>;
  if (update && "$set" in update && update.$set && typeof update.$set === "object") {
    if ("showOnlyUnread" in update.$set) {
      update.$set.showOnlyUnread = Boolean(update.$set.showOnlyUnread);
    }
    if ("debug" in update.$set) {
      update.$set.debug = Boolean(update.$set.debug);
    }
  }
  next();
});

export const PreferencesModel =
  mongoose.models.Preferences || mongoose.model("Preferences", preferencesSchema);
