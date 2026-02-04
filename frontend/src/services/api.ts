// API service for REST endpoints

const API_BASE = '/api';

export async function fetchModels() {
  const response = await fetch(`${API_BASE}/chat/models`);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json();
}

export async function fetchConversations() {
  const response = await fetch(`${API_BASE}/history`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }
  return response.json();
}

export async function fetchConversation(id: string) {
  const response = await fetch(`${API_BASE}/history/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }
  return response.json();
}

export async function deleteConversation(id: string) {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete conversation');
  }
  return response.json();
}

export async function updateConversationTitle(id: string, title: string) {
  const response = await fetch(`${API_BASE}/history/${id}/title?title=${encodeURIComponent(title)}`, {
    method: 'PATCH',
  });
  if (!response.ok) {
    throw new Error('Failed to update conversation title');
  }
  return response.json();
}

export async function fetchUsageStats(period: 'day' | 'week' | 'month' | 'all' = 'month') {
  const response = await fetch(`${API_BASE}/usage?period=${period}`);
  if (!response.ok) {
    throw new Error('Failed to fetch usage stats');
  }
  return response.json();
}

export async function fetchDailyUsage(days: number = 7) {
  const response = await fetch(`${API_BASE}/usage/daily?days=${days}`);
  if (!response.ok) {
    throw new Error('Failed to fetch daily usage');
  }
  return response.json();
}

export async function selectBestResponse(messageId: string) {
  const response = await fetch(`${API_BASE}/history/messages/${messageId}/select`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to select response');
  }
  return response.json();
}
