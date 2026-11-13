import type { HarnessName } from "@server/lib/executions/harness.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useFieldPresentation } from "@web/components/form/app-form";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@web/components/ui/autocomplete";
import { Field, FieldError, FieldLabel } from "@web/components/ui/field";
import { modelProviderCatalogQuery } from "@web/lib/provider-catalog/provider-catalog.queries";

// Suggests the provider's models the harness, and the Assistant if asked, can drive; any model ID remains accepted.
export function ModelField({
  modelProviderId,
  harness,
  assistant = false,
}: {
  modelProviderId: string;
  harness: HarnessName;
  assistant?: boolean;
}) {
  const { field, id, errors, controlProps } = useFieldPresentation<string>();

  const { data } = useLiveSuspenseQuery(
    modelProviderCatalogQuery(modelProviderId)
  );

  const models = (data?.provider.models ?? []).filter(
    (model) =>
      model.harnesses.includes(harness) && (!assistant || model.assistant)
  );

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>Model</FieldLabel>
      <Autocomplete
        items={models}
        itemToStringValue={(model) => model.id}
        value={field.state.value}
        onValueChange={(value) => field.handleChange(value)}
      >
        <AutocompleteInput {...controlProps} />
        <AutocompleteContent>
          <AutocompleteList>
            {(model: (typeof models)[number]) => (
              <AutocompleteItem key={model.id} value={model}>
                <span className="truncate">{model.name}</span>
                <span className="text-muted-foreground truncate">
                  {model.id}
                </span>
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}
