import React from 'react';
import { AlertTriangle, Info, Trash2, XCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  id?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  isLoading = false,
  id,
}) => {
  const iconConfig = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-rose-600" />,
      bg: 'bg-rose-100',
      btnVariant: 'danger' as const,
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
      bg: 'bg-amber-100',
      btnVariant: 'gold' as const,
    },
    info: {
      icon: <Info className="w-6 h-6 text-emerald-700" />,
      bg: 'bg-emerald-100',
      btnVariant: 'primary' as const,
    },
  };

  const currentConfig = iconConfig[variant];

  return (
    <Modal
      id={id}
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      showCloseButton={!isLoading}
      closeOnBackdrop={!isLoading}
      closeOnEsc={!isLoading}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={currentConfig.btnVariant}
            size="sm"
            isLoading={isLoading}
            onClick={async () => {
              await onConfirm();
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl shrink-0 ${currentConfig.bg}`}>
          {currentConfig.icon}
        </div>
        <div className="space-y-1.5 pt-0.5">
          <h3 className="text-base font-bold text-stone-900 leading-snug">{title}</h3>
          <div className="text-sm text-stone-600 leading-relaxed">{message}</div>
        </div>
      </div>
    </Modal>
  );
};
