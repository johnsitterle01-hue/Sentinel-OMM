import { Line, LineChart, ResponsiveContainer } from "recharts";

interface Props {
  data: number[];
  positive?: boolean;
  height?: number;
}

export function Sparkline({ data, positive = true, height = 40 }: Props) {
  if (!data || data.length === 0) return <div style={{ height }} />;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={positive ? "hsl(var(--bull))" : "hsl(var(--bear))"}
          strokeWidth={1.75}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
