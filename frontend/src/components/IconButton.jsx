import React from "react";

/**
 * IconButton
 * Props:
 *  - variant (bootstrap variant string): primary, danger, warning, success, info, secondary
 *  - size: "sm" or undefined (we only use sm)
 *  - icon: React node (e.g. <FontAwesomeIcon icon={faTrash} />)
 *  - className, title, aria-label, onClick, etc.
 */
export default function IconButton({
  variant = "primary",
  size = "sm",
  icon,
  className = "",
  ...rest
}) {
  const sizeClass = size === "sm" ? "btn-sm" : "";
  // Force text-white for variants that usually render dark text (like warning)
  const needWhiteText = [
    "warning",
    "primary",
    "danger",
    "success",
    "info",
    "dark",
  ].includes(variant);
  const textClass = needWhiteText ? "text-white" : "";
  return (
    <button
      type="button"
      className={`btn btn-${variant} ${sizeClass} btn-icon ${textClass} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}
