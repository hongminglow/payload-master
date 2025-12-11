"use client";

import type { FC } from "react";
import { Button } from "@payloadcms/ui";

// Minimal prop shape; Payload will inject the onClick/disabled props it needs.
type Props = {
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
};

const CustomSaveButton: FC<Props> = ({
  onClick,
  disabled,
  label = "Save & Log",
}: Props) => {
  const handleClick = () => {
    console.log("Custom save clicked");
    onClick?.();
  };

  return (
    <Button
      size="large"
      buttonStyle="primary"
      className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
      onClick={handleClick}
      disabled={disabled}
    >
      💾 {label}
    </Button>
  );
};

export default CustomSaveButton;
