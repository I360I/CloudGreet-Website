/**
 * Type definitions for chart data structures
 */

import type { ChartData } from 'chart.js'

export interface RevenueChartData extends ChartData<'line'> {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    borderColor: string
    backgroundColor: string
    fill: boolean
    tension: number
  }>
}

export interface CallChartData extends ChartData<'bar'> {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor: string
    borderColor: string
    borderWidth: number
  }>
}

export interface ConversionChartData extends ChartData<'doughnut'> {
  labels: string[]
  datasets: Array<{
    label: string
    data: number[]
    backgroundColor: string[]
    borderColor: string[]
    borderWidth: number
  }>
}

export interface ChartsData {
  revenueData?: RevenueChartData
  callData?: CallChartData
  conversionData?: ConversionChartData
}





