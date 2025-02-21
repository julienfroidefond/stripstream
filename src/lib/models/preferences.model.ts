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
  },
  {
    timestamps: true,
    strict: true,
    toObject: {
      transform: function (doc, ret) {
        // Assurez-vous que showOnlyUnread est toujours un booléen
        ret.showOnlyUnread = ret.showOnlyUnread === true;
        return ret;
      },
    },
  }
);

// Middleware pour s'assurer que showOnlyUnread est toujours un booléen
preferencesSchema.pre("save", function (next) {
  if (this.showOnlyUnread === undefined) {
    this.showOnlyUnread = false;
  }
  this.showOnlyUnread = this.showOnlyUnread === true;
  next();
});

preferencesSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as mongoose.UpdateQuery<any>;
  if (
    update &&
    "$set" in update &&
    update.$set &&
    typeof update.$set === "object" &&
    "showOnlyUnread" in update.$set
  ) {
    update.$set.showOnlyUnread = update.$set.showOnlyUnread === true;
  }
  next();
});

export const PreferencesModel =
  mongoose.models.Preferences || mongoose.model("Preferences", preferencesSchema);
