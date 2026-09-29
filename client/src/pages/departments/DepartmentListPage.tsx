
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { departmentsApi } from '@/api/departments';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Plus, Users, Building2, Edit } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function DepartmentListPage() {
 const navigate = useNavigate();

 const { data: deptData, isLoading } = useQuery({
 queryKey: ['departments'],
 queryFn: departmentsApi.getAll,
 });

 if (isLoading) return <LoadingSpinner />;

 return (
 <div className="space-y-6">
 <PageHeader
 title="Departments"
 description="Organize teams, ownership, and reporting structure."
 actions={<Button onClick={() => navigate('/departments/new')}>
 <Plus className="mr-2 h-4 w-4" /> Add Department
 </Button>}
 />

 {!deptData?.data?.length ? (
 <EmptyState 
 icon={Building2}
 title="No Departments found"
 description="Get started by creating a new department."
 actionLabel="Add Department"
 onAction={() => navigate('/departments/new')}
 />
 ) : (
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 {deptData.data.map((dept) => (
 <Card key={dept.id} className="flex flex-col">
 <CardHeader className="pb-3 border-b border-slate-border dark:border-slate-border">
 <CardTitle className="flex justify-between items-center">
 <span>{dept.name}</span>
 <Button variant="ghost" size="sm" onClick={() => navigate(`/departments/${dept.id}/edit`)}>
 <Edit className="h-4 w-4" />
 </Button>
 </CardTitle>
 </CardHeader>
 <CardContent className="py-4 flex-grow">
 <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3">
 {dept.description || 'No description available.'}
 </p>
 {dept.head && (
 <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">
 Head: {dept.head.firstName} {dept.head.lastName}
 </p>
 )}
 </CardContent>
 <CardFooter className="pt-0 pb-4">
 <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
 <Users className="h-4 w-4 mr-2" />
 {dept._count?.employees || 0} Employees
 </div>
 </CardFooter>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
