import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { useBlocker } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { Markdown } from "@web/components/markdown";
import { ActionBar } from "@web/components/ui/action-bar";
import { Alert, AlertDescription } from "@web/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@web/components/ui/alert-dialog";
import { Button } from "@web/components/ui/button";
import { ButtonGroup } from "@web/components/ui/button-group";
import { Code, CodeInput, CodeTextarea } from "@web/components/ui/code";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import { Spinner } from "@web/components/ui/spinner";
import { Switch } from "@web/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@web/components/ui/tabs";
import { Textarea } from "@web/components/ui/textarea";
import { errorDetail } from "@web/lib/errors";
import type {
  ChangeEvent,
  ComponentProps,
  KeyboardEvent,
  ReactNode,
  SubmitEvent,
} from "react";
import { createContext, use, useId, useState } from "react";

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

const SubmitErrorContext = createContext<Error | undefined>(undefined);

export function useFieldPresentation<T>(description?: string) {
  const field = useFieldContext<T>();
  const id = useId();
  const descriptionId = description ? `${id}-description` : undefined;

  const submissionAttempts = useSelector(
    field.form.store,
    (state) => state.submissionAttempts
  );

  const errors =
    field.state.meta.isBlurred || submissionAttempts > 0
      ? field.state.meta.errors
      : [];

  const controlProps = {
    id,
    name: field.name,
    onBlur: () => {
      field.handleBlur();
      void field.validate("change");
    },
    "aria-invalid": errors.length > 0,
    "aria-describedby":
      [descriptionId, errors.length > 0 ? `${id}-error` : undefined]
        .filter(Boolean)
        .join(" ") || undefined,
  };

  return { field, id, descriptionId, errors, controlProps };
}

function TextField({
  label,
  description,
  multiline = false,
  ...props
}: {
  label: string;
  description?: string;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  autoComplete?: string;
  type?: ComponentProps<"input">["type"];
}) {
  const { field, id, descriptionId, errors, controlProps } =
    useFieldPresentation<string>(description);

  const inputProps = {
    ...props,
    ...controlProps,
    value: field.state.value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      field.handleChange(event.target.value);
    },
  };

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? <Textarea {...inputProps} /> : <Input {...inputProps} />}
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}

function CodeField({
  label,
  description,
  example,
  multiline = false,
  placeholder,
  children,
}: {
  label: string;
  description?: string;
  example: string;
  multiline?: boolean;
  placeholder?: string;
  children?: ReactNode;
}) {
  const { field, id, descriptionId, errors, controlProps } =
    useFieldPresentation<string>(example);

  const inputProps = {
    ...controlProps,
    placeholder,
    value: field.state.value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      field.handleChange(event.target.value);
    },
  };

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <CodeTextarea {...inputProps} />
      ) : (
        <CodeInput {...inputProps} />
      )}
      <FieldDescription id={descriptionId}>
        {description} Example: <Code>{example}</Code>
      </FieldDescription>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
      {children}
    </Field>
  );
}

function MarkdownField({
  label,
  readOnly = false,
  className,
}: {
  label: string;
  readOnly?: boolean;
  className?: string;
}) {
  const { field, id, errors, controlProps } = useFieldPresentation<string>();

  if (readOnly) {
    return (
      <Field>
        <FieldTitle>{label}</FieldTitle>
        <Markdown mode="static">{field.state.value}</Markdown>
      </Field>
    );
  }

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Tabs defaultValue={field.state.value ? "preview" : "edit"}>
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>
        <TabsContent value="preview">
          <Markdown mode="static">{field.state.value}</Markdown>
        </TabsContent>
        <TabsContent value="edit" keepMounted>
          <Textarea
            {...controlProps}
            className={className}
            value={field.state.value}
            onChange={(event) => field.handleChange(event.target.value)}
          />
        </TabsContent>
      </Tabs>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}

interface FieldOption<T> {
  value: T;
  label: string;
  icon?: ReactNode;
}

