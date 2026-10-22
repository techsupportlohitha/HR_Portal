import { Request, Response } from 'express';
import { assetService } from './asset.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AuthRequest } from '../../middleware/auth.middleware';

export class AssetController {
  async createAsset(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.createAsset(req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset created successfully');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async getAssets(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.getAssets(req.user!, req.query);
      return sendSuccess(res, result, 'Assets retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 500);
    }
  }

  async getAssetById(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.getAssetById(req.user!, req.params.id as string);
      return sendSuccess(res, result, 'Asset retrieved');
    } catch (error: any) {
      return sendError(res, error.message, 404);
    }
  }

  async updateAsset(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.updateAsset(req.params.id as string, req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset updated');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async deleteAsset(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.deleteAsset(req.params.id as string, req.user!, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset deleted');
    } catch (error: any) {
      const status = error.message === 'Asset not found.' ? 404 : error.message.includes('authorized') ? 403 : 400;
      return sendError(res, error.message, status);
    }
  }

  async assignAsset(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.assignAsset(req.params.id as string, req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset assigned');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async returnAsset(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.returnAsset(req.params.id as string, req.body, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset returned');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async reportDamage(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.reportAssetDamage(req.params.id as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset reported as damaged');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }

  async reportLost(req: AuthRequest, res: Response) {
    try {
      const result = await assetService.reportAssetLost(req.params.id as string, req.user!.userId, { ipAddress: req.ip });
      return sendSuccess(res, result, 'Asset reported as lost');
    } catch (error: any) {
      return sendError(res, error.message, 400);
    }
  }
}

export const assetController = new AssetController();
