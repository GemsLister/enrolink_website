import { useMemo } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

export default function QuickChart({ type, data, options, className, style }) {
  const cfg = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2) return null
    const headers = data[0]
    const rows = data.slice(1)
    const isPie = type === 'PieChart'
    const isBar = type === 'BarChart'

    const legendStyleColor = options && options.legend && options.legend.textStyle && options.legend.textStyle.color
    const chartBg = options && options.backgroundColor

    if (isPie) {
      const colors = (() => {
        const s = options && options.slices
        if (!s || typeof s !== 'object') return undefined
        const out = []
        for (let i = 0; i < rows.length; i += 1) {
          const entry = s[i]
          out.push(entry && entry.color ? entry.color : undefined)
        }
        return out
      })()
      const seriesData = rows.map((r, i) => ({ name: String(r[0]), y: Number(r[1] || 0), color: colors ? colors[i] : undefined }))
      return {
        chart: { type: 'pie', backgroundColor: chartBg },
        title: { text: undefined },
        legend: { align: 'center', verticalAlign: 'bottom', itemStyle: { color: legendStyleColor } },
        tooltip: { pointFormat: '<b>{point.percentage:.1f}%</b>' },
        plotOptions: { pie: { allowPointSelect: true, cursor: 'pointer', dataLabels: { enabled: false } } },
        series: [{ type: 'pie', name: String(headers[1] || ''), data: seriesData }],
      }
    }

    const categories = rows.map(r => String(r[0]))
    const seriesNames = headers.slice(1)
    const series = seriesNames.map((name, idx) => {
      const values = rows.map(r => Number(r[idx + 1] || 0))
      const s = options && options.slices
      const entry = s && typeof s === 'object' ? s[idx] : undefined
      const color = entry && entry.color ? entry.color : undefined
      return { name: String(name), data: values, color }
    })
    return {
      chart: { type: isBar ? 'bar' : 'column', backgroundColor: chartBg },
      title: { text: undefined },
      xAxis: { categories },
      yAxis: { title: { text: undefined } },
      legend: { align: 'center', verticalAlign: 'bottom', itemStyle: { color: legendStyleColor } },
      credits: { enabled: false },
      plotOptions: {
        series: {
          borderRadius: 6,
          dataLabels: { enabled: true, inside: true, align: 'right', style: { fontWeight: 'bold' }, formatter: function () { return this.y } },
        },
      },
      series,
    }
  }, [type, data, options])

  if (!cfg) return <div className={className} style={style} />
  return (
    <div className={className} style={style}>
      <HighchartsReact highcharts={Highcharts} options={cfg} />
    </div>
  )
}
