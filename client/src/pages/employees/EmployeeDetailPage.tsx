import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { employeesApi } from '@/api/employees';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MoreHorizontal , ArrowLeft, FileText, CheckCircle2, Download} from 'lucide-react';
import { cn } from '@/lib/utils';


export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isHR = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'HR_EXECUTIVE';
  
  const SECTIONS = React.useMemo(() => [
    { id: 'general', label: 'Personal Information' },
    { id: 'job', label: 'Employment Information' },
    ...(isHR ? [{ id: 'payroll', label: 'Payroll & HR Information' }] : []),
    { id: 'assets', label: 'Assigned Assets' },
    { id: 'education', label: 'Documents' },
  ], [isHR]);
  const [isDeactivateOpen, setIsDeactivateOpen] = React.useState(false);
  const deactivateMutation = { mutate: (id: string) => {}, isPending: false }; // stub
  const [activeSection, setActiveSection] = useState('general');

  const queryClient = useQueryClient();

  const { data: empData, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeesApi.getById(id!),
  });

  const verifyDocumentMutation = useMutation({
    mutationFn: (documentId: string) => employeesApi.verifyDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    }
  });

  const emp = empData?.data;

  // Determine edit permission based on role and ownership
  const canEdit = 
    user?.role === 'ADMIN' || 
    user?.role === 'HR' || 
    user?.role === 'HR_EXECUTIVE' || 
    (user?.role === 'MANAGER' && (user?.employeeId === id || emp?.managerId === user?.employeeId || (user as any)?.employee?.id === id || emp?.managerId === (user as any)?.employee?.id));

  // Intersection observer logic for scroll spy
  useEffect(() => {
    const mainScrollContainer = document.querySelector('main');
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { 
      root: mainScrollContainer,
      rootMargin: '-10% 0px -40% 0px' 
    });

    SECTIONS.forEach(section => {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [empData, SECTIONS]);

  if (isLoading) return <div className="py-12"><LoadingSpinner /></div>;
  
  if (!emp) return <div className="text-gray-500 dark:text-gray-400 dark:text-gray-500">Employee not found</div>;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => // @ts-ignore
    navigate('/employees' as any)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 dark:text-gray-500 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            {emp.profilePhoto ? (
              <img src={emp.profilePhoto} alt="Profile" className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 font-bold text-lg ring-2 ring-white shadow-sm">
                {emp.firstName[0]}{emp.lastName[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-navy-900 dark:text-white flex items-center gap-2">
                {emp.firstName} {emp.lastName}
                <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'default'}>{emp.status}</Badge>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{emp.designation}</p>
            </div>
          </div>
        </div>
        
        <div>
          {canEdit && (
            <Button onClick={() => navigate(`/employees/${id}/edit`)} variant="outline">
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
                  <div className="lg:col-span-3 space-y-8 pb-32">
            
            {/* General Information */}
            <section id="general" className="space-y-6 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Personal Information</h2>
              </div>
              
              <Card>
                <CardHeader><CardTitle className="text-base">Basic Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Employee ID</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.employeeCode}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">First Name</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.firstName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Name</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date of Birth</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Mobile Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Email Address</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Address & Emergency Contact</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Full Address</p>
                      <p className="font-medium text-navy-900 dark:text-white">
                        {[emp.address, emp.city, emp.state, emp.zipCode, emp.country].filter(Boolean).join(', ') || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Emergency Contact Name</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.emergencyContactName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Emergency Contact Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">
                        {emp.emergencyContactNumber || 'N/A'} {emp.emergencyContactRelation ? `(${emp.emergencyContactRelation})` : ''}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Employment Information */}
            <section id="job" className="space-y-6 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Employment Information</h2>
              </div>
  
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Department</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.department?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Designation</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.designation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Location / Plant</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.location || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Date of Joining</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reporting Manager</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Employment Type</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.employmentType ? emp.employmentType.replace('_', ' ') : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Employee Status</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.status || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Confirmation Date</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.confirmationDate ? new Date(emp.confirmationDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Last Working Date</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.lastWorkingDate ? new Date(emp.lastWorkingDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    {emp.resignationDate && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resignation Date</p>
                        <p className="font-medium text-navy-900 dark:text-white">{new Date(emp.resignationDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Payroll / HR Information */}
            {isHR && (
            <section id="payroll" className="space-y-6 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Payroll & HR Information</h2>
              </div>
  
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CTC (Annual)</p>
                      <p className="font-medium text-navy-900 dark:text-white">₹{emp.ctc ? emp.ctc.toLocaleString() : '0'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Basic Salary</p>
                      <p className="font-medium text-navy-900 dark:text-white">₹{emp.basicSalary ? emp.basicSalary.toLocaleString() : '0'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gross Salary</p>
                      <p className="font-medium text-navy-900 dark:text-white">₹{emp.grossSalary ? emp.grossSalary.toLocaleString() : '0'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Bank Name</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.bankName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Account Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.bankAccountNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">IFSC Code</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.ifscCode || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">PF Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.pfNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">UAN Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.uanNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ESI Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.esiNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">PAN Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.panNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aadhaar Number</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.aadhaarNumber || 'N/A'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Statutory Remarks / Other Info</p>
                      <p className="font-medium text-navy-900 dark:text-white">{emp.statutoryRemarks || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
            )}

            <section id="assets" className="space-y-6 scroll-mt-24">
              <div className="flex flex-row items-center justify-between pb-2">
                <h2 className="text-lg font-bold text-navy-900 dark:text-white">Assigned Assets</h2>
                <Button variant="outline" size="sm" onClick={() => {
                  if (!emp?.assignedAssets?.length) return;
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Asset ID,Type,Brand/Model,Serial Number,Purchase Date,Purchase Value,Issue Date,Condition,Status\n"
                    + emp.assignedAssets.map((a: any) => 
                        `${a.id},${a.assetType},${a.brandModel || ''},${a.serialNumber || ''},${a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : ''},${a.purchaseValue || ''},${a.issueDate ? new Date(a.issueDate).toLocaleDateString() : ''},${a.issueCondition || ''},${a.status}`
                      ).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `Asset_History_${emp.firstName}_${emp.lastName}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}>
                  <Download className="w-4 h-4 mr-2" /> Export History
                </Button>
              </div>
              <Card>
                <CardContent className="pt-6">
                  {(!emp?.assignedAssets || emp.assignedAssets.length === 0) ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No assets currently assigned.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="py-2 font-medium">Type</th>
                            <th className="py-2 font-medium">Brand & Model</th>
                            <th className="py-2 font-medium">Serial Number</th>
                            <th className="py-2 font-medium">Issue Date</th>
                            <th className="py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {emp.assignedAssets.map((asset: any) => (
                            <tr key={asset.id}>
                              <td className="py-3 text-navy-900 dark:text-white">{asset.assetType}</td>
                              <td className="py-3 text-gray-600 dark:text-gray-400">{asset.brandModel || '-'}</td>
                              <td className="py-3 text-gray-600 dark:text-gray-400">{asset.serialNumber || '-'}</td>
                              <td className="py-3 text-gray-600 dark:text-gray-400">{asset.issueDate ? new Date(asset.issueDate).toLocaleDateString() : '-'}</td>
                              <td className="py-3">
                                <Badge variant={asset.status === 'IN_USE' ? 'success' : 'default'}>{asset.status}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <section id="education" className="space-y-6 scroll-mt-24">
              <h2 className="text-lg font-bold text-navy-900 dark:text-white">Documents</h2>
              <Card>
                <CardContent className="pt-6">
                  {emp.documents && emp.documents.length > 0 ? (
                    <div className="space-y-4">
                      {emp.documents.map((doc: any) => (
                        <div key={doc.id} className="flex items-start gap-4 p-4 border border-gray-100 dark:border-gray-800 rounded-lg">
                          <div className="bg-blue-50 p-3 rounded-lg"><FileText className="text-blue-500 w-6 h-6" /></div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-navy-900 dark:text-white">{doc.documentName}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">{doc.documentType.replace('_', ' ')} • Uploaded on {new Date(doc.uploadDate).toLocaleDateString()}</p>
                            <div className="mt-2 flex items-center gap-2 text-sm text-accent-500 font-medium">
                              <CheckCircle2 className="w-4 h-4" /> 
                              {doc.verificationStatus === 'VERIFIED' ? (
                                'Verified'
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>Pending Verification</span>
                                  {isHR && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="h-6 px-2 text-xs"
                                      onClick={() => verifyDocumentMutation.mutate(doc.id)}
                                      isLoading={verifyDocumentMutation.isPending}
                                    >
                                      Verify Now
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No documents uploaded yet (e.g., Resume, Aadhaar, PAN, Certificates, Appointment Letter).</p>
                  )}
                </CardContent>
              </Card>
            </section>

          </div>
        {/* Right Sticky Navigation */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-24 bg-sidebar text-white p-3 rounded-xl shadow-xl flex flex-col">
              <nav className="flex flex-col space-y-1">
                {SECTIONS.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      "px-4 py-3 text-sm rounded-lg text-left transition-all duration-200",
                      activeSection === section.id
                        ? "text-[#EAE0CF] bg-white/5 font-semibold"
                        : "text-white/70 font-medium hover:text-[#EAE0CF] hover:bg-white/5"
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        <ConfirmDialog isOpen={isDeactivateOpen} title="Deactivate Employee" message="Are you sure you want to deactivate this employee? They will lose access to the system immediately." confirmLabel="Deactivate" cancelLabel="Cancel" isDestructive={true} onConfirm={() => deactivateMutation.mutate(id as string)} onCancel={() => setIsDeactivateOpen(false)} />
</div>
    </div>
  );
}
