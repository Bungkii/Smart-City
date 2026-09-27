"use client";

import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Check, ChevronDown } from "lucide-react";

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
  const selected = options.find(option => option.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <div className={`accessible-select ${className}`}>
        <ListboxButton className="accessible-select-button" aria-label={label}>
          <span>{selected?.label ?? "ยังไม่มีรายการ"}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </ListboxButton>
        <ListboxOptions anchor="bottom start" className="accessible-select-options">
          {options.map(option => (
            <ListboxOption key={option.value} value={option.value} className="accessible-select-option">
              <span>{option.label}</span>
              <Check size={15} aria-hidden="true" className="accessible-select-check" />
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
