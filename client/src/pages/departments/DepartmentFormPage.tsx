import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '@/api/departments';
import { employeesApi } from '@/api/employees';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';

export default function DepartmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    headId: '',
  });

  const { data: deptData, isLoading: isLoadingDept } = useQuery({
    queryKey: ['department', id],
    queryFn: () => departmentsApi.getById(id!),
    enabled: isEdit,
  });

  const { data: empData } = useQuery({
    queryKey: ['employees', 'basic'],
    queryFn: () => employeesApi.getAll({ limit: 100 }), // Get some employees for head selection
  });

  useEffect(() => {
    if (isEdit && deptData?.data) {
      setFormData({
        name: deptData.data.name,
        description: deptData.data.description || '',
        headId: deptData.data.headId || '',
      });
    }
  }, [isEdit, deptData]);

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => isEdit ? departmentsApi.update({ id: id!, ...data }) : departmentsApi.create(data),
    onSuccess: () => {
      toast.success(`Department ${isEdit ? 'updated' : 'created'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      navigate('/departments');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to save department');
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  if (isEdit && isLoadingDept) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/departments')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {isEdit ? 'Edit Department' : 'Add New Department'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Department Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Department Name" name="name" value={formData.name} onChange={handleChange} required />
            
            <div className="flex flex-col space-y-1 w-full">
              <label htmlFor="department-description" className="text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
              <textarea
                id="department-description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="flex min-h-[100px] w-full rounded-md border border-slate-300 dark:border-slate-600 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional description"
              />
            </div>

            <div className="flex flex-col space-y-1 w-full">
              <label htmlFor="department-head" className="text-sm font-medium text-slate-700 dark:text-slate-300">Department Head</label>
              <Select 
                id="department-head"
                name="headId" 
                value={formData.headId} 
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-slate-300 dark:border-slate-600 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None</option>
                {empData?.data?.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </Select>
            </div>
            
            <div className="flex justify-end pt-4 gap-2">
              <Button type="button" variant="outline" onClick={() => navigate('/departments')}>Cancel</Button>
              <Button type="submit" isLoading={mutation.isPending}>Save Department</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

