import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useFieldPresentation } from "@web/components/form/app-form";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@web/components/ui/combobox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@web/components/ui/field";
import {
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@web/components/ui/item";
import type { Skill } from "@web/lib/skills/skill.collection";
import { skillListQuery } from "@web/lib/skills/skill.queries";

const description =
  "Each execution receives them, as the skills of a repository. A deleted skill stays selected, but executions do not receive it.";

export function AgentSkillsField() {
  const { field, id, descriptionId, errors, controlProps } =
    useFieldPresentation<string[]>(description);

  const { data } = useLiveSuspenseQuery(skillListQuery("", true));
  const skills = data.map(({ skill }) => skill);

  const selected = skills.filter(({ id: skillId }) =>
    field.state.value.includes(skillId)
  );

  const options = skills.filter(({ deletedAt }) => deletedAt === null);
  const anchor = useComboboxAnchor();

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>Skills</FieldLabel>
      <Combobox
        multiple
        items={options}
        value={selected}
        itemToStringLabel={(skill) => skill.name}
        isItemEqualToValue={(skill, value) => skill.id === value.id}
        onValueChange={(values) => {
          field.handleChange(values.map((skill) => skill.id));
          controlProps.onBlur();
        }}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(values: Skill[]) => (
              <>
                {values.map((skill) => (
                  <ComboboxChip key={skill.id}>
                    {skill.deletedAt ? `${skill.name} (deleted)` : skill.name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  {...controlProps}
                  placeholder={values.length > 0 ? "" : "Select skills"}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>No skills found.</ComboboxEmpty>
          <ComboboxList>
            {(skill: Skill) => (
              <ComboboxItem key={skill.id} value={skill}>
                <ItemContent className="min-w-0">
                  <ItemTitle>{skill.name}</ItemTitle>
                  <ItemDescription>{skill.description}</ItemDescription>
                </ItemContent>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription id={descriptionId}>{description}</FieldDescription>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}
