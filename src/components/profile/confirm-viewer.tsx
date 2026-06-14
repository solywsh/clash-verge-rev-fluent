import { useTranslation } from "react-i18next";
import { BaseDialog } from "@/components/base";

interface Props {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmViewer = (props: Props) => {
  const { open, title, message, onClose, onConfirm } = props;

  const { t } = useTranslation();

  return (
    <BaseDialog
      open={open}
      title={title}
      okBtn={t("Confirm")}
      cancelBtn={t("Cancel")}
      contentSx={{ pb: 1, userSelect: "text" }}
      onClose={onClose}
      onCancel={onClose}
      onOk={onConfirm}
    >
      {message}
    </BaseDialog>
  );
};
