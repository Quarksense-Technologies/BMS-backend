import { Company } from '../models/Company.model.js';
import { Project } from '../models/Project.model.js';

// @desc    Get all companies
// @route   GET /api/companies
// @access  Private
export const getCompanies = async (req, res) => {
  try {
    let query = {};

    // If user is not admin, only show companies they're associated with
    if (req.user.role !== 'admin') {
      query = {
        $or: [
          { createdBy: req.user._id },
          { managers: { $in: [req.user._id] } },
        ],
      };
    }

    const companies = await Company.find(query)
      .populate('createdBy', 'name email')
      .populate('managers', 'name email');

    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get company by ID
// @route   GET /api/companies/:id
// @access  Private
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('managers', 'name email');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get associated projects
    const projects = await Project.find({ company: company._id })
      .populate('managers', 'name email')
      .populate('team', 'name email')
      .select('name description status startDate endDate budget');

    // Check if user has permission to view this company
    if (
      req.user.role !== 'admin' &&
      company.createdBy._id.toString() !== req.user._id.toString() &&
      !company.managers.some(
        (manager) => manager._id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message: 'Not authorized to access this company',
      });
    }

    // Add projects to company response
    const companyResponse = company.toObject();
    companyResponse.projects = projects;

    res.json(companyResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a company
// @route   POST /api/companies
// @access  Private/Admin/Manager
export const createCompany = async (req, res) => {
  try {
    const { name, description, logo, address, contactInfo, managers } = req.body;

    const company = await Company.create({
      name,
      description,
      logo,
      address,
      contactInfo,
      managers: managers || [],
      createdBy: req.user._id,
    });

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update company
// @route   PUT /api/companies/:id
// @access  Private/Admin/Manager
export const updateCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if user has permission to update this company
    if (
      req.user.role !== 'admin' &&
      company.createdBy.toString() !== req.user._id.toString() &&
      !company.managers.includes(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this company',
      });
    }

    const { name, description, logo, address, contactInfo, managers } = req.body;

    company.name = name || company.name;
    company.description = description || company.description;
    company.logo = logo || company.logo;
    company.address = address || company.address;
    company.contactInfo = contactInfo || company.contactInfo;
    company.managers = managers || company.managers;

    const updatedCompany = await company.save();

    res.json(updatedCompany);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete company
// @route   DELETE /api/companies/:id
// @access  Private/Admin
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    await company.deleteOne();
    res.json({ message: 'Company removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};