import { useState } from "react";

export const useEditableCard = <T extends object>(initialValues: T) => {
    const [editing, setEditing] = useState(false);
    const [values, setValues] = useState<T>(initialValues);
    const [saving, setSaving] = useState(false);

    const startEditing = () => setEditing(true);

    const cancelEditing = () => {
        setValues(initialValues);
        setEditing(false);
    };

    const handleChange = <K extends keyof T>(field: K, value: T[K]) => {
        setValues((prev) => ({ ...prev, [field]: value }));
    };

    return {
        editing,
        values,
        saving,
        setSaving,
        startEditing,
        cancelEditing,
        setValues,
        handleChange,
    };
};