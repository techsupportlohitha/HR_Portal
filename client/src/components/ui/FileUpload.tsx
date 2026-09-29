import React, { useId, useState } from 'react';
import apiClient from '@/api/client';
import { UploadCloud, Loader2, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
 name: string;
 label: string;
 required?: boolean;
}

export function FileUpload({ name, label, required }: FileUploadProps) {
 const [uploading, setUploading] = useState(false);
 const [fileUrls, setFileUrls] = useState<string[]>([]);
 const generatedId = useId();
 const inputId = `file-upload-${generatedId}`;
 const statusId = `${inputId}-status`;

 const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const files = e.target.files;
 if (!files || files.length === 0) return;

 setUploading(true);
 const formData = new FormData();
 for (let i = 0; i < files.length; i++) {
 formData.append('files', files[i]);
 }

 try {
 const res = await apiClient.post('/upload', formData, {
 headers: { 'Content-Type': 'multipart/form-data' }
 });
 if (res.data.success) {
 setFileUrls(prev => [...prev, ...res.data.urls]);
 }
 } catch (err) {
 console.error('Upload failed', err);
 alert('File upload failed');
 } finally {
 setUploading(false);
 }
 };

 return (
 <div className="flex flex-col">
 <label htmlFor={inputId} className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
 {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
 </label>
 
 {/* Hidden input to pass the comma-separated URLs to the form submission */}
 <input type="hidden" name={name} value={fileUrls.join(',')} />

 <div className="relative border-2 border-dashed border-slate-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-center cursor-pointer">
 <input 
 id={inputId}
 type="file" 
 multiple
 onChange={handleUpload} 
 disabled={uploading}
 required={required && fileUrls.length === 0}
 className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
 accept="image/*,.pdf"
 aria-describedby={statusId}
 />
 
 {uploading ? (
 <div className="flex flex-col items-center text-indigo-500">
 <Loader2 className="w-6 h-6 animate-spin mb-2" />
 <span id={statusId} className="text-sm" role="status">Uploading...</span>
 </div>
 ) : fileUrls.length > 0 ? (
 <div className="flex flex-col items-center text-green-500">
 <CheckCircle2 className="w-6 h-6 mb-2" />
 <span id={statusId} className="text-sm font-medium" role="status">{fileUrls.length} file(s) uploaded</span>
 <span className="text-xs text-gray-500 mt-1">Click or drag more to add</span>
 </div>
 ) : (
 <div className="flex flex-col items-center text-gray-500">
 <UploadCloud className="w-6 h-6 mb-2" />
 <span id={statusId} className="text-sm">Click or drag to upload files</span>
 </div>
 )}
 </div>
 </div>
 );
}
