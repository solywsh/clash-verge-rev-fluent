import { ReactNode } from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Spinner,
} from "@fluentui/react-components";

interface Props {
  title: ReactNode;
  open: boolean;
  okBtn?: ReactNode;
  cancelBtn?: ReactNode;
  disableOk?: boolean;
  disableCancel?: boolean;
  disableFooter?: boolean;
  // Kept for source compatibility with the ~22 existing callers: applied to a
  // wrapper inside the Fluent surface so per-dialog sizing/scroll is preserved.
  // To be removed as each viewer's inner controls are migrated to Fluent.
  contentSx?: SxProps<Theme>;
  children?: ReactNode;
  loading?: boolean;
  onOk?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface DialogRef {
  open: () => void;
  close: () => void;
}

export const BaseDialog: React.FC<Props> = (props) => {
  const {
    open,
    title,
    children,
    okBtn,
    cancelBtn,
    contentSx,
    disableCancel,
    disableOk,
    disableFooter,
    loading,
  } = props;

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (!data.open) props.onClose?.();
      }}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>

          <DialogContent>
            <Box sx={contentSx}>{children}</Box>
          </DialogContent>

          {!disableFooter && (
            <DialogActions>
              {!disableCancel && (
                <Button appearance="secondary" onClick={props.onCancel}>
                  {cancelBtn}
                </Button>
              )}
              {!disableOk && (
                <Button
                  appearance="primary"
                  disabled={loading}
                  icon={loading ? <Spinner size="tiny" /> : undefined}
                  onClick={props.onOk}
                >
                  {okBtn}
                </Button>
              )}
            </DialogActions>
          )}
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
