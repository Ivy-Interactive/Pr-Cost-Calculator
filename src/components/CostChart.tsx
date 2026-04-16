import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import type { RollingDataPoint } from "../lib/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface CostChartProps {
  data: RollingDataPoint[];
  title: string;
  dataKey: keyof RollingDataPoint;
  color: string;
  yAxisLabel: string;
}

export function CostChart({
  data,
  title,
  dataKey,
  color,
  yAxisLabel,
}: CostChartProps) {
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: title,
        data: data.map((d) => d[dataKey] as number),
        borderColor: color,
        backgroundColor: color + "20",
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: "bold" as const },
        color: "#e0e0e0",
      },
      tooltip: {
        callbacks: {
          label: (context: { parsed: { y: number | null } }) => {
            const value = context.parsed.y ?? 0;
            if (dataKey === "denialRate") return `${value.toFixed(1)}%`;
            if (dataKey === "costPerPR") return `$${value.toFixed(0)}`;
            return value.toFixed(1);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel,
          color: "#999",
        },
        grid: { color: "#333" },
        ticks: { color: "#999" },
      },
      x: {
        grid: { color: "#333" },
        ticks: { color: "#999" },
      },
    },
  };

  return (
    <div className="chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
}
