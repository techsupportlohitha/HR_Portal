import { formatDate, formatDateTime } from '@/utils/dateFormat';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees';
import { departmentsApi } from '@/api/departments';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { KeyRound, Copy } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, CheckCircle2, Upload, Trash2 } from 'lucide-react';

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    employeeCode: '', firstName: '', lastName: '', email: '', phone: '',
    departmentId: '', designation: '', joiningDate: new Date().toISOString().split('T')[0],
    employmentType: 'PERMANENT', dateOfBirth: '', gender: '', address: '',
    city: '', state: '', zipCode: '', country: '', managerId: '',
    location: '', status: 'ACTIVE',
    maritalStatus: '', bloodGroup: '', qualification: '', experience: '', alternateMobile: '', personalEmail: '', permanentAddress: '',
    emergencyContactName: '', emergencyContactRelation: '', emergencyContactNumber: '',
    grade: '', probationPeriod: '', confirmationDate: '', resignationDate: '',
    noticePeriod: '', lastWorkingDate: '', exitType: '', exitReason: '',
    ctc: '', basicSalary: '', grossSalary: '', bankName: '', bankAccountNumber: '',
    ifscCode: '', pfNumber: '', uanNumber: '', esiNumber: '', panNumber: '', aadhaarNumber: '', statutoryRemarks: ''
  });

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: departmentsApi.getAll,
  });

  const { data: employeesList } = useQuery({
    queryKey: ['employees', 'all'],
    queryFn: () => employeesApi.getAll({ limit: 1000 }),
  });

  const { data: empData, isLoading: isLoadingEmp } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (isEdit && empData?.data) {
      const e = empData.data;
      setFormData({
        employeeCode: e.employeeCode,
        firstName: e.firstName,
        lastName: e.lastName,
        email: e.email,
        phone: e.phone || '',
        departmentId: e.departmentId || '',
        designation: e.designation,
        joiningDate: new Date(e.joiningDate).toISOString().split('T')[0],
        employmentType: e.employmentType || 'PERMANENT',
        dateOfBirth: e.dateOfBirth ? new Date(e.dateOfBirth).toISOString().split('T')[0] : '',
        gender: e.gender || '',
        address: e.address || '', city: e.city || '', state: e.state || '',
        zipCode: e.zipCode || '', country: e.country || '',
        managerId: e.managerId || '', location: e.location || '', status: e.status || 'ACTIVE',
        maritalStatus: e.maritalStatus || '', bloodGroup: e.bloodGroup || '', qualification: e.qualification || '', experience: e.experience || '', alternateMobile: e.alternateMobile || '',
        personalEmail: e.personalEmail || '', permanentAddress: e.permanentAddress || '',
        emergencyContactName: e.emergencyContactName || '', emergencyContactRelation: e.emergencyContactRelation || '',
        emergencyContactNumber: e.emergencyContactNumber || '', grade: e.grade || '',
        probationPeriod: e.probationPeriod?.toString() || '',
        confirmationDate: e.confirmationDate ? new Date(e.confirmationDate).toISOString().split('T')[0] : '',
        resignationDate: e.resignationDate ? new Date(e.resignationDate).toISOString().split('T')[0] : '',
        noticePeriod: e.noticePeriod?.toString() || '',
        lastWorkingDate: e.lastWorkingDate ? new Date(e.lastWorkingDate).toISOString().split('T')[0] : '',
        exitType: e.exitType || '', exitReason: e.exitReason || '',
        ctc: e.ctc?.toString() || '', basicSalary: e.basicSalary?.toString() || '',
        grossSalary: e.grossSalary?.toString() || '', bankName: e.bankName || '',
        bankAccountNumber: e.bankAccountNumber || '', ifscCode: e.ifscCode || '',
        pfNumber: e.pfNumber || '', uanNumber: e.uanNumber || '', esiNumber: e.esiNumber || '',
        panNumber: e.panNumber || '', aadhaarNumber: e.aadhaarNumber || '', statutoryRemarks: e.statutoryRemarks || ''
      });
    }
  }, [isEdit, empData]);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [credentialsModal, setCredentialsModal] = useState<{email: string, password: string} | null>(null);

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => isEdit ? employeesApi.update({ id: id!, ...data } as any) : employeesApi.create(data as any),
    onSuccess: async (res) => {
      // Handle the new response format for creation
      const employeeObj = !isEdit && (res?.data as any)?.employee ? (res.data as any).employee : res?.data;
      const empId = employeeObj?.id;
      
      if (!isEdit && pendingFiles.length > 0 && empId) {
        try {
          await Promise.all(pendingFiles.map(file => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('documentType', 'EDUCATIONAL_CERTIFICATE');
            fd.append('documentName', file.name);
            fd.append('employeeId', empId);
            return employeesApi.uploadDocument(fd);
          }));
        } catch (e) {
          toast.error('Employee created but some document uploads failed');
        }
      }
      
      toast.success(`Employee ${isEdit ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      if (!isEdit && (res?.data as any)?.temporaryPassword) {
        // Show credentials modal instead of navigating immediately
        setCredentialsModal({
          email: employeeObj.email,
          password: (res.data as any).temporaryPassword
        });
      } else {
        navigate('/employees');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save employee');
    }
  });

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      return Promise.all(files.map(file => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('documentType', 'EDUCATIONAL_CERTIFICATE');
        fd.append('documentName', file.name);
        fd.append('employeeId', id!);
        return employeesApi.uploadDocument(fd);
      }));
    },
    onSuccess: () => {
      toast.success('Documents uploaded successfully');
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
    onError: () => toast.error('Failed to upload documents')
  });

  const handleFileUpload = () => {
    if (selectedFiles.length > 0) uploadMutation.mutate(selectedFiles);
  };

  const deleteDocumentMutation = useMutation({
    mutationFn: (documentId: string) => employeesApi.deleteDocument(documentId),
    onSuccess: () => {
      toast.success('Document deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
    onError: () => toast.error('Failed to delete document')
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...formData };
    
    // Convert empty strings to undefined to not fail validations
    Object.keys(payload).forEach(key => {
      if (payload[key] === '') {
        delete payload[key];
      }
    });

    // Convert numeric fields
    const numericFields = ['salary', 'probationPeriod', 'noticePeriod', 'ctc', 'basicSalary', 'grossSalary'];
    numericFields.forEach(field => {
      if (payload[field]) {
        payload[field] = Number(payload[field]);
      }
    });
    
    mutation.mutate(payload);
  };

  if (isEdit && isLoadingEmp) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isEdit ? 'Edit Employee' : 'Add New Employee'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Employee Code" name="employeeCode" value={formData.employeeCode} onChange={handleChange} required />
              <Input label="Email" type="email" name="email" value={formData.email} onChange={handleChange} required />
              <Input label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
              <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
              <Input label="Phone" name="phone" value={formData.phone} onChange={handleChange} required pattern="[0-9]{10}" minLength={10} maxLength={10} title="Phone number must be exactly 10 digits" />
              <Input label="Alternate Mobile" name="alternateMobile" value={formData.alternateMobile} onChange={handleChange} pattern="[0-9]{10}" minLength={10} maxLength={10} title="Mobile number must be exactly 10 digits" />
              <Input label="Personal Email" type="email" name="personalEmail" value={formData.personalEmail} onChange={handleChange} />
              <Input label="Blood Group" name="bloodGroup" value={formData.bloodGroup} required onChange={handleChange} />
              <Input label="Qualification" name="qualification" value={formData.qualification} onChange={handleChange} />
              <div className="flex flex-col space-y-1 w-full">
                  <label htmlFor="employee-marital" className="text-sm font-medium text-slate-700 dark:text-slate-300">Marital Status <span className="text-red-500">*</span></label>
                  <Select 
                    id="employee-marital"
                    name="maritalStatus" required 
                    value={formData.maritalStatus} 
                    onChange={handleChange}
                  >
                    <option value="">Select Status</option>
                    <option value="UNMARRIED">Unmarried</option>
                    <option value="MARRIED">Married</option>
                    <option value="DIVORCED">Divorced</option>
                    <option value="WIDOWED">Widowed</option>
                  </Select>
                </div>
              
              <Input label="Emergency Contact Name" name="emergencyContactName" value={formData.emergencyContactName} onChange={handleChange} />
              <Input label="Emergency Contact Number" name="emergencyContactNumber" value={formData.emergencyContactNumber} onChange={handleChange} pattern="[0-9]{10}" minLength={10} maxLength={10} title="Contact number must be exactly 10 digits" />
              <Input label="Emergency Contact Relation" name="emergencyContactRelation" value={formData.emergencyContactRelation} onChange={handleChange} />

              <Input label="Date of Birth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange}  required />
              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="employee-gender" className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender <span className="text-red-500">*</span></label>
                <Select 
                  id="employee-gender"
                  name="gender" required 
                  value={formData.gender} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-slate-300 dark:focus:border-slate-600"
                >
                  <option value="">Select Gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Address Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Input label="Street Address" name="address" value={formData.address} onChange={handleChange}  required />
              </div>
              <Input label="City" name="city" value={formData.city} onChange={handleChange}  required />
              <Input label="State / Province" name="state" value={formData.state} onChange={handleChange}  required />
              <Input label="ZIP / Postal Code" name="zipCode" value={formData.zipCode} onChange={handleChange}  required />
              <Input label="Country" name="country" value={formData.country} onChange={handleChange}  required />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="employee-department" className="text-sm font-medium text-slate-700 dark:text-slate-300">Department <span className="text-red-500">*</span></label>
                <Select 
                  id="employee-department"
                  name="departmentId"
                  value={formData.departmentId} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-slate-300 dark:focus:border-slate-600"
                  required
                >
                  <option value="">Select Department</option>
                  {deptData?.data?.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </Select>
              </div>
              
              <Input label="Designation" name="designation" value={formData.designation} onChange={handleChange} required />
                <Input label="Experience" name="experience" value={formData.experience} onChange={handleChange} />
              <Input label="Joining Date" type="date" name="joiningDate" value={formData.joiningDate} onChange={handleChange} required />
              
              <Input label="Confirmation Date" type="date" name="confirmationDate" value={formData.confirmationDate} onChange={handleChange} />
              <Input label="Last Working Date" type="date" name="lastWorkingDate" value={formData.lastWorkingDate} onChange={handleChange} />
              <Input label="Resignation Date" type="date" name="resignationDate" value={formData.resignationDate} onChange={handleChange} />
              <Input label="Probation Period (Days)" type="number" min="0" name="probationPeriod" value={formData.probationPeriod} onChange={handleChange} />
              <Input label="Notice Period (Days)" type="number" min="0" name="noticePeriod" value={formData.noticePeriod} onChange={handleChange} />
              
              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="employee-type" className="text-sm font-medium text-slate-700 dark:text-slate-300">Employment Type <span className="text-red-500">*</span></label>
                <Select 
                  id="employee-type"
                  name="employmentType" required 
                  value={formData.employmentType} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-slate-300 dark:focus:border-slate-600"
                >
                  <option value="PERMANENT">Full-time</option>
                  <option value="CONTRACT">Part-time / Contract</option>
                  <option value="INTERN">Intern</option>
                </Select>
              </div>

              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="employee-manager" className="text-sm font-medium text-slate-700 dark:text-slate-300">Line Manager</label>
                <Select 
                  id="employee-manager"
                  name="managerId" 
                  value={formData.managerId} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-slate-300 dark:focus:border-slate-600"
                >
                  <option value="">Select Manager</option>
                  {employeesList?.data?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </Select>
              </div>

              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="employee-location" className="text-sm font-medium text-slate-700 dark:text-slate-300">Office Location</label>
                <Select 
                  id="employee-location"
                  name="location" 
                  value={formData.location} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-slate-300 dark:focus:border-slate-600"
                >
                  <option value="">Select Office</option>
                  <option value="Hyd Office">Hyd Office</option>
                  <option value="Peddapuram Plant">Peddapuram Plant</option>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-1 w-full">
                <label htmlFor="employee-status" className="text-sm font-medium text-slate-700 dark:text-slate-300">Employee Status <span className="text-red-500">*</span></label>
                <Select 
                  id="employee-status"
                  name="status" required 
                  value={formData.status} 
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 dark:focus:ring-slate-600 focus:border-slate-300 dark:focus:border-slate-600"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payroll & HR Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="CTC (Annual)" type="number" min="0" name="ctc" value={formData.ctc} onChange={handleChange} />
              <Input label="Basic Salary" type="number" min="0" name="basicSalary" value={formData.basicSalary} onChange={handleChange} />
              <Input label="Gross Salary" type="number" min="0" name="grossSalary" value={formData.grossSalary} onChange={handleChange} />
              
              <Input label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} />
              <Input label="Account Number" name="bankAccountNumber" value={formData.bankAccountNumber} onChange={handleChange} />
              <Input label="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleChange} />
              
              <Input label="PF Number" name="pfNumber" value={formData.pfNumber} onChange={handleChange} />
              <Input label="UAN Number" name="uanNumber" value={formData.uanNumber} onChange={handleChange} />
              <Input label="ESI Number" name="esiNumber" value={formData.esiNumber} onChange={handleChange} />
              <Input label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange} />
              <Input label="Aadhaar Number" name="aadhaarNumber" value={formData.aadhaarNumber} onChange={handleChange} />
              
              <div className="md:col-span-3">
                <Input label="Statutory Remarks" name="statutoryRemarks" value={formData.statutoryRemarks} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Documents & Certificates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEdit ? (
              <>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <input 
                      aria-label="Choose employee certificates to upload"
                      key={selectedFiles.length === 0 ? 'empty' : 'filled'}
                      type="file" 
                      multiple
                      onChange={(e) => setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 dark:file:bg-accent-900 dark:file:text-accent-200"
                    />
                    <Button 
                      type="button" 
                      onClick={handleFileUpload} 
                      disabled={selectedFiles.length === 0 || uploadMutation.isPending}
                      className="shrink-0"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setSelectedFiles([])} 
                      disabled={selectedFiles.length === 0}
                      className="shrink-0"
                    >
                      Clear
                    </Button>
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Certificates (Pending Upload)</h3>
                      {selectedFiles.map((f, i) => (
                        <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                          <div className="bg-blue-50 p-3 rounded-lg"><FileText className="text-blue-500 w-6 h-6" /></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-navy-900 dark:text-white">{f.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Will be uploaded upon click</p>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            aria-label={`Remove ${f.name} from selected certificates`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {empData?.data?.documents && empData.data.documents.length > 0 && (
                  <div className="mt-6 space-y-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Uploaded Certificates</h3>
                    {empData.data.documents.map((doc: any) => (
                      <div key={doc.id} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                        <div className="bg-blue-50 p-3 rounded-lg"><FileText className="text-blue-500 w-6 h-6" /></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-navy-900 dark:text-white">{doc.documentName}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{doc.documentType.replace('_', ' ')} • {formatDate(doc.uploadDate)}</p>
                          <div className="mt-2 flex items-center gap-2 text-sm text-accent-500 font-medium cursor-pointer">
                            <CheckCircle2 className="w-4 h-4" /> Verified
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteDocumentMutation.mutate(doc.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Delete ${doc.documentName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Select certificates to upload once the employee is created.</p>
                <div className="flex items-center gap-4">
                  <input 
                    aria-label="Choose employee certificates"
                    key={pendingFiles.length === 0 ? 'empty' : 'filled'}
                    type="file" 
                    multiple
                    onChange={(e) => setPendingFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100 dark:file:bg-accent-900 dark:file:text-accent-200"
                  />
                  <Button 
                    type="submit" 
                    disabled={pendingFiles.length === 0 || mutation.isPending}
                    className="shrink-0"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setPendingFiles([])} 
                    disabled={pendingFiles.length === 0}
                    className="shrink-0"
                  >
                    Clear
                  </Button>
                </div>
                {pendingFiles.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Selected Certificates (Pending Upload)</h3>
                    {pendingFiles.map((f, i) => (
                      <div key={i} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                        <div className="bg-blue-50 p-3 rounded-lg"><FileText className="text-blue-500 w-6 h-6" /></div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-navy-900 dark:text-white">{f.name}</h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">Will be uploaded upon saving</p>
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Remove ${f.name} from selected certificates`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end pt-6 gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/employees')}>Cancel</Button>
          <Button type="submit" isLoading={mutation.isPending}>Save Employee</Button>
        </div>
      </form>

      {/* Credentials Modal */}
      {credentialsModal && (
        <Modal 
          isOpen={!!credentialsModal} 
          onClose={() => {
            setCredentialsModal(null);
            navigate('/employees');
          }} 
          title="User Account Created"
        >
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A login account has been automatically created for this employee. Please share these credentials securely.
            </p>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Email</p>
                <p className="font-mono text-sm font-semibold">{credentialsModal.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-medium">Temporary Password</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <p className="font-mono text-lg font-bold text-primary-600 tracking-wider">{credentialsModal.password}</p>
                  <button 
                    type="button"
                    aria-label="Copy temporary password"
                    onClick={() => {
                      navigator.clipboard.writeText(credentialsModal.password);
                      toast.success('Password copied to clipboard');
                    }}
                    className="p-1 text-gray-400 hover:text-primary-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <Button onClick={() => {
                setCredentialsModal(null);
                navigate('/employees');
              }} className="w-full">
                I&apos;ve saved these credentials
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
