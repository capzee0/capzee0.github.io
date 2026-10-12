import { GripVertical } from 'lucide-react';
import {
  Group as ResizableGroup,
  Panel as ResizablePanelItem,
  Separator as ResizableSeparator,
  type GroupProps,
  type PanelProps,
  type SeparatorProps,
} from 'react-resizable-panels';
import { cn } from '@/lib/utils';

export interface ResizablePanelGroupProps extends Omit<GroupProps, 'orientation'> {
  direction?: 'horizontal' | 'vertical';
  orientation?: 'horizontal' | 'vertical';
}

export const ResizablePanelGroup = ({
  direction = 'horizontal',
  orientation,
  className,
  ...props
}: ResizablePanelGroupProps) => (
  <ResizableGroup
    orientation={orientation ?? direction}
    className={cn(
      'flex h-full w-full',
      className
    )}
    {...props}
  />
);

export const ResizablePanel = ({
  className,
  ...props
}: PanelProps) => (
  <ResizablePanelItem
    className={cn('h-full w-full', className)}
    {...props}
  />
);

export interface ResizableHandleProps extends SeparatorProps {
  withHandle?: boolean;
}

export const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: ResizableHandleProps) => (
  <ResizableSeparator
    className={cn(
      'relative flex items-center justify-center bg-forest/15 transition-colors duration-150 hover:bg-olive active:bg-olive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-olive select-none',
      'w-1.5 hover:w-2 cursor-col-resize',
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-6 w-3.5 items-center justify-center rounded-sm border border-forest/20 bg-surface shadow-xs">
        <GripVertical className="h-3 w-3 text-forest/70" />
      </div>
    )}
  </ResizableSeparator>
);
