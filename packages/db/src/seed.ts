import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { models, projects } from './schema';

const dbUrl = process.env.DATABASE_URL || 'file:/home/aftababu/Documents/projects/my_next/NimStudio/packages/db/database.sqlite';
const client = createClient({ url: dbUrl });
const db = drizzle(client);

function formatModelName(id: string) {
  const parts = id.split('/');
  const namePart = parts[parts.length - 1];
  return namePart.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function runSeed() {
  console.log('Seeding default project...');
  await db.insert(projects).values({ id: 'default', name: 'Default Project' }).onConflictDoNothing();

  console.log('Clearing existing models...');
  await db.delete(models);
  
  const curatedModels = [
    'deepseek-ai/deepseek-v4-pro',
    'qwen/qwen3-coder-480b-a35b-instruct',
    'meta/llama-3.3-70b-instruct',
    'mistralai/mistral-large-3-675b-instruct-2512',
    'z-ai/glm-5.1',
    'deepseek-ai/deepseek-v4-flash',
    'moonshotai/kimi-k2.6',
    'nvidia/cosmos3-nano-reasoner'
  ];

  console.log(`Inserting ${curatedModels.length} curated models...`);

  const modelsToInsert = curatedModels.map((id, index) => ({
    id,
    name: formatModelName(id),
    provider: id.split('/')[0] || 'nvidia',
    isActive: true,
    isSelected: index === 0 // Make the first one the default selected model
  }));

  await db.insert(models).values(modelsToInsert);

  console.log('Seed complete.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
