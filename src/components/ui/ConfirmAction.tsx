"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import { Button } from "@heroui/react";

export default function ConfirmAction({
  open,
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  busy = false,
  destructive = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onClose={() => { if (!busy) onClose(); }} className="confirmation-dialog">
      <DialogBackdrop className="confirmation-backdrop" />
      <div className="confirmation-position">
        <DialogPanel className="confirmation-panel">
          <DialogTitle className="confirmation-title">{title}</DialogTitle>
          <Description className="confirmation-description">{description}</Description>
          <div className="confirmation-actions">
            <Button variant="outline" size="sm" onPress={onClose} isDisabled={busy} autoFocus>ยกเลิก</Button>
            <Button variant="primary" size="sm" onPress={onConfirm} isDisabled={busy} className={destructive ? "confirmation-danger" : ""}>
              {busy ? "กำลังดำเนินการ..." : confirmLabel}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
