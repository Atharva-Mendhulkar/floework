import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { chartData } from "@/data/mockData";
import { Plus, Upload, Calendar } from "lucide-react";

const ProductivityChart = () => {
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="bg-surface rounded-2xl shadow-card p-5 flex flex-col gap-4 flex-1 min-w-[280px]">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Focus Distribution</h3>
        <div className="flex items-center gap-1">
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted">
            <Plus size={14} />
          </button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted">
            <Upload size={14} />
          </button>
          <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors text-text-muted">
            <Calendar size={14} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-36 h-36 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-foreground">{total}</span>
            <span className="text-[10px] text-text-muted">sessions</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {chartData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: entry.fill }}
              />
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-foreground">{entry.value}</span>
                <span className="text-xs text-text-muted">{entry.name}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductivityChart;
