import { useToast } from "@/components/ui/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();
  
  // Filter out toasts that are closed
  const openToasts = toasts.filter(t => t.open !== false);

  return (
    <ToastViewport>
      {openToasts.map(function ({ id, title, description, action, onOpenChange, open, className, ...props }) {
        const isBlueToast = className?.includes('bg-blue-50');
        return (
          <Toast key={id} {...props} open={open} className={className}>
            <div className="grid gap-1">
              {title && <ToastTitle className={isBlueToast ? "text-blue-900" : ""}>{title}</ToastTitle>}
              {description && (
                <ToastDescription className={isBlueToast ? "text-blue-800" : ""}>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose onClick={() => {
              if (onOpenChange) {
                onOpenChange(false);
              } else {
                dismiss(id);
              }
            }} />
          </Toast>
        );
      })}
    </ToastViewport>
  );
} 