const express = require('express');
const router = express.Router();
const {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');
const { authenticate, requireRole } = require('../middleware/auth');

const resourceManagers = [authenticate, requireRole('library_admin', 'admin')];

// /api/resources
router.route('/')
  .get(getResources)
  .post(...resourceManagers, createResource);

// /api/resources/:id
router.route('/:id')
  .get(getResourceById)
  .put(...resourceManagers, updateResource)
  .patch(...resourceManagers, updateResource)
  .delete(...resourceManagers, deleteResource);

module.exports = router;
