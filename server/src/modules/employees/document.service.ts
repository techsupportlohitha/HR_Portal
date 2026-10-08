import prisma from '../../config/database';
import { hasAdminAccess } from '../../utils/roles';
import { DocumentType } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export class DocumentService {
  async upload(currentUser: any, file: Express.Multer.File, data: any, reqContext: { ipAddress?: string }) {
    // Quarantine/Scanning simulation: in a real app, send to virus scanner.
    // For Gate 1, we just save the path and log it.
    
    // Retention state: We store it locally in an uploads folder
    const doc = await prisma.employeeDocument.create({
      data: {
        documentType: data.documentType,
        documentName: data.documentName,
        employeeId: data.employeeId,
        uploadedById: currentUser.userId,
        filePath: file.path,
      }
    });

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'UPLOAD_DOCUMENT',
        moduleAffected: 'employees',
        recordIdAffected: doc.id,
        userId: currentUser.userId,
        ipAddress: reqContext.ipAddress,
      }
    });

    return doc;
  }

  async getEmployeeDocuments(employeeId: string, currentUser: any, reqContext: { ipAddress?: string }) {
    // If SELF scope, user can only see their own. If HR/Admin, can see all.
    if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== employeeId) {
      throw new Error('Not authorized to view these documents');
    }

    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId },
      orderBy: { uploadDate: 'desc' }
    });

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'VIEW_DOCUMENTS_LIST',
        moduleAffected: 'employees',
        recordIdAffected: employeeId,
        userId: currentUser.userId,
        ipAddress: reqContext.ipAddress,
      }
    });

    return docs;
  }

  async getDocumentFile(documentId: string, currentUser: any, reqContext: { ipAddress?: string }) {
    const doc = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== doc.employeeId) {
      throw new Error('Not authorized to download this document');
    }

    const uploadsDirectory = path.resolve(process.cwd(), 'uploads');
    const filePath = path.resolve(doc.filePath);
    if (!filePath.startsWith(`${uploadsDirectory}${path.sep}`)) {
      throw new Error('Stored document path is invalid');
    }
    if (!fs.existsSync(filePath)) {
      throw new Error('Document file is unavailable. It may need to be uploaded again.');
    }

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'VIEW_DOCUMENT',
        moduleAffected: 'employees',
        recordIdAffected: documentId,
        userId: currentUser.userId,
        ipAddress: reqContext.ipAddress,
      }
    });

    const extension = path.extname(doc.documentName).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.txt': 'text/plain',
    };
    const contentType = contentTypes[extension] || 'application/octet-stream';

    return {
      filePath,
      documentName: doc.documentName,
      contentType,
      inline: contentType !== 'application/octet-stream',
    };
  }

  async deleteDocument(documentId: string, currentUser: any, reqContext: { ipAddress?: string }) {
    const doc = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    if (currentUser.role === 'EMPLOYEE' && currentUser.employeeId !== doc.employeeId) {
      throw new Error('Not authorized to delete this document');
    }

    await prisma.employeeDocument.delete({ where: { id: documentId } });

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'DELETE_DOCUMENT',
        moduleAffected: 'employees',
        recordIdAffected: documentId,
        userId: currentUser.userId,
        ipAddress: reqContext.ipAddress,
      }
    });

    return true;
  }

  async verifyDocument(documentId: string, currentUser: any, reqContext: { ipAddress?: string }) {
    const doc = await prisma.employeeDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('Document not found');

    if (!hasAdminAccess(currentUser.role)) {
      throw new Error('Not authorized to verify documents');
    }

    const updatedDoc = await prisma.employeeDocument.update({
      where: { id: documentId },
      data: { verificationStatus: 'VERIFIED' }
    });

    await prisma.auditLog.create({
      data: {
        actionPerformed: 'VERIFY_DOCUMENT',
        moduleAffected: 'employees',
        recordIdAffected: documentId,
        userId: currentUser.userId,
        ipAddress: reqContext.ipAddress,
      }
    });

    return updatedDoc;
  }
}

export const documentService = new DocumentService();
