import { useEffect, useState } from "react";
import DynamicField from "../components/dynamic/DynamicField";
import PagePreviewModal from "./PagePreviewModal";

function DynamicPage({
  pageKey = "APP_PAGE_MST",
  previewData = null,
  previewMode = false,
}) {
  const [page, setPage] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // --------------------------------------------------
  // LOAD PAGE
  // --------------------------------------------------

  useEffect(() => {
  if (previewData) {
    setPage(previewData);

    initializeForm(previewData.fields || []);

    setLoading(false);
    setError("");
    return;
  }

  loadPage();
}, [pageKey, previewData]);

  async function loadPage() {
    try {
      setLoading(true);
      setError("");
     
        const response = await fetch(`/api/pages/${pageKey}`);
        const data = await response.json();
     
      if (!data?.success || !data?.page) {
        throw new Error("Invalid page configuration");
      }

      setPage(data);
      initializeForm(data.fields);
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to load page");
    } finally {
      setLoading(false);
    }
  }

  // --------------------------------------------------
  // INITIAL FORM DATA
  // --------------------------------------------------

  function initializeForm(fields) {
    const initialData = {};

    fields.forEach((field) => {
      let value = "";

      // Default value
      if (field.DefaultValue !== undefined && field.DefaultValue !== "") {
        value = getDefaultValue(field.DefaultValue);
      }

      // Boolean field
      if (field.DATA_TYPE === "BOOL") {
        value = field.DefaultValue === true || field.DefaultValue === "true";
      }

      initialData[field.FIELD_NAME] = value;
    });

    setFormData(initialData);
  }

  // --------------------------------------------------
  // DEFAULT VALUE
  // --------------------------------------------------

  function getDefaultValue(defaultValue) {
    if (defaultValue === "#datetime") {
      return new Date().toISOString().slice(0, 16);
    }

    if (defaultValue === "#useridname") {
      return "";
    }

    return defaultValue;
  }

  // --------------------------------------------------
  // FIELD CHANGE
  // --------------------------------------------------

  function handleChange(name, value) {
    setFormData((previous) => ({
      ...previous,

      [name]: value,
    }));

    // Clear field error
    setErrors((previous) => {
      if (!previous[name]) {
        return previous;
      }

      const newErrors = {
        ...previous,
      };

      delete newErrors[name];

      return newErrors;
    });
  }

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  function validateForm() {
    const validationErrors = {};

    page.fields.forEach((field) => {
      if (!field.MANDATORY) {
        return;
      }

      const value = formData[field.FIELD_NAME];

      // Boolean
      if (field.DATA_TYPE === "BOOL") {
        return;
      }

      // Empty
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        validationErrors[field.FIELD_NAME] = `${field.TITLE} is required`;

        return;
      }

      // Max length
      if (field.MaxSize > 0 && String(value).length > field.MaxSize) {
        validationErrors[field.FIELD_NAME] =
          `${field.TITLE} cannot exceed ${field.MaxSize} characters`;
      }
    });

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();
     if (previewMode) {
    return;
    }
    setSuccess("");

    setError("");

    const isValid = validateForm();

    if (!isValid) {
      return;
    }

    try {
      console.log("Submitting:", formData);

      /*
        भविष्यात backend:

        const response = await fetch(
          `/api/pages/${pageKey}`,
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json"
            },

            body: JSON.stringify(formData)
          }
        );

        const result = await response.json();
      */

      setSuccess("Form submitted successfully!");
    } catch (err) {
      console.error(err);

      setError(err.message || "Unable to save data");
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div
        className="
        flex
        min-h-screen
        items-center
        justify-center
        bg-slate-100
      "
      >
        <div
          className="
          rounded-xl
          bg-white
          px-8
          py-6
          shadow-lg
        "
        >
          Loading page...
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error && !page) {
    return (
      <div
        className="
        mx-auto
        max-w-5xl
        px-4
        py-10
      "
      >
        <div
          className="
          rounded-xl
          border
          border-red-200
          bg-red-50
          p-5
          text-red-700
        "
        >
          {error}
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div
      className="
      min-h-screen
      bg-slate-100
      px-3
      py-6
      sm:px-6
      lg:px-8
    "
    >
      <div
        className="
        mx-auto
        w-full
        max-w-7xl
      "
      >
        <div
          className="
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-xl
        "
        >
          {/* =========================================
              HEADER
          ========================================= */}

          <div
            className="
            bg-gradient-to-r
            from-gray-600
            to-gray-600
            px-5
            py-6
            sm:px-8
            sm:py-8
          "
          >
            <h1
              className="
              text-2xl
              font-bold
              text-white
              justify
              sm:text-3xl
            "
            >
              {page.page.TITLE}
            </h1>

            <p
              className="
              hidden
              md:block
              mt-2
              text-sm
              text-blue-100
              sm:text-base
            "
            >
              Page: {page.page.PAGE_NAME}
            </p>
          </div>

          {/* =========================================
              FORM
          ========================================= */}

          <form
            onSubmit={handleSubmit}
            className="
              p-4
              sm:p-6
              lg:p-8
            "
          >
            {/* ERROR */}

            {error && (
              <div
                className="
                mb-6
                rounded-lg
                border
                border-red-200
                bg-red-50
                p-4
                text-sm
                text-red-700
              "
              >
                {error}
              </div>
            )}

            {/* SUCCESS */}

            {success && (
              <div
                className="
                mb-6
                rounded-lg
                border
                border-green-200
                bg-green-50
                p-4
                text-sm
                text-green-700
              "
              >
                {success}
              </div>
            )}

            {/* =======================================
                GROUPS
            ======================================= */}

            {renderGroups(page.fields, formData, errors, handleChange)}

            {/* =======================================
                BUTTONS
            ======================================= */}

            <div
              className="
              mt-8
              flex
              flex-col
              gap-3
              border-t
              pt-6
              sm:flex-row
            "
            >
              <button
                type="submit"
                className="
                  w-full
                  rounded-lg
                  bg-blue-600
                  px-6
                  py-3
                  font-semibold
                  text-white
                  shadow
                  transition
                  hover:bg-blue-700
                  focus:outline-none
                  focus:ring-2
                  focus:ring-blue-500
                  focus:ring-offset-2
                  sm:w-auto
                "
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => initializeForm(page.fields)}
                className="
                  w-full
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-6
                  py-3
                  font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  sm:w-auto
                "
              >
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* =========================================
            DEBUG
        ========================================= */}

        <div
          className="
          mt-6
          overflow-hidden
          rounded-xl
          bg-slate-900
          p-4
          sm:p-5
        "
        >
          <div
            className="
            mb-3
            font-semibold
            text-white
          "
          >
            Current Form Data
          </div>

          <pre
            className="
            overflow-auto
            text-xs
            text-green-400
            sm:text-sm
          "
          >
            {JSON.stringify(formData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// GROUP RENDERER
// ======================================================

function renderGroups(fields, formData, errors, handleChange) {
  const groups = {};

  fields.forEach((field) => {
    const groupName = field.GROUPNAME || "MAIN";

    if (!groups[groupName]) {
      groups[groupName] = [];
    }

    groups[groupName].push(field);
  });

  return Object.entries(groups).map(([groupName, groupFields]) => (
    <div key={groupName} className="mb-8">
      <div
        className="
          mb-5
          border-b
          border-slate-200
          pb-2
        "
      >
        <h2
          className="
            text-lg
            font-semibold
            text-slate-800
          "
        >
          {groupName}
        </h2>
      </div>

      <div
        className="
          grid
          grid-cols-1
          gap-5
          md:grid-cols-2
          lg:grid-cols-12
        "
      >
        {groupFields
          .sort((a, b) => a.SEQNO - b.SEQNO)
          .map((field) => (
            <DynamicField
              key={field.PAGE_PARAM_ID}
              field={field}
              value={formData[field.FIELD_NAME]}
              error={errors[field.FIELD_NAME]}
              onChange={handleChange}
            />
          ))}
      </div>
    </div>
  ));
}

export default DynamicPage;
