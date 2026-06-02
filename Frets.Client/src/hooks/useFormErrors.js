import { useCallback, useState } from "react";
import { invalidControlProps, parseApiValidationError } from "../utils/formErrors";

export function useFormErrors() {
  const [errors, setErrors] = useState({});

  const clearErrors = useCallback(() => setErrors({}), []);

  const clearField = useCallback((name) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setFieldError = useCallback((name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
  }, []);

  const setFieldErrors = useCallback((map) => {
    setErrors(map ?? {});
  }, []);

  const getError = useCallback((name) => errors[name], [errors]);

  const controlProps = useCallback((name) => invalidControlProps(errors[name]), [errors]);

  const applyApiError = useCallback((err, fieldMap = {}) => {
    const { fields } = parseApiValidationError(err, fieldMap);
    if (Object.keys(fields).length === 0) return false;
    setErrors(fields);
    return true;
  }, []);

  const bindText = useCallback(
    (name, value, setValue) => ({
      value,
      onChange: (e) => {
        clearField(name);
        setValue(e.target.value);
      },
      ...controlProps(name),
    }),
    [clearField, controlProps],
  );

  return {
    errors,
    clearErrors,
    clearField,
    setFieldError,
    setFieldErrors,
    getError,
    controlProps,
    applyApiError,
    bindText,
  };
}
