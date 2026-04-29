import { QuickCalculator } from "./components/QuickCalculator";
import { ComparisonChart } from "./components/ComparisonChart";
import { GitHubAuth } from "./components/GitHubAuth";
import "./styles/index.css";

function App() {
  return (
    <div className="app">
      <header>
        <div className="header-row">
          <div>
            <h1>PR Cost Calculator</h1>
            <p>Estimate development and AI token costs per pull request</p>
          </div>
          <GitHubAuth />
        </div>
      </header>

      <div className="landing-grid">
        <QuickCalculator />
        <ComparisonChart />
      </div>
    </div>
  );
}

export default App;
