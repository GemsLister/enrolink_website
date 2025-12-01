import { useEffect, useMemo, useState } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import { api } from '../api/client'

export default function QuickChart({ type, data, options, className, style, engine, dataSource, token }) {
  const isQuick = String(engine || '').toLowerCase() === 'quickchart'
  const [remoteData, setRemoteData] = useState(null)
  const [dsKey, setDsKey] = useState('')

  useEffect(() => {
    const src = dataSource
    if (!src) {
      setRemoteData(null)
      setDsKey('')
      return
    }
    const url = typeof src === 'string' ? src : String(src.url || '')
    if (!url) return
    const params = typeof src === 'object' && src.params ? src.params : undefined
    const path = typeof src === 'object' && src.path ? String(src.path) : ''
    const key = `${url}|${JSON.stringify(params)}|${path}`
    setDsKey(key)
    let alive = true
    ;(async () => {
      try {
        const res = await api.request('GET', url, { token, params })
        let out = res
        if (path) {
          const parts = path.split('.').filter(Boolean)
          for (const p of parts) out = out ? out[p] : undefined
        }
        if (alive && Array.isArray(out) && out.length >= 2) setRemoteData(out)
        else if (alive) setRemoteData(null)
      } catch (_) {
        if (alive) setRemoteData(null)
      }
    })()
    return () => { alive = false }
  }, [dataSource, token])

  const baseData = remoteData && dsKey ? remoteData : data

  const cfg = useMemo(() => {
    if (!Array.isArray(baseData) || baseData.length < 2 || isQuick) return null
    const headers = baseData[0]
    const rows = baseData.slice(1)
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
        chart: { type: 'pie', backgroundColor: chartBg, animation: { duration: 600 } },
        title: { text: undefined },
        legend: { align: 'center', verticalAlign: 'bottom', itemStyle: { color: legendStyleColor } },
        tooltip: { pointFormat: '<b>{point.percentage:.1f}%</b>' },
        plotOptions: { pie: { allowPointSelect: true, cursor: 'pointer', dataLabels: { enabled: true, format: '{point.percentage:.0f}%', style: { fontSize: '16px', fontWeight: 'bold', color: '#ffffff' } } }, series: { animation: { duration: 600 } } },
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
      chart: { type: isBar ? 'bar' : 'column', backgroundColor: chartBg, animation: { duration: 600 } },
      title: { text: undefined },
      xAxis: { categories },
      yAxis: { title: { text: undefined } },
      legend: { align: 'center', verticalAlign: 'bottom', itemStyle: { color: legendStyleColor } },
      credits: { enabled: false },
      plotOptions: { series: { borderRadius: 6, animation: { duration: 600 }, dataLabels: { enabled: true, inside: true, align: 'right', style: { fontWeight: 'bold' }, formatter: function () { return this.y } } } },
      series,
    }
  }, [type, baseData, options, engine])

  const quickUrl = useMemo(() => {
    if (!isQuick) return ''
    const d = baseData
    if (!Array.isArray(d) || d.length < 2) return ''
    const headers = d[0]
    const rows = d.slice(1)
    const legendColor = options && options.legend && options.legend.textStyle && options.legend.textStyle.color
    const bg = options && options.backgroundColor ? options.backgroundColor : 'transparent'
    const height = typeof style?.height === 'number' ? style.height : 280
    const width = typeof style?.width === 'number' ? style.width : 800
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
        options: { plugins: { legend: { position: 'bottom', labels: { color: legendColor } }, datalabels: { color: '#ffffff', font: { weight: 'bold', size: 18 }, anchor: 'center', align: 'center', formatter: "(value) => value + '%'" } } }
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
  }, [isQuick, type, baseData, options, style])

  if (isQuick) return <img src={quickUrl} className={className} style={style} alt="chart" />
  if (!cfg) return <div className={className} style={style} />
  return (
    <div className={className} style={style}>
      <HighchartsReact highcharts={Highcharts} options={cfg} />
    </div>
  )
}
