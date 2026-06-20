'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCompact } from '@/lib/format'

interface BudgetChartProps {
  data: { label: string; budget: number; actual: number }[]
}

export function BudgetChart({ data }: BudgetChartProps) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#5b6b78' }}
          axisLine={{ stroke: '#E8E0D4' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatCompact}
          tick={{ fontSize: 11, fill: '#5b6b78' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: 'rgba(14,124,157,0.06)' }}
          formatter={(v) =>
            new Intl.NumberFormat('vi-VN').format(Number(v)) + 'đ'
          }
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #E8E0D4',
            fontSize: 13,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="budget" name="Dự tính" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="actual" name="Thực tế" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.actual > d.budget ? '#F87171' : '#0E7C9D'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
