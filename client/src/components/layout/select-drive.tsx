import React, { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useGetDrives } from '../../services/apis';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectActiveDrive, setActiveDrive } from '../../store/slices';

export const SelectDrive = () => {
  // Store.
  const dispatch = useAppDispatch();
  const { activeDriveId } = useAppSelector(selectActiveDrive);

  // State.
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(
    activeDriveId,
  );

  // Queries.
  const { data: driveResponse, isLoading } = useGetDrives();

  // Constants.
  const myDrives = driveResponse?.data.filter(
    (drive) => drive.role === 'owner',
  );
  const sharedDrives = driveResponse?.data.filter(
    (drive) => drive.role !== 'owner',
  );

  // Effects.
  useEffect(() => {
    if (driveResponse) {
      const defaultDrive = driveResponse.data.find(
        (drive) => drive.id === selectedDriveId,
      );

      if (defaultDrive) {
        dispatch(setActiveDrive(defaultDrive));
      } else if (myDrives?.[0]) {
        dispatch(setActiveDrive(myDrives[0]));
        setSelectedDriveId(myDrives[0].id);
      }
    }
  }, [driveResponse]);

  // Handlers.
  const handleSelectDrive = (driveId: string) => {
    setSelectedDriveId(driveId);

    const drive = driveResponse?.data.find((drive) => drive.id === driveId);
    if (drive) {
      dispatch(setActiveDrive(drive));
    }
  };

  return (
    <Select
      disabled={isLoading}
      value={selectedDriveId ?? undefined}
      onValueChange={handleSelectDrive}
    >
      <SelectTrigger className="h-7 w-[140px] gap-1 rounded-full border-none bg-background/50 px-2.5 text-xs font-medium shadow-none hover:bg-background/80 sm:h-8 sm:w-[180px] sm:px-3 sm:text-sm">
        <SelectValue placeholder="Select space" />
      </SelectTrigger>
      <SelectContent className="w-[200px] p-1.5 sm:w-[240px] sm:p-2">
        <div className="mb-1.5 sm:mb-2">
          <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-2 sm:text-xs">
            Personal Drive
          </div>
          {myDrives &&
            myDrives.map((drive) => (
              <SelectItem
                key={drive.id}
                value={drive.id}
                className="rounded-md py-1.5 sm:py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-violet-500 sm:size-2" />
                  <span className="text-xs sm:text-sm">{drive.name}</span>
                </div>
              </SelectItem>
            ))}
        </div>

        {sharedDrives && sharedDrives.length > 0 && (
          <div>
            <div className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:mb-2 sm:text-xs">
              Shared Drives
            </div>
            {sharedDrives.map((drive) => (
              <SelectItem
                key={drive.id}
                value={drive.id}
                className="rounded-md py-1.5 sm:py-2"
              >
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-amber-500 sm:size-2" />
                  <span className="text-xs sm:text-sm">{drive.name}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
