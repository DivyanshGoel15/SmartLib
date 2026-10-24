const express = require('express');
const router = express.Router();
const {
  getResources,
  getResourceById,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');

// /api/resources
router.route('/')
  .get(getResources)
  .post(createResource);

// /api/resources/:id
router.route('/:id')
  .get(getResourceById)
  .put(updateResource)
  .patch(updateResource)
  .delete(deleteResource);

module.exports = router;
