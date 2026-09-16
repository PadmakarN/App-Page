import { useState } from "react";
import DynamicPage from "./DynamicPage";

function PagePreviewModal({ open, onClose, previewData }) {
  const [device, setDevice] = useState("desktop");

  if (!open || !previewData) {
    return null;
  }

  const deviceClass = {
    desktop: "w-full max-w-[1200px]",
    tablet: "w-[820px] max-w-[92vw]",
    mobile: "w-[390px] max-w-[92vw]",
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full flex-col">
        {/* HEADER */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-5">
          <div>
            <h2 className="font-semibold text-slate-800">Page Preview</h2>

            <p className="text-xs text-slate-500">
              {previewData.page?.TITLE || previewData.page?.PAGE_NAME || ""}
            </p>
          </div>

          {/* DEVICE SWITCHER */}
          <div className="flex items-center gap-1 rounded-lg border bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setDevice("desktop")}
              className={`rounded-md px-3 py-2 text-sm ${
                device === "desktop"
                  ? "bg-white font-semibold text-blue-600 shadow"
                  : "text-slate-500 hover:bg-white"
              }`}
            >
              Desktop
            </button>

            <button
              type="button"
              onClick={() => setDevice("tablet")}
              className={`rounded-md px-3 py-2 text-sm ${
                device === "tablet"
                  ? "bg-white font-semibold text-blue-600 shadow"
                  : "text-slate-500 hover:bg-white"
              }`}
            >
              Tablet
            </button>

            <button
              type="button"
              onClick={() => setDevice("mobile")}
              className={`rounded-md px-3 py-2 text-sm ${
                device === "mobile"
                  ? "bg-white font-semibold text-blue-600 shadow"
                  : "text-slate-500 hover:bg-white"
              }`}
            >
              Mobile
            </button>
          </div>

          {/* CLOSE */}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        {/* PREVIEW AREA */}
        <div className="flex flex-1 justify-center overflow-auto bg-slate-100 p-6">
          <div
            className={`${deviceClass[device]} h-fit min-h-full overflow-hidden rounded-xl border bg-white shadow-xl transition-all duration-300`}
          >
            {/* Browser bar */}
            <div className="flex h-9 items-center gap-2 border-b bg-slate-50 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-300" />
              <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-[10px] text-slate-400">
                Preview
              </div>
            </div>

            {/* ACTUAL DYNAMIC PAGE */}
            <div className="min-h-[600px]">
              <DynamicPage
                pageKey={previewData.page?.PAGE_NAME || ""}
                previewData={previewData}
                previewMode={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PagePreviewModal;
