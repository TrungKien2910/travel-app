'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCompact } from '@/lib/format'

interface SpendChartProps {
  data: { name: string; total: number }[]
}

const palette = ['#0E7C9D', '#1A9CB8', '#F2994A', '#0B5E78', '#E07A2E']

export function SpendChart({ data }: SpendChartProps) {
  if (!data.length) return null
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEAE0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 12, fill: '#5b6b78' }}
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
          formatter={(value) => [
            new Intl.NumberFormat('vi-VN').format(Number(value)) + 'đ',
            'Chi tiêu',
          ]}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #E8E0D4',
            fontSize: 13,
          }}
        />
        <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={56}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
