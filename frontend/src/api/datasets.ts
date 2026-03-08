import { apiRequest } from '@/api/client'
import type { DataItem, Dataset, DatasetScope, DataItemType } from '@/types/api'

export function listDatasets(workspaceId: number) {
  return apiRequest<{ datasets: Dataset[] }>(`/workspaces/${workspaceId}/datasets`)
}

export function getDataset(workspaceId: number, datasetId: number) {
  return apiRequest<{ dataset: Dataset }>(`/workspaces/${workspaceId}/datasets/${datasetId}`)
}

export function createDataset(
  workspaceId: number,
  input: { name?: string; scope: DatasetScope; agentId?: number }
) {
  return apiRequest<{ dataset: Dataset }>(`/workspaces/${workspaceId}/datasets`, {
    method: 'POST',
    body: input,
  })
}

export function updateDataset(
  workspaceId: number,
  datasetId: number,
  input: { name?: string; scope?: DatasetScope; agentId?: number | null }
) {
  return apiRequest<{ dataset: Dataset }>(`/workspaces/${workspaceId}/datasets/${datasetId}`, {
    method: 'PATCH',
    body: input,
  })
}

export function deleteDataset(workspaceId: number, datasetId: number) {
  return apiRequest<void>(`/workspaces/${workspaceId}/datasets/${datasetId}`, {
    method: 'DELETE',
  })
}

export function listDataItems(workspaceId: number, datasetId: number) {
  return apiRequest<{ dataItems: DataItem[] }>(`/workspaces/${workspaceId}/datasets/${datasetId}/items`)
}

export function createDataItem(
  workspaceId: number,
  datasetId: number,
  input: { type?: DataItemType; data: Record<string, unknown> }
) {
  return apiRequest<{ dataItem: DataItem }>(`/workspaces/${workspaceId}/datasets/${datasetId}/items`, {
    method: 'POST',
    body: input,
  })
}

export function updateDataItem(
  workspaceId: number,
  datasetId: number,
  itemId: number,
  input: { type?: DataItemType; data?: Record<string, unknown> }
) {
  return apiRequest<{ dataItem: DataItem }>(
    `/workspaces/${workspaceId}/datasets/${datasetId}/items/${itemId}`,
    {
      method: 'PATCH',
      body: input,
    }
  )
}

export function deleteDataItem(workspaceId: number, datasetId: number, itemId: number) {
  return apiRequest<void>(`/workspaces/${workspaceId}/datasets/${datasetId}/items/${itemId}`, {
    method: 'DELETE',
  })
}
