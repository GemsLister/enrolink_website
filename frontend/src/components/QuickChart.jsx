import { useMemo } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'

export default function QuickChart({ type, data, options, className, style, engine }) {
  const isQuick = String(engine || '').toLowerCase() === 'quickchart'

  const cfg = useMemo(() => {
    if (!Array.isArray(data) || data.length < 2 || isQuick) return null
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
      plotOptions: { series: { borderRadius: 6, dataLabels: { enabled: true, inside: true, align: 'right', style: { fontWeight: 'bold' }, formatter: function () { return this.y } } } },
      series,
    }
  }, [type, data, options, engine])

  const quickUrl = useMemo(() => {
    if (!isQuick || !Array.isArray(data) || data.length < 2) return ''
    const headers = data[0]
    const rows = data.slice(1)
    const legendColor = options && options.legend && options.legend.textStyle && options.legend.textStyle.color
    const bg = options && options.backgroundColor ? options.backgroundColor : 'transparent'
    const height = typeof style?.height === 'number' ? style.height : 280
    const width = 800
    const labels = rows.map(r => String(r[0]))
    const colorsFromSlices = (() => {
      const s = options && options.slices
      if (!s || typeof s !== 'object') return undefined
      const out = []
      for (let i = 0; i < rows.length; i += 1) {
        const entry = s[i]
        out.push(entry && entry.color ? entry.color : undefined)
      }
      return out
    })()
    const multiColorsFromSlices = (() => {
      const s = options && options.slices
      if (!s || typeof s !== 'object') return undefined
      const out = []
      const seriesCount = Math.max(0, headers.length - 1)
      for (let i = 0; i < seriesCount; i += 1) {
        const entry = s[i]
        out.push(entry && entry.color ? entry.color : undefined)
      }
      return out
    })()
    let chartCfg = {}
    if (type === 'PieChart') {
      const values = rows.map(r => Number(r[1] || 0))
      chartCfg = {
        type: 'pie',
        data: { labels, datasets: [{ data: values, backgroundColor: colorsFromSlices }] },
        options: { plugins: { legend: { position: 'bottom', labels: { color: legendColor } }, datalabels: { color: '#7d102a', font: { weight: 'bold' } } } }
      }
    } else {
      const seriesNames = headers.slice(1)
      const datasets = seriesNames.map((name, idx) => ({ label: String(name), data: rows.map(r => Number(r[idx + 1] || 0)), backgroundColor: multiColorsFromSlices ? multiColorsFromSlices[idx] || '#7d102a' : '#7d102a', borderWidth: 0 }))
      chartCfg = {
        type: 'bar',
        data: { labels, datasets },
        options: { plugins: { legend: { position: 'bottom', labels: { color: legendColor } }, datalabels: { color: '#7d102a', anchor: 'end', align: 'top' } }, scales: { x: { ticks: { color: legendColor } }, y: { ticks: { color: legendColor } } } }
      }
    }
    const url = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartCfg))}&backgroundColor=${encodeURIComponent(bg)}&width=${width}&height=${height}&devicePixelRatio=2&format=png&plugin=datalabels`
    return url
  }, [isQuick, type, data, options, style])

  if (isQuick) return <img src={quickUrl} className={className} style={{ ...style, width: '100%', height: 'auto' }} alt="chart" />
  if (!cfg) return <div className={className} style={style} />
  return (
    <div className={className} style={style}>
      <HighchartsReact highcharts={Highcharts} options={cfg} />
    </div>
  )
}
