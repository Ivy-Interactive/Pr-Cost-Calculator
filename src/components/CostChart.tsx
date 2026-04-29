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
import annotationPlugin from "chartjs-plugin-annotation";
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
  annotationPlugin,
);

interface CostChartProps {
  title: string;
  dataKey: keyof RollingDataPoint;
  yAxisLabel: string;
  ivyData?: RollingDataPoint[];
  againstData?: RollingDataPoint[];
  predictionData?: RollingDataPoint[];
  againstLabel?: string;
  /** Legacy single-dataset mode */
  data?: RollingDataPoint[];
  color?: string;
}

export function CostChart({
  title,
  dataKey,
  yAxisLabel,
  ivyData,
  againstData,
  predictionData,
  againstLabel = "Against",
  data,
  color,
}: CostChartProps) {
  // Multi-dataset mode
  const isMulti = !!(ivyData && againstData);
  const labels = isMulti ? ivyData.map((d) => d.date) : (data ?? []).map((d) => d.date);

  const datasets = isMulti
    ? [
        {
          label: `Ivy-Framework`,
          data: ivyData.map((d) => d[dataKey] as number),
          borderColor: "#4fc3f7",
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: againstLabel,
          data: againstData.map((d) => d[dataKey] as number),
          borderColor: "#ff7043",
          backgroundColor: "transparent",
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 2,
        },
        ...(predictionData
          ? [
              {
                label: `${againstLabel} + Ivy-Tendril`,
                data: predictionData.map((d) => d[dataKey] as number),
                borderColor: "#66bb6a",
                backgroundColor: "#66bb6a15",
                fill: true,
                borderDash: [6, 3],
                tension: 0.3,
                pointRadius: 2,
                borderWidth: 2,
              },
            ]
          : []),
      ]
    : [
        {
          label: title,
          data: (data ?? []).map((d) => d[dataKey] as number),
          borderColor: color ?? "#4fc3f7",
          backgroundColor: (color ?? "#4fc3f7") + "20",
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 6,
        },
      ];

  const chartData = { labels, datasets };

  const formatValue = (value: number) => {
    if (dataKey === "denialRate") return `${value.toFixed(1)}%`;
    if (dataKey === "costPerPR") return `$${value.toFixed(0)}`;
    return value.toFixed(1);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: isMulti,
        position: "bottom" as const,
        labels: { color: "#999", boxWidth: 16, font: { size: 11 } },
      },
      title: {
        display: true,
        text: title,
        font: { size: 16, weight: "bold" as const },
        color: "#e0e0e0",
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; parsed: { y: number | null } }) => {
            const label = context.dataset.label ?? "";
            const value = context.parsed.y ?? 0;
            return `${label}: ${formatValue(value)}`;
          },
        },
      },
      ...(isMulti
        ? (() => {
            const cutoffIdx = labels.findIndex((l) => l >= "Mar 02");
            return {
              annotation: {
                annotations: {
                  tendrilLine: {
                    type: "line" as const,
                    xMin: cutoffIdx,
                    xMax: cutoffIdx,
                    borderColor: "#66bb6a80",
                    borderWidth: 2,
                    borderDash: [6, 4],
                    label: {
                      display: true,
                      content: "Ivy-Tendril",
                      position: "end" as const,
                      backgroundColor: "#66bb6a20",
                      color: "#66bb6a",
                      font: { size: 13 },
                      padding: 6,
                      xAdjust: 45,
                    },
                  },
                  cliLabel: {
                    type: "line" as const,
                    xMin: cutoffIdx,
                    xMax: cutoffIdx,
                    borderColor: "transparent",
                    borderWidth: 0,
                    label: {
                      display: true,
                      content: "Claude Code CLI",
                      position: "end" as const,
                      backgroundColor: "#4fc3f720",
                      color: "#4fc3f7",
                      font: { size: 13 },
                      padding: 6,
                      xAdjust: -65,
                    },
                  },
                },
              },
            };
          })()
        : {}),
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
