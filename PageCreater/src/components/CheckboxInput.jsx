function CheckboxInput({ field, value, error, onChange }) {
  function handleChange(event) {
    onChange(field.FIELD_NAME, event.target.checked);
  }

  return (
    <div
      className="
      flex
      min-h-[42px]
      items-center
    "
    >
      <label
        className="
        flex
        cursor-pointer
        items-center
        gap-3
      "
      >
        <input
          type="checkbox"
          name={field.FIELD_NAME}
          checked={Boolean(value)}
          disabled={field.Disabled}
          onChange={handleChange}
          className="
            h-5
            w-5
            rounded
            border-slate-300
            text-blue-600
            focus:ring-blue-500
          "
        />

        <span
          className="
          text-sm
          font-medium
          text-slate-700
        "
        >
          {field.TITLE}
        </span>
      </label>

      {error && (
        <p
          className="
          ml-3
          text-xs
          text-red-600
        "
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default CheckboxInput;
