// GET /api/status: is Cozy Wash open right now?
import { getStatus } from './_lib/status.js';

export default async function handler(req, res) {
  const status = await getStatus();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=30');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(status));
}
