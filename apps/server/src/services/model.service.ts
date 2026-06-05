import { eq } from 'drizzle-orm';
import { db, models } from '@nimstudio/db';
import { getDecryptedApiKeyForProject } from './chat.service';

export async function getModels() {
  return await db.select().from(models).where(eq(models.isActive, true));
}

export async function refreshModels() {
  let apiKey;
  
  try {
    // Try to grab a key using the default project fallback
    apiKey = await getDecryptedApiKeyForProject('default');
  } catch (err) {
    // Ignore error and allow fetch to fail down below if apiKey is still undefined
  }

  if (!apiKey) {
    throw new Error('No NVIDIA API key found in the database. Please add one in Settings.');
  }

  const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models from NVIDIA: ${response.statusText}`);
  }

  const data = await response.json();
  const remoteModels = data.data || [];

  for (const rm of remoteModels) {
    await db.insert(models).values({
      id: rm.id,
      name: rm.id,
      provider: 'nvidia',
      isActive: false, 
    }).onConflictDoUpdate({
      target: models.id,
      set: {
        updatedAt: new Date(),
      }
    });
  }

  return { success: true, count: remoteModels.length };
}

export async function addModel(id: string) {
  const parts = id.split('/');
  const namePart = parts[parts.length - 1] || id;
  const name = namePart.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  const provider = parts[0] || 'nvidia';

  await db.insert(models).values({
    id,
    name,
    provider,
    isActive: true,
    isSelected: false,
  }).onConflictDoUpdate({
    target: models.id,
    set: { isActive: true }
  });
}

export async function removeModel(id: string) {
  await db.delete(models).where(eq(models.id, id));
}

export async function selectModel(id: string) {
  await db.update(models).set({ isSelected: false }).where(eq(models.isSelected, true));
  await db.update(models).set({ isSelected: true }).where(eq(models.id, id));
}

export async function renameModel(id: string, newName: string) {
  await db.update(models).set({ name: newName }).where(eq(models.id, id));
}
