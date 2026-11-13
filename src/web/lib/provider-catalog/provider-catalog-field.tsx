import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useFieldPresentation } from "@web/components/form/app-form";
import { Button } from "@web/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@web/components/ui/combobox";
import { Field, FieldError, FieldLabel } from "@web/components/ui/field";
import { ModelProviderIcon } from "@web/lib/model-providers/model-provider-icon";

import { providerCatalogListQuery } from "./provider-catalog.queries";

export function ProviderCatalogField({
  onSelect,
}: {
  onSelect: (provider: { name: string; baseUrl: string | null }) => void;
}) {
  const { field, id, errors, controlProps } = useFieldPresentation<string>();
  const { data: providers } = useLiveSuspenseQuery(providerCatalogListQuery());

  const selected = providers.find(
    (provider) => provider.id === field.state.value
  );

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>Provider</FieldLabel>
      <Combobox
        items={providers}
        value={selected ?? null}
        itemToStringLabel={(provider) => provider.name}
        isItemEqualToValue={(provider, value) => provider.id === value.id}
        limit={10}
        onValueChange={(provider) => {
          if (provider) {
            field.handleChange(provider.id);
            onSelect(provider);
            controlProps.onBlur();
          }
        }}
      >
        <ComboboxTrigger
          {...controlProps}
          render={<Button type="button" variant="outline" />}
          // oxlint-disable-next-line shadcn/no-restyle align icon y & left
          className="w-full justify-between pl-1.5"
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected && (
              <ModelProviderIcon catalogId={selected.id} size="xs" />
            )}
            <span className="truncate">
              <ComboboxValue placeholder="Select a provider" />
            </span>
          </span>
        </ComboboxTrigger>
        <ComboboxContent>
          <ComboboxInput
            aria-label="Search providers"
            placeholder="Search providers…"
            showTrigger={false}
          />
          <ComboboxEmpty>No providers found.</ComboboxEmpty>
          <ComboboxList>
            {(provider: (typeof providers)[number]) => (
              <ComboboxItem key={provider.id} value={provider}>
                <ModelProviderIcon catalogId={provider.id} size="xs" />
                <span className="truncate">{provider.name}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}
