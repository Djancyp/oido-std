import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ModalConfig } from '@/contexts/Modal';
import { cn } from '@/lib/utils';

export function GlobalModal({
  isOpen,
  config,
  onClose,
}: {
  isOpen: boolean;
  config: ModalConfig | null;
  onClose: () => void;
}) {
  if (!config) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
    full: 'max-w-[95vw] h-[90vh]',
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className={cn(sizeClasses[config.size || 'md'], 'overflow-y-auto')}>
        <DialogHeader>
          {config.title && <DialogTitle>{config.title}</DialogTitle>}
          {config.description && <DialogDescription>{config.description}</DialogDescription>}
        </DialogHeader>

        <div className="py-4">{config.content}</div>

        {config.footer && <DialogFooter>{config.footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
