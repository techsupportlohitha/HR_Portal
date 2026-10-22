import { Router } from 'express';
import { assetController } from './asset.controller';
import { authenticate, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createAssetSchema, updateAssetSchema, assignAssetSchema, returnAssetSchema } from './asset.schema';

const router = Router();

router.use(authenticate);

router.post('/', requirePermission('assets', 'add'), validateRequest({ body: createAssetSchema }), (req, res) => assetController.createAsset(req, res));
router.get('/', requirePermission('assets', 'view'), (req, res) => assetController.getAssets(req, res));
router.get('/:id', requirePermission('assets', 'view'), (req, res) => assetController.getAssetById(req, res));
router.put('/:id', requirePermission('assets', 'edit'), validateRequest({ body: updateAssetSchema }), (req, res) => assetController.updateAsset(req, res));
router.delete('/:id', requirePermission('assets', 'delete'), (req, res) => assetController.deleteAsset(req, res));
router.put('/:id/assign', requirePermission('assets', 'edit'), validateRequest({ body: assignAssetSchema }), (req, res) => assetController.assignAsset(req, res));
router.put('/:id/return', (req, res, next) => {
  const role = (req as import('../../middleware/auth.middleware').AuthRequest).user?.role;
  return requirePermission('assets', role === 'ADMIN' || role === 'HR' ? 'edit' : 'view')(req, res, next);
}, validateRequest({ body: returnAssetSchema }), (req, res) => assetController.returnAsset(req, res));
router.put('/:id/damage', requirePermission('assets', 'edit'), (req, res) => assetController.reportDamage(req, res));
router.put('/:id/lost', requirePermission('assets', 'edit'), (req, res) => assetController.reportLost(req, res));

export default router;
