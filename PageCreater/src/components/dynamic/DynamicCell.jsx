import DynamicHtml from "./DynamicHtml";

function DynamicCell({ field, row }) {

  const value = row[field.COLNAME];

  if (field.HTML_SCRIPT) {

    return (
      <DynamicHtml
        template={field.HTML_SCRIPT}
        data={row}
      />
    );

  }

  return value ?? "";
}

export default DynamicCell;