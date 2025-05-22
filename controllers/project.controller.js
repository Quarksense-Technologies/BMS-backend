import { Project } from '../models/Project.model.js';
import { Company } from '../models/Company.model.js';

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const { company, status } = req.query;
    let query = {};

    // Filter by company if provided
    if (company) {
      query.company = company;
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // If user is not admin, only show projects they're associated with
    if (req.user.role !== 'admin') {
      query = {
        ...query,
        $or: [
          { createdBy: req.user._id },
          { managers: { $in: [req.user._id] } },
          { team: { $in: [req.user._id] } },
        ],
      };
    }

    const projects = await Project.find(query)
      .populate('company', 'name')
      .populate('createdBy', 'name email')
      .populate('managers', 'name email')
      .populate('team', 'name email');

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('company', 'name')
      .populate('createdBy', 'name email')
      .populate('managers', 'name email')
      .populate('team', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has permission to view this project
    if (
      req.user.role !== 'admin' &&
      project.createdBy._id.toString() !== req.user._id.toString() &&
      !project.managers.some(
        (manager) => manager._id.toString() === req.user._id.toString()
      ) &&
      !project.team.some(
        (member) => member._id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(403).json({
        message: 'Not authorized to access this project',
      });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a project
// @route   POST /api/projects
// @access  Private/Admin/Manager
export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      company,
      startDate,
      endDate,
      status,
      budget,
      managers,
      team,
    } = req.body;

    // Check if company exists
    const companyExists = await Company.findById(company);
    if (!companyExists) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if user has permission to create project for this company
    if (
      req.user.role !== 'admin' &&
      companyExists.createdBy.toString() !== req.user._id.toString() &&
      !companyExists.managers.includes(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Not authorized to create projects for this company',
      });
    }

    const project = await Project.create({
      name,
      description,
      company,
      startDate,
      endDate,
      status,
      budget,
      managers: managers || [],
      team: team || [],
      createdBy: req.user._id,
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private/Admin/Manager
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has permission to update this project
    if (
      req.user.role !== 'admin' &&
      project.createdBy.toString() !== req.user._id.toString() &&
      !project.managers.includes(req.user._id)
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this project',
      });
    }

    const {
      name,
      description,
      startDate,
      endDate,
      status,
      budget,
      managers,
      team,
    } = req.body;

    project.name = name || project.name;
    project.description = description || project.description;
    project.startDate = startDate || project.startDate;
    project.endDate = endDate || project.endDate;
    project.status = status || project.status;
    project.budget = budget || project.budget;
    project.managers = managers || project.managers;
    project.team = team || project.team;

    const updatedProject = await project.save();

    res.json(updatedProject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private/Admin
export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    await project.deleteOne();
    res.json({ message: 'Project removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};