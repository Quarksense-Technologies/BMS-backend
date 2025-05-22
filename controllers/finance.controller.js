import { Transaction } from '../models/Transaction.model.js';
import { Project } from '../models/Project.model.js';

// @desc    Get all transactions
// @route   GET /api/finances
// @access  Private
export const getTransactions = async (req, res) => {
  try {
    const {
      project,
      company,
      type,
      status,
      category,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = req.query;

    let query = {};

    // Filter by project if provided
    if (project) {
      query.project = project;
    }

    // Filter by company if provided
    if (company) {
      query.company = company;
    }

    // Filter by type if provided
    if (type) {
      query.type = type;
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    // Filter by amount range if provided
    if (minAmount || maxAmount) {
      query.amount = {};
      if (minAmount) {
        query.amount.$gte = Number(minAmount);
      }
      if (maxAmount) {
        query.amount.$lte = Number(maxAmount);
      }
    }

    // Apply role-based filtering
    if (req.user.role !== 'admin') {
      // For managers, show transactions of projects they manage
      if (req.user.role === 'manager') {
        // Find projects where this user is a manager
        const managedProjects = await Project.find({
          $or: [
            { createdBy: req.user._id },
            { managers: { $in: [req.user._id] } },
          ],
        }).select('_id');

        const managedProjectIds = managedProjects.map((project) => project._id);

        // Show transactions for managed projects or created by the user
        query = {
          ...query,
          $or: [
            { project: { $in: managedProjectIds } },
            { createdBy: req.user._id },
          ],
        };
      } else {
        // For regular users, only show transactions they created
        query = {
          ...query,
          createdBy: req.user._id,
        };
      }
    }

    const transactions = await Transaction.find(query)
      .populate('project', 'name')
      .populate('company', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ date: -1 });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/finances/:id
// @access  Private
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('project', 'name')
      .populate('company', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user has permission to view this transaction
    if (
      req.user.role === 'user' &&
      transaction.createdBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Not authorized to access this transaction',
      });
    }

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a transaction
// @route   POST /api/finances
// @access  Private
export const createTransaction = async (req, res) => {
  try {
    const {
      type,
      amount,
      description,
      date,
      category,
      project,
      attachments,
      notes,
    } = req.body;

    // Check if project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Get company from project
    const company = projectExists.company;

    // Set initial status based on role
    let status = 'pending';
    if (req.user.role === 'admin') {
      status = 'approved';
    }

    const transaction = await Transaction.create({
      type,
      amount,
      description,
      date: date || Date.now(),
      category,
      project,
      company,
      status,
      attachments: attachments || [],
      notes,
      createdBy: req.user._id,
      approvedBy: req.user.role === 'admin' ? req.user._id : null,
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update transaction
// @route   PUT /api/finances/:id
// @access  Private
export const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if user has permission to update this transaction
    if (
      req.user.role === 'user' &&
      transaction.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this transaction',
      });
    }

    // Don't allow updating if already approved/rejected
    if (['approved', 'rejected'].includes(transaction.status) && req.user.role !== 'admin') {
      return res.status(400).json({
        message: 'Cannot update transaction that has been approved or rejected',
      });
    }

    const {
      type,
      amount,
      description,
      date,
      category,
      attachments,
      notes,
    } = req.body;

    transaction.type = type || transaction.type;
    transaction.amount = amount || transaction.amount;
    transaction.description = description || transaction.description;
    transaction.date = date || transaction.date;
    transaction.category = category || transaction.category;
    transaction.attachments = attachments || transaction.attachments;
    transaction.notes = notes || transaction.notes;

    // Reset to pending if edited (unless admin)
    if (req.user.role !== 'admin') {
      transaction.status = 'pending';
      transaction.approvedBy = null;
    }

    const updatedTransaction = await transaction.save();

    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/finances/:id
// @access  Private/Admin
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await transaction.deleteOne();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve transaction
// @route   PUT /api/finances/:id/approve
// @access  Private/Admin/Manager
export const approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        message: `Transaction is already ${transaction.status}`,
      });
    }

    transaction.status = 'approved';
    transaction.approvedBy = req.user._id;

    const updatedTransaction = await transaction.save();

    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject transaction
// @route   PUT /api/finances/:id/reject
// @access  Private/Admin/Manager
export const rejectTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({
        message: `Transaction is already ${transaction.status}`,
      });
    }

    const { reason } = req.body;

    transaction.status = 'rejected';
    transaction.approvedBy = req.user._id;
    transaction.notes = transaction.notes
      ? `${transaction.notes}\nRejection reason: ${reason}`
      : `Rejection reason: ${reason}`;

    const updatedTransaction = await transaction.save();

    res.json(updatedTransaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get financial summary
// @route   GET /api/finances/summary
// @access  Private
export const getFinancialSummary = async (req, res) => {
  try {
    const { company, project, startDate, endDate } = req.query;

    let matchStage = {};

    // Apply company filter if provided
    if (company) {
      matchStage.company = mongoose.Types.ObjectId(company);
    }

    // Apply project filter if provided
    if (project) {
      matchStage.project = mongoose.Types.ObjectId(project);
    }

    // Apply date range filter if provided
    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) {
        matchStage.date.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.date.$lte = new Date(endDate);
      }
    }

    // Apply role-based access control
    if (req.user.role !== 'admin') {
      if (req.user.role === 'manager') {
        // Find projects where this user is a manager
        const managedProjects = await Project.find({
          $or: [
            { createdBy: req.user._id },
            { managers: { $in: [req.user._id] } },
          ],
        }).select('_id');

        const managedProjectIds = managedProjects.map((project) => project._id);

        // Show transactions for managed projects or created by the user
        matchStage.$or = [
          { project: { $in: managedProjectIds } },
          { createdBy: req.user._id },
        ];
      } else {
        // For regular users, only show transactions they created
        matchStage.createdBy = req.user._id;
      }
    }

    // Only include approved transactions
    matchStage.status = 'approved';

    // Get summary by type
    const typeSummary = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get summary by category
    const categorySummary = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Get monthly summary for the last 12 months
    const monthlySummary = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]);

    // Count transactions by status
    const statusCount = await Transaction.aggregate([
      { 
        $match: req.user.role === 'user' 
          ? { createdBy: req.user._id } 
          : {} 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate overall totals
    const totals = typeSummary.reduce(
      (acc, item) => {
        if (item._id === 'expense') {
          acc.totalExpenses = item.total;
        } else if (item._id === 'payment' || item._id === 'income') {
          acc.totalIncome += item.total;
        }
        return acc;
      },
      { totalIncome: 0, totalExpenses: 0 }
    );

    const balance = totals.totalIncome - totals.totalExpenses;

    res.json({
      summary: {
        byType: typeSummary,
        byCategory: categorySummary,
        monthly: monthlySummary,
        byStatus: statusCount,
      },
      totals: {
        income: totals.totalIncome,
        expenses: totals.totalExpenses,
        balance,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export transactions
// @route   GET /api/finances/export
// @access  Private
export const exportTransactions = async (req, res) => {
  try {
    const {
      project,
      company,
      type,
      status,
      category,
      startDate,
      endDate,
      format = 'json',
    } = req.query;

    let query = {};

    // Apply filters
    if (project) query.project = project;
    if (company) query.company = company;
    if (type) query.type = type;
    if (status) query.status = status;
    if (category) query.category = category;

    // Apply date range filter
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Apply role-based access control
    if (req.user.role !== 'admin') {
      if (req.user.role === 'manager') {
        // Find projects where this user is a manager
        const managedProjects = await Project.find({
          $or: [
            { createdBy: req.user._id },
            { managers: { $in: [req.user._id] } },
          ],
        }).select('_id');

        const managedProjectIds = managedProjects.map((project) => project._id);

        // Show transactions for managed projects or created by the user
        query.$or = [
          { project: { $in: managedProjectIds } },
          { createdBy: req.user._id },
        ];
      } else {
        // For regular users, only show transactions they created
        query.createdBy = req.user._id;
      }
    }

    // Get transactions with populated references
    const transactions = await Transaction.find(query)
      .populate('project', 'name')
      .populate('company', 'name')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ date: -1 });

    // Prepare data for export
    const exportData = transactions.map((transaction) => ({
      id: transaction._id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      date: transaction.date,
      category: transaction.category,
      project: transaction.project ? transaction.project.name : 'Unknown Project',
      company: transaction.company ? transaction.company.name : 'Unknown Company',
      status: transaction.status,
      createdBy: transaction.createdBy
        ? `${transaction.createdBy.name} (${transaction.createdBy.email})`
        : 'Unknown User',
      approvedBy: transaction.approvedBy
        ? `${transaction.approvedBy.name} (${transaction.approvedBy.email})`
        : 'Not Approved',
      notes: transaction.notes,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    }));

    // Return data in requested format
    if (format === 'csv') {
      // Simplified CSV conversion
      const fields = Object.keys(exportData[0] || {});
      const csv = [
        fields.join(','),
        ...exportData.map((item) =>
          fields
            .map((field) => {
              const value = item[field];
              // Handle fields that might contain commas by quoting
              if (typeof value === 'string' && value.includes(',')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',')
        ),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=transactions.csv'
      );
      res.send(csv);
    } else {
      // Default to JSON format
      res.json(exportData);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};