const mongoose = require("mongoose");


const memberSchema = new mongoose.Schema(
  {

    externalId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true

    },
    email: {
      type: String,
      required: true

    }
  },
  { _id: false }
);

const managerSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true
    }
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    members: [memberSchema],
    manager: {
      type: managerSchema,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Team", teamSchema);
