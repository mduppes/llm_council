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
