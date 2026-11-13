import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";

interface RoleOption<T extends string> {
  label: string;
  value: T;
}

export function RoleSelect<T extends string>({
  ariaLabel,
  value,
  options,
  editable,
  onChange,
}: {
  ariaLabel: string;
  value: T;
  options: RoleOption<T>[];
  editable: boolean;
  onChange: (role: T) => void;
}) {
  if (!editable) {
    return options.find((option) => option.value === value)?.label;
  }

  return (
    <Select
      items={options}
      value={value}
      onValueChange={(role) => {
        if (role !== null) {
          onChange(role);
        }
      }}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
