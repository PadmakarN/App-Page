function DynamicHtml({ template, data }) {

  let html = template;

  Object.entries(data).forEach(
    ([key, value]) => {

      const regex = new RegExp(
        `{{\\s*${key}\\s*}}`,
        "g"
      );

      html = html.replace(
        regex,
        value ?? ""
      );

    }
  );

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: html
      }}
    />
  );
}

export default DynamicHtml;