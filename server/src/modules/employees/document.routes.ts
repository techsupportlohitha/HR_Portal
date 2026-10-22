import { Router } from 'express';
import { documentController } from './document.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { uploadDocumentSchema } from './document.schema';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post('/upload', authenticate, requirePermission('employees', 'edit'), upload.single('file'), validate(uploadDocumentSchema), (req, res) => documentController.upload(req, res));
router.get('/:employeeId', authenticate, requirePermission('employees', 'view'), (req, res) => documentController.getEmployeeDocuments(req, res));
router.get('/:id/download', authenticate, requirePermission('employees', 'view'), (req, res) => documentController.viewDocument(req, res));
router.delete('/:id', authenticate, requirePermission('employees', 'delete'), (req, res) => documentController.deleteDocument(req, res));
router.put('/:id/verify', authenticate, requirePermission('employees', 'approve'), (req, res) => documentController.verifyDocument(req, res));

export default router;
