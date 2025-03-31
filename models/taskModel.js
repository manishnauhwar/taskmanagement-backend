const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true,
      default: () => require('crypto').randomBytes(8).toString('hex')
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      required: false,
      enum: ["To Do", "In progress", "Completed"],
      default: "To Do"
    },
    priority: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High"]
    },
    dueDate: {
      type: Date,
      required: true
    },
    assignedTo: {
      type: String,
      required: false,
      default: ""
    },
    completionTime: {
      type: String
    },

  },
  {
    versionKey: false,
    timestamps: true
  }
);
module.exports = mongoose.model("Task", taskSchema);
