import DynamicCell from "./DynamicCell";

function DynamicGrid({ fields, rows }) {

  const columns = fields
    .filter(
      (field) => field.SHOW_IN_GRID !== false
    )
    .sort(
      (a, b) => a.SEQNO - b.SEQNO
    );

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow">

      <table className="min-w-full">

        <thead className="bg-slate-200">

          <tr>

            {columns.map((column) => (

              <th
                key={column.PAGE_PARAM_ID}
                className="px-4 py-3 text-left"
              >
                {column.COLTITLE}
              </th>

            ))}

          </tr>

        </thead>

        <tbody>

          {rows.map((row, index) => (

            <tr
              key={row.ID || index}
              className="border-t"
            >

              {columns.map((column) => (

                <td
                  key={column.PAGE_PARAM_ID}
                  className="px-4 py-3"
                >

                  <DynamicCell
                    field={column}
                    row={row}
                  />

                </td>

              ))}

            </tr>

          ))}

        </tbody>

      </table>

    </div>
  );
}

export default DynamicGrid;