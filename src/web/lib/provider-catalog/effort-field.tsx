import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useFieldPresentation } from "@web/components/form/app-form";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from "@web/components/ui/autocomplete";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@web/components/ui/field";
import { modelProviderCatalogQuery } from "@web/lib/provider-catalog/provider-catalog.queries";

const description = "Empty keeps the default of the model.";

// Suggests the model's effort levels; any effort remains accepted, and none keeps the model's default.
export function EffortField({
  modelProviderId,
  model,
}: {
  modelProviderId: string;
  model: string;
}) {
  const { field, id, descriptionId, errors, controlProps } =
    useFieldPresentation<string | null>(description);

  const { data } = useLiveSuspenseQuery(
    modelProviderCatalogQuery(modelProviderId)
  );

  const efforts =
    data?.provider.models.find(({ id: modelId }) => modelId === model)
      ?.efforts ?? [];

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>Effort</FieldLabel>
      <Autocomplete
        items={efforts}
        value={field.state.value ?? ""}
        onValueChange={(value) => field.handleChange(value || null)}
      >
        <AutocompleteInput {...controlProps} placeholder="Default" />
        <AutocompleteContent>
          <AutocompleteList>
            {(effort: string) => (
              <AutocompleteItem key={effort} value={effort}>
                {effort}
              </AutocompleteItem>
            )}
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      <FieldDescription id={descriptionId}>{description}</FieldDescription>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}