function SelectField({
  label,
  description,
  options,
  placeholder = "Select an option",
  disabled = false,
  openLink,
}: {
  label: string;
  description?: string;
  options: FieldOption<string | null>[];
  placeholder?: string;
  disabled?: boolean;
  openLink?: ReactNode;
}) {
  const { field, id, descriptionId, errors, controlProps } =
    useFieldPresentation<string | null>(description);

  // The popup takes the focus: the field is blurred once it closes.
  const { onBlur, ...triggerProps } = controlProps;

  const trigger = (
    <SelectTrigger {...triggerProps} className="w-full">
      <SelectValue>
        {(value) => {
          const option = options.find((item) => item.value === value);

          return option ? (
            <>
              {option.icon}
              {option.label}
            </>
          ) : (
            placeholder
          );
        }}
      </SelectValue>
    </SelectTrigger>
  );

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        items={options}
        value={field.state.value}
        disabled={disabled}
        onValueChange={(value) => {
          // Base UI reports a pick of the current value too.
          if (value !== field.state.value) {
            field.handleChange(value);
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            onBlur();
          }
        }}
      >
        {openLink ? (
          <ButtonGroup className="w-full">
            {trigger}
            {openLink}
          </ButtonGroup>
        ) : (
          trigger
        )}
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value ?? ""} value={option.value}>
              {option.icon}
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <FieldDescription id={descriptionId}>{description}</FieldDescription>
      )}
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}

function SwitchField({
  label,
  description,
  disabled,
}: {
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const { field, id, descriptionId, controlProps } =
    useFieldPresentation<boolean>(description);

  return (
    <Field orientation="horizontal">
      <Switch
        {...controlProps}
        checked={field.state.value}
        disabled={disabled}
        onCheckedChange={(checked) => {
          field.handleChange(checked);
        }}
      />
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {description && (
          <FieldDescription id={descriptionId}>{description}</FieldDescription>
        )}
      </FieldContent>
    </Field>
  );
}

function SubmitButton({ children }: { children: ReactNode }) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.isSubmitting}>
      {(isSubmitting) => (
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}

function SaveBar({ children }: { children: ReactNode }) {
  const form = useFormContext();

  return (
    <form.Subscribe
      selector={(state) => ({
        isDirty: !state.isDefaultValue,
        isSubmitting: state.isSubmitting,
      })}
    >
      {({ isDirty, isSubmitting }) =>
        isDirty && (
          <ActionBar status="Unsaved changes" alert={<FormError />}>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => form.reset()}
            >
              Discard
            </Button>
            <SubmitButton>{children}</SubmitButton>
          </ActionBar>
        )
      }
    </form.Subscribe>
  );
}

function LeaveGuard() {
  const form = useFormContext();

  const hasUnsavedChanges = () =>
    !form.state.isDefaultValue && !form.state.isSubmitting;

  const { status, proceed, reset } = useBlocker({
    shouldBlockFn: hasUnsavedChanges,
    enableBeforeUnload: hasUnsavedChanges,
    withResolver: true,
  });

  return (
    <AlertDialog
      open={status === "blocked"}
      onOpenChange={(open) => {
        if (!open) {
          reset?.();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            If you leave this page, your changes are lost.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={proceed}>
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function FormError() {
  const error = use(SubmitErrorContext);

  return (
    error && (
      <Alert variant="destructive">
        <AlertDescription>{errorDetail(error)}</AlertDescription>
      </Alert>
    )
  );
}

function Form({ children }: { children: ReactNode }) {
  const form = useFormContext();
  const [error, setError] = useState<Error>();

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    // A key can submit twice before the first submission settles.
    if (form.state.isSubmitting) {
      return;
    }

    setError(undefined);
    await form.handleSubmit().catch(setError);
  }

  function submitOnModEnter(event: KeyboardEvent<HTMLFormElement>) {
    if (
      event.key === "Enter" &&
      (event.metaKey || event.ctrlKey) &&
      !form.state.isDefaultValue
    ) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    }
  }

  return (
    <SubmitErrorContext value={error}>
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions the keys reach it from its fields */}
      <form
        noValidate
        className="grid gap-6"
        onKeyDown={submitOnModEnter}
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        {children}
        <LeaveGuard />
      </form>
    </SubmitErrorContext>
  );
}

export const { useAppForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    CodeField,
    MarkdownField,
    SelectField,
    SwitchField,
  },
  formComponents: { Form, FormError, SubmitButton, SaveBar },
});
