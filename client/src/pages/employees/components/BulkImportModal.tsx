import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Upload, FileSpreadsheet, X, AlertCircle } from 'lucide-react';
import { employeesApi } from '@/api/employees';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BulkImportModal({ isOpen, onClose }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<{ createdCount: number; failedRows: any[] } | null>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResults(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setResults(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await employeesApi.bulkImport(formData);
      if (res.success) {
        setResults(res.data);
        if (res.data.failedRows && res.data.failedRows.length > 0) {
          toast.success(`Imported ${res.data.createdCount} employees with some errors.`);
        } else {
          toast.success(`Successfully imported ${res.data.createdCount} employees`);
          setTimeout(onClose, 1500);
        }
        queryClient.invalidateQueries({ queryKey: ['employees'] });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,firstName,lastName,email,employeeCode,phone,designation,joiningDate,gender,location\\nJohn,Doe,john@example.com,EMP001,1234567890,Software Engineer,2024-01-01,Male,New York\\nJane,Smith,jane@example.com,EMP002,0987654321,Product Manager,2024-02-01,Female,London";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "employee_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Employees">
      <div className="space-y-6">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Upload an Excel (.xlsx) or CSV file containing employee data. 
          <button onClick={downloadTemplate} className="text-brand-primary hover:underline ml-1 font-medium">Download template file.</button>
        </p>

        {!results ? (
          <div 
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex flex-col items-center">
                <FileSpreadsheet className="w-12 h-12 text-accent-500 mb-3" />
                <p className="font-medium text-slate-900 dark:text-slate-100">{file.name}</p>
                <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                <button onClick={() => setFile(null)} className="text-sm text-red-500 mt-4 hover:underline">Remove file</button>
              </div>
            ) : (
              <div className="flex flex-col items-center cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Click or drag file to this area to upload</p>
                <p className="text-sm text-slate-500 mt-1">Support for a single or bulk upload.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800 rounded-xl">
              <h4 className="font-bold text-emerald-800 dark:text-emerald-400">Import Complete</h4>
              <p className="text-emerald-700 dark:text-emerald-300 mt-1">Successfully created {results.createdCount} employee records.</p>
            </div>
            
            {results.failedRows.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h4 className="font-bold text-red-800 dark:text-red-400">Failed Rows ({results.failedRows.length})</h4>
                </div>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  {results.failedRows.map((fr, idx) => (
                    <li key={idx}>Row {fr.row}: {fr.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results && (
            <Button onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? 'Uploading...' : 'Import Data'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
