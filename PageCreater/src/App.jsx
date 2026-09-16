import DynamicPageManagement from "./pages/DynamicPageManagement";
import DynamicCrudPage from "./components/DynamicCrudPage";

function App() {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");
  const mode = params.get("mode");

  // Runtime: ?page=2 or ?page=UserMaster
  if (page && mode !== "designer") {
    return <DynamicCrudPage pageId={page} />;
  }
  return <DynamicPageManagement />;
}

export default App;
