"use client";

import { useRef } from "react";
import { FormSubmit, useForm, useFormModified } from "@payloadcms/ui";
import { useHotkey } from "@payloadcms/ui/hooks/useHotkey";
import { useDocumentInfo } from "@payloadcms/ui/providers/DocumentInfo";
import { useEditDepth } from "@payloadcms/ui/providers/EditDepth";
import { useOperation } from "@payloadcms/ui/providers/Operation";
import { useTranslation } from "@payloadcms/ui/providers/Translation";

type Props = {
  label?: string;
};

export default function CustomSaveButton({ label: labelProp }: Props) {
  const { uploadStatus } = useDocumentInfo();
  const { t } = useTranslation();
  const { submit } = useForm() as unknown as { submit?: () => Promise<unknown> | void };
  const modified = useFormModified();
  const editDepth = useEditDepth();
  const operation = useOperation();

  const passedLabel =
    typeof labelProp === "string" && labelProp.trim().length > 0
      ? labelProp
      : undefined;

  const defaultSaveLabel = t("general:save") || "Save";
  const label = passedLabel || `${defaultSaveLabel} (Log)`;
  const ref = useRef<HTMLButtonElement | null>(null);

  const disabled =
    (operation === "update" && !modified) || uploadStatus === "uploading";

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ["s"] }, (e) => {
    if (disabled) {
      // absorb the event
    }

    e.preventDefault();
    e.stopPropagation();
    if (ref?.current) {
      ref.current.click();
    }
  });

  const handleSubmit = () => {
    if (uploadStatus === "uploading") {
      return;
    }

    console.log("[ADMIN] Custom save clicked");

    if (typeof submit !== "function") {
      console.error(
        "[ADMIN] CustomSaveButton: form submit function is unavailable. This usually means multiple copies of @payloadcms/ui are installed (version mismatch). Align @payloadcms/* and payload versions, reinstall, and restart dev."
      );
      return;
    }

    return void submit();
  };

  return (
    <FormSubmit
      buttonId="action-save"
      className="custom-save-button"
      disabled={disabled}
      onClick={handleSubmit}
      ref={ref}
      size="medium"
      type="button"
    >
      <img
        src="/custom-save.svg"
        alt=""
        aria-hidden="true"
        className="custom-save-button__icon"
      />
      <span className="custom-save-button__label">{label}</span>
      <span className="custom-save-button__badge">CUSTOM</span>
    </FormSubmit>
  );
}
