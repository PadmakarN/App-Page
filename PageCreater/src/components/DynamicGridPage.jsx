import { useEffect, useState } from "react";
import DynamicGrid from "../components/dynamic/DynamicGrid";
import pageData from "../data/page.json";

function DynamicGridPage({ pageKey }) {

  const [page, setPage] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, [pageKey]);

  async function loadPage() {

    try {

      setLoading(true);

      // Future API
      const response =
         await fetch(`/api/pages/${pageKey}/grid`);
     const data = await response.json();

      //const data = pageData;

      setPage(data);
      setRows(data.rows || []);

    } catch (error) {

      console.error(error);

    } finally {

      setLoading(false);

    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">

      <div className="mx-auto max-w-7xl">

        <h1 className="mb-6 text-2xl font-bold">
          {page.page.TITLE}
        </h1>

        <DynamicGrid
          fields={page.fields}
          rows={rows}
        />

      </div>

    </div>
  );
}

export default DynamicGridPage;