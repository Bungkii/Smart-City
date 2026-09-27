"use client";

import { AlertDialog, Button } from "@heroui/react";

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
    <AlertDialog>
      <AlertDialog.Backdrop
        isOpen={open}
        onOpenChange={nextOpen => { if (!nextOpen && !busy) onClose(); }}
        isDismissable={!busy}
        isKeyboardDismissDisabled={busy}
        variant="blur"
        className="confirmation-backdrop"
      >
        <AlertDialog.Container placement="center" size="sm">
          <AlertDialog.Dialog className="confirmation-panel">
            <AlertDialog.Header>
              <AlertDialog.Heading className="confirmation-title">{title}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="confirmation-description">{description}</AlertDialog.Body>
            <AlertDialog.Footer className="confirmation-actions">
              <Button variant="outline" size="sm" onPress={onClose} isDisabled={busy} autoFocus>ยกเลิก</Button>
              <Button variant={destructive ? "danger" : "primary"} size="sm" onPress={onConfirm} isDisabled={busy}>
                {busy ? "กำลังดำเนินการ..." : confirmLabel}
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}
