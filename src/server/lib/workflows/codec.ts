import { handle, isChild } from "./handle";
import type { Extra } from "./handle";
import { childParts } from "./runtime";
import type { Instance } from "./runtime";
import type { Fields, Json } from "./storage.types";

const isObject = (value: unknown): value is object =>
  typeof value === "object" && value !== null;

const isJson = (value: unknown): value is Json =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  (Array.isArray(value) && value.every(isJson)) ||
  (isObject(value) &&
    Object.getPrototypeOf(value) === Object.prototype &&
    Object.values(value).every(isJson));

const isFunction = (value: unknown): value is () => void =>
  typeof value === "function";

export function encode({ workflow, type, id }: Instance): Fields {
  const fields: Fields = {};

  for (const key of Object.keys(workflow)) {
    const value: unknown = Object.getOwnPropertyDescriptor(
      workflow,
      key
    )?.value;

    if (isChild(value)) {
      fields[key] = { child: value.id };
    } else if (value === undefined || isJson(value)) {
      fields[key] = { value: structuredClone(value) };
    } else if (!isFunction(value)) {
      throw new Error(
        `The field ${key} of the workflow ${type} ${id} holds neither JSON nor a child`
      );
    }
  }

  return fields;
}

export function install(instance: Instance, fields: Fields) {
  for (const [key, field] of Object.entries(fields)) {
    if (Object.hasOwn(instance.workflow, key)) {
      Object.assign(instance.workflow, {
        [key]:
          "child" in field
            ? handle<Extra>(...childParts(instance, field.child))
            : structuredClone(field.value),
      });
    }
  }
}
