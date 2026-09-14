
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '@/api/notifications';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { Trash2, CheckCheck, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default function NotificationListPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifs, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll().then(res => res.data),
  });

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const clearReadMutation = useMutation({
    mutationFn: notificationsApi.clearRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-navy-900 dark:text-gray-400 dark:hover:text-white mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <PageHeader
        title="Notifications"
        description="Review alerts and keep important updates moving."
        actions={(
          <div className="flex gap-2">
          <Button variant="outline" onClick={() => clearReadMutation.mutate()} disabled={clearReadMutation.isPending || !notifs?.some((n: any) => n.isRead)}>
            <Trash2 className="w-4 h-4 mr-2" /> Clear Read
          </Button>
          <Button variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending || !notifs?.some((n: any) => !n.isRead)}>
            <CheckCheck className="w-4 h-4 mr-2" /> Mark All as Read
          </Button>
          </div>
        )}
      />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-4">
          {notifs?.map((notification: any) => (
            <Card key={notification.id} className={!notification.isRead ? 'bg-blue-50/50 border-blue-200' : ''}>
              <CardContent className="p-4 flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold">{notification.title}</h3>
                    {!notification.isRead && <Badge variant="info">New</Badge>}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 dark:text-gray-500 text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {!notification.isRead && (
                    <Button variant="outline" size="sm" onClick={() => markReadMutation.mutate(notification.id)}>
                      Mark Read
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMutation.mutate(notification.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!notifs || notifs.length === 0) && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 dark:text-gray-500">No notifications</div>
          )}
        </div>
      )}
    </div>
  );
}
