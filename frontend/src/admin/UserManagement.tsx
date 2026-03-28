import {
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Shield,
  ShieldOff,
  Activity,
  Mail,
  User,
  Award,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { getApiBaseUrl } from '../config/apiConfig';
import { useNotificationStore } from '../stores/notificationStore';

import { adminFetch } from './adminApi';
import { AdminSectionCard } from './AdminSectionCard';

interface UserData {
  id: string;
  email: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  isPremium: boolean;
  isOnboarded: boolean;
  approach: string | null;
  profilePhoto: string | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    assessments: number;
    moodEntries: number;
    conversations: number;
  };
}

interface UserDetails extends UserData {
  birthday: string | null;
  gender: string | null;
  region: string | null;
  language: string | null;
  dataConsent: boolean;
}

interface Activity {
  type: 'assessment' | 'mood' | 'conversation';
  id: string;
  timestamp: string;
  data: {
    assessmentType?: string;
    score?: number;
    mood?: string;
    intensity?: number;
    title?: string;
    messageCount?: number;
  };
}

export const UserManagement: React.FC = () => {
  const { push } = useNotificationStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPremium, setFilterPremium] = useState<string>('all');
  const [filterOnboarded, setFilterOnboarded] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // User detail modal
  const [selectedUser, setSelectedUser] = useState<UserDetails | null>(null);
  const [userActivity, setUserActivity] = useState<Activity[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterPremium !== 'all' && { isPremium: filterPremium }),
        ...(filterOnboarded !== 'all' && { isOnboarded: filterOnboarded })
      });

      const response = await adminFetch(`${getApiBaseUrl()}/admin/users?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalPages(data.data.pagination.totalPages);
        setTotalCount(data.data.pagination.totalCount);
      } else {
        throw new Error(data.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load users'
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, filterPremium, filterOnboarded, push]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleViewDetails = async (user: UserData) => {
    try {
      setIsDetailLoading(true);
      setDetailModalOpen(true);
      
      const [detailsRes, activityRes] = await Promise.all([
        adminFetch(`${getApiBaseUrl()}/admin/users/${user.id}`),
        adminFetch(`${getApiBaseUrl()}/admin/users/${user.id}/activity`)
      ]);

      if (!detailsRes.ok || !activityRes.ok) {
        throw new Error('Failed to fetch user details');
      }

      const detailsData = await detailsRes.json();
      const activityData = await activityRes.json();

      if (detailsData.success && activityData.success) {
        setSelectedUser(detailsData.data.user);
        setUserActivity(activityData.data);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to load user details'
      });
      setDetailModalOpen(false);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleTogglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await adminFetch(`${getApiBaseUrl()}/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPremium: !currentStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      push({
        type: 'success',
        title: 'Success',
        description: `User ${!currentStatus ? 'upgraded to' : 'downgraded from'} premium`
      });

      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to update user status'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setIsDeleting(true);
      
      const response = await adminFetch(`${getApiBaseUrl()}/admin/users/${userToDelete.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      push({
        type: 'success',
        title: 'Success',
        description: 'User account deactivated'
      });

      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to delete user'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assessment':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'mood':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'conversation':
        return <Mail className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <AdminSectionCard
        icon={User}
        title="User Management"
        description={`Manage user accounts and view activity (${totalCount} users)`}
        actions={
          <Button variant="outline" onClick={() => fetchUsers()}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
        contentClassName="space-y-4"
      >
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </AdminSectionCard>
    );
  }

  return (
    <>
      <AdminSectionCard
        icon={User}
        title="User Management"
        description={`Manage user accounts and view activity (${totalCount} users)`}
        actions={
          <Button variant="outline" onClick={() => fetchUsers()}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        }
        contentClassName="space-y-6"
      >
        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search 
              className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground cursor-pointer" 
              onClick={(e) => {
                const input = e.currentTarget.parentElement?.querySelector('input');
                input?.focus();
                input?.select();
              }}
            />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pr-12"
            />
          </div>
          <Select value={filterPremium} onValueChange={setFilterPremium}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Premium status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="true">Premium Only</SelectItem>
              <SelectItem value="false">Free Only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOnboarded} onValueChange={setFilterOnboarded}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Onboarded" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="true">Onboarded</SelectItem>
              <SelectItem value="false">Not Onboarded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {user.isPremium && (
                        <Badge variant="default" className="w-fit">
                          <Award className="h-3 w-3 mr-1" />
                          Premium
                        </Badge>
                      )}
                      {user.isOnboarded ? (
                        <Badge variant="outline" className="w-fit text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Onboarded
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit text-gray-500">
                          <XCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm space-y-1">
                      <div>{user._count.assessments} assessments</div>
                      <div className="text-muted-foreground">
                        {user._count.conversations} conversations
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{formatDate(user.createdAt)}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                          <User className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleTogglePremium(user.id, user.isPremium)}>
                          {user.isPremium ? (
                            <>
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove Premium
                            </>
                          ) : (
                            <>
                              <Shield className="h-4 w-4 mr-2" />
                              Grant Premium
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y">
              {users.map((user) => (
                <div key={user.id} className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {user.isPremium && (
                  <Badge variant="default" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
                {user.isOnboarded ? (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Onboarded
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-gray-500">
                    <XCircle className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div>
                  <span className="text-muted-foreground">Assessments:</span>{' '}
                  <span className="font-medium">{user._count.assessments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Conversations:</span>{' '}
                  <span className="font-medium">{user._count.conversations}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Joined:</span>{' '}
                  <span className="font-medium">{formatDate(user.createdAt)}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                    <User className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleTogglePremium(user.id, user.isPremium)}>
                    {user.isPremium ? (
                      <>
                        <ShieldOff className="h-4 w-4 mr-2" />
                        Remove Premium
                      </>
                    ) : (
                      <>
                        <Shield className="h-4 w-4 mr-2" />
                        Grant Premium
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => {
                      setUserToDelete(user);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
      </AdminSectionCard>

      {/* User Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user profile and activity history
            </DialogDescription>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedUser ? (
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Email</Label>
                        <div className="font-medium">{selectedUser.email}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <div className="font-medium">{selectedUser.name}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Premium Status</Label>
                        <div>
                          {selectedUser.isPremium ? (
                            <Badge>Premium</Badge>
                          ) : (
                            <Badge variant="outline">Free</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Approach</Label>
                        <div className="font-medium capitalize">
                          {selectedUser.approach || 'Not set'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Member Since</Label>
                        <div className="font-medium">{formatDate(selectedUser.createdAt)}</div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Last Active</Label>
                        <div className="font-medium">{formatDate(selectedUser.updatedAt)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedUser._count.assessments}</div>
                      <div className="text-sm text-muted-foreground">Assessments</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedUser._count.moodEntries}</div>
                      <div className="text-sm text-muted-foreground">Mood Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{selectedUser._count.conversations}</div>
                      <div className="text-sm text-muted-foreground">Conversations</div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>Latest user actions and interactions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userActivity.map((activity) => (
                        <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg border">
                          <div className="mt-1">{getActivityIcon(activity.type)}</div>
                          <div className="flex-1">
                            <div className="font-medium capitalize">{activity.type}</div>
                            <div className="text-sm text-muted-foreground">
                              {activity.type === 'assessment' && (
                                <>Assessment: {activity.data.assessmentType} (Score: {activity.data.score})</>
                              )}
                              {activity.type === 'mood' && (
                                <>Mood: {activity.data.mood} (Intensity: {activity.data.intensity})</>
                              )}
                              {activity.type === 'conversation' && (
                                <>{activity.data.title || 'Untitled'} ({activity.data.messageCount} messages)</>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(activity.timestamp)}
                          </div>
                        </div>
                      ))}
                      {userActivity.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          No recent activity
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the account for <strong>{userToDelete?.email}</strong>.
              The user data will be anonymized but not permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;
