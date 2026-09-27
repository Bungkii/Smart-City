"use client";

import { Label, ListBox, Select } from "@heroui/react";

type Option = { value: string; label: string };

export default function AccessibleSelect({
  label,
  value,
  onChange,
  options,
  disabled = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Select
      className={`dashboard-select ${className}`}
      value={value || null}
      onChange={key => onChange(key === null ? "" : String(key))}
      isDisabled={disabled}
      placeholder="ยังไม่มีรายการ"
      variant="secondary"
      fullWidth
    >
      <Label className="dashboard-select-label">{label}</Label>
      <Select.Trigger className="dashboard-select-trigger">
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className="dashboard-select-popover" placement="bottom start">
        <ListBox aria-label={label}>
          {options.map(option => (
            <ListBox.Item key={option.value} id={option.value} textValue={option.label}>
              <Label>{option.label}</Label>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
