const mongoose = require("mongoose");

const taskStatisticSchema = new mongoose.Schema(
  {

    externalId: {
      type: String,
      required: true
    },
    year: {
      type: Number,
      required: true
    },
    totalTasks: {
      type: Number,
      required: true
    },
    completedTasks: {
      type: Number,
      required: true
    }
  },
  {
    versionKey: false,
    timestamps: true
  }
);

module.exports = mongoose.model("TaskStatistic", taskStatisticSchema);
