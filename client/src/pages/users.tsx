import { useState } from 'react';
import { Trash2, UserPlus, User, Users, Shield, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout';
import { useAppSelector } from '../store/hooks';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  ScrollArea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui';
import { toast } from '../hooks/use-toast';
import {
  useGetDriveMembers,
  useAddDriveMember,
  useUpdateDriveMember,
  useRemoveDriveMember,
  handleResponseErrorMessage,
  DriveRole,
} from '../services/apis';
import { AddDriveMemberPayload } from '../services/apis/drives/types';
import { selectActiveDrive } from '../store/slices/drive-slice';

export function UsersPage() {
  // Store.
  const { canManageUsers } = useAppSelector(selectActiveDrive);
  const { activeDriveId } = useAppSelector(selectActiveDrive);

  // States.
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const form = useForm<AddDriveMemberPayload>({
    defaultValues: {
      role: DriveRole.Guest,
    },
  });

  // Navigation.
  const navigate = useNavigate();
  if (!canManageUsers) {
    navigate('/');
  }

  // Queries.
  const {
    data: membersResponse,
    isPending,
    refetch,
  } = useGetDriveMembers(activeDriveId ?? '', canManageUsers);
  const { mutate: addMember } = useAddDriveMember();
  const { mutate: updateMember } = useUpdateDriveMember();
  const { mutate: removeMember } = useRemoveDriveMember();

  const handleAddUser = (data: AddDriveMemberPayload) => {
    addMember(data, {
      onSuccess: () => {
        toast({
          title: 'User added successfully',
        });
        setIsAddUserModalOpen(false);
        refetch();
        form.reset();
      },
      onError: (error) => {
        handleResponseErrorMessage(error, form.setError);
      },
    });
  };

  const handleUpdateRole = (memberId: string, role: DriveRole) => {
    updateMember(
      { id: memberId, role },
      {
        onSuccess: () => {
          toast({
            title: 'User role updated successfully',
          });
          refetch();
        },
        onError: (error) => {
          handleResponseErrorMessage(error);
        },
      },
    );
  };

  const handleDelete = (memberId: string) => {
    removeMember(memberId, {
      onSuccess: () => {
        toast({
          title: 'User removed successfully',
        });
        setMemberToDelete(null);
        refetch();
      },
      onError: (error) => {
        handleResponseErrorMessage(error);
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drive Members"
        description="Add and manage members who can access the drive"
        action={
          <Dialog
            open={isAddUserModalOpen}
            onOpenChange={setIsAddUserModalOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="size-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Member</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={form.handleSubmit(handleAddUser)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    error={form.formState.errors.email?.message}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    onValueChange={(value) =>
                      form.setValue('role', value as DriveRole)
                    }
                    value={form.watch('role')}
                  >
                    <SelectTrigger
                      id="role"
                      className={
                        form.formState.errors.role ? 'border-destructive' : ''
                      }
                    >
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="guest">Guest</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.role.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Add Member
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <ScrollArea className="h-[calc(100dvh-18rem)] w-full md:h-[calc(100dvh-16rem)]">
        <div className="rounded-lg border bg-card">
          <div className="hidden items-center gap-4 border-b bg-secondary/50 px-4 py-3 text-sm font-medium text-muted-foreground md:flex">
            <div className="flex flex-1 items-center gap-2">
              <Users className="size-4" />
              User
            </div>
            <div className="flex w-[150px] items-center gap-2">
              <Shield className="size-4" />
              Role
            </div>
            <div className="flex w-[60px] items-center justify-end gap-2 pr-2">
              <Settings className="size-4" />
              <span className="sr-only">Actions</span>
            </div>
          </div>

          <div className="divide-y">
            {isPending ? (
              <div className="flex justify-center p-8">
                <Spinner />
              </div>
            ) : membersResponse?.data.length === 0 ? (
              <div className="flex justify-center p-8 text-sm text-muted-foreground">
                No members found
              </div>
            ) : (
              membersResponse?.data.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/50 md:flex-row md:items-center"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                      <User className="size-5 text-secondary-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {member.userName}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {member.userEmail}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 md:justify-start">
                    <div className="shrink-0 md:w-[150px]">
                      <Select
                        defaultValue={member.role}
                        onValueChange={(value) =>
                          handleUpdateRole(member.id, value as DriveRole)
                        }
                      >
                        <SelectTrigger className="h-9 w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="guest">Guest</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex shrink-0 justify-end md:w-[60px]">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToDelete(member.id)}
                        className="size-9 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Remove member"
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!memberToDelete}
        onOpenChange={() => setMemberToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold">
                {
                  membersResponse?.data.find((m) => m.id === memberToDelete)
                    ?.userName
                }
              </span>{' '}
              from this drive? Once removed, they will no longer have access to
              any files in this drive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToDelete && handleDelete(memberToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
