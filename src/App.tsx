import { QuickCalculator } from "./components/QuickCalculator";
import { ComparisonChart } from "./components/ComparisonChart";
import "./styles/index.css";

function App() {
  return (
    <div className="app">
      <header>
        <h1>PR Cost Calculator</h1>
        <p>Estimate development and AI token costs per pull request</p>
      </header>

      <div className="landing-grid">
        <QuickCalculator />
        <ComparisonChart />
      </div>
    </div>
  );
}

export default App;
