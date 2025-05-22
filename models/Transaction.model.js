import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['expense', 'payment', 'income'],
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Please add an amount'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    category: {
      type: String,
      enum: [
        'salary',
        'equipment',
        'software',
        'consulting',
        'office',
        'travel',
        'marketing',
        'utilities',
        'taxes',
        'other',
      ],
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    attachments: [
      {
        name: String,
        url: String,
      },
    ],
    notes: String,
  },
  {
    timestamps: true,
  }
);

export const Transaction = mongoose.model('Transaction', transactionSchema);