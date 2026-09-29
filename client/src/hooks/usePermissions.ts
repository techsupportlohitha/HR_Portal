import { useQuery } from '@tanstack/react-query';
import apiClient from '@/api/client';

interface ModulePermission {
 canView: boolean;
 canAdd: boolean;
 canEdit: boolean;
 canDelete: boolean;
 canApprove: boolean;
 canViewRestricted: boolean;
 canExport: boolean;
}

type PermissionsMap = Record<string, ModulePermission>;

export function usePermissions() {
 const { data, isLoading } = useQuery<PermissionsMap>({
 queryKey: ['my-permissions'],
 queryFn: async () => {
 const { data } = await apiClient.get('/permissions/my');
 return data.data as PermissionsMap;
 },
 staleTime: 5 * 60 * 1000, // Cache for 5 minutes
 });

 const canExport = (module: string): boolean => {
 return data?.[module]?.canExport ?? false;
 };

 const canAdd = (module: string): boolean => {
 return data?.[module]?.canAdd ?? false;
 };

 const canEdit = (module: string): boolean => {
 return data?.[module]?.canEdit ?? false;
 };

 const canDelete = (module: string): boolean => {
 return data?.[module]?.canDelete ?? false;
 };

 const canApprove = (module: string): boolean => {
 return data?.[module]?.canApprove ?? false;
 };

 const canViewRestricted = (module: string): boolean => {
 return data?.[module]?.canViewRestricted ?? false;
 };

 return {
 permissions: data,
 isLoading,
 canExport,
 canAdd,
 canEdit,
 canDelete,
 canApprove,
 canViewRestricted,
 };
}
